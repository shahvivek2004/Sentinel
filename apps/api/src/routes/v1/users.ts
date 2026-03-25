import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "@repo/db";
import redisClient from "@repo/redis/client";
import { requiredBodySignin, requiredBodySignup } from "@repo/zod/validation";

import {
  devCookieConfig,
  EXP_TIME,
  JWT_SECRET,
  LATEST_STATUS_CACHE,
  sendResponse,
  type authRequest,
} from "../../utils";
import { authMiddleware } from "../../middleware/auth";

type redisCache = {
  site_id: string;
  region_id: string;
  status: "Up" | "Down" | "Warning";
  response_time_ms: number;
  created_at: Date;
  status_code?: number;
  error_type?: string;
  error_reason?: string;
};

const usersRouter: Router = Router();

usersRouter.post("/signup", async (req: Request, res: Response) => {
  const result = requiredBodySignup.safeParse(req.body);

  if (!result.success) {
    const error = result.error.issues[0]?.message ?? "error!";
    sendResponse(res, 400, error);
    return;
  }

  try {
    const isEmailExist = (
      await db.user.findUnique({
        where: {
          email: result.data.email,
        },
        select: {
          email: true,
        },
      })
    )?.email;

    if (isEmailExist) {
      sendResponse(res, 400, "User already exist, go to login!");
      return;
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    await db.user.create({
      data: {
        name: result.data.username,
        email: result.data.email,
        password: hashedPassword,
      },
    });

    sendResponse(res, 201, "Signup successful!");
  } catch (error) {
    console.error("Failed to signup: ", error);
    sendResponse(res, 500, "Internal server error!");
  }
});

usersRouter.post("/signin", async (req: Request, res: Response) => {
  const result = requiredBodySignin.safeParse(req.body);

  if (!result.success) {
    const error = result.error.issues[0]?.message ?? "error";
    sendResponse(res, 400, error);
    return;
  }

  try {
    const userData = await db.user.findUnique({
      where: {
        email: result.data.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });

    if (!userData) {
      sendResponse(res, 400, "User don't exist, sign up first!");
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      result.data.password,
      userData.password,
    );
    if (!isPasswordValid) {
      sendResponse(res, 400, "Wrong Password!");
      return;
    }

    const token = jwt.sign({ id: userData.id }, JWT_SECRET, {
      expiresIn: EXP_TIME,
    } as jwt.SignOptions);

    res
      .status(201)
      .cookie("__uIt", token, devCookieConfig)
      .json({ message: "Login success!" });
  } catch (error) {
    console.error("Failed to signin: ", error);
    sendResponse(res, 500, "Internal server error!");
  }
});

usersRouter.get(
  "/dashboard",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as authRequest).userId;
      const userData = await db.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          sites: {
            select: {
              id: true,
              url: true,
              primeRegionId: true,
              timeAdded: true,
              intervalTime: true,
              method: true,
              timeout: true,
            },
          },
        },
      });

      if (userData) {
        const siteIds = userData.sites.map((value) => value.id);
        const raw = await redisClient.hmGet(LATEST_STATUS_CACHE, siteIds);
        const result = raw.map((val) => {
          if (val) return JSON.parse(val) as redisCache;
          return null;
        });
        sendResponse(res, 200, {
          data: { site_data: userData, latest_data: result },
        });
      } else {
        sendResponse(res, 404, "User not found!");
      }
    } catch (error) {
      sendResponse(res, 500, "Internal server error!");
    }
  },
);

usersRouter.post("/signout", (_, res: Response) => {
  try {
    res
      .status(201)
      .clearCookie("__uIt", devCookieConfig)
      .json({ message: "Logout Successfully!" });
  } catch (error) {
    console.error("Failed to signout: ", error);
    sendResponse(res, 500, "Internal server error!");
  }
});

export default usersRouter;
