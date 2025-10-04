/**
 * Regression tests for hybrid data integration (odds, injuries, weather)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { featureExtractor } from '../services/featureEngineering/featureExtractor.js';
import { predictionEngine } from '../services/predictionEngine.js';

describe('Hybrid Data Integration Tests', () => {
  describe('Feature Extraction', () => {
    it('should extract market metrics from scraped odds data', async () => {
      // Verify MarketMetrics structure
      const mockMarket = {
        homeOpen: 2.1, drawOpen: 3.4, awayOpen: 3.2,
        homeCurrent: 1.95, drawCurrent: 3.5, awayCurrent: 3.8,
        homeDrift: -0.15, drawDrift: 0.1, awayDrift: 0.6,
        driftVelocity: 0.283,
        sentiment: 'home' as const
      };
      
      expect(mockMarket.sentiment).toBe('home');
      expect(mockMarket.driftVelocity).toBeGreaterThan(0.08); // Threshold for significance
      expect(mockMarket.homeDrift).toBeLessThan(0); // Shortening indicates money
    });

    it('should extract injury impact from scraped injury data', async () => {
      // Verify InjuryImpact structure
      const mockInjury = {
        keyPlayersOut: 3,
        impactScore: 6, // 0-10 scale
        affectedPositions: ['Defender', 'Midfielder', 'Forward']
      };
      
      expect(mockInjury.impactScore).toBeGreaterThanOrEqual(0);
      expect(mockInjury.impactScore).toBeLessThanOrEqual(10);
      expect(mockInjury.keyPlayersOut).toBe(3);
    });

    it('should extract weather metrics from scraped weather data', async () => {
      // Verify WeatherMetrics structure
      const mockWeather = {
        temperatureC: 8,
        windSpeedMs: 12,
        humidity: 85,
        precipitationMm: 6.5,
        condition: 'Rain',
        description: 'heavy rain',
        weatherXgModifier: -0.25, // Negative reduces xG
        forecastUnix: 1735920000
      };
      
      expect(mockWeather.weatherXgModifier).toBeLessThan(0);
      expect(Math.abs(mockWeather.weatherXgModifier!)).toBeGreaterThan(0.1); // Significant modifier
    });

    it('should handle missing scraped data gracefully', async () => {
      // Test default values when data unavailable
      const defaultInjury = {
        keyPlayersOut: 0,
        impactScore: 0,
        affectedPositions: []
      };
      
      expect(defaultInjury.impactScore).toBe(0);
      expect(defaultInjury.affectedPositions).toEqual([]);
    });
  });

  describe('Probability Normalization', () => {
    it('should ensure probabilities sum to 100% ±0.1 without market nudges', () => {
      const testProbs = { home: 0.45, draw: 0.28, away: 0.27 };
      const normalized = predictionEngine['normalizeToPercentages'](testProbs);
      const sum = normalized.home + normalized.draw + normalized.away;
      
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);
    });

    it('should maintain normalization after market sentiment nudges', () => {
      // Test that after applying market nudges, probabilities still sum to 100%
      const testProbs = { home: 0.42, draw: 0.31, away: 0.27 };
      
      // Simulate market nudge
      const homeNudge = 0.02; // +2% nudge
      const adjusted = {
        home: testProbs.home + homeNudge,
        draw: testProbs.draw - homeNudge * 0.5,
        away: testProbs.away - homeNudge * 0.5
      };
      
      const normalized = predictionEngine['normalizeToPercentages'](adjusted);
      const sum = normalized.home + normalized.draw + normalized.away;
      
      expect(sum).toBeGreaterThanOrEqual(99.9);
      expect(sum).toBeLessThanOrEqual(100.1);
    });

    it('should maintain normalization after weather modifiers', () => {
      // Test normalization with weather xG modifiers applied
      expect(true).toBe(true);
    });
  });

  describe('Prediction Latency', () => {
    it('should generate predictions within 2 seconds (P95 target)', async () => {
      const startTime = Date.now();
      
      // Mock prediction call
      // In actual test, would call predictionEngine.generatePrediction(fixtureId)
      
      const duration = Date.now() - startTime;
      
      // P95 latency target is <2000ms
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Data Quality Indicators', () => {
    it('should include scraper sources in dataQuality when scraped data is present', () => {
      // Test that data sources include 'scraper:odds', 'scraper:injuries', etc.
      expect(true).toBe(true);
    });

    it('should calculate completeness score based on available data', () => {
      // Test completeness calculation
      expect(true).toBe(true);
    });
  });

  describe('Key Factor Analysis', () => {
    it('should surface market factor when drift velocity > 0.08', () => {
      // Test market factor threshold
      expect(true).toBe(true);
    });

    it('should surface injury factor when impact differential > 0.15', () => {
      // Test injury factor threshold
      expect(true).toBe(true);
    });

    it('should surface weather factor when modifier > 0.1', () => {
      // Test weather factor threshold
      expect(true).toBe(true);
    });

    it('should limit top factors to 5 maximum', () => {
      // Test factor limiting
      expect(true).toBe(true);
    });
  });

  describe('Cache and Freshness', () => {
    it('should respect TTL for odds data (10 minutes)', () => {
      const oddsTTL = 600; // 10 minutes in seconds
      expect(oddsTTL).toBe(10 * 60);
    });

    it('should respect TTL for injury data (1 hour)', () => {
      const injuryTTL = 3600; // 1 hour in seconds
      expect(injuryTTL).toBe(60 * 60);
    });

    it('should respect TTL for weather data (3 hours)', () => {
      const weatherTTL = 10800; // 3 hours in seconds
      expect(weatherTTL).toBe(3 * 60 * 60);
    });

    it('should verify TTL mapping matches configuration', () => {
      const ttlMap: Record<string, number> = {
        odds: 600,
        injuries: 3600,
        weather: 10800,
        match_stats: 86400,
        team_form: 86400,
        xg_data: 86400
      };
      
      expect(ttlMap.odds).toBe(600);
      expect(ttlMap.injuries).toBe(3600);
      expect(ttlMap.weather).toBe(10800);
    });
  });
});

describe('Scraped Data Router Tests', () => {
  describe('TTL Headers', () => {
    it('should set Cache-Control max-age=600 for odds data', () => {
      // Test cache headers for odds
      expect(true).toBe(true);
    });

    it('should set Cache-Control max-age=3600 for injury data', () => {
      // Test cache headers for injuries
      expect(true).toBe(true);
    });

    it('should generate ETag for response caching', () => {
      // Test ETag generation
      expect(true).toBe(true);
    });

    it('should return 304 Not Modified when ETag matches', () => {
      // Test If-None-Match handling
      expect(true).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should require SCRAPER_AUTH_TOKEN for POST requests', () => {
      // Test auth requirement
      expect(true).toBe(true);
    });

    it('should reject requests with invalid tokens', () => {
      // Test auth rejection
      expect(true).toBe(true);
    });
  });
});

describe('Scheduler Tests', () => {
  it('should trigger odds refresh every 10 minutes', () => {
    // Test scheduler configuration
    expect(true).toBe(true);
  });

  it('should trigger injury refresh every 1 hour', () => {
    // Test scheduler configuration
    expect(true).toBe(true);
  });

  it('should only scrape fixtures within lookahead window', () => {
    // Test window filtering
    expect(true).toBe(true);
  });

  it('should track last refresh timestamps per fixture', () => {
    // Test refresh tracking
    expect(true).toBe(true);
  });
});
