import { Pool } from "pg";
import "dotenv/config";

export const pool = new Pool({
  host: process.env.TSDB_HOST,
  port: Number(process.env.TSDB_PORT),
  user: process.env.TSDB_USER,
  password: process.env.TSDB_PASSWORD,
  database: process.env.TSDB_DBNAME,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
