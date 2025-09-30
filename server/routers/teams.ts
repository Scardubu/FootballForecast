import { Router } from "express";
import { asyncHandler } from "../middleware/index.js";
import { storage } from "../storage.js";

export const teamsRouter = Router();

import { apiFootballClient } from "../services/apiFootballClient.js";

// Get teams, with optional filtering by league and season
teamsRouter.get("/", asyncHandler(async (req, res) => {
  const { league, season } = req.query;

  // If league and season are provided, proxy to API Football
  if (league && season) {
    const params = new URLSearchParams();
    params.append('league', league as string);
    params.append('season', season as string);
    const endpoint = `teams?${params.toString()}`;
    const data = await apiFootballClient.request(endpoint);
    return res.json(data);
  }

  // Otherwise, fetch from local storage
  const teams = await storage.getTeams();
  res.json(teams);
}));

// Get stats for all teams (aggregated)
teamsRouter.get("/stats", asyncHandler(async (req, res) => {
  const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
  const teams = await storage.getTeams();
  const stats = await Promise.all(
    teams.map(async (t) => storage.getTeamStats(t.id, leagueId))
  );
  res.json(stats.filter((s): s is NonNullable<typeof s> => Boolean(s)));
}));

// Get team stats
teamsRouter.get("/:teamId/stats", asyncHandler(async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
  const stats = await storage.getTeamStats(teamId, leagueId);
  res.json(stats);
}));