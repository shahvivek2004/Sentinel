import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import v1Router from "./routes";

import { corsConfig, PORT } from "./utils";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsConfig));

app.use("/api/v1", v1Router);

app.listen(PORT, () => {
  console.log(`server is running at port: ${PORT}`);
});
