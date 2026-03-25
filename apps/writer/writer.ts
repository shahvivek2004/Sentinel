// writer.ts
import { sleep } from "bun";
import "dotenv/config";

import redisClient from "@repo/redis/client";
import { pool } from "@repo/timescaledb";
import { db } from "@repo/db";

type StreamInputData = {
  data: string;
};

type StreamData = {
  id: string;
  message: StreamInputData;
};

type StreamResponse = [
  {
    name: string;
    messages: StreamData[];
  },
];

type reportLog = {
  site_id: string;
  region_id: string;
  primeRegionId: string;
  url: string;
  status: "Up" | "Down" | "Warning";
  response_time_ms: number;
  created_at: Date;
  doNotify: boolean;
  status_code?: number;
  error_type?: string;
  error_reason?: string;
};

type dbLog = Omit<reportLog, "url" | "doNotify" | "primeRegionId">;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[CONFIG] Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

const PUSH_THRESHOLD = Number(requireEnv("PUSH_THRESHOLD"));
const WRITER_STREAM_NAME = requireEnv("WRITER_STREAM_NAME");
const CONSUMER_GROUP_NAME = requireEnv("CONSUMER_GROUP_NAME");
const CONSUMER_NAME = requireEnv("CONSUMER_NAME");
const LATEST_STATUS_CACHE = requireEnv("LATEST_STATUS_CACHE");
const BLOCK_MS = Number(process.env.BLOCK_MS) || 30000;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 300;
const RECLAIM_MIN_IDLE_MS = Number(process.env.RECLAIM_MIN_IDLE_MS) || 60000;

const openIncidents = new Map<string, { id: string; startedAt: Date }>();
let reportLogs: reportLog[] = [];
let lastSaveTime = Date.now();

async function init() {
  await createConsumerGroup();
  try {
    const unresolved = await db.incident.findMany({
      where: { resolvedAt: null },
    });
    unresolved.forEach((i) =>
      openIncidents.set(i.siteId, { id: i.id, startedAt: i.startedAt }),
    );
    console.log(`[INIT] Rehydrated ${unresolved.length} open incidents`);
  } catch (err) {
    // Non-fatal — writer can still process ticks, just won't have incident state
    console.warn(
      "[INIT] Could not rehydrate open incidents, will rebuild from stream:",
      err,
    );
  }
}

async function createConsumerGroup(): Promise<void> {
  console.log(
    `[WORKER] ${CONSUMER_NAME} started. Listening on stream "${WRITER_STREAM_NAME}"...`,
  );
  try {
    await redisClient.xGroupCreate(
      WRITER_STREAM_NAME,
      CONSUMER_GROUP_NAME,
      "$",
      {
        MKSTREAM: true,
      },
    );
    console.log(`[INIT] Consumer group "${CONSUMER_GROUP_NAME}" created.`);
  } catch (e: any) {
    if (e?.message?.includes("BUSYGROUP")) {
      console.log(
        `[INIT] Consumer group "${CONSUMER_GROUP_NAME}" already exists.`,
      );
    } else {
      throw e;
    }
  }
}

async function readConsumerGroup(): Promise<StreamData[]> {
  try {
    const response = (await redisClient.xReadGroup(
      CONSUMER_GROUP_NAME,
      CONSUMER_NAME,
      { key: WRITER_STREAM_NAME, id: ">" },
      { COUNT: BATCH_SIZE, BLOCK: BLOCK_MS },
    )) as StreamResponse | null;

    return response?.[0]?.messages ?? [];
  } catch (error: any) {
    if (error.message?.includes("NOGROUP")) {
      console.warn("[STREAM] Consumer group missing. Recreating...");
      await createConsumerGroup();
      await sleep(1000); // prevent log flood
      return [];
    }

    console.error("[STREAM] xReadGroup failed:", error.message);
    await sleep(1000); // general backoff
    return [];
  }
}

async function reclaimMessages(): Promise<StreamData[]> {
  try {
    const response = await redisClient.xAutoClaim(
      WRITER_STREAM_NAME,
      CONSUMER_GROUP_NAME,
      CONSUMER_NAME,
      RECLAIM_MIN_IDLE_MS,
      "0-0",
      { COUNT: BATCH_SIZE },
    );

    const MAX_DELIVERIES = 3;
    const deadIds: string[] = [];
    const validMessages: StreamData[] = [];

    for (const msg of response?.messages ?? []) {
      if (!msg) continue;

      if (msg.deliveriesCounter && msg.deliveriesCounter >= MAX_DELIVERIES) {
        console.warn(
          `[DEAD] Dropping message ${msg.id} after ${msg.deliveriesCounter} deliveries`,
        );
        deadIds.push(msg.id);
      } else {
        validMessages.push(msg as StreamData);
      }
    }

    if (deadIds.length) {
      await redisClient.xAckDel(
        WRITER_STREAM_NAME,
        CONSUMER_GROUP_NAME,
        deadIds,
      );
    }

    return validMessages;
  } catch (error: any) {
    console.error("[RECLAIM] xAutoClaim failed:", error.message);
    await sleep(1000);
    return [];
  }
}

