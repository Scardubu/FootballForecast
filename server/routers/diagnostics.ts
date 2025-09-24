import { Router } from "express";
import { getConfigSummary } from "../config";
import { storage } from "../storage";

export const diagnosticsRouter = Router();

diagnosticsRouter.get("/version", (req, res) => {
  const summary = getConfigSummary();
  res.json({
    ...summary,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

diagnosticsRouter.get("/status", async (req, res) => {
  const summary = getConfigSummary();
  let leagues = 0, teams = 0, fixtures = 0, db = false;
  try {
    leagues = (await storage.getLeagues()).length;
    teams = (await storage.getTeams()).length;
    fixtures = (await storage.getFixtures()).length;
    db = !!process.env.DATABASE_URL;
  } catch {}
  res.json({
    ...summary,
    leagues,
    teams,
    fixtures,
    db,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  });
});
