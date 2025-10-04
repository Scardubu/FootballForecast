/**
 * Feature Extraction Service - Combines all feature engineering modules
 */

import { storage } from "../../storage.js";
import { formCalculator, type FormMetrics } from "./formCalculator.js";
import { xgCalculator, type XGMetrics } from "./xgCalculator.js";
import { logger } from "../../middleware/logger.js";
import type { Fixture, Team } from "../../../shared/schema.js";

export interface HeadToHeadMetrics {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  lastMeetingDate: string | null;
  lastMeetingScore: string | null;
  homeWinRate: number;
}

export interface WeatherMetrics {
  temperatureC: number | null;
  windSpeedMs: number | null;
  humidity: number | null;
  precipitationMm: number | null;
  condition: string | null;
  description: string | null;
  weatherXgModifier: number | null;
  forecastUnix: number | null;
}

export interface VenueMetrics {
  homeWinRate: number;
  averageHomeGoals: number;
  recentHomeForm: string;
  homeAdvantageScore: number;
}

export interface InjuryImpact {
  keyPlayersOut: number;
  impactScore: number; // 0-10 scale
  affectedPositions: string[];
}

export interface MarketMetrics {
  homeOpen: number | null;
  drawOpen: number | null;
  awayOpen: number | null;
  homeCurrent: number | null;
  drawCurrent: number | null;
  awayCurrent: number | null;
  homeDrift: number; // current - open
  drawDrift: number;
  awayDrift: number;
  driftVelocity: number; // average absolute drift
  sentiment: 'home' | 'away' | 'neutral';
}

export interface MatchFeatures {
  fixtureId: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  form: {
    home: FormMetrics;
    away: FormMetrics;
  };
  xG: XGMetrics;
  headToHead: HeadToHeadMetrics;
  venue: VenueMetrics;
  injuries: {
    home: InjuryImpact;
    away: InjuryImpact;
  };
  market?: MarketMetrics;
  weather?: WeatherMetrics;
  dataQuality: {
    completeness: number;
    recency: string;
    sources: string[];
  };
}

export class FeatureExtractor {
  /**
   * Extract all features for a match prediction
   */
  async extractMatchFeatures(fixtureId: number): Promise<MatchFeatures> {
    const startTime = Date.now();
    logger.info({ fixtureId }, 'Extracting features for match');

    try {
      // Get fixture details
      const fixture = await storage.getFixture(fixtureId);
      if (!fixture || !fixture.homeTeamId || !fixture.awayTeamId) {
        throw new Error(`Fixture ${fixtureId} not found or missing team information`);
      }
      const [homeTeamRaw, awayTeamRaw] = await Promise.all([
        storage.getTeam(fixture.homeTeamId),
        storage.getTeam(fixture.awayTeamId)
      ]);

      // Ensure team objects conform to Team type (convert undefined to null)
      const homeTeam = homeTeamRaw ? {
        ...homeTeamRaw,
        code: homeTeamRaw.code ?? null,
        country: homeTeamRaw.country ?? null,
        founded: homeTeamRaw.founded ?? null,
        national: homeTeamRaw.national ?? null,
        logo: homeTeamRaw.logo ?? null
      } : null;

      const awayTeam = awayTeamRaw ? {
        ...awayTeamRaw,
        code: awayTeamRaw.code ?? null,
        country: awayTeamRaw.country ?? null,
        founded: awayTeamRaw.founded ?? null,
        national: awayTeamRaw.national ?? null,
        logo: awayTeamRaw.logo ?? null
      } : null;

      // Extract features in parallel (core signals)
      const [formData, xgData, h2hData, venueData] = await Promise.all([
        this.extractFormFeatures(fixture.homeTeamId, fixture.awayTeamId, fixture.leagueId),
        this.extractXGFeatures(fixture.homeTeamId, fixture.awayTeamId, fixture.leagueId),
        this.extractHeadToHeadFeatures(fixture.homeTeamId, fixture.awayTeamId),
        this.extractVenueFeatures(fixture.homeTeamId, fixture.leagueId)
      ]);

      // Scraped injuries (PhysioRoom/Transfermarkt) with graceful fallback
      const [homeInjScraped, awayInjScraped] = await Promise.all([
        this.fetchTeamInjuriesScraped(fixture.homeTeamId),
        this.fetchTeamInjuriesScraped(fixture.awayTeamId)
      ]);

      const injuryData = {
        home: homeInjScraped ?? this.getDefaultInjuryImpact(),
        away: awayInjScraped ?? this.getDefaultInjuryImpact()
      };

      const extraSources: string[] = [];
      if (homeInjScraped || awayInjScraped) extraSources.push('scraper:injuries');

      // Scraped odds / market sentiment (OddsPortal) – optional
      const market = await this.fetchFixtureOddsScraped(fixtureId);
      if (market) extraSources.push('scraper:odds');

      // Weather data (OpenWeather) when coordinates available
      const weather = await this.fetchFixtureWeather(fixtureId);
      if (weather) extraSources.push('scraper:weather');

      const features: MatchFeatures = {
        fixtureId,
        homeTeam,
        awayTeam,
        form: formData,
        xG: xgData,
        headToHead: h2hData,
        venue: venueData,
        injuries: injuryData,
        market: market ?? undefined,
        weather: weather ?? undefined,
        dataQuality: this.assessDataQuality(formData, xgData, h2hData, extraSources)
      };

      const duration = Date.now() - startTime;
      logger.info({ fixtureId, duration }, 'Feature extraction complete');

      return features;
    } catch (error) {
      logger.error({ fixtureId, error }, 'Feature extraction failed');
      throw error;
    }
  }

