import { Router } from 'express';
import { healthRouter } from './health';
import { fixturesRouter } from './fixtures';
import { leaguesRouter } from './leagues';
import { standingsRouter } from './standings';
import { teamsRouter } from './teams';
import { predictionsRouter } from './predictions';
import { scrapedDataRouter } from './scraped-data';
import { schedulerRouter } from './scheduler';
import { authRouter } from './auth';
import { mlRouter } from './ml';
import { createAuthMiddleware } from '../middleware';
import { diagnosticsRouter } from './diagnostics';

const apiRouter = Router();

// Publicly accessible routes
apiRouter.use('/health', healthRouter);
apiRouter.use('/fixtures', fixturesRouter);
apiRouter.use('/leagues', leaguesRouter);
apiRouter.use('/standings', standingsRouter);
apiRouter.use('/teams', teamsRouter);
apiRouter.use('/predictions', predictionsRouter);
apiRouter.use('/scraped-data', scrapedDataRouter);
apiRouter.use('/ml', mlRouter);
apiRouter.use('/diagnostics', diagnosticsRouter);

// Auth routes
apiRouter.use('/auth', authRouter);

// All routes below this point require authentication
// Only /scheduler routes require authentication
apiRouter.use('/scheduler', createAuthMiddleware({ required: true }), schedulerRouter);

export { apiRouter };
