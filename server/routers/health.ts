import { Router } from "express";
import { asyncHandler } from "../middleware";
import { apiFootballClient } from "../services/apiFootballClient";
import { scrapingScheduler } from "../scraping-scheduler";

export const healthRouter = Router();

// Health and monitoring endpoints (no auth required)
healthRouter.get('/health', asyncHandler(async (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
}));

healthRouter.get('/_client-status', asyncHandler(async (req, res) => {
  const clientStatus = apiFootballClient.getStatus();
  res.json({
    apiClient: clientStatus,
    scheduler: {
      initialized: !!scrapingScheduler,
      timestamp: new Date().toISOString()
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));