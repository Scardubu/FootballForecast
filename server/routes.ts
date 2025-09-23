import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  httpLogger,
  logger,
  generalRateLimit,
  createAuthMiddleware,
  errorHandler,
  notFoundHandler
} from "./middleware";
import {
  healthRouter,
  fixturesRouter,
  leaguesRouter,
  standingsRouter,
  teamsRouter,
  predictionsRouter,
  scrapedDataRouter,
  schedulerRouter,
  apiFootballRouter,
  authRouter
} from "./routers";
import cookieParser from 'cookie-parser';

// Data initialization utility functions moved to focused routers

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for rate limiting and IP detection behind load balancers
  app.set('trust proxy', 1);
  
  // Apply global middleware stack
  logger.info('Applying global middleware stack');
  app.use(cookieParser()); // Parse cookies for session authentication
  app.use(httpLogger); // Structured request logging with request IDs
  app.use(generalRateLimit); // Rate limiting protection (100 req/15min per IP)
  
  // Mount health endpoints (no auth required) - must be before auth middleware
  app.use('/api', healthRouter);

  // Mount auth endpoints (no auth required for creating sessions)
  app.use('/api/auth', authRouter);

  // Apply required authentication to protected API routes (health and auth endpoints declared before this middleware)
  app.use('/api', createAuthMiddleware({ 
    required: true, 
    skipPaths: ['/health', '/_client-status', '/auth'] 
  }));
  
  // Mount focused routers for organized endpoint management
  app.use('/api/fixtures', fixturesRouter);
  app.use('/api/leagues', leaguesRouter); 
  app.use('/api/standings', standingsRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/predictions', predictionsRouter);
  app.use('/api/scraped-data', scrapedDataRouter);
  app.use('/api/scheduler', schedulerRouter);
  app.use('/api/football', apiFootballRouter);

  // Initialize with some default leagues
  setTimeout(async () => {
    try {
      console.log('Initializing data...');
      
      // Try to fetch real data, fallback to sample data if API limits reached
      const leagues = [
        { id: 39, name: 'Premier League', teams: [
          { id: 40, name: 'Liverpool', logo: 'https://media-4.api-sports.io/football/teams/40.png' },
          { id: 50, name: 'Manchester City', logo: 'https://media-4.api-sports.io/football/teams/50.png' },
          { id: 42, name: 'Arsenal', logo: 'https://media-4.api-sports.io/football/teams/42.png' },
          { id: 49, name: 'Chelsea', logo: 'https://media-4.api-sports.io/football/teams/49.png' },
          { id: 33, name: 'Manchester United', logo: 'https://media-4.api-sports.io/football/teams/33.png' }
        ]},
        { id: 140, name: 'La Liga', teams: [
          { id: 541, name: 'Real Madrid', logo: 'https://media-4.api-sports.io/football/teams/541.png' },
          { id: 529, name: 'Barcelona', logo: 'https://media-4.api-sports.io/football/teams/529.png' },
          { id: 530, name: 'Atlético Madrid', logo: 'https://media-4.api-sports.io/football/teams/530.png' }
        ]}
      ];

      // Import updateStandings from standings router
      const { standingsRouter } = await import('./routers/standings');
      
      for (const league of leagues) {
        console.log(`⚠️ Using sample data for ${league.name} (ID: ${league.id})`);
        
        // First, ensure league exists
        await storage.updateLeague({
          id: league.id,
          name: league.name,
          country: league.id === 39 ? 'England' : 'Spain',
          logo: null,
          flag: null,
          season: 2023,
          type: 'League'
        });
        
        // Store team data FIRST to avoid FK constraint violations
        for (const team of league.teams) {
          await storage.updateTeam({
            id: team.id,
            name: team.name,
            logo: team.logo,
            country: league.id === 39 ? 'England' : 'Spain',
            national: false,
            code: null,
            founded: null
          });
        }
        
        // Create sample standings AFTER teams exist
        const standingsData = league.teams.map((team, index) => ({
          id: `${league.id}-${team.id}`,
          leagueId: league.id,
          teamId: team.id,
          position: index + 1,
          points: 30 - (index * 3),
          played: 10,
          wins: 8 - index,
          draws: 2,
          losses: index,
          goalsFor: 25 - (index * 2),
          goalsAgainst: 8 + index,
          goalDifference: 17 - (index * 3),
          form: 'WWDWL'
        }));

        await storage.updateStandings(standingsData);
        console.log(`✅ Sample data seeded for ${league.name}`);
      }
      
      console.log('Data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }, 1000);

  // Apply centralized error handling middleware after all routes
  // Handle 404s for API routes specifically (before SPA fallbacks)
  app.use('/api', notFoundHandler);
  app.use(errorHandler); // Centralized error handling with proper logging and Problem+JSON format
  
  logger.info('All routes and middleware configured successfully with centralized error handling');

  const httpServer = createServer(app);
  return httpServer;
}