import type { Prediction } from "@shared/schema";
import type { TelemetryMetrics } from "./telemetry-metrics";

/**
 * Test utilities for generating deterministic telemetry data
 */

export const createMockPrediction = (overrides: Partial<Prediction> = {}): Prediction => ({
  id: `pred-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  fixtureId: 1001,
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

export const createMockTelemetryMap = (fixtures: number[] = [1001, 1002, 1003]): Record<number, Prediction> => {
  const telemetryMap: Record<number, Prediction> = {};
  
  fixtures.forEach((fixtureId, index) => {
    telemetryMap[fixtureId] = createMockPrediction({
      fixtureId,
      latencyMs: 200 + (index * 50), // Varying latencies
      modelCalibrated: index % 2 === 0, // Alternating calibration
      modelTrained: index !== 2, // One fallback prediction
      createdAt: new Date(Date.now() - (index * 60000)), // Staggered timestamps
    });
  });
  
  return telemetryMap;
};

export const createMockTelemetryMetrics = (overrides: Partial<TelemetryMetrics> = {}): TelemetryMetrics => ({
  totalFixtures: 3,
  calibratedFixtures: 2,
  uncalibratedFixtures: 1,
  calibrationRate: 0.67,
  averageLatencyMs: 233,
  p95LatencyMs: 300,
  maxLatencyMs: 300,
  serviceLatencyAverageMs: 45,
  latestUpdatedAt: new Date(),
  ...overrides,
});

export const MOCK_TELEMETRY_SCENARIOS = {
  empty: {} as Record<number, Prediction>,
  single: createMockTelemetryMap([1001]),
  multiple: createMockTelemetryMap([1001, 1002, 1003]),
  allCalibrated: (() => {
    const base = createMockTelemetryMap([1001, 1002]);
    const result: Record<number, Prediction> = {};
    Object.entries(base).forEach(([key, prediction]: [string, Prediction]) => {
      const id = Number(key);
      result[id] = { ...prediction, modelCalibrated: true, modelTrained: true };
    });
    return result;
  })(),
  allFallback: (() => {
    const base = createMockTelemetryMap([1001, 1002]);
    const result: Record<number, Prediction> = {};
    Object.entries(base).forEach(([key, prediction]: [string, Prediction]) => {
      const id = Number(key);
      result[id] = { ...prediction, modelCalibrated: false, modelTrained: false };
    });
    return result;
  })(),
  highLatency: (() => {
    const base = createMockTelemetryMap([1001, 1002]);
    const result: Record<number, Prediction> = {};
    Object.entries(base).forEach(([key, prediction]: [string, Prediction], index: number) => {
      const id = Number(key);
      result[id] = { ...prediction, latencyMs: 1500 + index * 200 };
    });
    return result;
  })(),
};
