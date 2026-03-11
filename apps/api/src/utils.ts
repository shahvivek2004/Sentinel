import type { Response } from "express";
import "dotenv/config";

export function sendResponse(res: Response, code: number, value: any) {
  return res.status(code).json({ message: value });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[CONFIG] Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

export const PORT = requireEnv("PORT");
export const JWT_SECRET = requireEnv("JWT_SECRET");
export const EXP_TIME = requireEnv("EXP_TIME");
export const STORE_NAME = requireEnv("STORE_NAME");
export const HASH_STORE_NAME = requireEnv("HASH_STORE_NAME");

// prod
export const prodCookieConfig = {
  domain: "",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24 * 4,
};

//dev
export const devCookieConfig = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24 * 4,
};

export const corsConfig = {
  origin: ["http://localhost:3000"], // Your frontend URL
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
