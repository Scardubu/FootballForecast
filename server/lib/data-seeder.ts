import { storage, storageReady } from '../storage.js';
import { logger } from '../middleware/index.js';
import type { League, Team, Standing, Fixture } from '../../shared/schema.js';
import {
  beginIngestionEvent,
  completeIngestionEvent,
  failIngestionEvent,
  markIngestionDegraded,
  computeChecksum
} from './ingestion-tracker.js';
import {
  getFallbackLeagues,
  getFallbackTeamsForLeague,
  getFallbackStandingsForLeague,
  getFallbackFixturesForLeague
} from './fallback-loader.js';

export const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
];

async function seedTeamsForLeague(leagueId: number, season: number): Promise<{ count: number; checksum: string; fallbackUsed: boolean }> {
  logger.info(`Seeding teams for league ${leagueId}...`);
  let teamsData: Team[] = [];
  let fallbackUsed = true; // Always use fallback for initial seeding

  // Use fallback data for reliable initial seeding
  const fallbackTeams = getFallbackTeamsForLeague(leagueId);
  if (fallbackTeams.length > 0) {
    teamsData = fallbackTeams;
    logger.info(`Loaded ${teamsData.length} fallback teams for league ${leagueId}.`);
  }

  if (teamsData.length === 0) {
    logger.warn(`No teams available for league ${leagueId}`);
    return { count: 0, checksum: '', fallbackUsed: true };
  }

  await storage.updateTeams(teamsData);
  logger.info(`Seeded ${teamsData.length} teams for league ${leagueId}.`);
  return {
    count: teamsData.length,
    checksum: computeChecksum(teamsData.map(t => t.id)),
    fallbackUsed
  };
}

async function seedStandingsForLeague(leagueId: number, season: number): Promise<{ count: number; checksum?: string; fallbackUsed: boolean }> {
  logger.info(`Seeding standings for league ${leagueId}...`);
  let standingsData: Standing[] = [];
  let fallbackUsed = true; // Always use fallback for initial seeding

  // Use fallback data for reliable initial seeding
  const fallbackStandings = getFallbackStandingsForLeague(leagueId);
  if (fallbackStandings.length > 0) {
    standingsData = fallbackStandings;
    logger.info(`Loaded ${standingsData.length} fallback standings entries for league ${leagueId}.`);
  }

  if (standingsData.length === 0) {
    logger.warn(`No standings found for league ${leagueId}`);
    return { count: 0, fallbackUsed: true };
  }

  await storage.updateStandings(standingsData);
  logger.info(`Seeded standings for ${standingsData.length} teams in league ${leagueId}.`);
  return {
    count: standingsData.length,
    checksum: computeChecksum(standingsData.map(s => s.id)),
    fallbackUsed
  };
}

async function seedFixturesForLeague(leagueId: number, season: number): Promise<{ count: number; checksum?: string; fallbackUsed: boolean }> {
  logger.info(`Seeding fixtures for league ${leagueId}...`);
  let fixturesData: Fixture[] = [];
  let fallbackUsed = true; // Always use fallback for initial seeding

  // Use fallback data for reliable initial seeding
  const fallbackFixtures = getFallbackFixturesForLeague(leagueId);
  if (fallbackFixtures.length > 0) {
    fixturesData = fallbackFixtures;
    logger.info(`Loaded ${fixturesData.length} fallback fixtures for league ${leagueId}.`);
  }

  if (fixturesData.length === 0) {
    logger.warn(`No fixtures found for league ${leagueId}`);
    return { count: 0, fallbackUsed: true };
  }

  await storage.updateFixtures(fixturesData);
  logger.info(`Seeded ${fixturesData.length} fixtures for league ${leagueId}.`);
  return {
    count: fixturesData.length,
    checksum: computeChecksum(fixturesData.map(f => f.id)),
    fallbackUsed
  };
}

