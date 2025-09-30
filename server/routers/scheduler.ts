import { Router } from "express";
import { asyncHandler } from "../middleware/index.js";
import { scrapingScheduler } from "../scraping-scheduler.js";

export const schedulerRouter = Router();

// Scheduler monitoring endpoint for production observability
schedulerRouter.get("/status", asyncHandler(async (req, res) => {
  const status = scrapingScheduler.getStatus();
  res.json({
    scheduler: status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));