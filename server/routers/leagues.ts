import { Router } from "express";
import { asyncHandler } from "../middleware/index.js";
import { storage } from "../storage.js";

export const leaguesRouter = Router();

import { apiFootballClient } from "../services/apiFootballClient.js";

// Get leagues, with optional filtering by country and season
leaguesRouter.get("/", asyncHandler(async (req, res) => {
  const { country, season } = req.query;

  // If filters are provided, proxy to API Football
  if (country || season) {
    const params = new URLSearchParams();
    if (country) params.append('country', country as string);
    if (season) params.append('season', season as string);
    const endpoint = `leagues?${params.toString()}`;
    const data = await apiFootballClient.request(endpoint);
    return res.json(data);
  }

  // Otherwise, fetch from local storage
  const leagues = await storage.getLeagues();
  res.json(leagues);
}));