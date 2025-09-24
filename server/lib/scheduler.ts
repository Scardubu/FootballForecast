import cron from 'node-cron';
import { logger } from '../middleware';
import { storage } from '../storage';
import { apiClient } from '../../client/src/lib/api-client';
import type { Fixture, Standing } from '@shared/schema';

async function updateStandings() {
  logger.info('Scheduler: Starting standings update job.');
  const leagues = await storage.getLeagues();
  const season = new Date().getFullYear();

  for (const league of leagues) {
    try {
      logger.info(`Updating standings for league: ${league.name} (${league.id})`);
      const standingsResponse = await apiClient.getStandings(league.id, season);
      const standings = standingsResponse.response[0]?.league?.standings[0];
      if (!standings) {
        logger.warn(`No standings found for league ${league.id} in scheduler.`);
        continue;
      }
      const standingsData = standings.map(s => ({
        id: `${league.id}-${s.team.id}`,
        leagueId: league.id,
        teamId: s.team.id,
        position: s.rank,
        points: s.points,
        played: s.all.played,
        wins: s.all.win,
        draws: s.all.draw,
        losses: s.all.lose,
        goalsFor: s.all.goals.for,
        goalsAgainst: s.all.goals.against,
        goalDifference: s.goalsDiff,
        form: s.form,
      } as Standing));
      await storage.updateStandings(standingsData);
      logger.info(`Successfully updated standings for league: ${league.name}.`);
    } catch (error) {
      logger.error({ err: error }, `Failed to update standings for league ${league.id}`);
    }
  }
  logger.info('Scheduler: Standings update job finished.');
}

async function updateFixtures() {
  logger.info('Scheduler: Starting fixtures update job.');
  const leagues = await storage.getLeagues();
  const today = new Date().toISOString().split('T')[0];

  for (const league of leagues) {
    try {
      logger.info(`Updating fixtures for league: ${league.name} (${league.id})`);
      const fixturesResponse = await apiClient.getFixtures(league.id, today);
      const fixturesData = fixturesResponse.response.map(f => ({
        id: f.fixture.id,
        referee: f.fixture.referee,
        timezone: f.fixture.timezone,
        date: new Date(f.fixture.date),
        timestamp: f.fixture.timestamp,
        status: f.fixture.status.short,
        elapsed: f.fixture.status.elapsed,
        round: f.league.round,
        homeTeamId: f.teams.home.id,
        awayTeamId: f.teams.away.id,
        leagueId: f.league.id,
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
        homeScore: null,
        awayScore: null,
        fulltimeHomeScore: null,
        fulltimeAwayScore: null,
        halftimeHomeScore: null,
        halftimeAwayScore: null,
        venue: null, // Add venue if available from API
      } as Fixture));
      await storage.updateFixtures(fixturesData);
      logger.info(`Successfully updated fixtures for league: ${league.name}.`);
    } catch (error) {
      logger.error({ err: error }, `Failed to update fixtures for league ${league.id}`);
    }
  }
  logger.info('Scheduler: Fixtures update job finished.');
}

export function initializeSchedulers() {
  logger.info('Initializing cron jobs...');

  // Schedule standings to update every 6 hours
  cron.schedule('0 */6 * * *', updateStandings);
  logger.info('Scheduled standings update job to run every 6 hours.');

  // Schedule fixtures to update every hour
  cron.schedule('0 * * * *', updateFixtures);
  logger.info('Scheduled fixtures update job to run every hour.');

  // Run jobs on startup if not in production to ensure data is fresh for development
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Running initial data update for development environment...');
    updateStandings();
    updateFixtures();
  }
}
