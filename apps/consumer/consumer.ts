import "dotenv/config";
import redisClient from "@repo/redis/client";
import { sleep } from "bun";

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

// ─── Redis error handling ──────────────────────────────────────────────────────

redisClient.on("error", (err) => {
    console.error("[REDIS] Client error:", err.message);
});

redisClient.on("reconnecting", (err) => {
    console.warn("[REDIS] Reconnecting...", err);
});

type SiteInputData = {
    id: string;
    url: string;
    intervalTime: number; // in seconds
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
    }
];


const STREAM_NAME = process.env.STREAM_NAME;
const CONSUMER_GROUP_NAME = process.env.REGION_NAME;
const CONSUMER_NAME = process.env.WORKER_NAME;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5000;
const BLOCK_MS = Number(process.env.BLOCK_MS) || 15000;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 10;
const RECLAIM_MIN_IDLE_MS = Number(process.env.RECLAIM_MIN_IDLE_MS) || 60000;


function logCheck(result: {
    siteId: string;
    url: string;
    status: "UP" | "DOWN" | string;
    httpStatus?: number;
    responseTimeMs: number;
    timestamp: Date;
    errorType?: string;
    reason?: string;
}) {
    if (result.status === "UP") {
        console.log(
            `[UP] | ${result.url} | ${result.httpStatus} | ${result.responseTimeMs}ms | ${result.timestamp}`
        );
    } else {
        console.error(
            `[DOWN] | ${result.url} | ${result.errorType ?? result.reason} | ${result.responseTimeMs}ms | ${result.timestamp}`
        );
    }
}


async function fetchWebsite(url: string, id: string): Promise<void> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            redirect: "follow",
        });

        await response.body?.cancel();

        const responseTime = Date.now() - startTime;
        const isUp = response.status >= 200 && response.status < 400;

        const log = {
            siteId: id,
            url,
            status: isUp ? "UP" : "DOWN",
            httpStatus: response.status,
            responseTimeMs: responseTime,
            timestamp,
        };

        logCheck(log);

    } catch (err: any) {
        const responseTime = Date.now() - startTime;

        let reason = "UNKNOWN";
        let errorType = "NETWORK_ERROR";

        if (err.name === "TimeoutError" || err.name === "AbortError") {
            reason = "TIMEOUT";
            errorType = "TIMEOUT";
        } else if (err.code === "ENOTFOUND") {
            reason = "DNS_NOT_FOUND";
            errorType = "DNS_ERROR";
        } else if (err.code === "ECONNREFUSED") {
            reason = "CONNECTION_REFUSED";
        } else if (err.code === "ECONNRESET") {
            reason = "CONNECTION_RESET";
        } else if (err.message) {
            reason = err.message;
        }
        const log = {
            siteId: id,
            url,
            status: "DOWN",
            errorType,
            reason,
            responseTimeMs: responseTime,
            timestamp,
        }

        logCheck(log);
    }
}


async function createConsumerGroup(): Promise<void> {
    console.log(`[WORKER] ${CONSUMER_NAME} started. Listening on stream "${STREAM_NAME}"...`);
    try {
        await redisClient.xGroupCreate(STREAM_NAME!, CONSUMER_GROUP_NAME!, "$", {
            MKSTREAM: true,
        });
        console.log(`[INIT] Consumer group "${CONSUMER_GROUP_NAME}" created.`);
    } catch (e: any) {
        if (e?.message?.includes("BUSYGROUP")) {
            console.log(`[INIT] Consumer group "${CONSUMER_GROUP_NAME}" already exists.`);
        } else {
            throw e;
        }
    }
}


async function readConsumerGroup(): Promise<StreamData[]> {
    try {
        const response = (await redisClient.xReadGroup(
            CONSUMER_GROUP_NAME!,
            CONSUMER_NAME!,
            { key: STREAM_NAME!, id: ">" },
            { COUNT: BATCH_SIZE, BLOCK: BLOCK_MS }
        )) as StreamResponse | null;

        return response?.[0]?.messages ?? [];
    } catch (error: any) {
        console.error("[STREAM] xReadGroup failed:", error.message);
        return [];
    }
}


async function reclaimMessages(): Promise<StreamData[]> {
    try {
        const response = await redisClient.xAutoClaim(
            STREAM_NAME!,
            CONSUMER_GROUP_NAME!,
            CONSUMER_NAME!,
            RECLAIM_MIN_IDLE_MS,
            "0-0",
            { COUNT: BATCH_SIZE }
        );

        // Dead-letter: if a message has been delivered too many times, just ACK and skip it
        const MAX_DELIVERIES = 3;
        const deadIds: string[] = [];
        const validMessages: StreamData[] = [];

        for (const msg of response?.messages ?? []) {
            if (!msg) continue;

            if (msg.deliveriesCounter && msg.deliveriesCounter >= MAX_DELIVERIES) {
                console.warn(`[DEAD] Dropping message ${msg.id} after ${msg.deliveriesCounter} deliveries`);
                deadIds.push(msg.id);
            } else {
                validMessages.push(msg as StreamData);
            }
        }

        if (deadIds.length) {
            console.log("[DEAD] Dead message cleared succesfully");
            await redisClient.xAck(STREAM_NAME!, CONSUMER_GROUP_NAME!, deadIds);
        }

        return validMessages;
    } catch (error: any) {
        console.error("[RECLAIM] xAutoClaim failed:", error.message);
        return [];
    }
}


async function processMessages(messages: StreamData[]): Promise<void> {
    if (!messages) return;
    if (!messages.length) return;

    const eventIds = messages.map(m => m.id);
    const fetchTasks = messages.map(({ id, message }) => {
        try {
            const parsed = JSON.parse(message.data) as SiteInputData;
            return fetchWebsite(parsed.url, parsed.id);
        } catch (parseErr) {
            console.error(`[PARSE] Bad data id=${id}`);
            return Promise.resolve();
        }
    });

    // We use a Promise.all with a race to ensure processing doesn't hang the loop
    try {
        await Promise.allSettled(fetchTasks);
    } catch (error) {
        console.error(`[PROMISE] failed to resolve all`);
    }

    try {
        if (eventIds.length > 0) {
            await redisClient.xAckDel(STREAM_NAME!, CONSUMER_GROUP_NAME!, eventIds, "ACKED");
        } else {
            console.log(`[ACK] no messages.`);
        }
    } catch (err) {
        console.error("[ACK] xAck failed: ", err);
    }
}


async function consumer() {
    // 1. Always check for stale/pending messages first
    try {
        const reclaimed = await reclaimMessages();
        if (reclaimed.length > 0) {
            console.log("[RECLAIM] messages reclaimed successfully.");
            await processMessages(reclaimed);
            return;
        }
    } catch (error) {
        console.error(`[RECLAIM] unable to process reclaimed messages: ${error}`);
    }

    // 2. Read and process new messages (blocks up to BLOCK_MS if empty)
    try {
        console.log("[WAIT] Waiting for message.");
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
            console.error("[LOOP] Unexpected error, continuing after backoff:", error.message);
            await sleep(1000);
        }
    }
}

loop();