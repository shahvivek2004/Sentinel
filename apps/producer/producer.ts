// producer.ts
import { db } from "@repo/db";
import redisClient from "@repo/redis/client";
import { sleep } from "bun";
import "dotenv/config";

type SiteInputData = {
    id: string,
    url: string,
    intervalTime: number  // in seconds
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
    const response: SiteInputData[] = await db.site.findMany({ select: { id: true, url: true, intervalTime: true } });

    const existing = await redisClient.zRangeByScore(STORE_NAME, '-inf', '+inf');

    if (existing.length === 0) {
        console.log("[STORE] Priority scheduler initilized.")
        await redisClient.zAdd(STORE_NAME, response.map(e => ({
            score: now + e.intervalTime,
            value: JSON.stringify(e)
        })))
    }
}


async function producer() {
    const now = Math.floor(Date.now() / 1000);
    const dueSites = await redisClient.zRangeByScore(STORE_NAME, '-inf', now);

    if(!dueSites) return;
    if (!dueSites.length) return;

    const queuedSites: StreamInputData[] = [];
    const updatedScores: SortedSetData[] = [];

    for (const entry of dueSites) {
        try {
            const parsed = JSON.parse(entry) as SiteInputData;
            console.log(`[SCHEDULED] ${parsed.url} at ${new Date()}`);
            updatedScores.push({
                score: now + parsed.intervalTime,
                value: entry
            });
        } catch (error) {
            console.error(`[PARSE] failed to parse data: ${entry}, causing Error: ${error}`);
        }
        queuedSites.push({ data: entry });
    }


    const pipeline = redisClient.multi();
    for (const item of queuedSites) {
        pipeline.xAdd(STREAM_NAME, "*", item);
    }
    pipeline.zAdd(STORE_NAME, updatedScores);


    try {
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
            await producer();
        } catch (err) {
            console.error("Tick failed:", err);
        }
        await sleep(15000);
    }
}

loop();


// async function producer() {
//     //console.log("Producer waiting for task...⏳");
//     const now = Math.floor(Date.now() / 1000);
//     const dueSites = await redisClient.zRangeByScore(STORE_NAME, '-inf', now); // this will be stringify values of array -> string[]
//     if (!dueSites.length) return;

//     //console.log("task assigned...✅")
//     const queuedSites: StreamInputData[] = [];
//     const updatedScores: SortedSetData[] = [];

//     for (const entry of dueSites) {
//         const parsed = JSON.parse(entry) as SiteInputData;
//         console.log(`Job scheduled : ${parsed.url} ✅ at ${new Date()}`)
//         queuedSites.push({ data: entry });
//         updatedScores.push({
//             score: now + parsed.intervalTime,
//             value: entry
//         })
//     }

//    Approach - 1
//    const promises = queuedSites.map((item) => redisClient.xAdd(STREAM_NAME, "*", item));
//    await Promise.allSettled(promises);

//    Approach - 2
//    for(const item of queuedSites){
//        await redisClient.xAdd(STREAM_NAME, "*", item);
//    }

//     await redisClient.zAdd(STORE_NAME, updatedScores);
// }