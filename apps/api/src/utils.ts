import type { Response } from 'express';
import 'dotenv/config';

export function sendResponse(res: Response, code: number, value: any) {
    return res.status(code).json({ message: value });
}

export const PORT = process.env.PORT ?? 4000;
export const JWT_SECRET = process.env.JWT_SECRET;
export const EXP_TIME = process.env.EXP_TIME ?? "4d";
export const STORE_NAME = process.env.STORE_NAME;

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
}