  /**
   * Extract form features for both teams
   */
  private async extractFormFeatures(
    homeTeamId: number,
    awayTeamId: number,
    leagueId: number | null
  ): Promise<{ home: FormMetrics; away: FormMetrics }> {
    try {
      // Get recent matches for both teams
      const [homeMatches, awayMatches] = await Promise.all([
        this.getRecentMatches(homeTeamId, leagueId),
        this.getRecentMatches(awayTeamId, leagueId)
      ]);

      return {
        home: formCalculator.calculateTeamForm(homeMatches, homeTeamId),
        away: formCalculator.calculateTeamForm(awayMatches, awayTeamId)
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to extract form features, using defaults');
      return {
        home: formCalculator.calculateTeamForm([], homeTeamId),
        away: formCalculator.calculateTeamForm([], awayTeamId)
      };
    }
  }

  /**
   * Extract xG features
   */
  private async extractXGFeatures(
    homeTeamId: number,
    awayTeamId: number,
    leagueId: number | null
  ): Promise<XGMetrics> {
    try {
      const [homeMatches, awayMatches] = await Promise.all([
        this.getRecentMatches(homeTeamId, leagueId),
        this.getRecentMatches(awayTeamId, leagueId)
      ]);

      // Calculate from recent form
      const homeStats = this.calculateStatsFromMatches(homeMatches, homeTeamId);
      const awayStats = this.calculateStatsFromMatches(awayMatches, awayTeamId);

      return xgCalculator.estimateExpectedGoals(homeStats, awayStats, true);
    } catch (error) {
      logger.warn({ error }, 'Failed to extract xG features, using defaults');
      return {
        home: 1.5,
        away: 1.2,
        differential: 0.3,
        totalGoals: 2.7,
        homeCleanSheetProb: 25,
        awayCleanSheetProb: 30
      };
    }
  }

  /**
   * Extract head-to-head history
   */
  private async extractHeadToHeadFeatures(
    homeTeamId: number,
    awayTeamId: number
  ): Promise<HeadToHeadMetrics> {
    try {
      // Get all fixtures between these teams
      const allFixtures = await storage.getFixtures();
      const h2hMatches = allFixtures.filter(f => 
        (f.homeTeamId === homeTeamId && f.awayTeamId === awayTeamId) ||
        (f.homeTeamId === awayTeamId && f.awayTeamId === homeTeamId)
      ).filter(f => f.status === 'FT' && f.homeScore !== null && f.awayScore !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Last 10 meetings

      if (h2hMatches.length === 0) {
        return this.getDefaultH2H();
      }

      let homeWins = 0;
      let awayWins = 0;
      let draws = 0;

      h2hMatches.forEach(match => {
        const isHomeTeamHome = match.homeTeamId === homeTeamId;
        const homeGoals = match.homeScore ?? 0;
        const awayGoals = match.awayScore ?? 0;

        if (homeGoals > awayGoals) {
          isHomeTeamHome ? homeWins++ : awayWins++;
        } else if (awayGoals > homeGoals) {
          isHomeTeamHome ? awayWins++ : homeWins++;
        } else {
          draws++;
        }
      });

      const lastMatch = h2hMatches[0];
      const homeWinRate = h2hMatches.length > 0 ? (homeWins / h2hMatches.length) * 100 : 33;

      return {
        totalMatches: h2hMatches.length,
        homeWins,
        draws,
        awayWins,
        lastMeetingDate: lastMatch ? new Date(lastMatch.date).toLocaleDateString() : null,
        lastMeetingScore: lastMatch ? `${lastMatch.homeScore}-${lastMatch.awayScore}` : null,
        homeWinRate
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to extract H2H features, using defaults');
      return this.getDefaultH2H();
    }
  }

  /**
   * Extract venue advantage features
   */
  private async extractVenueFeatures(
    homeTeamId: number,
    leagueId: number | null
  ): Promise<VenueMetrics> {
    try {
      const allFixtures = await storage.getFixtures();
      const homeMatches = allFixtures
        .filter(f => 
          f.homeTeamId === homeTeamId &&
          f.status === 'FT' &&
          f.homeScore !== null &&
          (leagueId ? f.leagueId === leagueId : true)
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      if (homeMatches.length === 0) {
        return this.getDefaultVenue();
      }

      const wins = homeMatches.filter(m => (m.homeScore ?? 0) > (m.awayScore ?? 0)).length;
      const totalGoals = homeMatches.reduce((sum, m) => sum + (m.homeScore ?? 0), 0);
      const formString = homeMatches.slice(0, 5).map(m => {
        const homeGoals = m.homeScore ?? 0;
        const awayGoals = m.awayScore ?? 0;
        if (homeGoals > awayGoals) return 'W';
        if (homeGoals === awayGoals) return 'D';
        return 'L';
      }).join('');

      const homeWinRate = (wins / homeMatches.length) * 100;
      const averageHomeGoals = totalGoals / homeMatches.length;

      return {
        homeWinRate,
        averageHomeGoals,
        recentHomeForm: formString,
        homeAdvantageScore: this.calculateHomeAdvantageScore(homeWinRate, averageHomeGoals)
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to extract venue features, using defaults');
      return this.getDefaultVenue();
    }
  }

  /**
   * Get recent matches for a team
   */
  private async getRecentMatches(teamId: number, leagueId: number | null): Promise<Fixture[]> {
    const allFixtures = await storage.getFixtures();
    return allFixtures
      .filter(f => 
        (f.homeTeamId === teamId || f.awayTeamId === teamId) &&
        f.status === 'FT' &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        (leagueId ? f.leagueId === leagueId : true)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }

  /**
   * Calculate stats from match history
   */
  private calculateStatsFromMatches(matches: Fixture[], teamId: number) {
    if (matches.length === 0) {
      return { goalsPerGame: 1.5, goalsConcededPerGame: 1.5 };
    }

    let goalsScored = 0;
    let goalsConceded = 0;

    matches.forEach(match => {
      const isHome = match.homeTeamId === teamId;
      goalsScored += isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      goalsConceded += isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
    });

    return {
      goalsPerGame: goalsScored / matches.length,
      goalsConcededPerGame: goalsConceded / matches.length
    };
  }

  /**
   * Calculate home advantage score (0-10)
   */
  private calculateHomeAdvantageScore(winRate: number, avgGoals: number): number {
    const winComponent = (winRate / 100) * 5; // 0-5 points
    const goalComponent = Math.min(avgGoals / 3, 1) * 5; // 0-5 points
    return Number((winComponent + goalComponent).toFixed(1));
  }

  /**
   * Assess data quality and completeness
   */
  private assessDataQuality(
    form: { home: FormMetrics; away: FormMetrics },
    xG: XGMetrics,
    h2h: HeadToHeadMetrics,
    extraSources: string[] = []
  ): { completeness: number; recency: string; sources: string[] } {
    let completeness = 100;
    const sources = ['database', ...extraSources];

    // Reduce completeness if data is limited
    if (form.home.formString.length < 5) completeness -= 10;
    if (form.away.formString.length < 5) completeness -= 10;
    if (h2h.totalMatches === 0) completeness -= 15;
    if (h2h.totalMatches < 3) completeness -= 5;

    return {
      completeness: Math.max(completeness, 60),
      recency: 'Updated recently',
      sources
    };
  }

  /**
   * Fetch latest scraped injuries for a team and convert to InjuryImpact
   */
  private async fetchTeamInjuriesScraped(teamId: number): Promise<InjuryImpact | null> {
    try {
      const scraped = await storage.getScrapedData(undefined, 'injuries', undefined, teamId);
      if (!scraped || scraped.length === 0) return null;
      const latest = scraped[0] as unknown as { data?: any };
      const data = (latest && (latest as any).data) || {};
      const count: number = typeof data.count === 'number' ? data.count : Array.isArray(data.players) ? data.players.length : 0;
      const severitySum: number = typeof data.severity_sum === 'number' ? data.severity_sum : 0;

      // Map to 0-10 scale (assume max 5 players significant with severity up to 4)
      const maxScore = 5 * 4;
      const score = maxScore > 0 ? Math.min(10, Math.round((severitySum / maxScore) * 10)) : 0;
      const impactedPositions: string[] = Array.isArray(data.players)
        ? (data.players.map((p: any) => p.position).filter((p: any) => !!p) as string[]).slice(0, 5)
        : [];

      return {
        keyPlayersOut: count,
        impactScore: score,
        affectedPositions: impactedPositions,
      };
    } catch (error) {
      logger.warn({ teamId, error }, 'Failed to fetch scraped injuries');
      return null;
    }
  }

  /**
   * Fetch latest scraped weather for a fixture and compute weather metrics
   */
  private async fetchFixtureWeather(fixtureId: number): Promise<WeatherMetrics | null> {
    try {
      const scraped = await storage.getScrapedData(undefined, 'weather', fixtureId, undefined);
      if (!scraped || scraped.length === 0) return null;
      const latest = scraped[0] as unknown as { data?: any };
      const data = (latest && (latest as any).data) || {};

      return {
        temperatureC: typeof data.temperature_c === 'number' ? data.temperature_c : null,
        windSpeedMs: typeof data.wind_speed_ms === 'number' ? data.wind_speed_ms : null,
        humidity: typeof data.humidity === 'number' ? data.humidity : null,
        precipitationMm: typeof data.precipitation_mm === 'number' ? data.precipitation_mm : null,
        condition: typeof data.condition === 'string' ? data.condition : null,
        description: typeof data.description === 'string' ? data.description : null,
        weatherXgModifier: typeof data.weather_xg_modifier === 'number' ? data.weather_xg_modifier : null,
        forecastUnix: typeof data.forecast_time === 'number' ? data.forecast_time : null,
      };
    } catch (error) {
      logger.warn({ fixtureId, error }, 'Failed to fetch weather data');
      return null;
    }
  }

  /**
   * Fetch latest scraped odds for a fixture and compute market metrics
   */
  private async fetchFixtureOddsScraped(fixtureId: number): Promise<MarketMetrics | null> {
    try {
      const records = await storage.getScrapedData(undefined, 'odds', fixtureId, undefined);
      if (!records || records.length === 0) return null;
      const latest = records[0] as unknown as { data?: any };
      const d = (latest && (latest as any).data) || {};

      const homeOpen = typeof d.home_open === 'number' ? d.home_open : null;
      const drawOpen = typeof d.draw_open === 'number' ? d.draw_open : null;
      const awayOpen = typeof d.away_open === 'number' ? d.away_open : null;
      const homeCurrent = typeof d.home_current === 'number' ? d.home_current : null;
      const drawCurrent = typeof d.draw_current === 'number' ? d.draw_current : null;
      const awayCurrent = typeof d.away_current === 'number' ? d.away_current : null;
      const homeDrift = typeof d.home_drift === 'number' ? d.home_drift : (homeCurrent !== null && homeOpen !== null ? homeCurrent - homeOpen : 0);
      const drawDrift = typeof d.draw_drift === 'number' ? d.draw_drift : (drawCurrent !== null && drawOpen !== null ? drawCurrent - drawOpen : 0);
      const awayDrift = typeof d.away_drift === 'number' ? d.away_drift : (awayCurrent !== null && awayOpen !== null ? awayCurrent - awayOpen : 0);
      const driftVelocity = typeof d.drift_velocity === 'number'
        ? d.drift_velocity
        : Number((Math.abs(homeDrift) + Math.abs(drawDrift) + Math.abs(awayDrift)) / 3).valueOf();

      // Sentiment: shortening (negative drift) indicates money coming in
      let sentiment: 'home' | 'away' | 'neutral' = 'neutral';
      const homeShorten = homeDrift < -0.05 ? Math.abs(homeDrift) : 0;
      const awayShorten = awayDrift < -0.05 ? Math.abs(awayDrift) : 0;
      if (homeShorten > awayShorten && homeShorten > 0.05) sentiment = 'home';
      else if (awayShorten > homeShorten && awayShorten > 0.05) sentiment = 'away';

      return {
        homeOpen, drawOpen, awayOpen,
        homeCurrent, drawCurrent, awayCurrent,
        homeDrift, drawDrift, awayDrift,
        driftVelocity: Number(driftVelocity || 0),
        sentiment
      };
    } catch (error) {
      logger.warn({ fixtureId, error }, 'Failed to fetch scraped odds');
      return null;
    }
  }

  // Default values
  private getDefaultH2H(): HeadToHeadMetrics {
    return {
      totalMatches: 0,
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      lastMeetingDate: null,
      lastMeetingScore: null,
      homeWinRate: 33
    };
  }

  private getDefaultVenue(): VenueMetrics {
    return {
      homeWinRate: 50,
      averageHomeGoals: 1.5,
      recentHomeForm: 'WDWDL',
      homeAdvantageScore: 5.0
    };
  }

  private getDefaultInjuryImpact(): InjuryImpact {
    return {
      keyPlayersOut: 0,
      impactScore: 0,
      affectedPositions: []
    };
  }
}

export const featureExtractor = new FeatureExtractor();
