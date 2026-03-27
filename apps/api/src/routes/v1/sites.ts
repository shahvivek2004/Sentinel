import { Router, type Request, type Response } from "express";

import redisClient from "@repo/redis/client";
import { db, type PrismaJson } from "@repo/db";
import {
  requiredBodyUrlPatch,
  requiredBodyUrlPost,
} from "@repo/zod/validation";

import {
  HASH_STORE_NAME,
  LATEST_STATUS_CACHE,
  sendResponse,
  STORE_NAME,
  type authRequest,
} from "../../utils";
import { authMiddleware } from "../../middleware/auth";
import { pool } from "@repo/timescaledb";

type days =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

const sitesRouter = Router();

async function assertSiteOwner(siteId: string, userId: string) {
  return db.site.findFirst({ where: { id: siteId, userid: userId } });
}

// insert site which needs to be monitored
sitesRouter.post(
  "/url",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as authRequest).userId;

      if (!userId) {
        sendResponse(res, 401, "Unauthenticated!");
        return;
      }

      const result = requiredBodyUrlPost.safeParse(req.body);

      if (!result.success) {
        const error = result.error.issues[0]?.message ?? "error!";
        sendResponse(res, 400, error);
        return;
      }

      const [website] = await db.$transaction(async (tx) => {
        const monitorCount = await tx.site.count({
          where: { userid: userId },
        });

        if (monitorCount >= 5) {
          throw new Error("LIMIT_REACHED");
        }

        return [
          await tx.site.create({
            data: {
              userid: userId,
              ...result.data,
            },
            select: {
              id: true,
              url: true,
              intervalTime: true,
              method: true,
              primeRegionId: true,
              timeout: true,
              sslVerify: true,
              followRedirect: true,
              body: true,
              header: true,
              maintenanceStartMin: true,
              maintenanceEndMin: true,
              maintenanceDays: true,
            },
          }),
        ];
      });

      const nextRun = Math.floor(Date.now() / 1000) + website.intervalTime;
      const pipeline = redisClient.multi();
      pipeline.hSet(HASH_STORE_NAME, website.id, JSON.stringify(website));
      pipeline.zAdd(STORE_NAME, { score: nextRun, value: website.id });
      await pipeline.exec();
      sendResponse(res, 201, { data: website });
    } catch (error: any) {
      if (error.message === "LIMIT_REACHED") {
        sendResponse(
          res,
          403,
          "Free plan limit reached. Upgrade to add more monitors.",
        );
        return;
      }
      console.error("Failed to POST url: ", error);
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

// update site configs by siteId
sitesRouter.patch(
  "/url/:siteId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as authRequest).userId;
      const siteId = req.params.siteId as string;

      if (!siteId) {
        sendResponse(res, 400, "Bad request!");
      }

      if (!userId) {
        sendResponse(res, 401, "Unauthenticated!");
        return;
      }

      const parsed = requiredBodyUrlPatch.safeParse(req.body);
      if (!parsed.success) {
        const error = parsed.error.issues[0]?.message;
        sendResponse(res, 400, error ?? "error!");
        return;
      }

      const updateData = parsed.data; // already only contains provided fields

      const response = await db.site.findUnique({
        where: {
          id: siteId,
        },
      });

      if (!response) {
        sendResponse(res, 404, "Not found!");
        return;
      }

      if (response.userid !== userId) {
        sendResponse(res, 403, "Unauthorized!");
        return;
      }

      const result = await db.site.update({
        where: {
          id: siteId,
        },
        data: updateData,
        select: {
          id: true,
          url: true,
          intervalTime: true,
          method: true,
          primeRegionId: true,
          timeout: true,
          sslVerify: true,
          followRedirect: true,
          body: true,
          header: true,
          maintenanceStartMin: true,
          maintenanceEndMin: true,
          maintenanceDays: true,
        },
      });

      await redisClient.hSet(
        HASH_STORE_NAME,
        result.id,
        JSON.stringify(result),
      );
      sendResponse(res, 200, "Updated successfully!");
    } catch (error) {
      console.error("Failed to PATCH updates: ", error);
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

sitesRouter.delete(
  "/url/delete/:siteId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as authRequest).userId;
      const siteId = req.params.siteId as string;

      if (!siteId) {
        sendResponse(res, 400, "Bad request!");
      }

      if (!userId) {
        sendResponse(res, 401, "Unauthenticated!");
        return;
      }

      const response = await db.site.findUnique({
        where: {
          id: siteId,
        },
      });

      if (!response) {
        sendResponse(res, 404, "Not found!");
        return;
      }

      if (response.userid !== userId) {
        sendResponse(res, 403, "Unauthorized!");
        return;
      }

      await db.site.delete({
        where: {
          id: siteId,
        },
      });

      const pipeline = redisClient.multi();
      pipeline.zRem(STORE_NAME, siteId);
      pipeline.hDel(HASH_STORE_NAME, siteId);
      pipeline.hDel(LATEST_STATUS_CACHE, siteId);
      await pipeline.exec();
      sendResponse(res, 201, "Deleted successfully!");
    } catch (error) {
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

sitesRouter.get(
  "/:siteId/overview",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = (req as authRequest).userId;
    const { siteId } = req.params;
    const region = req.query.region as string | undefined;

    if (!userId) return sendResponse(res, 401, "Unauthenticated!");
    if (!region) return sendResponse(res, 400, "region query param required");
    if (!siteId || typeof siteId !== "string")
      return sendResponse(res, 404, "Site Id not found");

    const site = await assertSiteOwner(siteId, userId);
    if (!site) return sendResponse(res, 404, "Site not found");

    try {
      const latestTickRes = await pool.query<{
        status: string;
        response_time_ms: number;
      }>(
        `SELECT status, response_time_ms
         FROM raw_tick_status
         WHERE site_id = $1 AND region_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [siteId, region],
      );
      const latest = latestTickRes.rows[0] ?? null;

      const dailyBarsRes = await pool.query<{
        date: string;
        total_checks: string;
        up_checks: string;
      }>(
        `SELECT
           TO_CHAR(bucket AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
           total_checks::bigint AS total_checks,
           up_checks::bigint    AS up_checks
         FROM aggregate_daily
         WHERE site_id   = $1
           AND region_id = $2
           AND bucket    >= NOW() - INTERVAL '30 days'
         ORDER BY bucket ASC`,
        [siteId, region],
      );

      let total_checks = 0;
      let up_checks = 0;
      for (let val of dailyBarsRes.rows) {
        total_checks += Number(val.total_checks);
        up_checks += Number(val.up_checks);
      }

      const uptime30dPct =
        total_checks && Number(total_checks) > 0
          ? (Number(up_checks) / Number(total_checks)) * 100
          : null;

      return sendResponse(res, 200, {
        data: {
          site_id: siteId,
          url: site.url,
          current_status: latest?.status ?? null,
          current_latency_ms: latest?.response_time_ms ?? null,
          uptime_30d_pct: uptime30dPct,
          daily_bars: dailyBarsRes.rows.map((r) => ({
            date: r.date,
            total_checks: Number(r.total_checks),
            up_checks: Number(r.up_checks),
          })),
        },
      });
    } catch (err) {
      console.error("Failed to GET overview:", err);
      return sendResponse(res, 500, "Internal server error!");
    }
  },
);

sitesRouter.get(
  "/:siteId/timeseries",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = (req as authRequest).userId;
    const { siteId } = req.params;
    const region = req.query.region as string | undefined;
    const range = (req.query.range as string | undefined) ?? "24h";

    if (!userId) return sendResponse(res, 401, "Unauthenticated!");
    if (!region) return sendResponse(res, 400, "region query param required");
    if (!["24h", "7d", "30d"].includes(range))
      return sendResponse(res, 400, "range must be 24h | 7d | 30d");
    if (!siteId || typeof siteId !== "string")
      return sendResponse(res, 404, "Site not found");
    const site = await assertSiteOwner(siteId, userId);
    if (!site) return sendResponse(res, 404, "Site not found");

    const use30m = range === "24h" || range === "7d";
    const intervalMap: Record<string, string> = {
      "24h": "24 hours",
      "7d": "7 days",
      "30d": "30 days",
    };
    const interval = intervalMap[range];
    const tableName = use30m ? "aggregate_30m" : "aggregate_daily";

    try {
      // Per-bucket rows
      const pointsRes = await pool.query<{
        bucket: string;
        avg_rt: string;
        min_rt: string;
        max_rt: string;
        p90: string;
        p95: string;
        p99: string;
      }>(
        `SELECT
           bucket AT TIME ZONE 'UTC' AS bucket,
           ROUND(avg_rt)             AS avg_rt,
           min_rt,
           max_rt,
           ROUND(approx_percentile(0.90, response_time_percentiles)) AS p90,
           ROUND(approx_percentile(0.95, response_time_percentiles)) AS p95,
           ROUND(approx_percentile(0.99, response_time_percentiles)) AS p99
         FROM ${tableName}
         WHERE site_id   = $1
           AND region_id = $2
           AND bucket    >= NOW() - INTERVAL '${interval}'
         ORDER BY bucket ASC`,
        [siteId, region],
      );

      // Aggregate stats for the whole range
      const statsRes = await pool.query<{
        avg: string;
        min: string;
        max: string;
        p90: string;
        p95: string;
        p99: string;
      }>(
        `SELECT
           ROUND(AVG(avg_rt))    AS avg,
           MIN(min_rt)           AS min,
           MAX(max_rt)           AS max,
           ROUND(approx_percentile(0.90, rollup(response_time_percentiles))) AS p90,
           ROUND(approx_percentile(0.95, rollup(response_time_percentiles))) AS p95,
           ROUND(approx_percentile(0.99, rollup(response_time_percentiles))) AS p99
         FROM ${tableName}
         WHERE site_id   = $1
           AND region_id = $2
           AND bucket    >= NOW() - INTERVAL '${interval}'`,
        [siteId, region],
      );

      const stats = statsRes.rows[0] ?? {
        avg: null,
        min: null,
        max: null,
        p90: null,
        p95: null,
        p99: null,
      };

      return sendResponse(res, 200, {
        data: {
          points: pointsRes.rows.map((r) => ({
            bucket: r.bucket,
            avg_rt: r.avg_rt !== null ? Number(r.avg_rt) : null,
            min_rt: r.min_rt !== null ? Number(r.min_rt) : null,
            max_rt: r.max_rt !== null ? Number(r.max_rt) : null,
            p90: r.p90 !== null ? Number(r.p90) : null,
            p95: r.p95 !== null ? Number(r.p95) : null,
            p99: r.p99 !== null ? Number(r.p99) : null,
          })),
          stats: {
            avg: stats.avg !== null ? Number(stats.avg) : null,
            min: stats.min !== null ? Number(stats.min) : null,
            max: stats.max !== null ? Number(stats.max) : null,
            p90: stats.p90 !== null ? Number(stats.p90) : null,
            p95: stats.p95 !== null ? Number(stats.p95) : null,
            p99: stats.p99 !== null ? Number(stats.p99) : null,
          },
        },
      });
    } catch (err) {
      console.error("Failed to GET timeseries:", err);
      return sendResponse(res, 500, "Internal server error!");
    }
  },
);

sitesRouter.get(
  "/:siteId/incidents",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = (req as authRequest).userId;
    const { siteId } = req.params;
    const region = req.query.region as string | undefined;
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;

    if (!userId) return sendResponse(res, 401, "Unauthenticated!");
    if (!region || !fromStr || !toStr)
      return sendResponse(
        res,
        400,
        "region, from, and to query params required",
      );

    const fromDate = new Date(`${fromStr}T00:00:00Z`);
    const toDate = new Date(`${toStr}T23:59:59Z`);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
      return sendResponse(res, 400, "Invalid date format — use YYYY-MM-DD");
    if (fromDate > toDate)
      return sendResponse(res, 400, "from must be before to");

    if (!siteId || typeof siteId !== "string")
      return sendResponse(res, 404, "Site not found");
    const site = await assertSiteOwner(siteId, userId);
    if (!site) return sendResponse(res, 404, "Site not found");

    try {
      const uptimeRes = await pool.query<{
        total_checks: string;
        up_checks: string;
      }>(
        `SELECT
           SUM(total_checks)::bigint AS total_checks,
           SUM(up_checks)::bigint    AS up_checks
         FROM aggregate_daily
         WHERE site_id   = $1
           AND bucket   >= $2
           AND bucket   <= $3`,
        [siteId, fromDate, toDate],
      );

      const { total_checks, up_checks } = uptimeRes.rows[0] ?? {};
      const uptimePct =
        total_checks && Number(total_checks) > 0
          ? (Number(up_checks) / Number(total_checks)) * 100
          : 100;

      // Incidents — straight from Postgres via Prisma, no retention limit
      const incidents = await db.incident.findMany({
        where: {
          siteId,
          startedAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          startedAt: true,
          resolvedAt: true,
          durationSeconds: true,
        },
      });

      const totalDowntimeSeconds = incidents.reduce(
        (sum, i) => sum + (i.durationSeconds ?? 0),
        0,
      );

      return sendResponse(res, 200, {
        data: {
          uptime_pct: Number(uptimePct.toFixed(3)),
          total_incidents: incidents.length,
          total_downtime_minutes: Number(
            (totalDowntimeSeconds / 60).toFixed(2),
          ),
          incidents, // individual records — useful for a future incident list UI
          from: fromStr,
          to: toStr,
        },
      });
    } catch (err) {
      console.error("Failed to GET incidents:", err);
      return sendResponse(res, 500, "Internal server error!");
    }
  },
);

sitesRouter.get(
  "/incidents",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as authRequest).userId;
      const incidents = await db.incident.findMany({
        where: {
          site: {
            userid: userId,
          },
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 20,
        include: {
          site: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });
      sendResponse(res, 200, { data: incidents });
    } catch (error) {
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

export default sitesRouter;
