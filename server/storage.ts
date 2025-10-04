import {
  type User,
  type InsertUser,
  type League,
  type Team,
  type Fixture,
  type Prediction,
  type Standing,
  type TeamStats,
  type ScrapedData,
  type InsertScrapedData,
  type IngestionEvent,
  type InsertIngestionEvent,
  type UpdateIngestionEvent
} from "../shared/schema.js";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Football data methods
  getLeagues(): Promise<League[]>;
  getLeague(id: number): Promise<League | undefined>;
  updateLeague(league: League): Promise<League>;
  updateLeagues(leagues: League[]): Promise<League[]>;
  
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  updateTeam(team: Team): Promise<Team>;
  updateTeams(teams: Team[]): Promise<Team[]>;
  
  getLiveFixtures(): Promise<Fixture[]>;
  getFixtures(leagueId?: number): Promise<Fixture[]>;
  getFixture(id: number): Promise<Fixture | undefined>;
  updateFixture(fixture: Fixture): Promise<Fixture>;
  updateFixtures(fixtures: Fixture[]): Promise<Fixture[]>;
  
  getPredictions(fixtureId?: number): Promise<Prediction[]>;
  updatePrediction(prediction: Prediction): Promise<Prediction>;
  
  getStandings(leagueId: number): Promise<Standing[]>;
  updateStandings(standings: Standing[]): Promise<Standing[]>;
  
  getTeamStats(teamId: number, leagueId?: number): Promise<TeamStats | undefined>;
  updateTeamStats(stats: TeamStats): Promise<TeamStats>;
  
  // Scraped data methods
  createScrapedData(data: InsertScrapedData): Promise<ScrapedData>;
  getScrapedData(source?: string, dataType?: string, fixtureId?: number, teamId?: number): Promise<ScrapedData[]>;
  getLatestScrapedData(source: string, dataType: string): Promise<ScrapedData | undefined>;

  // Ingestion events
  createIngestionEvent(event: InsertIngestionEvent): Promise<IngestionEvent>;
  updateIngestionEvent(id: string, update: UpdateIngestionEvent): Promise<IngestionEvent | undefined>;
  getIngestionEvent(id: string): Promise<IngestionEvent | undefined>;
  getRecentIngestionEvents(limit?: number): Promise<IngestionEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private leagues: Map<number, League>;
  private teams: Map<number, Team>;
  private fixtures: Map<number, Fixture>;
  private predictions: Map<string, Prediction>;
  private standings: Map<string, Standing>;
  private teamStats: Map<string, TeamStats>;
  private scrapedData: Map<string, ScrapedData>;
  private ingestionEvents: Map<string, IngestionEvent>;

  constructor() {
    this.users = new Map();
    this.leagues = new Map();
    this.teams = new Map();
    this.fixtures = new Map();
    this.predictions = new Map();
    this.standings = new Map();
    this.teamStats = new Map();
    this.scrapedData = new Map();
    this.ingestionEvents = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLeagues(): Promise<League[]> {
    return Array.from(this.leagues.values());
  }

  async getLeague(id: number): Promise<League | undefined> {
    return this.leagues.get(id);
  }

  async updateLeague(league: League): Promise<League> {
    this.leagues.set(league.id, league);
    return league;
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async updateTeam(team: Team): Promise<Team> {
    this.teams.set(team.id, team);
    return team;
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    return Array.from(this.fixtures.values()).filter(
      fixture => fixture.status === 'LIVE' || fixture.status === '1H' || fixture.status === '2H'
    );
  }

  async getFixtures(leagueId?: number): Promise<Fixture[]> {
    const fixtures = Array.from(this.fixtures.values());
    if (leagueId) {
      return fixtures.filter(fixture => fixture.leagueId === leagueId);
    }
    return fixtures;
  }

  async getFixture(id: number): Promise<Fixture | undefined> {
    return this.fixtures.get(id);
  }

  async updateFixture(fixture: Fixture): Promise<Fixture> {
    this.fixtures.set(fixture.id, fixture);
    return fixture;
  }

  async getPredictions(fixtureId?: number): Promise<Prediction[]> {
    const predictions = Array.from(this.predictions.values());
    if (fixtureId) {
      return predictions.filter(pred => pred.fixtureId === fixtureId);
    }
    return predictions;
  }

  async updatePrediction(prediction: Prediction): Promise<Prediction> {
    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  async getStandings(leagueId: number): Promise<Standing[]> {
    return Array.from(this.standings.values())
      .filter(standing => standing.leagueId === leagueId)
      .sort((a, b) => a.position - b.position);
  }

  async updateStandings(standings: Standing[]): Promise<Standing[]> {
    standings.forEach(standing => {
      this.standings.set(standing.id, standing);
    });
    return standings;
  }
  
  async updateLeagues(leagues: League[]): Promise<League[]> {
    leagues.forEach(league => {
      this.leagues.set(league.id, league);
    });
    return leagues;
  }
  
  async updateTeams(teams: Team[]): Promise<Team[]> {
    teams.forEach(team => {
      this.teams.set(team.id, team);
    });
    return teams;
  }
  
  async updateFixtures(fixtures: Fixture[]): Promise<Fixture[]> {
    fixtures.forEach(fixture => {
      this.fixtures.set(fixture.id, fixture);
    });
    return fixtures;
  }

  async getTeamStats(teamId: number, leagueId?: number): Promise<TeamStats | undefined> {
    return Array.from(this.teamStats.values()).find(
      stats => stats.teamId === teamId && (!leagueId || stats.leagueId === leagueId)
    );
  }

  async updateTeamStats(stats: TeamStats): Promise<TeamStats> {
    this.teamStats.set(stats.id, stats);
    return stats;
  }

  // Scraped data methods for memory storage
  async createScrapedData(data: InsertScrapedData): Promise<ScrapedData> {
    const id = randomUUID();
    const scrapedData: ScrapedData = { 
      ...data, 
      id, 
      createdAt: new Date(),
      fixtureId: data.fixtureId ?? null,
      teamId: data.teamId ?? null,
      confidence: String(data.confidence ?? '0') // Ensure string type for schema
    };
    this.scrapedData.set(id, scrapedData);
    return scrapedData;
  }

  async getScrapedData(source?: string, dataType?: string, fixtureId?: number, teamId?: number): Promise<ScrapedData[]> {
    return Array.from(this.scrapedData.values())
      .filter(data => {
        if (source && data.source !== source) return false;
        if (dataType && data.dataType !== dataType) return false;
        if (fixtureId && data.fixtureId !== fixtureId) return false;
        if (teamId && data.teamId !== teamId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime())
      .slice(0, 100);
  }

  async getLatestScrapedData(source: string, dataType: string): Promise<ScrapedData | undefined> {
    return Array.from(this.scrapedData.values())
      .filter(data => data.source === source && data.dataType === dataType)
      .sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime())[0];
  }

  async createIngestionEvent(event: InsertIngestionEvent): Promise<IngestionEvent> {
    const id = randomUUID();
    const startedAt = event.startedAt ?? new Date();
    const dedupeKey = event.dedupeKey ?? `${event.source}:${event.scope}:${startedAt.toISOString()}`;
    const ingestionEvent: IngestionEvent = {
      id,
      source: event.source,
      scope: event.scope,
      status: event.status ?? "running",
      startedAt,
      finishedAt: event.finishedAt ?? null,
      durationMs: event.durationMs ?? null,
      recordsWritten: event.recordsWritten ?? null,
      fallbackUsed: event.fallbackUsed ?? false,
      checksum: event.checksum ?? null,
      metadata: event.metadata ?? null,
      error: event.error ?? null,
      dedupeKey,
      retryCount: event.retryCount ?? 0,
      lastErrorAt: event.lastErrorAt ?? null,
      metrics: event.metrics ?? null,
      updatedAt: event.updatedAt ?? startedAt
    } as IngestionEvent;

    this.ingestionEvents.set(id, ingestionEvent);
    return ingestionEvent;
  }

  async updateIngestionEvent(id: string, update: UpdateIngestionEvent): Promise<IngestionEvent | undefined> {
    const existing = this.ingestionEvents.get(id);
    if (!existing) {
      return undefined;
    }

    const mergedMetadata = update.metadata
      ? {
          ...(existing.metadata as Record<string, unknown> | null || {}),
          ...update.metadata
        }
      : existing.metadata;

    const updated: IngestionEvent = {
      ...existing,
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.startedAt !== undefined ? { startedAt: update.startedAt } : {}),
      ...(update.finishedAt !== undefined ? { finishedAt: update.finishedAt } : {}),
      ...(update.durationMs !== undefined ? { durationMs: update.durationMs } : {}),
      ...(update.recordsWritten !== undefined ? { recordsWritten: update.recordsWritten } : {}),
      ...(update.fallbackUsed !== undefined ? { fallbackUsed: update.fallbackUsed } : {}),
      ...(update.checksum !== undefined ? { checksum: update.checksum } : {}),
      metadata: mergedMetadata,
      ...(update.error !== undefined ? { error: update.error } : {}),
      ...(update.retryCount !== undefined ? { retryCount: update.retryCount } : {}),
      ...(update.lastErrorAt !== undefined ? { lastErrorAt: update.lastErrorAt } : {}),
      ...(update.metrics !== undefined ? { metrics: update.metrics } : {}),
      updatedAt: update.updatedAt ?? new Date()
    } as IngestionEvent;

    this.ingestionEvents.set(id, updated);
    return updated;
  }

  async getIngestionEvent(id: string): Promise<IngestionEvent | undefined> {
    return this.ingestionEvents.get(id);
  }

  async getRecentIngestionEvents(limit: number = 20): Promise<IngestionEvent[]> {
    return Array.from(this.ingestionEvents.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }
}

import { DatabaseStorage } from "./db-storage.js";

// Use database storage when available, memory storage as fallback
const databaseUrl = process.env.DATABASE_URL?.trim();
const disableDatabase = (process.env.DISABLE_DATABASE_STORAGE || '').toLowerCase() === 'true';
const usingDatabase = !!databaseUrl && !disableDatabase;

let storage: IStorage = new MemStorage();

const storageReady = (async () => {
  if (usingDatabase) {
    try {
      storage = await DatabaseStorage.create();
      console.log('[OK] Using Database storage');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[WARN] Failed to initialize Database storage, falling back to Memory storage:', message);
      console.log('[OK] Using Memory storage (database initialization failed)');
    }
  } else {
    console.log('[OK] Using Memory storage (no DATABASE_URL or explicitly disabled)');
  }

  return storage;
})();

// Export storageReady promise for modules that need to wait
export { storageReady };

// Export live binding to storage instance
export { storage };
