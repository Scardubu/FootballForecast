import { Router } from "express";
import { asyncHandler } from "../middleware";
import { apiFootballClient } from "../services/apiFootballClient";

export const apiFootballRouter = Router();

// Proxy endpoint for live fixtures
apiFootballRouter.get('/fixtures/live', asyncHandler(async (req, res) => {
  const data = await apiFootballClient.request('fixtures?live=all');
  res.json(data);
}));

// Proxy endpoint for fixtures with optional filters
apiFootballRouter.get('/fixtures', asyncHandler(async (req, res) => {
  const { league, date } = req.query;
  let endpoint = 'fixtures';
  const params = new URLSearchParams();
  
  if (league) params.append('league', league as string);
  if (date) params.append('date', date as string);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  const data = await apiFootballClient.request(endpoint);
  res.json(data);
}));

// Proxy endpoint for standings
apiFootballRouter.get('/standings/:leagueId/:season', asyncHandler(async (req, res) => {
  const { leagueId, season } = req.params;
  const data = await apiFootballClient.request(`standings?league=${leagueId}&season=${season}`);
  res.json(data);
}));

// Proxy endpoint for teams
apiFootballRouter.get('/teams', asyncHandler(async (req, res) => {
  const { league, season } = req.query;
  let endpoint = 'teams';
  const params = new URLSearchParams();
  
  if (league) params.append('league', league as string);
  if (season) params.append('season', season as string);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  const data = await apiFootballClient.request(endpoint);
  res.json(data);
}));

// Proxy endpoint for predictions
apiFootballRouter.get('/predictions/:fixtureId', asyncHandler(async (req, res) => {
  const { fixtureId } = req.params;
  const data = await apiFootballClient.request(`predictions?fixture=${fixtureId}`);
  res.json(data);
}));

// Proxy endpoint for leagues
apiFootballRouter.get('/leagues', asyncHandler(async (req, res) => {
  const { country, season } = req.query;
  let endpoint = 'leagues';
  const params = new URLSearchParams();
  
  if (country) params.append('country', country as string);
  if (season) params.append('season', season as string);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  const data = await apiFootballClient.request(endpoint);
  res.json(data);
}));

// Proxy endpoint for team statistics
apiFootballRouter.get('/teams/:teamId/statistics', asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { league, season } = req.query;
  
  if (!league || !season) {
    return res.status(400).json({ error: 'League and season parameters required' });
  }
  
  const data = await apiFootballClient.request(`teams/statistics?team=${teamId}&league=${league}&season=${season}`);
  res.json(data);
}));