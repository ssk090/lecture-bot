import { config as dotenvConfig } from "dotenv";
import cors from "cors";
import express from "express";
import path from "node:path";
import { pipelineRouter } from "./routes/pipeline";
import { sessionsRouter } from "./routes/sessions";
import { chatRouter } from "./routes/chat";

dotenvConfig({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), "../.env")],
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.use("/api", pipelineRouter);
  app.use("/api", sessionsRouter);
  app.use("/api", chatRouter);

  return app;
}