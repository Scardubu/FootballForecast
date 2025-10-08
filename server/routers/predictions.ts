import { Router } from "express";
import crypto from "crypto";
import { asyncHandler, logger } from "../middleware/index.js";
import { storage } from "../storage.js";
import { mlClient } from "../lib/ml-client.js";
import { beginIngestionEvent, completeIngestionEvent, failIngestionEvent, computeChecksum } from "../lib/ingestion-tracker.js";
import { predictionEngine } from "../services/predictionEngine.js";
import { enhancedFallbackData } from "../lib/enhanced-fallback-data.js";
import type { Prediction } from "../../shared/schema.js";

export const predictionsRouter = Router();

// Bulk telemetry lookup for multiple fixtures
predictionsRouter.get("/telemetry", asyncHandler(async (req, res) => {
  try {
    const fixtureIdsParam = req.query.fixtureIds;

    let fixtureIds: number[] | undefined;
    if (typeof fixtureIdsParam === "string") {
      fixtureIds = fixtureIdsParam
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
    } else if (Array.isArray(fixtureIdsParam)) {
      fixtureIds = fixtureIdsParam
        .map((value) => {
          const raw = typeof value === "string" ? value : String(value);
          const parsed = parseInt(raw.trim(), 10);
          return Number.isNaN(parsed) ? undefined : parsed;
        })
        .filter((id): id is number => typeof id === "number");
    }

    const predictionsByFixture = new Map<number, Prediction>();

    const toDate = (value: unknown): Date | undefined => {
      if (value instanceof Date) return value;
      if (value == null) return undefined;
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      }
      return undefined;
    };

    const collectLatestPrediction = (predictionList: Prediction[]) => {
      for (const prediction of predictionList) {
        if (prediction.fixtureId === null || prediction.fixtureId === undefined) {
          continue;
        }

        const existing = predictionsByFixture.get(prediction.fixtureId);
        if (!existing) {
          predictionsByFixture.set(prediction.fixtureId, prediction);
          continue;
        }

        const createdAtDate = toDate(prediction.createdAt);
        if (!createdAtDate) {
          continue;
        }

        const existingDate = toDate(existing.createdAt);
        if (!existingDate || createdAtDate > existingDate) {
          predictionsByFixture.set(prediction.fixtureId, prediction);
        }
      }
    };

    if (fixtureIds && fixtureIds.length > 0) {
      const predictionLists = await Promise.all(
        fixtureIds.map((fixtureId) => storage.getPredictions(fixtureId).catch(() => []))
      );
      predictionLists.forEach(collectLatestPrediction);
    } else {
      const allPredictions = await storage.getPredictions().catch(() => []);
      collectLatestPrediction(allPredictions);
    }

    const telemetryMap: Record<number, Prediction> = {};
    predictionsByFixture.forEach((prediction, fixtureId) => {
      telemetryMap[fixtureId] = prediction;
    });

    const body = JSON.stringify(telemetryMap);
    const hashHex = crypto.createHash('sha1').update(body).digest('hex');
    let etagNumeric: string;
    try {
      etagNumeric = BigInt('0x' + hashHex).toString(10);
    } catch (error) {
      logger.warn({ error, hashHex }, 'Failed to convert telemetry hash to numeric ETag; falling back to timestamp');
      etagNumeric = Date.now().toString();
    }
    const etag = `"telemetry-${etagNumeric}"`;
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', etag);
    logger.info(`Telemetry request served: ${Object.keys(telemetryMap).length} fixtures`);
    res.type('application/json').send(body);
  } catch (error) {
    logger.error({ error }, 'Error in telemetry endpoint');
    // Return empty telemetry instead of 500
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({});
  }
}));

