// consumer.ts
import "dotenv/config";
import redisClient from "@repo/redis/client";
import { sleep } from "bun";
import type { PrismaJson } from "@repo/db";
import { Agent } from "undici";
import { parse } from "dotenv";

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1); // Let process manager (PM2/k8s) restart
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("[SHUTDOWN] SIGTERM received, closing Redis connection...");
  await redisClient.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[SHUTDOWN] SIGINT received, closing Redis connection...");
  await redisClient.quit();
  process.exit(0);
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[CONFIG] Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

// ─── Redis error handling ──────────────────────────────────────────────────────

redisClient.on("error", (err) => {
  console.error("[REDIS] Client error:", err.message);
});

redisClient.on("reconnecting", (err) => {
  console.warn("[REDIS] Reconnecting...", err);
});

type days =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

type SiteInputData = {
  id: string;
  url: string;
  intervalTime: number;
  method: string;
  timeout: number;
  sslVerify: boolean;
  followRedirect: boolean;
  body?: PrismaJson;
  header?: PrismaJson;
  maintenanceStartMin: number | null;
  maintenanceEndMin: number | null;
  maintenanceDays: days[];
};

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

type statusEnum = "Up" | "Down" | "Warning";

type reportLog = {
  site_id: string;
  region_id: string;
  url: string;
  status: statusEnum;
  response_time_ms: number;
  createdAt: Date;
  doNotify: boolean;
  statusCode?: number;
  errorType?: string;
  errorReason?: string;
};

const WRITER_STREAM_NAME = requireEnv("WRITER_STREAM_NAME");
const PRODUCER_STREAM_NAME = requireEnv("PRODUCER_STREAM_NAME");
const CONSUMER_GROUP_NAME = requireEnv("REGION_ID");
const CONSUMER_NAME = requireEnv("WORKER_NAME");
const BLOCK_MS = Number(process.env.BLOCK_MS) || 30000;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 50;
const RECLAIM_MIN_IDLE_MS = Number(process.env.RECLAIM_MIN_IDLE_MS) || 60000;

const secureAgent = new Agent({
  connect: {
    rejectUnauthorized: true,
  },
});

const unsecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

