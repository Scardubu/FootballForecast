import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import type { IStorage } from "./storage";
import {
  users, leagues, teams, fixtures, predictions, standings, teamStats, scrapedData,
  type User, type League, type Team, type Fixture, type Prediction, 
  type Standing, type TeamStats, type InsertUser, type ScrapedData, type InsertScrapedData
} from "../shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

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
    const inserted = await db.insert(leagues)
      .values(league)
      .onConflictDoUpdate({
        target: leagues.id,
        set: {
          name: league.name,
          country: league.country,
          logo: league.logo,
          flag: league.flag,
          season: league.season,
          type: league.type
        }
      })
      .returning();
    return inserted[0];
  }
  
  async updateLeagues(leagueArray: League[]): Promise<League[]> {
    if (leagueArray.length === 0) return [];
    
    const inserted = await db.insert(leagues)
      .values(leagueArray)
      .onConflictDoUpdate({
        target: leagues.id,
        set: {
          name: sql`excluded.name`,
          country: sql`excluded.country`,
          logo: sql`excluded.logo`,
          flag: sql`excluded.flag`, 
          season: sql`excluded.season`,
          type: sql`excluded.type`
        }
      })
      .returning();
    return inserted;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async updateTeam(team: Team): Promise<Team> {
    const inserted = await db.insert(teams)
      .values(team)
      .onConflictDoUpdate({
        target: teams.id,
        set: {
          name: team.name,
          code: team.code,
          country: team.country,
          founded: team.founded,
          national: team.national,
          logo: team.logo
        }
      })
      .returning();
    return inserted[0];
  }
  
  async updateTeams(teamArray: Team[]): Promise<Team[]> {
    if (teamArray.length === 0) return [];
    
    const inserted = await db.insert(teams)
      .values(teamArray)
      .onConflictDoUpdate({
        target: teams.id,
        set: {
          name: sql`excluded.name`,
          code: sql`excluded.code`,
          country: sql`excluded.country`,
          founded: sql`excluded.founded`,
          national: sql`excluded.national`,
          logo: sql`excluded.logo`
        }
      })
      .returning();
    return inserted;
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    return await db.select().from(fixtures)
      .where(inArray(fixtures.status, ['LIVE', '1H', '2H']))
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
    const inserted = await db.insert(fixtures)
      .values(fixture)
      .onConflictDoUpdate({
        target: fixtures.id,
        set: {
          referee: fixture.referee,
          timezone: fixture.timezone,
          date: fixture.date,
          timestamp: fixture.timestamp,
          status: fixture.status,
          elapsed: fixture.elapsed,
          round: fixture.round,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          leagueId: fixture.leagueId,
          venue: fixture.venue,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          halftimeHomeScore: fixture.halftimeHomeScore,
          halftimeAwayScore: fixture.halftimeAwayScore
        }
      })
      .returning();
    return inserted[0];
  }
  
  async updateFixtures(fixtureArray: Fixture[]): Promise<Fixture[]> {
    if (fixtureArray.length === 0) return [];
    
    const inserted = await db.insert(fixtures)
      .values(fixtureArray)
      .onConflictDoUpdate({
        target: fixtures.id,
        set: {
          referee: sql`excluded.referee`,
          timezone: sql`excluded.timezone`,
          date: sql`excluded.date`,
          timestamp: sql`excluded.timestamp`,
          status: sql`excluded.status`,
          elapsed: sql`excluded.elapsed`,
          round: sql`excluded.round`,
          homeTeamId: sql`excluded.home_team_id`,
          awayTeamId: sql`excluded.away_team_id`, 
          leagueId: sql`excluded.league_id`,
          venue: sql`excluded.venue`,
          homeScore: sql`excluded.home_score`,
          awayScore: sql`excluded.away_score`,
          halftimeHomeScore: sql`excluded.halftime_home_score`,
          halftimeAwayScore: sql`excluded.halftime_away_score`
        }
      })
      .returning();
    return inserted;
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
    // Since fixtureId is not guaranteed to be unique, we use the prediction ID as the conflict target.
    // A robust implementation would have a unique constraint on fixtureId.
    const inserted = await db.insert(predictions)
      .values(prediction)
      .onConflictDoUpdate({
        target: predictions.id,
        set: {
          homeWinProbability: prediction.homeWinProbability,
          drawProbability: prediction.drawProbability,
          awayWinProbability: prediction.awayWinProbability,
          expectedGoalsHome: prediction.expectedGoalsHome,
          expectedGoalsAway: prediction.expectedGoalsAway,
          bothTeamsScore: prediction.bothTeamsScore,
          over25Goals: prediction.over25Goals,
          confidence: prediction.confidence,
          createdAt: new Date(), // Update timestamp on modification
        }
      })
      .returning();
      
    return inserted[0];
  }

  async getStandings(leagueId: number): Promise<Standing[]> {
    return await db.select().from(standings)
      .where(eq(standings.leagueId, leagueId))
      .orderBy(standings.position);
  }

  async updateStandings(standingsArray: Standing[]): Promise<Standing[]> {
    if (standingsArray.length === 0) return [];

    const inserted = await db.insert(standings)
      .values(standingsArray)
      .onConflictDoUpdate({
        target: [standings.leagueId, standings.teamId],
        set: {
          position: sql`excluded.position`,
          points: sql`excluded.points`,
          played: sql`excluded.played`,
          wins: sql`excluded.wins`,
          draws: sql`excluded.draws`,
          losses: sql`excluded.losses`,
          goalsFor: sql`excluded.goals_for`,
          goalsAgainst: sql`excluded.goals_against`,
          goalDifference: sql`excluded.goal_difference`,
          form: sql`excluded.form`,
        }
      })
      .returning();
      
    return inserted;
  }

  async getTeamStats(teamId: number, leagueId?: number): Promise<TeamStats | undefined> {
    const conditions = [eq(teamStats.teamId, teamId)];
    
    if (leagueId) {
      conditions.push(eq(teamStats.leagueId, leagueId));
    }
    
    const result = await db.select().from(teamStats).where(and(...conditions)).limit(1);
    return result[0];
  }

  async updateTeamStats(stats: TeamStats): Promise<TeamStats> {
    const inserted = await db.insert(teamStats)
      .values(stats)
      .onConflictDoUpdate({
        target: [teamStats.teamId, teamStats.leagueId],
        set: {
          attackRating: stats.attackRating,
          defenseRating: stats.defenseRating,
          overallRating: stats.overallRating,
          averageGoalsScored: stats.averageGoalsScored,
          averageGoalsConceded: stats.averageGoalsConceded,
          cleanSheets: stats.cleanSheets,
          form: stats.form,
          lastUpdated: new Date(),
        }
      })
      .returning();
      
    return inserted[0];
  }
  // Scraped data methods - secure and validated
  async createScrapedData(data: InsertScrapedData): Promise<ScrapedData> {
    // Ensure confidence is a string as required by the schema
    const dataWithStringConfidence = {
      ...data,
      confidence: String(data.confidence ?? "0")
    };
    const inserted = await db.insert(scrapedData).values([dataWithStringConfidence]).returning();
    return inserted[0];
  }
  async getScrapedData(source?: string, dataType?: string, fixtureId?: number, teamId?: number): Promise<ScrapedData[]> {
    const conditions = [];
    
    if (source) conditions.push(eq(scrapedData.source, source));
    if (dataType) conditions.push(eq(scrapedData.dataType, dataType));
    if (fixtureId) conditions.push(eq(scrapedData.fixtureId, fixtureId));
    if (teamId) conditions.push(eq(scrapedData.teamId, teamId));
    
    if (conditions.length > 0) {
      return await db.select().from(scrapedData).where(and(...conditions))
        .orderBy(desc(scrapedData.scrapedAt));
    }
    
    return await db.select().from(scrapedData)
      .orderBy(desc(scrapedData.scrapedAt))
      .limit(100);
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