import cors from "cors";
import express from "express";

import interviewRoutes from "./routes/interview.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5174",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/", (_req, res) => {
    res.json({ message: "AI Mock Interview API v2 (RAG + Sections + TTS)" });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "2.0.0" });
  });

  app.use("/interviews", interviewRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