export async function runDataSeeder() {
  // Wait for storage to be initialized
  await storageReady;
  
  logger.info('Checking if data seeding is required...');
  const ctx = await beginIngestionEvent({
    source: 'api-football',
    scope: 'bootstrap-top-leagues',
    metadata: {
      leagues: TOP_LEAGUES.map(l => l.id)
    }
  });

  try {
    const leagues = await storage.getLeagues();
    if (leagues.length > 0) {
      logger.info('Database already seeded. Skipping.');
      await completeIngestionEvent(ctx, {
        metadata: {
          skipped: true,
          existingLeagues: leagues.length
        },
        recordsWritten: 0
      });
      return;
    }

    logger.info('Database is empty. Starting data seeding process...');
    const season = new Date().getFullYear();

    const fallbackLeagueBranding = getFallbackLeagues(season).reduce<Record<number, League>>((acc, league) => {
      acc[league.id] = league;
      return acc;
    }, {});

    const leagueData: League[] = TOP_LEAGUES.map(l => ({
      id: l.id,
      name: l.name,
      country: l.country,
      logo: fallbackLeagueBranding[l.id]?.logo ?? '',
      flag: fallbackLeagueBranding[l.id]?.flag ?? '',
      season: season,
      type: 'League',
    }));

    let recordsWritten = 0;
    const leagueChecksum = computeChecksum(leagueData.map(l => l.id));
    await storage.updateLeagues(leagueData);
    recordsWritten += leagueData.length;
    logger.info(`Seeded ${leagueData.length} top leagues.`);

    const failedLeagues: number[] = [];
    const failureDetails: { leagueId: number; error: string }[] = [];
    const leagueSummaries: Array<{ leagueId: number; teams: number; standings: number; fixtures: number; fallbackUsed: boolean }> = [];
    const fallbackLeagues: number[] = [];

    for (const league of TOP_LEAGUES) {
      const leagueCtx = await beginIngestionEvent({
        source: 'api-football',
        scope: `bootstrap-league-${league.id}`,
        metadata: {
          leagueId: league.id,
          season
        }
      });

      try {
        const teamsResult = await seedTeamsForLeague(league.id, season);
        const standingsResult = await seedStandingsForLeague(league.id, season);
        const fixturesResult = await seedFixturesForLeague(league.id, season);

        recordsWritten += teamsResult.count + standingsResult.count + fixturesResult.count;
        leagueSummaries.push({
          leagueId: league.id,
          teams: teamsResult.count,
          standings: standingsResult.count,
          fixtures: fixturesResult.count,
          fallbackUsed: teamsResult.fallbackUsed || standingsResult.fallbackUsed || fixturesResult.fallbackUsed
        });

        if (teamsResult.fallbackUsed || standingsResult.fallbackUsed || fixturesResult.fallbackUsed) {
          fallbackLeagues.push(league.id);
        }

        const ingestionMetadata = {
          leagueId: league.id,
          season,
          teamCount: teamsResult.count,
          standingsCount: standingsResult.count,
          fixturesCount: fixturesResult.count,
          teamsChecksum: teamsResult.checksum,
          standingsChecksum: standingsResult.checksum,
          fixturesChecksum: fixturesResult.checksum,
          fallbackUsed: teamsResult.fallbackUsed || standingsResult.fallbackUsed || fixturesResult.fallbackUsed
        };

        if (teamsResult.fallbackUsed || standingsResult.fallbackUsed || fixturesResult.fallbackUsed) {
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: teamsResult.count + standingsResult.count + fixturesResult.count,
            fallbackUsed: true,
            metadata: ingestionMetadata,
            checksum: computeChecksum([
              league.id,
              teamsResult.checksum,
              standingsResult.checksum,
              fixturesResult.checksum,
              'fallback'
            ])
          });
        } else {
          await completeIngestionEvent(leagueCtx, {
            recordsWritten: teamsResult.count + standingsResult.count + fixturesResult.count,
            metadata: ingestionMetadata,
            checksum: computeChecksum([
              league.id,
              teamsResult.checksum,
              standingsResult.checksum,
              fixturesResult.checksum
            ])
          });
        }
      } catch (error) {
        failedLeagues.push(league.id);
        failureDetails.push({ leagueId: league.id, error: (error instanceof Error ? error.message : String(error)) });
        logger.error({ err: error }, `Failed to seed data for league ${league.id}`);
        await failIngestionEvent(leagueCtx, error, {
          recordsWritten: 0,
          metadata: {
            leagueId: league.id,
            season
          }
        });
      }
    }

    const summaryMetadata = {
      season,
      leagueChecksum,
      successfulLeagues: TOP_LEAGUES.length - failedLeagues.length,
      failedLeagues,
      fallbackLeagues,
      leagueSummaries,
      failureDetails
    };

    if (failedLeagues.length > 0 || fallbackLeagues.length > 0) {
      await markIngestionDegraded(ctx, {
        recordsWritten,
        fallbackUsed: fallbackLeagues.length > 0,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata)
      });
    } else {
      await completeIngestionEvent(ctx, {
        recordsWritten,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata)
      });
    }

    logger.info('Data seeding process completed.');
  } catch (error) {
    logger.error({ err: error }, 'Data seeding process failed');
    await failIngestionEvent(ctx, error);
    throw error;
  }
}
