import { Router } from "express";
import { asyncHandler } from "../middleware";
import { storage } from "../storage";
import { z } from "zod";
import { auth } from "../config";

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
  
  // Import validation schema dynamically to avoid circular dependencies
  const { insertScrapedDataSchema } = await import("../../shared/schema.ts");
  
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
  
  const data = await storage.getScrapedData(
    source as string,
    dataType as string, 
    fixtureId ? parseInt(fixtureId as string) : undefined,
    teamId ? parseInt(teamId as string) : undefined
  );
  
  res.json(data);
}));
  
// Get latest scraped data for source and type
scrapedDataRouter.get("/latest/:source/:dataType", asyncHandler(async (req, res) => {
  const { source, dataType } = req.params;
  
  const data = await storage.getLatestScrapedData(source, dataType);
  
  if (!data) {
    return res.status(404).json({ error: "No data found" });
  }
  
  res.json(data);
}));