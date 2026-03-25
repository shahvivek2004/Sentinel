import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { JWT_SECRET, sendResponse, type authRequest } from "../utils";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token =
    (req as authRequest).cookies["__uIt"] ||
    (req as authRequest).headers["authorization"];
  if (!token) {
    sendResponse(res, 401, "Unauthenticated!, please sign-in again!");
    return;
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as authRequest).userId = decodedToken.id;
    next();
  } catch (error) {
    sendResponse(res, 401, "Unauthenticated!, please sign-in again!");
  }
}
