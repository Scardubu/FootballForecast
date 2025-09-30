export interface Team {
  id: number;
  name: string;
  code?: string | null;
  country?: string | null;
  founded?: number | null;
  national: boolean;
  logo?: string | null;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo?: string | null;
  flag?: string | null;
  season: number;
  type: string;
}

export interface Fixture {
  id: number;
  referee?: string | null;
  timezone?: string | null;
  date: Date;
  timestamp?: number | null;
  status: string;
  elapsed?: number | null;
  round?: string | null;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  venue?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  halftimeHomeScore?: number | null;
  halftimeAwayScore?: number | null;
}

export interface Prediction {
  id: string;
  fixtureId: number;
  homeWinProbability?: string | null;
  drawProbability?: string | null;
  awayWinProbability?: string | null;
  expectedGoalsHome?: string | null;
  expectedGoalsAway?: string | null;
  bothTeamsScore?: string | null;
  over25Goals?: string | null;
  confidence?: string | null;
  createdAt: Date;
  mlModel?: string | null;
  predictedOutcome?: string | null;
  latencyMs?: number | null;
  serviceLatencyMs?: number | null;
  modelCalibrated?: boolean | null;
  calibrationMetadata?: Record<string, unknown> | null;
  modelTrained?: boolean | null;
  aiInsight?: string | null;
}

export interface Standing {
  id: string;
  leagueId: number;
  teamId: number;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string | null;
}

export interface TeamStats {
  id: string;
  teamId: number;
  leagueId: number;
  attackRating?: number | null;
  defenseRating?: number | null;
  overallRating?: string | null;
  averageGoalsScored?: string | null;
  averageGoalsConceded?: string | null;
  cleanSheets?: number | null;
  form?: string | null;
  lastUpdated: Date;
}

export interface ScrapedData {
  id: string;
  source: string;
  dataType: "match_stats" | "team_ratings" | "match_insights" | "team_form" | "xg_data";
  fixtureId?: number | null;
  teamId?: number | null;
  data: Record<string, unknown>;
  confidence: number;
  scrapedAt: Date;
  createdAt: Date;
}
