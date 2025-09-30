import { Router } from "express";
import crypto from "crypto";
import { getIngestionSummary } from "../lib/ingestion-tracker.js";

const DEFAULT_LIMIT = 50;

function sanitizeLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(value), 200);
}

export const telemetryRouter = Router();

telemetryRouter.get("/ingestion", async (req, res, next) => {
  try {
    const limit = sanitizeLimit(req.query.limit);
    const summary = await getIngestionSummary(limit);

    // Lightweight caching: short TTL and ETag based on summary hash
    const etag = '"ingestion-' + crypto.createHash('sha1').update(JSON.stringify(summary)).digest('hex') + '"';
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('ETag', etag);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});