// Get prediction for a single fixture by ID
predictionsRouter.get("/:fixtureId", asyncHandler(async (req, res) => {
  const fixtureId = parseInt(req.params.fixtureId);
  if (isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture ID' });
  }

  try {
    // 1. Check if a recent prediction already exists in storage
    const existingPredictions = await storage.getPredictions(fixtureId).catch(() => []);
    if (existingPredictions.length > 0) {
      const recentPrediction = existingPredictions[0];
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      // Handle createdAt which could be Date or string from database
      const predictionDate = typeof recentPrediction.createdAt === 'string' 
        ? new Date(recentPrediction.createdAt) 
        : recentPrediction.createdAt;
      if (predictionDate && predictionDate > fiveMinutesAgo) {
        logger.info(`Returning cached prediction for fixture ${fixtureId}`);
        // Cache stored predictions for 5 minutes
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return res.json(recentPrediction);
      }
    }

    // 2. Fetch fixture details from storage
    const fixture = await storage.getFixture(fixtureId).catch(() => null);
    if (!fixture) {
      logger.warn(`Fixture ${fixtureId} not found in storage, checking if fallback is appropriate`);
      
      // Handle enhanced fallback for predictions on generated fixtures (2000000+)
      // Also handle standard fixtures (1000+) that may be missing from the database
      if (fixtureId >= 1000) {
        logger.info(`Generating fallback prediction for fixture ID ${fixtureId}`);
        const fallbackPrediction = enhancedFallbackData.generatePrediction(fixtureId);
        
        // Cache fallback predictions for 10 minutes
        res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
        res.set('X-Prediction-Source', 'fallback');
        
        return res.json(fallbackPrediction);
      }
      
      // Only return 404 for non-fallback eligible fixtures
      return res.status(404).json({ 
        error: 'Fixture not found',
        message: `Fixture with ID ${fixtureId} does not exist. Please check the fixture ID or ensure data has been seeded.`
      });
    }
    
    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      logger.warn(`Fixture ${fixtureId} missing team information`);
      return res.status(400).json({ 
        error: 'Invalid fixture data',
        message: 'Fixture is missing team information'
      });
    }

    // 3. Call the ML service for a new prediction
    const mlRequest = {
      fixture_id: fixture.id,
      home_team_id: fixture.homeTeamId,
      away_team_id: fixture.awayTeamId,
      home_team_name: '', // Names are optional for the model
      away_team_name: '',
    };

    let mlResponse = await mlClient.predict(mlRequest).catch(() => null);

    // 4. If ML service fails, decide whether to fallback or return 503
    if (!mlResponse) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // PRODUCTION: Never use fallback - return 503 to indicate service unavailable
        logger.error(`ML prediction failed for fixture ${fixtureId} in production. No fallback allowed.`);
        return res.status(503).json({
          error: 'ML service unavailable',
          message: 'Prediction service is temporarily unavailable. Please try again later.',
          fixtureId: fixtureId
        });
      } else if (mlClient.isFallbackAllowed()) {
        // DEVELOPMENT: Use fallback for testing
        logger.warn(`ML prediction failed for fixture ${fixtureId}. Generating fallback (development only).`);
        mlResponse = mlClient.generateFallbackPrediction(mlRequest);
      } else {
        return res.status(503).json({
          error: 'ML service unavailable',
          message: 'Prediction service is temporarily unavailable. Please try again later.',
        });
      }
    }

    // 5. Transform the ML response and save it to storage with provenance
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
      predictedOutcome: mlResponse.predicted_outcome,
      latencyMs: mlResponse.latency_ms ?? null,
      serviceLatencyMs: mlResponse.service_latency_ms ?? null,
      modelCalibrated: mlResponse.model_calibrated ?? null,
      modelTrained: mlResponse.model_trained ?? null,
      calibrationMetadata: mlResponse.calibration ?? null,
      // aiInsight is not stored in DB, but included at runtime for richer UI
      aiInsight: mlResponse.explanation ?? undefined
    };

    // Ingestion provenance tracking
    const ctx = await beginIngestionEvent({
      source: 'ml_service',
      scope: `prediction:${fixtureId}`,
      metadata: { fixtureId }
    });
    try {
      await storage.updatePrediction(newPrediction);
      await completeIngestionEvent(ctx, {
        recordsWritten: 1,
        metadata: { mlModel: newPrediction.mlModel },
        checksum: computeChecksum(newPrediction)
      });
      logger.info(`Saved new prediction for fixture ${fixtureId}`);
    } catch (err) {
      await failIngestionEvent(ctx, err, { recordsWritten: 0 });
      throw err;
    }

    // 6. Return the new prediction with caching
    // Cache predictions for 10 minutes (they don't change frequently)
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json(newPrediction);
  } catch (error) {
    logger.error({ error, fixtureId }, 'Error generating prediction');
    // Return a graceful error response
    return res.status(500).json({
      error: 'Prediction generation failed',
      message: 'Unable to generate prediction at this time. Please try again later.',
      fixtureId
    });
  }
}));

// Generate enhanced prediction with betting insights
predictionsRouter.get("/:fixtureId/insights", asyncHandler(async (req, res) => {
  const fixtureId = parseInt(req.params.fixtureId);
  if (isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture ID' });
  }

  try {
    // Generate comprehensive prediction with betting insights
    const enhancedPrediction = await predictionEngine.generatePrediction(fixtureId);

    // Compute ETag for caching and conditional requests
    const body = JSON.stringify(enhancedPrediction);
    const hashHex = crypto.createHash('sha1').update(body).digest('hex');
    let etagNumeric: string;
    try {
      etagNumeric = BigInt('0x' + hashHex).toString(10);
    } catch (error) {
      logger.warn({ error, hashHex }, 'Failed to convert insights hash to numeric ETag; falling back to timestamp');
      etagNumeric = Date.now().toString();
    }
    const etag = `"insights-${fixtureId}-${etagNumeric}"`;

    // Handle conditional request
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    // Cache enhanced predictions for 10 minutes
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.set('ETag', etag);
    res.type('application/json').send(body);
    
  } catch (error) {
    logger.error({ error, fixtureId }, 'Enhanced prediction generation failed');
    return res.status(500).json({
      error: 'Enhanced prediction failed',
      message: 'Unable to generate betting insights at this time. Please try again later.',
      fixtureId
    });
  }
}));

// Batch generate enhanced predictions for multiple fixtures
predictionsRouter.post("/batch/insights", asyncHandler(async (req, res) => {
  const { fixtureIds } = req.body;
  
  if (!Array.isArray(fixtureIds) || fixtureIds.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid request',
      message: 'fixtureIds must be a non-empty array'
    });
  }

  if (fixtureIds.length > 20) {
    return res.status(400).json({
      error: 'Too many fixtures',
      message: 'Maximum 20 fixtures per batch request'
    });
  }

  try {
    // Generate predictions in parallel with controlled concurrency
    const predictions = await Promise.allSettled(
      fixtureIds.map(id => predictionEngine.generatePrediction(id))
    );

    const results = predictions.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { fixtureId: fixtureIds[index], prediction: result.value, success: true };
      } else {
        return { 
          fixtureId: fixtureIds[index], 
          error: result.reason?.message || 'Prediction failed',
          success: false 
        };
      }
    });

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ 
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    logger.error({ error }, 'Batch prediction generation failed');
    return res.status(500).json({
      error: 'Batch prediction failed',
      message: 'Unable to generate batch predictions at this time.'
    });
  }
}));