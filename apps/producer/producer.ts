// producer.ts
import { db, type PrismaJson } from "@repo/db";
import redisClient from "@repo/redis/client";
import { sleep } from "bun";
import "dotenv/config";

type SiteInputData = {
    id: string,
    url: string,
    intervalTime: number,
    method: string,
    timeout: number,
    sslVerify: boolean,
    followRedirect: boolean;
    body?: PrismaJson,
    header?: PrismaJson
}

type StreamInputData = {
    data: string;
}

type SortedSetData = {
    score: number,
    value: string
}


const STORE_NAME = process.env.STORE_NAME!;
const STREAM_NAME = process.env.STREAM_NAME!;


if (!STORE_NAME) {
    throw new Error("Store name not provided!");
}

if (!STREAM_NAME) {
    throw new Error("Stream name not provided!");
}


async function init() {
    console.log(`[INIT] Producer initialized on ${STREAM_NAME}`);

    const now = Math.floor(Date.now() / 1000);
    const response: SiteInputData[] = await db.site.findMany({
        select: {
            id: true,
            url: true,
            intervalTime: true,
            method: true,
            timeout: true,
            sslVerify: true,
            followRedirect: true,
            body: true,
            header: true
        }
    });

    if (response.length > 0) {
        const existing = await redisClient.zRangeByScore(STORE_NAME, '-inf', '+inf');

        if (existing.length === 0) {
            try {
                console.log("[STORE] Priority scheduler initilized.")
                await redisClient.zAdd(STORE_NAME, response.map(e => ({
                    score: now + e.intervalTime,
                    value: JSON.stringify(e)
                })))
            } catch (error) {
                console.error(`[STORE] failed insert data into scheduler: `, error);
            }
        }
    } else {
        console.error("[DB] no records of sites in database.")
    }
}

async function neededWait() {
    const next = await redisClient.zRangeWithScores(STORE_NAME, 0, 0);

    if (!next || !next.length || !next[0]) {
        await sleep(1000);
        return null;
    }

    const nextScore = next[0].score;
    const wait = Math.max(0, nextScore * 1000 - Date.now()); // convert it into milliseconds for precision
    return wait;
}

async function producer() {
    const now = Math.floor(Date.now() / 1000); // in seconds
    const dueSites = await redisClient.zRangeByScore(STORE_NAME, '-inf', now);

    if (!dueSites) return;
    if (!dueSites.length) return;

    const queuedSites: StreamInputData[] = [];
    const updatedScores: SortedSetData[] = [];

    for (const entry of dueSites) {
        try {
            const parsed = JSON.parse(entry) as SiteInputData;
            queuedSites.push({ data: entry });
            updatedScores.push({
                score: now + parsed.intervalTime,
                value: entry
            });
        } catch (error) {
            console.error(`[PARSE] failed to parse data: ${entry}, causing Error: ${error}`);
        }
    }

    try {
        const pipeline = redisClient.multi();
        for (const item of queuedSites) {
            pipeline.xAdd(STREAM_NAME, "*", item);
        }

        if (updatedScores.length > 0) {
            pipeline.zAdd(STORE_NAME, updatedScores);
        }
        const results = await pipeline.exec();
        results.forEach((result, index) => {
            if (result instanceof Error) {
                console.error(`[PIPELINE] command [${index}] failed: `, result.message);
                // TODO: push failed queuedSites[index] to a dead-letter queue
            }
        });
    } catch (err) {
        console.error("[PIPELINE] execution failed entirely: ", err);
        throw err; // Let the caller/scheduler handle retry
    }
}


async function loop() {
    await init();
    while (true) {
        try {
            const wait = await neededWait();
            if (wait === null) continue;
            if (wait > 0) await sleep(wait);
            await producer();
        } catch (err) {
            console.error("Tick failed:", err);
            await sleep(1000);
        }
    }
}

loop();