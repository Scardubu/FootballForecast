import { Router } from "express";
import { asyncHandler, logger } from "../middleware";
import { storage } from "../storage";
import { mlClient } from "../lib/ml-client";
import type { Prediction } from "@shared/schema";

export const predictionsRouter = Router();

// Get prediction for a single fixture by ID
predictionsRouter.get("/:fixtureId", asyncHandler(async (req, res) => {
  const fixtureId = parseInt(req.params.fixtureId);
  if (isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture ID' });
  }

  // 1. Check if a recent prediction already exists in storage
  const existingPredictions = await storage.getPredictions(fixtureId);
  if (existingPredictions.length > 0) {
    const recentPrediction = existingPredictions[0];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(recentPrediction.createdAt) > fiveMinutesAgo) {
      logger.info(`Returning cached prediction for fixture ${fixtureId}`);
      return res.json(recentPrediction);
    }
  }

  // 2. Fetch fixture details from storage
  const fixture = await storage.getFixture(fixtureId);
  if (!fixture || !fixture.homeTeamId || !fixture.awayTeamId) {
    return res.status(404).json({ error: 'Fixture not found or teams not specified' });
  }

  // 3. Call the ML service for a new prediction
  const mlRequest = {
    fixture_id: fixture.id,
    home_team_id: fixture.homeTeamId,
    away_team_id: fixture.awayTeamId,
    home_team_name: '', // Names are optional for the model
    away_team_name: '',
  };

  let mlResponse = await mlClient.predict(mlRequest);

  // 4. If ML service fails, decide whether to fallback or return 503
  if (!mlResponse) {
    if (mlClient.isFallbackAllowed()) {
      logger.warn(`ML prediction failed for fixture ${fixtureId}. Generating fallback.`);
      mlResponse = mlClient.generateFallbackPrediction(mlRequest);
    } else {
      return res.status(503).json({
        error: 'ML service unavailable',
        message: 'Prediction service is temporarily unavailable. Please try again later.',
      });
    }
  }

  // 5. Transform the ML response and save it to storage
  const newPrediction: Prediction = {
    id: `pred-${fixture.id}-${Date.now()}`,
    fixtureId: fixture.id,
    homeWinProbability: String(mlResponse.probabilities.home * 100),
    drawProbability: String(mlResponse.probabilities.draw * 100),
    awayWinProbability: String(mlResponse.probabilities.away * 100),
    expectedGoalsHome: String(mlResponse.expected_goals.home),
    expectedGoalsAway: String(mlResponse.expected_goals.away),
    bothTeamsScore: String(mlResponse.additional_markets.both_teams_score * 100),
    over25Goals: String(mlResponse.additional_markets.over_2_5_goals * 100),
    confidence: String(mlResponse.confidence * 100),
    createdAt: new Date(),
    mlModel: mlResponse.model_version,
    explanation: mlResponse.explanation || 'No explanation provided.',
  };

  await storage.updatePrediction(newPrediction);
  logger.info(`Saved new prediction for fixture ${fixtureId}`);

  // 6. Return the new prediction
  res.json(newPrediction);
}));