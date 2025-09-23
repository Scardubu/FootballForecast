import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leagues = pgTable("leagues", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  logo: text("logo"),
  flag: text("flag"),
  season: integer("season").notNull(),
  type: text("type").notNull(),
});

export const teams = pgTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  country: text("country"),
  founded: integer("founded"),
  national: boolean("national").default(false),
  logo: text("logo"),
});

export const fixtures = pgTable("fixtures", {
  id: integer("id").primaryKey(),
  referee: text("referee"),
  timezone: text("timezone"),
  date: timestamp("date").notNull(),
  timestamp: integer("timestamp"),
  status: text("status").notNull(),
  elapsed: integer("elapsed"),
  round: text("round"),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  leagueId: integer("league_id").references(() => leagues.id),
  venue: text("venue"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  halftimeHomeScore: integer("halftime_home_score"),
  halftimeAwayScore: integer("halftime_away_score"),
}, (table) => ({
  // Indexes for performance on common queries
  fixturesStatusIdx: index("fixtures_status_idx").on(table.status),
  fixturesLeagueIdx: index("fixtures_league_idx").on(table.leagueId),
  fixturesDateIdx: index("fixtures_date_idx").on(table.date),
}));

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fixtureId: integer("fixture_id").references(() => fixtures.id),
  homeWinProbability: decimal("home_win_probability", { precision: 5, scale: 2 }),
  drawProbability: decimal("draw_probability", { precision: 5, scale: 2 }),
  awayWinProbability: decimal("away_win_probability", { precision: 5, scale: 2 }),
  expectedGoalsHome: decimal("expected_goals_home", { precision: 4, scale: 2 }),
  expectedGoalsAway: decimal("expected_goals_away", { precision: 4, scale: 2 }),
  bothTeamsScore: decimal("both_teams_score", { precision: 5, scale: 2 }),
  over25Goals: decimal("over_25_goals", { precision: 5, scale: 2 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  // Index for performance on fixture-based queries
  predictionsFixtureIdx: index("predictions_fixture_idx").on(table.fixtureId),
}));

export const standings = pgTable("standings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: integer("league_id").references(() => leagues.id),
  teamId: integer("team_id").references(() => teams.id),
  position: integer("position").notNull(),
  points: integer("points").notNull(),
  played: integer("played").notNull(),
  wins: integer("wins").notNull(),
  draws: integer("draws").notNull(),
  losses: integer("losses").notNull(),
  goalsFor: integer("goals_for").notNull(),
  goalsAgainst: integer("goals_against").notNull(),
  goalDifference: integer("goal_difference").notNull(),
  form: text("form"),
}, (table) => ({
  // Composite unique constraint to prevent duplicate standings entries
  standingsUnique: unique("standings_league_team_unique").on(table.leagueId, table.teamId),
}));

export const teamStats = pgTable("team_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: integer("team_id").references(() => teams.id),
  leagueId: integer("league_id").references(() => leagues.id),
  attackRating: integer("attack_rating"),
  defenseRating: integer("defense_rating"),
  overallRating: decimal("overall_rating", { precision: 5, scale: 2 }),
  averageGoalsScored: decimal("average_goals_scored", { precision: 4, scale: 2 }),
  averageGoalsConceded: decimal("average_goals_conceded", { precision: 4, scale: 2 }),
  cleanSheets: integer("clean_sheets"),
  form: text("form"),
  lastUpdated: timestamp("last_updated").default(sql`now()`),
}, (table) => ({
  // Composite unique constraint to prevent duplicate team stats
  teamStatsUnique: unique("team_stats_team_league_unique").on(table.teamId, table.leagueId),
}));

// Dedicated table for scraped data - isolated from core tables to avoid FK issues
export const scrapedData = pgTable("scraped_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // "fbref", "whoscored", etc.
  dataType: text("data_type").notNull(), // "match_stats", "team_ratings", "match_insights"
  fixtureId: integer("fixture_id"), // Optional reference - no FK constraint
  teamId: integer("team_id"), // Optional reference - no FK constraint  
  data: jsonb("data").notNull(), // Flexible JSON storage for scraped content
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  scrapedAt: timestamp("scraped_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  // Composite unique constraint for idempotent scraping - prevents duplicate scraped entries
  scrapedDataUnique: unique("scraped_data_unique").on(table.source, table.dataType, table.fixtureId, table.teamId),
  // Index for performance on common queries
  scrapedDataSourceTypeIdx: index("scraped_data_source_type_idx").on(table.source, table.dataType),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLeagueSchema = createInsertSchema(leagues);
export const insertTeamSchema = createInsertSchema(teams);
export const insertFixtureSchema = createInsertSchema(fixtures);
export const insertPredictionSchema = createInsertSchema(predictions);
export const insertStandingSchema = createInsertSchema(standings);
export const insertTeamStatsSchema = createInsertSchema(teamStats);

// Scraped data validation with strict type checking
export const insertScrapedDataSchema = createInsertSchema(scrapedData).omit({
  id: true,
  createdAt: true,
}).extend({
  source: z.enum(["fbref", "whoscored", "api-football", "default"]),
  dataType: z.enum(["match_stats", "team_ratings", "match_insights", "team_form", "xg_data"]),
  data: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: "Data object cannot be empty"
  }),
  confidence: z.number().min(0).max(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Standing = typeof standings.$inferSelect;
export type TeamStats = typeof teamStats.$inferSelect;
export type ScrapedData = typeof scrapedData.$inferSelect;
export type InsertScrapedData = z.infer<typeof insertScrapedDataSchema>;
