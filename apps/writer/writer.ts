import { db } from "@repo/db";
import redisClient from "@repo/redis/client";
import { sleep } from "bun";
import "dotenv/config";

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
  url: string;
  status: "Up" | "Down" | "Warning";
  response_time_ms: number;
  createdAt: Date;
  doNotify: boolean;
  statusCode?: number;
  errorType?: string;
  errorReason?: string;
};

type dbLog = Omit<reportLog, "url" | "doNotify">;

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
const BLOCK_MS = Number(process.env.BLOCK_MS) || 30000;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 50;
const RECLAIM_MIN_IDLE_MS = Number(process.env.RECLAIM_MIN_IDLE_MS) || 60000;

let eventIds: string[] = [];
let dbLogs: dbLog[] = [];
let lastId = "0";
let lastSaveTime = Date.now();

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
      await redisClient.xAck(WRITER_STREAM_NAME, CONSUMER_GROUP_NAME, deadIds);
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
  const lapsedTime = Date.now() - lastSaveTime;
  for (const item of getReport) {
    lastId = item.id;
    eventIds.push(item.id);
    try {
      const value = JSON.parse(item.message.data) as reportLog;
      const { url, doNotify, ...dbRow } = value;

      // do something to notify user here
      // just to check log the alarm mock
      if (dbRow.status !== "Up" && !doNotify) {
        console.log(
          `${url} is right now : ${dbRow.status} but due to maintenance`,
        );
      }

      dbLogs.push(dbRow);
    } catch (error) {
      console.error("[PARSE] failed to parse message: ", error);
    }
  }

  if (
    dbLogs.length >= PUSH_THRESHOLD ||
    (dbLogs.length > 0 && lapsedTime >= 60000)
  ) {
    try {
      await Promise.all([
        db.tickStatus.createMany({ data: dbLogs }),
        redisClient.xDel(WRITER_STREAM_NAME, eventIds),
      ]);
      dbLogs = [];
      eventIds = [];
      lastSaveTime = Date.now();
    } catch (error) {
      console.error("[DB] insert failed:", error);
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

async function loop(): Promise<void> {
  await createConsumerGroup();
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
