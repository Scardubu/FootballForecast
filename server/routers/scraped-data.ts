import { Router } from "express";
import { createHash } from "crypto";
import { asyncHandler } from "../middleware/index.js";
import { storage } from "../storage.js";
import { z } from "zod";
import { auth } from "../config/index.js";
import { insertScrapedDataSchema } from "../../shared/schema.js";

export const scrapedDataRouter = Router();

// Secure scraped data endpoint with validation
scrapedDataRouter.post("/", asyncHandler(async (req, res) => {
  // Improved authentication check - support Bearer tokens  
  const authHeader = req.headers.authorization || req.headers['x-internal-token'];
  const expectedToken = auth.scraperToken;
  
  if (!expectedToken) {
    return res.status(500).json({ error: "Server misconfiguration - auth token not set" });
  }
  
  let authToken: string | undefined;
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (authHeaderStr?.startsWith('Bearer ')) {
    authToken = authHeaderStr.substring(7);
  } else if (typeof authHeaderStr === 'string') {
    authToken = authHeaderStr;
  }
  
  if (!authToken || authToken !== expectedToken) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: "Unauthorized - Invalid auth token" });
  }
  
  // Validate request body with Zod
  const validation = insertScrapedDataSchema.safeParse({
    source: req.body.source,
    dataType: req.body.data_type || req.body.dataType,
    fixtureId: req.body.fixture_id || req.body.fixtureId,
    teamId: req.body.team_id || req.body.teamId,
    data: req.body.data,
    confidence: req.body.confidence,
    scrapedAt: new Date(req.body.scraped_at || req.body.scrapedAt)
  });
  
  if (!validation.success) {
    return res.status(400).json({ 
      error: "Validation failed",
      details: validation.error.issues 
    });
  }
  
  // Store in dedicated scraped data table (no FK constraints)
  const storedData = await storage.createScrapedData(validation.data);
  
  console.log(`✅ Securely stored ${validation.data.dataType} data from ${validation.data.source} (ID: ${storedData.id})`);
  
  res.status(201).json({ 
    success: true,
    id: storedData.id,
    message: `Stored ${validation.data.dataType} data from ${validation.data.source}`,
    confidence: validation.data.confidence
  });
}));

// Get scraped data with query filters
scrapedDataRouter.get("/", asyncHandler(async (req, res) => {
  const { source, dataType, fixtureId, teamId } = req.query;
  
  // TTL mapping
  const ttlMap: Record<string, number> = {
    odds: 600,
    injuries: 3600,
    weather: 10800,
    match_stats: 86400,
    team_form: 86400,
    xg_data: 86400
  };
  const typeKey = typeof dataType === 'string' ? dataType : '';
  const ttl = ttlMap[typeKey] ?? 1800;
  
  const data = await storage.getScrapedData(
    source as string,
    dataType as string, 
    fixtureId ? parseInt(fixtureId as string) : undefined,
    teamId ? parseInt(teamId as string) : undefined
  );

  // Early return for empty data
  if (!data || data.length === 0) {
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
    return res.json([]);
  }

  // ETag based on latest record id+scrapedAt
  const latest = data[0];
  const etag = latest ? createHash('sha1').update(`${latest.id}:${latest.scrapedAt}`).digest('hex') : undefined;
  if (etag && req.headers['if-none-match'] === etag) {
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
    return res.status(304).end();
  }

  res.setHeader('Cache-Control', `public, max-age=${ttl}`);
  if (etag) res.setHeader('ETag', etag);
  if (latest) {
    const freshness = Math.max(0, Math.floor((Date.now() - new Date(latest.scrapedAt).getTime()) / 1000));
    res.setHeader('X-Freshness-Seconds', String(freshness));
  }

  res.json(data);
}));
// Get latest scraped data for source and type
scrapedDataRouter.get("/latest/:source/:dataType", asyncHandler(async (req, res) => {
  const { source, dataType } = req.params;
  
  const data = await storage.getLatestScrapedData(source, dataType);
  
  if (!data) {
    return res.status(404).json({ error: "No data found" });
  }
  // TTL and ETag
  const ttlMap: Record<string, number> = { odds: 600, injuries: 3600, weather: 10800, match_stats: 86400, team_form: 86400, xg_data: 86400 };
  const ttl = ttlMap[dataType] ?? 1800;
  const etag = createHash('sha1').update(`${data.id}:${data.scrapedAt}`).digest('hex');
  if (req.headers['if-none-match'] === etag) {
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
    return res.status(304).end();
  }
  res.setHeader('Cache-Control', `public, max-age=${ttl}`);
  res.setHeader('ETag', etag);
  const freshness = Math.max(0, Math.floor((Date.now() - new Date(data.scrapedAt).getTime()) / 1000));
  res.setHeader('X-Freshness-Seconds', String(freshness));
  res.json(data);
}));

// Back-compat route used by Python scrapers for fallback retrieval
// GET /api/scraped-data/:dataType/:identifier
scrapedDataRouter.get("/:dataType/:identifier", asyncHandler(async (req, res) => {
  const { dataType, identifier } = req.params;
  
  // Try to parse identifier as fixture or team ID
  const numericId = parseInt(identifier);
  if (isNaN(numericId)) {
    return res.status(400).json({ error: "Invalid identifier - must be numeric" });
  }
  
  // Query by fixture first, then team
  let records = await storage.getScrapedData(undefined, dataType, numericId, undefined);
  if (!records || records.length === 0) {
    records = await storage.getScrapedData(undefined, dataType, undefined, numericId);
  }

  if (!records || records.length === 0) {
    return res.status(404).json({ error: "No data found" });
  }
  const record = records[0];
  const ttlMap: Record<string, number> = { odds: 600, injuries: 3600, weather: 10800, match_stats: 86400, team_form: 86400, xg_data: 86400 };
  const ttl = ttlMap[dataType] ?? 1800;
  const etag = createHash('sha1').update(`${record.id}:${record.scrapedAt}`).digest('hex');
  if (req.headers['if-none-match'] === etag) {
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
    return res.status(304).end();
  }
  res.setHeader('Cache-Control', `public, max-age=${ttl}`);
  res.setHeader('ETag', etag);
  const freshness = Math.max(0, Math.floor((Date.now() - new Date(record.scrapedAt).getTime()) / 1000));
  res.setHeader('X-Freshness-Seconds', String(freshness));
  res.json(record);
}));