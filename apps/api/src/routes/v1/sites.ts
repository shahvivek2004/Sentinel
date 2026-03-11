import { Router, type Request, type Response } from "express";

import { db, type PrismaJson } from "@repo/db";
import { HASH_STORE_NAME, sendResponse, STORE_NAME } from "../../utils";
import { authMiddleware } from "../../middleware/auth";
import redisClient from "@repo/redis/client";
import {
  requiredBodyUrlPatch,
  requiredBodyUrlPost,
} from "@repo/zod/validation";

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

const sitesRouter = Router();

interface authRequest extends Request {
  userId: string;
  cookies: {
    __uIt: string;
  };
}

// get latest site status by id
sitesRouter.get(
  "/status/:siteId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const siteId = req.params.siteId as string;
      const website = await db.site.findUnique({
        where: {
          id: siteId,
        },
        include: {
          ticks: {
            where: {
              site_id: siteId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (!website) {
        sendResponse(res, 404, "Not found!");
        return;
      }

      sendResponse(res, 200, { status: website });
    } catch (error) {
      console.error("Failed to GET status: ", error);
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

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
      const website: SiteInputData = await db.site.create({
        data: {
          userid: userId,
          ...result.data,
        },
        select: {
          id: true,
          url: true,
          intervalTime: true,
          method: true,
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

      const nextRun = Math.floor(Date.now() / 1000) + website.intervalTime;
      const pipeline = redisClient.multi();
      pipeline.hSet(HASH_STORE_NAME, website.id, JSON.stringify(website));
      pipeline.zAdd(STORE_NAME, { score: nextRun, value: website.id });
      await pipeline.exec();
      sendResponse(res, 201, { siteId: website.id });
    } catch (error) {
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
      const parsed = requiredBodyUrlPatch.safeParse(req.body);
      if (!parsed.success) {
        sendResponse(res, 400, parsed.error.issues[0]?.message ?? "error!");
        return;
      }

      const updateData = parsed.data; // already only contains provided fields

      const userId = (req as authRequest).userId;
      const siteId = req.params.siteId as string;

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

      const result: SiteInputData = await db.site.update({
        where: {
          id: siteId,
        },
        data: updateData,
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

export default sitesRouter;
