import { Router } from "express";
import { asyncHandler } from "../middleware";
import { storage } from "../storage";

export const leaguesRouter = Router();

// Get leagues
leaguesRouter.get("/", asyncHandler(async (req, res) => {
  const leagues = await storage.getLeagues();
  res.json(leagues);
}));