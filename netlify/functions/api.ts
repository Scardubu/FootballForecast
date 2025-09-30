import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log all incoming requests for diagnostics
app.use((req, res, next) => {
  console.log(`[Netlify API] ${req.method} ${req.originalUrl}`);
  next();
});

// Set up routes (without WebSocket and server creation)
async function setupApp() {
  // Trust proxy for Netlify
  app.set('trust proxy', 1);

  // Always available common middleware
  app.use(cookieParser());

  try {
    // Import route setup but adapt for serverless. This may throw if config/env is missing.
    const { apiRouter } = await import('../../server/routers/api');
    const { httpLogger, generalRateLimit, errorHandler, notFoundHandler } = await import('../../server/middleware');

    // Apply middleware
    app.use(httpLogger);
    app.use(generalRateLimit);

    // Mount the consolidated API router at the Netlify Functions base path.
    // In production, requests are forwarded to /.netlify/functions/api/:splat
    app.use('/', apiRouter);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
  } catch (e) {
    // Degraded mode: configuration likely missing in serverless environment
    console.error('[Netlify API] Running in degraded mode:', (e as Error).message);

    // Minimal health endpoint
    app.get(['/', '/health', '/api/health'], (_req, res) => {
      res.json({ status: 'degraded', message: 'Serverless API in degraded mode', timestamp: new Date().toISOString() });
    });

    // Auth status should not 500; return unauthenticated instead
    app.get(['/auth/status', '/api/auth/status'], (_req, res) => {
      res.json({ authenticated: false, user: null });
    });

    // Dev login is not available in production/serverless degraded mode
    app.post(['/auth/dev-login', '/api/auth/dev-login'], (_req, res) => {
      res.status(404).json({ error: 'Endpoint not available', message: 'Dev login only available in development mode' });
    });

    // Provide realistic sample data for common read-only endpoints to avoid UI crashes
    app.get(['/leagues', '/api/leagues'], (_req, res) => {
      res.json([
        { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", flag: "https://media.api-sports.io/flags/gb.svg", season: 2023, type: "League" },
        { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png", flag: "https://media.api-sports.io/flags/es.svg", season: 2023, type: "League" },
        { id: 78, name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png", flag: "https://media.api-sports.io/flags/de.svg", season: 2023, type: "League" }
      ]);
    });

    app.get(['/teams', '/api/teams'], (_req, res) => {
      res.json([
        { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", country: "England", founded: 1878, venue: "Old Trafford" },
        { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", country: "England", founded: 1880, venue: "Etihad Stadium" },
        { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", country: "England", founded: 1886, venue: "Emirates Stadium" },
        { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", country: "England", founded: 1892, venue: "Anfield" },
        { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", country: "England", founded: 1905, venue: "Stamford Bridge" }
      ]);
    });

    app.get(['/standings/:league', '/api/standings/:league'], (req, res) => {
      const leagueId = req.params.league;
      res.json([
        { id: 1, teamId: 50, position: 1, played: 10, won: 8, drawn: 1, lost: 1, points: 25, goalsFor: 24, goalsAgainst: 8 },
        { id: 2, teamId: 42, position: 2, played: 10, won: 7, drawn: 2, lost: 1, points: 23, goalsFor: 22, goalsAgainst: 10 },
        { id: 3, teamId: 40, position: 3, played: 10, won: 6, drawn: 3, lost: 1, points: 21, goalsFor: 20, goalsAgainst: 12 },
        { id: 4, teamId: 33, position: 4, played: 10, won: 6, drawn: 2, lost: 2, points: 20, goalsFor: 18, goalsAgainst: 14 },
        { id: 5, teamId: 49, position: 5, played: 10, won: 5, drawn: 3, lost: 2, points: 18, goalsFor: 16, goalsAgainst: 13 }
      ]);
    });

    app.get(['/fixtures/live', '/api/fixtures/live'], (_req, res) => {
      res.json([
        {
          id: 1001,
          homeTeamId: 33,
          awayTeamId: 50,
          homeScore: 1,
          awayScore: 2,
          status: "LIVE",
          elapsed: 67,
          venue: "Old Trafford",
          round: "Matchday 11",
          date: new Date().toISOString()
        },
        {
          id: 1002,
          homeTeamId: 42,
          awayTeamId: 49,
          homeScore: 2,
          awayScore: 1,
          status: "HT",
          elapsed: 45,
          venue: "Emirates Stadium",
          round: "Matchday 11",
          date: new Date().toISOString()
        }
      ]);
    });

    app.get(['/stats', '/api/stats'], (_req, res) => {
      res.json([
        { id: 1, teamId: 50, averageGoalsScored: "2.4", averageGoalsConceded: "0.8", overallRating: "92", attackRating: 95, defenseRating: 88, cleanSheets: 7 },
        { id: 2, teamId: 42, averageGoalsScored: "2.2", averageGoalsConceded: "1.0", overallRating: "89", attackRating: 91, defenseRating: 86, cleanSheets: 6 },
        { id: 3, teamId: 40, averageGoalsScored: "2.0", averageGoalsConceded: "1.2", overallRating: "87", attackRating: 88, defenseRating: 85, cleanSheets: 5 },
        { id: 4, teamId: 33, averageGoalsScored: "1.8", averageGoalsConceded: "1.4", overallRating: "84", attackRating: 85, defenseRating: 82, cleanSheets: 4 },
        { id: 5, teamId: 49, averageGoalsScored: "1.6", averageGoalsConceded: "1.3", overallRating: "82", attackRating: 83, defenseRating: 80, cleanSheets: 4 }
      ]);
    });

    // Football proxy-like routes with realistic data structure
    app.get(['/football/fixtures', '/api/football/fixtures'], (req, res) => {
      const { league, season } = req.query;
      res.json({
        response: [
          {
            fixture: {
              id: 2001,
              referee: "Michael Oliver",
              timezone: "UTC",
              date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
              timestamp: Math.floor(Date.now() / 1000) + 86400,
              status: { long: "Not Started", short: "NS", elapsed: null },
              venue: { id: 556, name: "Old Trafford", city: "Manchester" }
            },
            league: { id: parseInt(league as string) || 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", flag: "https://media.api-sports.io/flags/gb.svg", season: parseInt(season as string) || 2023, round: "Regular Season - 12" },
            teams: {
              home: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", winner: null },
              away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: null }
            },
            goals: { home: null, away: null },
            score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
          }
        ],
        paging: { current: 1, total: 1 }
      });
    });

    app.get(['/football/teams', '/api/football/teams'], (_req, res) => {
      res.json({
        response: [
          { team: { id: 33, name: "Manchester United", code: "MUN", country: "England", founded: 1878, national: false, logo: "https://media.api-sports.io/football/teams/33.png" }, venue: { id: 556, name: "Old Trafford", address: "Sir Matt Busby Way", city: "Manchester", capacity: 76212, surface: "grass", image: "https://media.api-sports.io/football/venues/556.png" } },
          { team: { id: 50, name: "Manchester City", code: "MCI", country: "England", founded: 1880, national: false, logo: "https://media.api-sports.io/football/teams/50.png" }, venue: { id: 555, name: "Etihad Stadium", address: "Ashton New Road", city: "Manchester", capacity: 55017, surface: "grass", image: "https://media.api-sports.io/football/venues/555.png" } }
        ],
        paging: { current: 1, total: 1 }
      });
    });

    // Scraped data endpoint
    app.get(['/scraped-data', '/api/scraped-data'], (_req, res) => {
      res.json([
        {
          id: 1,
          dataType: 'xg_data',
          source: 'understat.com',
          data: { expectedGoals: 2.3, expectedGoalsAgainst: 1.1 },
          confidence: 0.85,
          scrapedAt: new Date().toISOString()
        },
        {
          id: 2,
          dataType: 'team_ratings',
          source: 'whoscored.com',
          data: { rating: 87.5, form: 'WWDWW' },
          confidence: 0.92,
          scrapedAt: new Date().toISOString()
        }
      ]);
    });

    // Fallback handler for other routes: return 503 with guidance
    app.use((req, res) => {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'API is running in degraded mode. Configure environment variables on Netlify to enable full functionality.',
        path: req.originalUrl,
        required_env: ['API_FOOTBALL_KEY', 'API_BEARER_TOKEN', 'SCRAPER_AUTH_TOKEN']
      });
    });
  }

  // Catch-all 404 for unmatched routes (should be rare here)
  app.use((req, res) => {
    console.error(`[Netlify API] 404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  });

  return app;
}

let appPromise: Promise<express.Application> | null = null;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    // Initialize app once and reuse
    if (!appPromise) {
      appPromise = setupApp();
    }
    const app = await appPromise;
    const serverlessHandler = serverless(app) as unknown as (e: HandlerEvent, c: HandlerContext) => Promise<HandlerResponse>;
    const response = await serverlessHandler(event, context);
    return response;
  } catch (error) {
    console.error('[FATAL] Netlify function handler crashed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'A critical server error occurred.',
        // Only include error details in non-production environments for security
        details: process.env.NODE_ENV !== 'production' ? (error as Error).message : undefined,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
