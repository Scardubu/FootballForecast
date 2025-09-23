import { Router } from "express";
import { asyncHandler } from "../middleware";
import { storage } from "../storage";

export const predictionsRouter = Router();

function generateBasicPrediction(fixtureId: number) {
  return {
    id: `pred-${fixtureId}`,
    fixtureId,
    homeWinProbability: "45",
    drawProbability: "28", 
    awayWinProbability: "27",
    expectedGoalsHome: "1.5",
    expectedGoalsAway: "1.2",
    bothTeamsScore: "65",
    over25Goals: "52",
    confidence: "35",
    createdAt: new Date(),
    mlModel: "fallback",
    keyFactors: "[]",
    explanation: "Basic prediction - ML model unavailable"
  };
}

// Get predictions
predictionsRouter.get("/", asyncHandler(async (req, res) => {
  const fixtureId = req.query.fixture ? parseInt(req.query.fixture as string) : undefined;
  const predictions = await storage.getPredictions(fixtureId);
  res.json(predictions);
}));