import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { predictionsRouter } from '../routers/predictions';
import { storage } from '../storage';
import { mlClient } from '../lib/ml-client';
import type { Prediction } from '../../shared/schema.js';

// Mock dependencies
vi.mock('../storage');
vi.mock('../lib/ml-client');
vi.mock('../middleware', () => ({
  // Preserve async error propagation in tests
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockStorage = vi.mocked(storage);
const mockMlClient = vi.mocked(mlClient);

const app = express();
app.use(express.json());
app.use('/api/predictions', predictionsRouter);
// Attach a minimal error handler to avoid hanging requests when handlers throw
// This ensures tests expecting 500 complete instead of timing out
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err?.message || 'Internal Server Error';
  res.status(500).json({ error: message });
});

const createMockPrediction = (fixtureId: number, overrides: Partial<Prediction> = {}): Prediction => ({
  id: `pred-${fixtureId}-${Date.now()}`,
  fixtureId,
  homeWinProbability: "45.5",
  drawProbability: "27.2",
  awayWinProbability: "27.3",
  expectedGoalsHome: "1.8",
  expectedGoalsAway: "1.2",
  bothTeamsScore: "62.5",
  over25Goals: "58.3",
  confidence: "78.5",
  createdAt: new Date(),
  mlModel: "test-v1.0",
  predictedOutcome: "home",
  latencyMs: 250,
  serviceLatencyMs: 45,
  modelCalibrated: true,
  calibrationMetadata: {
    method: "temperature-scaling",
    temperature: 1.05,
    applied: true,
  },
  modelTrained: true,
  aiInsight: "Test prediction insight",
  ...overrides,
});

describe('Predictions Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /telemetry', () => {
    it('should return empty telemetry map when no predictions exist', async () => {
      mockStorage.getPredictions.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/predictions/telemetry')
        .expect(200);

      expect(response.body).toEqual({});
      expect(response.headers['cache-control']).toBe('public, max-age=300');
      expect(response.headers['etag']).toMatch(/^"telemetry-\d+"$/);
    });

    it('should return telemetry map for all predictions', async () => {
      const predictions = [
        createMockPrediction(1001),
        createMockPrediction(1002, { modelCalibrated: false }),
      ];
      mockStorage.getPredictions.mockResolvedValue(predictions);

      const response = await request(app)
        .get('/api/predictions/telemetry')
        .expect(200);

      expect(Object.keys(response.body)).toHaveLength(2);
      expect(response.body[1001]).toMatchObject({
        fixtureId: 1001,
        modelCalibrated: true,
      });
      expect(response.body[1002]).toMatchObject({
        fixtureId: 1002,
        modelCalibrated: false,
      });
    });

    it('should filter telemetry by fixture IDs', async () => {
      const predictions = [
        createMockPrediction(1001),
        createMockPrediction(1002),
        createMockPrediction(1003),
      ];
      
      mockStorage.getPredictions
        .mockResolvedValueOnce([predictions[0]])
        .mockResolvedValueOnce([predictions[1]]);

      const response = await request(app)
        .get('/api/predictions/telemetry?fixtureIds=1001,1002')
        .expect(200);

      expect(Object.keys(response.body)).toHaveLength(2);
      expect(response.body[1001]).toBeDefined();
      expect(response.body[1002]).toBeDefined();
      expect(response.body[1003]).toBeUndefined();
      
      expect(mockStorage.getPredictions).toHaveBeenCalledWith(1001);
      expect(mockStorage.getPredictions).toHaveBeenCalledWith(1002);
    });

    it('should handle array of fixture IDs', async () => {
      const prediction = createMockPrediction(1001);
      mockStorage.getPredictions.mockResolvedValue([prediction]);

      const response = await request(app)
        .get('/api/predictions/telemetry')
        .query({ fixtureIds: ['1001', '1002'] })
        .expect(200);

      expect(mockStorage.getPredictions).toHaveBeenCalledWith(1001);
      expect(mockStorage.getPredictions).toHaveBeenCalledWith(1002);
    });

    it('should return latest prediction when multiple exist for same fixture', async () => {
      const olderPrediction = createMockPrediction(1001, {
        createdAt: new Date('2023-01-01'),
        latencyMs: 100,
      });
      const newerPrediction = createMockPrediction(1001, {
        createdAt: new Date('2023-01-02'),
        latencyMs: 200,
      });
      
      mockStorage.getPredictions.mockResolvedValue([olderPrediction, newerPrediction]);

      const response = await request(app)
        .get('/api/predictions/telemetry')
        .expect(200);

      expect(response.body[1001].latencyMs).toBe(200);
    });

    it('should handle invalid fixture IDs gracefully', async () => {
      mockStorage.getPredictions.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/predictions/telemetry?fixtureIds=invalid,abc,123')
        .expect(200);

      expect(response.body).toEqual({});
      expect(mockStorage.getPredictions).toHaveBeenCalledWith(123);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getPredictions.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/predictions/telemetry')
        .expect(200);

      // Should return empty object on error for graceful degradation
      expect(response.body).toEqual({});
    });
  });

  describe('GET /:fixtureId', () => {
    it('should return cached prediction if recent', async () => {
      const recentPrediction = createMockPrediction(1001, {
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      });
      mockStorage.getPredictions.mockResolvedValue([recentPrediction]);

      const response = await request(app)
        .get('/api/predictions/1001')
        .expect(200);

      expect(response.body).toMatchObject({
        fixtureId: 1001,
        id: recentPrediction.id,
      });
      expect(mockStorage.getFixture).not.toHaveBeenCalled();
    });

    it('should generate new prediction if cache is stale', async () => {
      const stalePrediction = createMockPrediction(1001, {
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      });
      const fixture = { id: 1001, homeTeamId: 1, awayTeamId: 2 };
      const mlResponse = {
        probabilities: { home: 0.5, draw: 0.3, away: 0.2 },
        expected_goals: { home: 1.5, away: 1.0 },
        additional_markets: { both_teams_score: 0.6, over_2_5_goals: 0.4 },
        confidence: 0.8,
        model_version: "v2.0",
        predicted_outcome: "home",
        latency_ms: 300,
        service_latency_ms: 50,
        model_calibrated: true,
        calibration: { method: "platt", temperature: 1.1, applied: true },
      };

      mockStorage.getPredictions.mockResolvedValue([stalePrediction]);
      mockStorage.getFixture.mockResolvedValue(fixture);
      mockMlClient.predict.mockResolvedValue(mlResponse);
      mockStorage.updatePrediction.mockResolvedValue(expect.any(Object));

      const response = await request(app)
        .get('/api/predictions/1001')
        .expect(200);

      expect(response.body).toMatchObject({
        fixtureId: 1001,
        mlModel: "v2.0",
        latencyMs: 300,
      });
      expect(mockMlClient.predict).toHaveBeenCalled();
      expect(mockStorage.updatePrediction).toHaveBeenCalled();
    });

    it('should return 400 for invalid fixture ID', async () => {
      const response = await request(app)
        .get('/api/predictions/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid fixture ID');
    });

    it('should return 404 for non-existent fixture (below fallback threshold)', async () => {
      mockStorage.getPredictions.mockResolvedValue([]);
      mockStorage.getFixture.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/predictions/999') // Use ID < 1000 to avoid fallback
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Fixture not found');
    });

    it('should use fallback prediction when ML service fails', async () => {
      const fixture = { id: 1001, homeTeamId: 1, awayTeamId: 2 };
      const fallbackResponse = {
        probabilities: { home: 0.33, draw: 0.33, away: 0.34 },
        expected_goals: { home: 1.0, away: 1.0 },
        additional_markets: { both_teams_score: 0.5, over_2_5_goals: 0.5 },
        confidence: 0.5,
        model_version: "fallback-v1.0",
        predicted_outcome: "draw",
        model_calibrated: false,
      };

      mockStorage.getPredictions.mockResolvedValue([]);
      mockStorage.getFixture.mockResolvedValue(fixture);
      mockMlClient.predict.mockResolvedValue(null);
      mockMlClient.isFallbackAllowed.mockReturnValue(true);
      mockMlClient.generateFallbackPrediction.mockReturnValue(fallbackResponse);
      mockStorage.updatePrediction.mockResolvedValue(expect.any(Object));

      const response = await request(app)
        .get('/api/predictions/1001')
        .expect(200);

      expect(response.body).toMatchObject({
        fixtureId: 1001,
        mlModel: "fallback-v1.0",
        modelCalibrated: false,
      });
    });

    it('should return 503 when ML service fails and fallback disabled', async () => {
      const fixture = { id: 1001, homeTeamId: 1, awayTeamId: 2 };

      mockStorage.getPredictions.mockResolvedValue([]);
      mockStorage.getFixture.mockResolvedValue(fixture);
      mockMlClient.predict.mockResolvedValue(null);
      mockMlClient.isFallbackAllowed.mockReturnValue(false);

      const response = await request(app)
        .get('/api/predictions/1001')
        .expect(503);

      expect(response.body).toHaveProperty('error', 'ML service unavailable');
    });
  });
});
