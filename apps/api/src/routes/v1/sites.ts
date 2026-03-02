import { Router, type Request, type Response } from "express";

import { db } from "@repo/db";
import { sendResponse, STORE_NAME } from "../../utils";
import { authMiddleware } from "../../middleware/auth";
import redisClient from "@repo/redis/client";


const sitesRouter = Router();

interface authRequest extends Request {
    userId: string,
    cookies: {
        __uIt: string;
    };
}

// insert site which needs to be monitored
sitesRouter.post('/url', authMiddleware, async (req: Request, res: Response) => {

    if (!req.body.url) {
        sendResponse(res, 400, "Bad request!");
        return;
    }

    if (!STORE_NAME) throw Error("Store name not provided!");

    const userId = (req as authRequest).userId;

    try {
        const website = await db.site.create({
            data: {
                userid: userId,
                url: req.body.url,
                intervalTime: req.body.intervalTime
            },
            select: {
                id: true,
                url: true,
                intervalTime: true
            }
        });

        await redisClient.zAdd(STORE_NAME, { score: Math.floor(Date.now() / 1000), value: JSON.stringify(website) });
        sendResponse(res, 201, { siteId: website.id });
    } catch (error) {
        sendResponse(res, 500, "Internal server error!");
    }
})

// get latest site status
sitesRouter.get('/status/:siteId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const website = await db.site.findFirst({
            where: {
                userid: (req as authRequest).userId,
                id: req.params.siteId as string
            },
            include: {
                ticks: {
                    orderBy: [{
                        createdAt: "desc"
                    }],
                    take: 1
                }
            }
        });

        if (!website) {
            sendResponse(res, 404, "Not found!");
            return;
        }

        sendResponse(res, 200, { status: website })
    } catch (error) {
        sendResponse(res, 500, "Internal server error!");
    }
})


export default sitesRouter;