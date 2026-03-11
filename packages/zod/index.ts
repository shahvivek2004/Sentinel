import { z } from "zod";
import { type PrismaJson, type PrismaInputJson } from "@repo/db";

export const requiredBodySignup = z.object({
  email: z
    .email({ error: "Invalid email format" })
    .min(7, { error: "Email must be at least 7 characters" })
    .max(60, { error: "Email must be less than 60 characters" }),

  username: z
    .string()
    .min(2, { error: "Username must be at least 2 characters" })
    .max(60, { error: "Username must be less than 60 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      error: "Username can only contain letters, numbers, and underscores",
    }),

  password: z
    .string()
    .min(10, { error: "Password must be at least 10 characters" })
    .max(50, { error: "Password must be less than 50 characters" })
    .regex(/[A-Z]/, {
      error: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      error: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { error: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, {
      error: "Password must contain at least one special character",
    }),
});

export const requiredBodySignin = z.object({
  email: z
    .email({ error: "Invalid email format" })
    .min(7, { error: "Email must be at least 7 characters" })
    .max(60, { error: "Email must be less than 60 characters" }),

  password: z
    .string()
    .min(10, { error: "Password must be at least 10 characters" })
    .max(50, { error: "Password must be less than 50 characters" })
    .regex(/[A-Z]/, {
      error: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      error: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { error: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, {
      error: "Password must contain at least one special character",
    }),
});

const daysEnum = z.enum([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

const prismaJsonSchema: z.ZodType<PrismaInputJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(prismaJsonSchema),
    z.record(z.string(), prismaJsonSchema),
  ]),
);

export const requiredBodyUrlPost = z.object({
  url: z.httpUrl({ error: "Provided URL should be in HTTP or HTTPS protocol" }),
  intervalTime: z
    .number({ error: "Interval time must be number" })
    .int()
    .positive({ error: "Interval time must be greater than 0" })
    .min(60, { error: "Interval time must be at least 60s" })
    .max(900, { error: "Interval time must be at max 900s" }),
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], {
      error: "(Fetching) Method must be standard and in format of string",
    })
    .default("GET"),
  timeout: z
    .number({ error: "Timeout must be number" })
    .int()
    .positive({ error: "Timeout must be greater than 0" })
    .min(1000, { error: "Timeout must be at least 1000ms" })
    .max(15000, { error: "Timeout must be at max 15000ms" })
    .default(5000),
  sslVerify: z
    .boolean({ error: "SSL verification parameter must be in boolean" })
    .default(true),
  followRedirect: z
    .boolean({ error: "Following Redirect signal must be in boolean" })
    .default(true),
  body: prismaJsonSchema.optional(),
  header: prismaJsonSchema.optional(),
  maintenanceStartMin: z
    .number({ error: "Maintenance start time must be number" })
    .int()
    .min(0, { error: "Maintenance start time must be at least 0" })
    .max(1439, { error: "Maintenance start time must be at max 1439" })
    .nullable(),
  maintenanceEndMin: z
    .number({ error: "Maintenance end time must be number" })
    .int()
    .min(0, { error: "Maintenance end time must be at least 0" })
    .max(1439, { error: "Maintenance end time must be at max 1439" })
    .nullable(),
  maintenanceDays: z.array(daysEnum).default([]),
});

export const requiredBodyUrlPatch = z
  .object({
    url: z.url({ error: "Provided URL should be in HTTP or HTTPS protocol" }),
    intervalTime: z
      .number({ error: "Interval time must be a number" })
      .int()
      .min(60)
      .max(900),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], {
      error: "Method must be a valid HTTP method",
    }),
    timeout: z
      .number({ error: "Timeout must be a number" })
      .int()
      .min(1000)
      .max(15000),
    sslVerify: z.boolean({ error: "SSL verification must be boolean" }),
    followRedirect: z.boolean({ error: "Follow redirect must be boolean" }),
    body: prismaJsonSchema.optional(),
    header: prismaJsonSchema.optional(),
    maintenanceStartMin: z.number().int().min(0).max(1439).nullable(),
    maintenanceEndMin: z.number().int().min(0).max(1439).nullable(),
    maintenanceDays: z.array(daysEnum),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided for update",
  });