function isMaintenance(t: Date, s: number | null, e: number | null, d: days[]) {
  if (s == null || e == null || !d.length) {
    return false;
  }

  if (s < 0 || s > 1439 || e < 0 || e > 1439) return false;

  const weekDays: days[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const currDayIndex = t.getDay();
  const currDay = weekDays[currDayIndex]!;
  const prevDay = weekDays[(currDayIndex + 6) % 7]!;

  const currMin = t.getHours() * 60 + t.getMinutes();

  if (s <= e) {
    return d.includes(currDay) && currMin >= s && currMin <= e;
  }

  if (currMin >= s) {
    return d.includes(currDay);
  }

  if (currMin <= e) {
    return d.includes(prevDay);
  }

  return false;
}

function logCheck(result: reportLog) {
  if (result.status === "Up") {
    console.log(
      `[${result.status}] | ${result.url} | ${result.statusCode} | ${result.response_time_ms}ms | ${result.createdAt}`,
    );
  } else {
    console.error(
      `[${result.status}] | ${result.url} | ${result.errorReason ?? result.errorType} | ${result.response_time_ms}ms | ${result.createdAt}`,
    );
  }
}

async function fetchWebsite(
  url: string,
  id: string,
  method: string,
  timeout: number,
  sslVerify: boolean,
  followRedirect: boolean,
  maintenanceStartMin: number | null,
  maintenanceEndMin: number | null,
  maintenanceDays: days[],
  headers?: PrismaJson,
  body?: PrismaJson,
): Promise<reportLog> {
  const startTime = Date.now();
  const createdAt = new Date();
  try {
    const finalTimeout = Math.max(1000, Math.min(timeout, 15000));
    let fetchOptions: RequestInit = {
      method,
      signal: AbortSignal.timeout(finalTimeout),
      redirect: followRedirect ? "follow" : "manual",
      dispatcher: (sslVerify ? secureAgent : unsecureAgent) as any,
    };

    if (
      body &&
      typeof body === "object" &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      fetchOptions.body = JSON.stringify(body);
    }

    if (headers && typeof headers === "object" && !Array.isArray(headers)) {
      let value = headers as Record<string, string>;
      if (body) {
        value = { "Content-Type": "application/json", ...value };
      }
      fetchOptions.headers = value;
    }

    const response = await fetch(url, fetchOptions);

    response.body?.cancel().catch((e) => {
      console.error("[RESPONSE] maybe body already consumed: ", e);
    });

    const responseTime = Date.now() - startTime;
    let status: statusEnum = "Up";

    if (response.status >= 500) status = "Down";
    else if (response.status >= 400) status = "Warning";

    let log: reportLog = {
      site_id: id,
      region_id: CONSUMER_GROUP_NAME,
      url,
      status,
      statusCode: response.status,
      response_time_ms: responseTime,
      doNotify: false,
      createdAt,
    };

    if (status !== "Up") {
      log.doNotify = !isMaintenance(
        createdAt,
        maintenanceStartMin,
        maintenanceEndMin,
        maintenanceDays,
      );
      log.errorType = "HTTP_ERROR";
      log.errorReason = response.statusText;
    }

    return log;
  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    let errorReason = "UNKNOWN";
    let errorType = "NETWORK_ERROR";
    let status: statusEnum = "Down";

    if (err.code === "ENOTFOUND") {
      errorType = "DNS_ERROR";
      errorReason = "DNS_NOT_FOUND";
    } else if (err.code === "ECONNREFUSED") {
      errorReason = "TCP_CONNECTION_REFUSED";
    } else if (err.code === "ECONNRESET") {
      errorReason = "TCP_CONNECTION_RESET";
    } else if (err.code === "ETIMEDOUT") {
      errorType = "TIMEOUT";
      errorReason = "NETWORK_TIMEOUT";
    } else if (err.code === "CERT_HAS_EXPIRED") {
      errorReason = "SSL_EXPIRED";
    } else if (
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      err.code === "UND_ERR_ABORTED"
    ) {
      errorType = "TIMEOUT";
      errorReason = "REQUEST_TIMEOUT";
      status = "Warning";
    } else {
      errorReason = `${err.name}: ${err.message}`;
    }

    const log: reportLog = {
      site_id: id,
      region_id: CONSUMER_GROUP_NAME,
      url,
      status,
      errorType,
      errorReason,
      response_time_ms: responseTime,
      doNotify: !isMaintenance(
        createdAt,
        maintenanceStartMin,
        maintenanceEndMin,
        maintenanceDays,
      ),
      createdAt,
    };

    return log;
  }
}

async function createConsumerGroup(): Promise<void> {
  console.log(
    `[WORKER] ${CONSUMER_NAME} started. Listening on stream "${PRODUCER_STREAM_NAME}"...`,
  );
  try {
    await redisClient.xGroupCreate(
      PRODUCER_STREAM_NAME,
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
      { key: PRODUCER_STREAM_NAME, id: ">" },
      { COUNT: BATCH_SIZE, BLOCK: BLOCK_MS },
    )) as StreamResponse | null;

    return response?.[0]?.messages ?? [];
  } catch (error: any) {
    if (error.message?.includes("NOGROUP")) {
      console.warn("[STREAM] Consumer group missing. Recreating...");
      await createConsumerGroup();
      await sleep(1000);
      return [];
    }

    console.error("[STREAM] xReadGroup failed:", error.message);
    await sleep(1000);
    return [];
  }
}

async function reclaimMessages(): Promise<StreamData[]> {
  try {
    const response = await redisClient.xAutoClaim(
      PRODUCER_STREAM_NAME,
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
      await redisClient.xAck(
        PRODUCER_STREAM_NAME,
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

async function processMessages(messages: StreamData[]): Promise<void> {
  if (!messages.length) return;

  const eventIds = messages.map((m) => m.id);
  const fetchTasks = messages.map(({ id, message }) => {
    try {
      const parsed = JSON.parse(message.data) as SiteInputData;
      return fetchWebsite(
        parsed.url,
        parsed.id,
        parsed.method,
        parsed.timeout,
        parsed.sslVerify,
        parsed.followRedirect,
        parsed.maintenanceStartMin,
        parsed.maintenanceEndMin,
        parsed.maintenanceDays,
        parsed.header,
        parsed.body,
      );
    } catch (parseErr) {
      console.error(`[PARSE] Bad data id=${id}`);
      return Promise.resolve(null);
    }
  });

  try {
    const reports = await Promise.allSettled(fetchTasks);
    const pipeline = redisClient.multi();
    for (const item of reports) {
      if (item.status === "fulfilled") {
        if (item.value) {
          logCheck(item.value);
          pipeline.xAdd(WRITER_STREAM_NAME, "*", {
            data: JSON.stringify(item.value),
          });
        }
      } else {
        console.error(`[PROMISE] failed to resolve:`, item.reason);
      }
    }

    if (eventIds.length > 0) {
      pipeline.xAckDel(
        PRODUCER_STREAM_NAME,
        CONSUMER_GROUP_NAME,
        eventIds,
        "ACKED",
      );
    }

    await pipeline.exec();
  } catch (error) {
    console.error(`[UNEXPECTED] worker failed : `, error);
    await sleep(1000);
  }
}

async function consumer() {
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
      await consumer();
    } catch (error: any) {
      console.error(
        "[LOOP] Unexpected error, continuing after backoff:",
        error.message,
      );
      await sleep(1000);
    }
  }
}

loop();
