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
    }
];

type reportLog = {
    site_id: string;
    region_id: string;
    url: string;
    status: "Up" | "Down" | "Warning";
    response_time_ms: number;
    createdAt: Date;
    statusCode?: number;
    errorType?: string;
    errorReason?: string;
}

type dbLog = Omit<reportLog, 'url'>;

const PUSH_THRESHOLD = Number(process.env.PUSH_THRESHOLD!);
const WRITER_STREAM_NAME = process.env.WRITER_STREAM_NAME!;

let eventIds: string[] = [];
let dbLogs: dbLog[] = [];
let lastId = "0";
let lastSaveTime = Date.now();

async function readStream() {
    try {
        const response = await redisClient.xRead({
            key: WRITER_STREAM_NAME,
            id: lastId,
        }, {
            COUNT: 25,
            BLOCK: 15000
        }) as StreamResponse | null;

        return response?.[0]?.messages ?? [];
    } catch (error: any) {
        console.error("[STREAM] xReadGroup failed:", error);
        return [];
    }
}


async function writer() {
    const getReport = await readStream();
    const lapsedTime = Date.now() - lastSaveTime;
    for (const item of getReport) {
        lastId = item.id
        eventIds.push(item.id);
        try {
            const value = JSON.parse(item.message.data) as reportLog;
            const { url, ...dbRow } = value
            dbLogs.push(dbRow);
        } catch (error) {
            console.error("[PARSE] failed to parse message: ", error);
        }
    }

    if ((dbLogs.length >= PUSH_THRESHOLD) || (dbLogs.length > 0 && lapsedTime >= 45000)) {
        try {
            await Promise.all([db.tickStatus.createMany({ data: dbLogs }), redisClient.xDel(WRITER_STREAM_NAME, eventIds)]);
            dbLogs = [];
            eventIds = [];
            lastSaveTime = Date.now();
            //console.log("[DB] insert Success.");
        } catch (error) {
            console.error("[DB] insert failed:", error);
        }
    }
}

async function loop() {
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