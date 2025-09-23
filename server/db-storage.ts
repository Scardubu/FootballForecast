import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage.ts";
import { 
  users, leagues, teams, fixtures, predictions, standings, teamStats, scrapedData,
  type User, type League, type Team, type Fixture, type Prediction, 
  type Standing, type TeamStats, type InsertUser, type ScrapedData, type InsertScrapedData
} from "../shared/schema.ts";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Football data methods
  async getLeagues(): Promise<League[]> {
    return await db.select().from(leagues).orderBy(leagues.name);
  }

  async getLeague(id: number): Promise<League | undefined> {
    const result = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    return result[0];
  }

  async updateLeague(league: League): Promise<League> {
    const existing = await this.getLeague(league.id);
    
    if (existing) {
      const updated = await db.update(leagues)
        .set(league)
        .where(eq(leagues.id, league.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(leagues).values(league).returning();
      return inserted[0];
    }
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async updateTeam(team: Team): Promise<Team> {
    const existing = await this.getTeam(team.id);
    
    if (existing) {
      const updated = await db.update(teams)
        .set(team)
        .where(eq(teams.id, team.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(teams).values(team).returning();
      return inserted[0];
    }
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    return await db.select().from(fixtures)
      .where(eq(fixtures.status, 'LIVE'))
      .orderBy(desc(fixtures.date));
  }

  async getFixtures(leagueId?: number): Promise<Fixture[]> {
    if (leagueId) {
      return await db.select().from(fixtures)
        .where(eq(fixtures.leagueId, leagueId))
        .orderBy(desc(fixtures.date))
        .limit(100);
    }
    
    return await db.select().from(fixtures)
      .orderBy(desc(fixtures.date))
      .limit(100);
  }

  async getFixture(id: number): Promise<Fixture | undefined> {
    const result = await db.select().from(fixtures).where(eq(fixtures.id, id)).limit(1);
    return result[0];
  }

  async updateFixture(fixture: Fixture): Promise<Fixture> {
    const existing = await this.getFixture(fixture.id);
    
    if (existing) {
      const updated = await db.update(fixtures)
        .set(fixture)
        .where(eq(fixtures.id, fixture.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(fixtures).values(fixture).returning();
      return inserted[0];
    }
  }

  async getPredictions(fixtureId?: number): Promise<Prediction[]> {
    if (fixtureId) {
      return await db.select().from(predictions)
        .where(eq(predictions.fixtureId, fixtureId))
        .orderBy(desc(predictions.createdAt));
    }
    
    return await db.select().from(predictions)
      .orderBy(desc(predictions.createdAt))
      .limit(100);
  }

  async updatePrediction(prediction: Prediction): Promise<Prediction> {
    try {
      // Check if prediction already exists
      const existing = await db.select().from(predictions)
        .where(eq(predictions.fixtureId, prediction.fixtureId!))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing prediction
        const updated = await db.update(predictions)
          .set(prediction)
          .where(eq(predictions.id, existing[0].id))
          .returning();
        return updated[0];
      } else {
        // Insert new prediction
        const inserted = await db.insert(predictions).values(prediction).returning();
        return inserted[0];
      }
    } catch (error) {
      console.error('Error updating prediction:', error);
      // Fallback: try just inserting
      const inserted = await db.insert(predictions).values(prediction).returning();
      return inserted[0];
    }
  }

  async getStandings(leagueId: number): Promise<Standing[]> {
    return await db.select().from(standings)
      .where(eq(standings.leagueId, leagueId))
      .orderBy(standings.position);
  }

  async updateStandings(standingsArray: Standing[]): Promise<Standing[]> {
    if (standingsArray.length === 0) return [];
    
    // Delete existing standings for the league
    const leagueId = standingsArray[0]?.leagueId;
    if (leagueId) {
      await db.delete(standings).where(eq(standings.leagueId, leagueId));
    }
    
    // Insert new standings
    const inserted = await db.insert(standings).values(standingsArray).returning();
    return inserted;
  }

  async getTeamStats(teamId: number, leagueId?: number): Promise<TeamStats | undefined> {
    const query = db.select().from(teamStats).where(eq(teamStats.teamId, teamId));
    const result = await query.limit(1);
    
    if (leagueId && result.length > 0) {
      // Filter by league ID after fetch if needed
      return result.find(stats => stats.leagueId === leagueId);
    }
    
    return result[0];
  }

  async updateTeamStats(stats: TeamStats): Promise<TeamStats> {
    const existing = await this.getTeamStats(stats.teamId, stats.leagueId || undefined);
    
    if (existing) {
      const updated = await db.update(teamStats)
        .set(stats)
        .where(eq(teamStats.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(teamStats).values(stats).returning();
      return inserted[0];
    }
  }

  // Scraped data methods - secure and validated
  async createScrapedData(data: InsertScrapedData): Promise<ScrapedData> {
    const inserted = await db.insert(scrapedData).values([data]).returning();
    return inserted[0];
  }

  async getScrapedData(source?: string, dataType?: string, fixtureId?: number, teamId?: number): Promise<ScrapedData[]> {
    const conditions = [];
    
    if (source) conditions.push(eq(scrapedData.source, source));
    if (dataType) conditions.push(eq(scrapedData.dataType, dataType));
    if (fixtureId) conditions.push(eq(scrapedData.fixtureId, fixtureId));
    if (teamId) conditions.push(eq(scrapedData.teamId, teamId));
    
    let query = db.select().from(scrapedData);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(scrapedData.scrapedAt)).limit(100);
  }

  async getLatestScrapedData(source: string, dataType: string): Promise<ScrapedData | undefined> {
    const result = await db.select().from(scrapedData)
      .where(and(
        eq(scrapedData.source, source),
        eq(scrapedData.dataType, dataType)
      ))
      .orderBy(desc(scrapedData.scrapedAt))
      .limit(1);
    
    return result[0];
  }
}