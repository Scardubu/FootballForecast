import type { Prediction } from "@shared/schema";

export interface TelemetryMetrics {
  totalFixtures: number;
  calibratedFixtures: number;
  uncalibratedFixtures: number;
  calibrationRate: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  maxLatencyMs: number | null;
  serviceLatencyAverageMs: number | null;
  latestUpdatedAt: Date | null;
}

const toDate = (value: Prediction["createdAt"]): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toLatency = (prediction: Prediction): number | null => {
  if (typeof prediction.latencyMs === "number") {
    return prediction.latencyMs;
  }
  if (typeof prediction.serviceLatencyMs === "number") {
    return prediction.serviceLatencyMs;
  }
  return null;
};

const percentile = (values: number[], percentileValue: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

export const computeTelemetryMetrics = (
  telemetryMap: Record<number, Prediction | undefined> | undefined
): TelemetryMetrics => {
  const predictions = telemetryMap ? Object.values(telemetryMap).filter(Boolean) as Prediction[] : [];

  if (predictions.length === 0) {
    return {
      totalFixtures: 0,
      calibratedFixtures: 0,
      uncalibratedFixtures: 0,
      calibrationRate: null,
      averageLatencyMs: null,
      p95LatencyMs: null,
      maxLatencyMs: null,
      serviceLatencyAverageMs: null,
      latestUpdatedAt: null,
    };
  }

  const calibratedFixtures = predictions.filter((prediction) => prediction.modelCalibrated === true).length;
  const uncalibratedFixtures = predictions.filter((prediction) => prediction.modelCalibrated === false).length;

  const latencies = predictions
    .map((prediction) => toLatency(prediction))
    .filter((latency): latency is number => typeof latency === "number" && Number.isFinite(latency));

  const serviceLatencies = predictions
    .map((prediction) => prediction.serviceLatencyMs)
    .filter((latency): latency is number => typeof latency === "number" && Number.isFinite(latency));

  const averageLatencyMs = latencies.length > 0
    ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
    : null;

  const serviceLatencyAverageMs = serviceLatencies.length > 0
    ? serviceLatencies.reduce((sum, latency) => sum + latency, 0) / serviceLatencies.length
    : null;

  const p95LatencyMs = percentile(latencies, 95);
  const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : null;

  const latestUpdatedAt = predictions.reduce<Date | null>((latest, prediction) => {
    const createdAt = toDate(prediction.createdAt);
    if (!createdAt) {
      return latest;
    }
    if (!latest || createdAt > latest) {
      return createdAt;
    }
    return latest;
  }, null);

  return {
    totalFixtures: predictions.length,
    calibratedFixtures,
    uncalibratedFixtures,
    calibrationRate: predictions.length > 0 ? calibratedFixtures / predictions.length : null,
    averageLatencyMs,
    p95LatencyMs,
    maxLatencyMs,
    serviceLatencyAverageMs,
    latestUpdatedAt,
  };
};

export const formatLatency = (latencyMs: number | null): string => {
  if (latencyMs === null || Number.isNaN(latencyMs)) {
    return "N/A";
  }
  if (latencyMs >= 1000) {
    const seconds = latencyMs / 1000;
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  }
  return `${Math.round(latencyMs)} ms`;
};

export const formatCalibrationRate = (rate: number | null): string => {
  if (rate === null || Number.isNaN(rate)) {
    return "N/A";
  }
  return `${Math.round(rate * 100)}%`;
};
