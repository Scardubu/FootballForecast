import { Router } from "express";
import { asyncHandler } from "../middleware";
import { storage } from "../storage";

export const teamsRouter = Router();

// Get teams
teamsRouter.get("/", asyncHandler(async (req, res) => {
  const teams = await storage.getTeams();
  res.json(teams);
}));

// Get team stats
teamsRouter.get("/:teamId/stats", asyncHandler(async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
  const stats = await storage.getTeamStats(teamId, leagueId);
  res.json(stats);
}));