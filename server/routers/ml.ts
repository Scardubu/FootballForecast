import express, { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware";
import { mlClient } from "../lib/ml-client";
import { 
  mlPredictionRequestSchema, 
  mlBatchPredictionRequestSchema,
  mlTrainingRequestSchema,
  type MLPredictionResponse
} from "@shared/schema";
import { storage } from "../storage";

export const mlRouter = express.Router();

/**
 * GET /api/ml/health - Check ML service health
 */
mlRouter.get("/health", asyncHandler(async (req: Request, res: Response) => {
  const health = await mlClient.healthCheck();
  
  res.status(health.status === "healthy" ? 200 : 503).json({
    ...health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/ml/model/status - Get ML model status and metrics
 */
mlRouter.get("/model/status", asyncHandler(async (req, res) => {
  const status = await mlClient.getModelStatus();
  
  if (!status) {
    return res.status(503).json({
      error: "ML model status unavailable",
      message: "Could not retrieve model status from ML service"
    });
  }
  
  res.json(status);
}));

/**
 * POST /api/ml/predict - Get prediction for a single match
 */
mlRouter.post("/predict", asyncHandler(async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedRequest = mlPredictionRequestSchema.parse(req.body);
    
    // Try ML service first
    let prediction = await mlClient.predict(validatedRequest);
    
    // Fallback if ML service fails
    if (!prediction) {
      console.warn(`🔄 ML service unavailable, using fallback prediction for fixture ${validatedRequest.fixture_id}`);
      prediction = mlClient.generateFallbackPrediction(validatedRequest);
    }
    
    // Store prediction in database if fixture_id is provided
    if (prediction.fixture_id && prediction) {
      try {
        await storage.updatePrediction({
          id: `ml-pred-${prediction.fixture_id}-${Date.now()}`,
          fixtureId: prediction.fixture_id!,
          homeWinProbability: prediction.probabilities.home.toString(),
          drawProbability: prediction.probabilities.draw.toString(),
          awayWinProbability: prediction.probabilities.away.toString(),
          expectedGoalsHome: prediction.expected_goals.home.toString(),
          expectedGoalsAway: prediction.expected_goals.away.toString(),
          bothTeamsScore: prediction.additional_markets.both_teams_score.toString(),
          over25Goals: prediction.additional_markets.over_2_5_goals.toString(),
          confidence: prediction.confidence.toString(),
          createdAt: new Date(),
        });
        console.log(`💾 Stored prediction for fixture ${prediction.fixture_id} in database`);
      } catch (dbError) {
        console.warn("Failed to store prediction in database:", dbError);
        // Continue anyway - prediction response is still valid
      }
    }
    
    res.json(prediction);
    
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: validationError.errors,
      });
    } else {
      res.status(500).json({
        error: "Prediction failed",
        message: validationError instanceof Error ? validationError.message : "Unknown error"
      });
    }
  }
}));

/**
 * POST /api/ml/predict/batch - Get predictions for multiple matches
 */
mlRouter.post("/predict/batch", asyncHandler(async (req, res) => {
  try {
    // Validate request body
    const validatedRequest = mlBatchPredictionRequestSchema.parse(req.body);
    
    // Try ML service for batch prediction
    let predictions = await mlClient.predictBatch(validatedRequest);
    
    // Fallback if ML service fails - generate individual fallbacks
    if (predictions.length === 0 && validatedRequest.requests.length > 0) {
      console.warn(`🔄 ML service unavailable, generating ${validatedRequest.requests.length} fallback predictions`);
      predictions = validatedRequest.requests.map(req => mlClient.generateFallbackPrediction(req));
    }
    
    // Store successful predictions in database
    const storedPredictions = [];
    for (const prediction of predictions) {
      if (prediction.fixture_id) {
        try {
          await storage.updatePrediction({
            id: `ml-pred-${prediction.fixture_id}-${Date.now()}-${Math.random()}`,
            fixtureId: prediction.fixture_id,
            homeWinProbability: prediction.probabilities.home.toString(),
            drawProbability: prediction.probabilities.draw.toString(),
            awayWinProbability: prediction.probabilities.away.toString(),
            expectedGoalsHome: prediction.expected_goals.home.toString(),
            expectedGoalsAway: prediction.expected_goals.away.toString(),
            bothTeamsScore: prediction.additional_markets.both_teams_score.toString(),
            over25Goals: prediction.additional_markets.over_2_5_goals.toString(),
            confidence: prediction.confidence.toString(),
            createdAt: new Date(),
          });
          storedPredictions.push(prediction.fixture_id);
        } catch (dbError) {
          console.warn(`Failed to store prediction for fixture ${prediction.fixture_id}:`, dbError);
        }
      }
    }
    
    if (storedPredictions.length > 0) {
      console.log(`💾 Stored ${storedPredictions.length} batch predictions in database`);
    }
    
    res.json({
      predictions,
      total: predictions.length,
      stored: storedPredictions.length,
      failed: predictions.length - storedPredictions.length
    });
    
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error", 
        details: validationError.errors,
      });
    } else {
      res.status(500).json({
        error: "Batch prediction failed",
        message: validationError instanceof Error ? validationError.message : "Unknown error"
      });
    }
  }
}));

