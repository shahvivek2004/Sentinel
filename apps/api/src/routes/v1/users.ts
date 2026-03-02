import { Router, type Request, type Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from "@repo/db";
import { requiredBodySignin, requiredBodySignup } from "@repo/zod/validation";

import { devCookieConfig, EXP_TIME, JWT_SECRET, sendResponse } from "../../utils";

const usersRouter: Router = Router();



usersRouter.post('/signup', async (req: Request, res: Response) => {

    const result = requiredBodySignup.safeParse(req.body);

    if (!result.success) {
        const error = result.error.issues[0]?.message ?? "error!";
        sendResponse(res, 400, error);
        return;
    }

    try {
        const isEmailExist = (await db.user.findUnique({
            where: {
                email: result.data.email
            },
            select: {
                email: true
            }
        }))?.email;
        
        if (isEmailExist) {
            sendResponse(res, 400, "User already exist, go to login!");
            return;
        }

        const hashedPassword = await bcrypt.hash(result.data.password, 10);
        
        await db.user.create({
            data: {
                name: result.data.username,
                email: result.data.email,
                password: hashedPassword
            }
        });

        sendResponse(res, 201, "Signup successful!");

    } catch (error) {
        sendResponse(res, 500, "Internal server error!");
    }
})


usersRouter.post('/signin', async (req: Request, res: Response) => {

    const result = requiredBodySignin.safeParse(req.body);

    if (!result.success) {
        const error = result.error.issues[0]?.message ?? "error";
        sendResponse(res, 400, error);
        return;
    }

    try {
        const userData = await db.user.findUnique({
            where: {
                email: result.data.email
            },
            select: {
                id: true,
                name: true,
                email: true,
                password: true
            }
        })

        if (!userData) {
            sendResponse(res, 400, "User don't exist, sign up first!");
            return;
        }

        const isPasswordValid = await bcrypt.compare(result.data.password, userData.password);
        if (!isPasswordValid) {
            sendResponse(res, 400, "Wrong Password!");
            return;
        }

        const token = jwt.sign({ id: userData.id }, JWT_SECRET!, { expiresIn: EXP_TIME } as jwt.SignOptions);

        res.status(201).cookie("__uIt", token, devCookieConfig).json({ message: "Login success!" });

    } catch (error) {
        sendResponse(res, 500, "Internal server error!");
    }
})


usersRouter.post('/signout', (req: Request, res: Response) => {
    try {
        res.status(201).clearCookie("__uIt", devCookieConfig).json({ message: "Logout Successfully!" });
    } catch {
        sendResponse(res, 500, "Internal server error!");
    }
})

export default usersRouter;