import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PredictionEngine } from '../services/predictionEngine';
import { featureExtractor } from '../services/featureEngineering/featureExtractor';
import { mlClient } from '../lib/ml-client';
import type { MatchFeatures } from '../services/featureEngineering/featureExtractor';

// Mock dependencies
vi.mock('../services/featureEngineering/featureExtractor');
vi.mock('../lib/ml-client');
vi.mock('../middleware/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockFeatureExtractor = vi.mocked(featureExtractor);
const mockMlClient = vi.mocked(mlClient);

describe('PredictionEngine - Probability Normalization', () => {
  let engine: PredictionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new PredictionEngine();
  });

  const createMockFeatures = (overrides?: Partial<MatchFeatures>): MatchFeatures => ({
    fixtureId: 1001,
    homeTeam: { id: 1, name: 'Arsenal', code: 'ARS', country: 'England', founded: 1886, national: false, logo: null },
    awayTeam: { id: 2, name: 'Chelsea', code: 'CHE', country: 'England', founded: 1905, national: false, logo: null },
    form: {
      home: {
        last5Points: 12,
        goalsScored: 8,
        goalsConceded: 3,
        trend: 'improving' as const,
        formString: 'WWLWD',
        winRate: 60,
      },
      away: {
        last5Points: 9,
        goalsScored: 6,
        goalsConceded: 5,
        trend: 'stable' as const,
        formString: 'WDLWL',
        winRate: 40,
      },
    },
    xG: {
      home: 1.8,
      away: 1.2,
      differential: 0.6,
      totalGoals: 3.0,
      homeCleanSheetProb: 30,
      awayCleanSheetProb: 20,
    },
    headToHead: {
      totalMatches: 10,
      homeWins: 5,
      draws: 3,
      awayWins: 2,
      lastMeetingDate: '2024-01-15',
      lastMeetingScore: '2-1',
      homeWinRate: 50,
    },
    venue: {
      homeWinRate: 55,
      averageHomeGoals: 1.9,
      recentHomeForm: 'WWDWL',
      homeAdvantageScore: 6.5,
    },
    injuries: {
      home: {
        keyPlayersOut: 1,
        impactScore: 3,
        affectedPositions: ['MF'],
      },
      away: {
        keyPlayersOut: 2,
        impactScore: 5,
        affectedPositions: ['FW', 'DF'],
      },
    },
    dataQuality: {
      completeness: 85,
      recency: 'Updated recently',
      sources: ['database'],
    },
    ...overrides,
  });

  describe('ML Prediction Probability Normalization', () => {
    it('should normalize ML probabilities to sum to 100% ±0.1%', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);

      // Mock ML response with probabilities that don't sum to 100
      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: {
          home: 0.48,
          draw: 0.29,
          away: 0.22, // Sum = 0.99 (99%)
        },
        expected_goals: { home: 1.8, away: 1.2 },
        additional_markets: {
          both_teams_score: 0.62,
          over_2_5_goals: 0.58,
        },
        confidence: 0.78,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      // Verify probabilities sum to 100% within tolerance
      const sum = prediction.predictions.homeWin + prediction.predictions.draw + prediction.predictions.awayWin;
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);

      // Verify individual probabilities are reasonable
      expect(prediction.predictions.homeWin).toBeGreaterThan(0);
      expect(prediction.predictions.homeWin).toBeLessThanOrEqual(100);
      expect(prediction.predictions.draw).toBeGreaterThan(0);
      expect(prediction.predictions.draw).toBeLessThanOrEqual(100);
      expect(prediction.predictions.awayWin).toBeGreaterThan(0);
      expect(prediction.predictions.awayWin).toBeLessThanOrEqual(100);
    });

    it('should handle edge case probabilities that sum to more than 100%', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);

      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: {
          home: 0.50,
          draw: 0.35,
          away: 0.30, // Sum = 1.15 (115%)
        },
        expected_goals: { home: 1.8, away: 1.2 },
        additional_markets: {
          both_teams_score: 0.62,
          over_2_5_goals: 0.58,
        },
        confidence: 0.78,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      const sum = prediction.predictions.homeWin + prediction.predictions.draw + prediction.predictions.awayWin;
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);
    });

    it('should clamp additional market probabilities to [0, 100] range', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);

      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: {
          home: 0.45,
          draw: 0.30,
          away: 0.25,
        },
        expected_goals: { home: 1.8, away: 1.2 },
        additional_markets: {
          both_teams_score: 1.2, // > 100%
          over_2_5_goals: -0.1, // < 0%
        },
        confidence: 0.78,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      expect(prediction.additionalMarkets.btts).toBeGreaterThanOrEqual(0);
      expect(prediction.additionalMarkets.btts).toBeLessThanOrEqual(100);
      expect(prediction.additionalMarkets.over25Goals).toBeGreaterThanOrEqual(0);
      expect(prediction.additionalMarkets.over25Goals).toBeLessThanOrEqual(100);
    });
  });

  describe('Rule-Based Prediction Probability Normalization', () => {
    it('should normalize rule-based probabilities to sum to 100% ±0.1%', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      
      // ML client returns null to trigger rule-based fallback
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      const sum = prediction.predictions.homeWin + prediction.predictions.draw + prediction.predictions.awayWin;
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);
    });

    it('should favor home team when home advantage is strong', async () => {
      const mockFeatures = createMockFeatures({
        form: {
          home: {
            last5Points: 15, // Perfect home form
            goalsScored: 12,
            goalsConceded: 1,
            trend: 'improving' as const,
            formString: 'WWWWW',
            winRate: 100,
          },
          away: {
            last5Points: 3, // Poor away form
            goalsScored: 2,
            goalsConceded: 8,
            trend: 'declining' as const,
            formString: 'LLLLL',
            winRate: 0,
          },
        },
        xG: {
          home: 2.5,
          away: 0.8,
          differential: 1.7,
          totalGoals: 3.3,
          homeCleanSheetProb: 50,
          awayCleanSheetProb: 10,
        },
        venue: {
          homeWinRate: 80,
          averageHomeGoals: 2.8,
          recentHomeForm: 'WWWWW',
          homeAdvantageScore: 9.0,
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      // Home team should have highest probability
      expect(prediction.predictions.homeWin).toBeGreaterThan(prediction.predictions.draw);
      expect(prediction.predictions.homeWin).toBeGreaterThan(prediction.predictions.awayWin);
      
      // Sum should still be normalized
      const sum = prediction.predictions.homeWin + prediction.predictions.draw + prediction.predictions.awayWin;
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);
    });
  });

  describe('Explainability - Key Factors', () => {
    it('should include injuries in top factors when impact is significant', async () => {
      const mockFeatures = createMockFeatures({
        injuries: {
          home: {
            keyPlayersOut: 0,
            impactScore: 0,
            affectedPositions: [],
          },
          away: {
            keyPlayersOut: 3, // Significant injuries
            impactScore: 8,
            affectedPositions: ['FW', 'MF', 'DF'],
          },
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      // Should include injury factor when impact > 0.15
      const injuryFactor = prediction.reasoning.topFactors.find(f => f.category === 'injuries');
      expect(injuryFactor).toBeDefined();
      expect(injuryFactor?.factor).toBe('Injury Impact');
      expect(injuryFactor?.impact).toBeGreaterThan(0); // Positive impact for home (away injured)
    });

    it('should not include injuries when impact is minimal', async () => {
      const mockFeatures = createMockFeatures({
        injuries: {
          home: {
            keyPlayersOut: 0,
            impactScore: 1,
            affectedPositions: [],
          },
          away: {
            keyPlayersOut: 0,
            impactScore: 1,
            affectedPositions: [],
          },
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      // Should not include injury factor when impact <= 0.15
      const injuryFactor = prediction.reasoning.topFactors.find(f => f.category === 'injuries');
      expect(injuryFactor).toBeUndefined();
    });

    it('should always include form, xG, and venue factors', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      const factorCategories = prediction.reasoning.topFactors.map(f => f.category);
      expect(factorCategories).toContain('form');
      expect(factorCategories).toContain('xg');
      expect(factorCategories).toContain('venue');
    });

    it('should limit top factors to 4 items', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      expect(prediction.reasoning.topFactors).toHaveLength(4);
    });
  });

  describe('Betting Suggestions', () => {
    it('should provide match result suggestion based on highest probability', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      
      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: {
          home: 0.55,
          draw: 0.25,
          away: 0.20,
        },
        expected_goals: { home: 1.8, away: 1.2 },
        additional_markets: {
          both_teams_score: 0.62,
          over_2_5_goals: 0.58,
        },
        confidence: 0.78,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      const matchResultBet = prediction.suggestedBets.find(b => b.type === 'match_result');
      expect(matchResultBet).toBeDefined();
      expect(matchResultBet?.recommendation).toBe('Home Win');
      expect(matchResultBet?.confidence).toBeGreaterThan(50);
    });

    it('should provide over/under suggestion based on xG', async () => {
      const mockFeatures = createMockFeatures({
        xG: {
          home: 2.2,
          away: 1.8,
          differential: 0.4,
          totalGoals: 4.0, // High xG total
          homeCleanSheetProb: 20,
          awayCleanSheetProb: 15,
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      const overUnderBet = prediction.suggestedBets.find(b => b.type === 'over_under');
      expect(overUnderBet).toBeDefined();
      expect(overUnderBet?.recommendation).toContain('Over 2.5'); // High xG should suggest over
    });

    it('should provide BTTS suggestion', async () => {
      const mockFeatures = createMockFeatures();
      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      mockMlClient.predict.mockResolvedValue(null);

      const prediction = await engine.generatePrediction(1001);

      const bttsBet = prediction.suggestedBets.find(b => b.type === 'both_teams_score');
      expect(bttsBet).toBeDefined();
      expect(['Yes', 'No']).toContain(bttsBet?.recommendation);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should reflect high confidence when data quality is high', async () => {
      const mockFeatures = createMockFeatures({
        dataQuality: {
          completeness: 95,
          recency: 'Updated recently',
          sources: ['database', 'api'],
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      
      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: { home: 0.50, draw: 0.30, away: 0.20 },
        expected_goals: { home: 1.8, away: 1.2 },
        additional_markets: { both_teams_score: 0.62, over_2_5_goals: 0.58 },
        confidence: 0.85,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      expect(prediction.predictions.confidence).toBe('high');
      expect(prediction.reasoning.dataQuality.completeness).toBeGreaterThanOrEqual(90);
    });

    it('should reflect low confidence when data quality is poor', async () => {
      const mockFeatures = createMockFeatures({
        dataQuality: {
          completeness: 50,
          recency: 'Outdated',
          sources: ['fallback'],
        },
      });

      mockFeatureExtractor.extractMatchFeatures.mockResolvedValue(mockFeatures);
      
      mockMlClient.predict.mockResolvedValue({
        fixture_id: 1001,
        probabilities: { home: 0.40, draw: 0.35, away: 0.25 },
        expected_goals: { home: 1.5, away: 1.3 },
        additional_markets: { both_teams_score: 0.55, over_2_5_goals: 0.48 },
        confidence: 0.45,
        model_version: 'test-v1',
        predicted_outcome: 'home',
      });

      const prediction = await engine.generatePrediction(1001);

      expect(prediction.predictions.confidence).toBe('low');
    });
  });
});