/**
 * POST /api/ml/train - Trigger model training
 */
mlRouter.post("/train", asyncHandler(async (req, res) => {
  try {
    // Validate request body
    const validatedRequest = mlTrainingRequestSchema.parse(req.body);
    
    // Trigger training (async process)
    const success = await mlClient.trainModel(validatedRequest);
    
    if (success) {
      res.json({
        message: "Model training initiated successfully",
        start_date: validatedRequest.start_date,
        end_date: validatedRequest.end_date,
        retrain: validatedRequest.retrain,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: "Training initiation failed",
        message: "Could not start model training process"
      });
    }
    
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: validationError.errors,
      });
    } else {
      res.status(500).json({
        error: "Training request failed",
        message: validationError instanceof Error ? validationError.message : "Unknown error"
      });
    }
  }
}));

/**
 * POST /api/ml/predict/fixture/:fixtureId - Convenient endpoint for fixture-specific predictions
 */
mlRouter.post("/predict/fixture/:fixtureId", asyncHandler(async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    if (isNaN(fixtureId)) {
      return res.status(400).json({ error: "Invalid fixture ID" });
    }
    
    // Get fixture details to extract team IDs
    const fixture = await storage.getFixture(fixtureId);
    if (!fixture) {
      return res.status(404).json({ error: "Fixture not found" });
    }
    
    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      return res.status(400).json({ error: "Fixture missing team information" });
    }
    
    // Get team names for better prediction context
    const [homeTeam, awayTeam] = await Promise.all([
      storage.getTeam(fixture.homeTeamId),
      storage.getTeam(fixture.awayTeamId)
    ]);
    
    // Make prediction request
    const predictionRequest = {
      fixture_id: fixtureId,
      home_team_id: fixture.homeTeamId,
      away_team_id: fixture.awayTeamId,
      home_team_name: homeTeam?.name,
      away_team_name: awayTeam?.name,
    };
    
    // Try ML service first
    let prediction = await mlClient.predict(predictionRequest);
    
    // Fallback if ML service fails
    if (!prediction) {
      console.warn(`🔄 ML service unavailable, using fallback for fixture ${fixtureId}`);
      prediction = mlClient.generateFallbackPrediction(predictionRequest);
    }
    
    // Store prediction in database
    try {
      await storage.updatePrediction({
        id: `ml-pred-${fixtureId}-${Date.now()}`,
        fixtureId: prediction.fixture_id!,
        homeWinProbability: prediction.probabilities.home.toString(),
        drawProbability: prediction.probabilities.draw.toString(),
        awayWinProbability: prediction.probabilities.away.toString(),
        expectedGoalsHome: prediction.expected_goals.home.toString(),
        expectedGoalsAway: prediction.expected_goals.away.toString(),
        bothTeamsScore: prediction.additional_markets.both_teams_score.toString(),
        over25Goals: prediction.additional_markets.over_2_5_goals.toString(),
        confidence: prediction.confidence.toString(),
      });
      console.log(`💾 Stored prediction for fixture ${fixtureId} in database`);
    } catch (dbError) {
      console.warn("Failed to store prediction in database:", dbError);
    }
    
    res.json(prediction);
    
  } catch (error) {
    res.status(500).json({
      error: "Fixture prediction failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));

/**
 * GET /api/ml/predictions/fixture/:fixtureId - Get existing prediction for fixture
 */
mlRouter.get("/predictions/fixture/:fixtureId", asyncHandler(async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    if (isNaN(fixtureId)) {
      return res.status(400).json({ error: "Invalid fixture ID" });
    }
    
    const predictions = await storage.getPredictions(fixtureId);
    
    if (predictions.length === 0) {
      return res.status(404).json({ 
        error: "No predictions found",
        message: `No predictions available for fixture ${fixtureId}` 
      });
    }
    
    // Return the most recent prediction
    const latestPrediction = predictions[0];
    res.json(latestPrediction);
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve prediction",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}));