async function processMessages(getReport: StreamData[]) {
  if (!getReport.length) return;
  let eventIds: string[] = [];
  const lapsedTime = Date.now() - lastSaveTime;
  try {
    for (const item of getReport) {
      eventIds.push(item.id);
      try {
        const value = JSON.parse(item.message.data) as reportLog;
        reportLogs.push(value);
      } catch (error) {
        console.error("[PARSE] failed to parse message: ", error);
      }
    }

    if (eventIds.length > 0) {
      await redisClient.xAckDel(
        WRITER_STREAM_NAME,
        CONSUMER_GROUP_NAME,
        eventIds,
      );
      eventIds = [];
    }
  } catch (error) {
    console.error("[REDIS] failed to Ack given ticks: ", error);
  }

  if (
    reportLogs.length >= PUSH_THRESHOLD ||
    (reportLogs.length > 0 && lapsedTime >= 60000)
  ) {
    try {
      let dbLogs: dbLog[] = [];
      const latestBySite = new Map<string, dbLog>();
      reportLogs.forEach((value) => {
        const { url, doNotify, primeRegionId, ...dbRow } = value;
        dbLogs.push(dbRow);
        if (primeRegionId === dbRow.region_id) {
          const existing = latestBySite.get(dbRow.site_id);
          if (
            !existing ||
            new Date(dbRow.created_at) > new Date(existing.created_at)
          ) {
            latestBySite.set(dbRow.site_id, dbRow);
          }
        }

        if (dbRow.status !== "Up") {
          if (!doNotify) {
            console.log(
              `${url} is right now : ${dbRow.status} but due to maintenance`,
            );
          } else {
            // Notification channel integration
          }
        }
      });

      await insertBatch(dbLogs);

      for (const row of dbLogs) {
        const open = openIncidents.get(row.site_id);

        if (row.status === "Down") {
          if (!open) {
            // New incident — open it
            const incident = await db.incident.create({
              data: {
                siteId: row.site_id,
                startedAt: new Date(row.created_at),
              },
            });
            openIncidents.set(row.site_id, {
              id: incident.id,
              startedAt: incident.startedAt,
            });
          }
          // else: already open, do nothing
        } else {
          if (open) {
            // Status recovered — close the incident
            const resolvedAt = new Date(row.created_at);
            const durationSeconds = Math.round(
              (resolvedAt.getTime() - open.startedAt.getTime()) / 1000,
            );
            await db.incident.update({
              where: { id: open.id },
              data: { resolvedAt, durationSeconds },
            });
            openIncidents.delete(row.site_id);
          }
        }
      }

      const pipeline = redisClient.multi();
      latestBySite.forEach((row) => {
        pipeline.hSet(LATEST_STATUS_CACHE, row.site_id, JSON.stringify(row));
      });

      await pipeline.exec();
      dbLogs = [];
      latestBySite.clear();
      lastSaveTime = Date.now();
    } catch (error) {
      console.error(
        `[DB] insert failed, lost data records : ${reportLogs.length}`,
        error,
      );
    } finally {
      reportLogs = [];
    }
  }
}

async function writer() {
  try {
    const reclaimed = await reclaimMessages();
    if (reclaimed.length > 0) {
      await processMessages(reclaimed);
      return;
    }
  } catch (error) {
    console.error(`[RECLAIM] unable to process reclaimed messages: ${error}`);
  }

  try {
    const fresh = await readConsumerGroup();
    if (fresh.length > 0) {
      await processMessages(fresh);
    }
  } catch (error) {
    console.error(`[STREAM] unable to process stream message: `, error);
  }
}

async function insertBatch(dbLogs: dbLog[]) {
  if (dbLogs.length === 0) return;

  const values: any[] = [];
  const placeholders: string[] = [];

  dbLogs.forEach((log, i) => {
    const idx = i * 8; // number of columns

    placeholders.push(
      `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`,
    );

    values.push(
      log.site_id,
      log.region_id,
      log.created_at,
      log.status,
      log.response_time_ms,
      log.status_code ?? null,
      log.error_type ?? null,
      log.error_reason ?? null,
    );
  });

  const query = `
    INSERT INTO raw_tick_status 
    (site_id, region_id, created_at, status, response_time_ms, status_code, error_type, error_reason)
    VALUES ${placeholders.join(",")}
    ON CONFLICT DO NOTHING
  `;

  await pool.query(query, values);
}

async function loop(): Promise<void> {
  await init();
  while (true) {
    try {
      await writer();
    } catch (error) {
      console.error("[LOOP] unexpected error: ", error);
      await sleep(1000);
    }
  }
}

loop();
