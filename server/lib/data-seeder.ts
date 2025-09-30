import { storage } from '../storage.js';
import { logger } from '../middleware/index.js';
import { apiClient } from '../../client/src/lib/api-client'; // We can reuse the client
import type { League, Team, Standing } from '../../shared/schema.js';
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
  getFallbackStandingsForLeague
} from './fallback-loader.js';

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 61, name: 'Ligue 1', country: 'France' },
];

async function seedTeamsForLeague(leagueId: number, season: number): Promise<{ count: number; checksum: string; fallbackUsed: boolean }> {
  logger.info(`Seeding teams for league ${leagueId}...`);
  let teamsData: Team[] = [];
  let fallbackUsed = false;

  try {
    const teamsResponse = await apiClient.getTeams(leagueId, season);
    teamsData = teamsResponse.response.map(({ team }) => ({
      id: team.id,
      name: team.name,
      code: team.code,
      country: team.country,
      founded: team.founded,
      national: team.national,
      logo: team.logo,
    } as Team));
  } catch (error) {
    fallbackUsed = true;
    logger.warn({ err: error }, `Falling back to static team data for league ${leagueId}`);
  }

  if (teamsData.length === 0) {
    const fallbackTeams = getFallbackTeamsForLeague(leagueId);
    if (fallbackTeams.length > 0) {
      fallbackUsed = true;
      teamsData = fallbackTeams;
      logger.info(`Loaded ${teamsData.length} fallback teams for league ${leagueId}.`);
    }
  }

  if (teamsData.length === 0) {
    throw new Error(`Unable to load teams for league ${leagueId}`);
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
  let fallbackUsed = false;

  try {
    const standingsResponse = await apiClient.getStandings(leagueId, season);
    const standings = standingsResponse.response[0]?.league?.standings[0];
    if (Array.isArray(standings) && standings.length > 0) {
      standingsData = standings.map(s => ({
        id: `${leagueId}-${s.team.id}`,
        leagueId: leagueId,
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
    }
  } catch (error) {
    fallbackUsed = true;
    logger.warn({ err: error }, `Falling back to static standings for league ${leagueId}`);
  }

  if (standingsData.length === 0) {
    const fallbackStandings = getFallbackStandingsForLeague(leagueId);
    if (fallbackStandings.length > 0) {
      fallbackUsed = true;
      standingsData = fallbackStandings;
      logger.info(`Loaded ${standingsData.length} fallback standings entries for league ${leagueId}.`);
    }
  }

  if (standingsData.length === 0) {
    logger.warn(`No standings found for league ${leagueId}`);
    return { count: 0, fallbackUsed };
  }

  await storage.updateStandings(standingsData);
  logger.info(`Seeded standings for ${standingsData.length} teams in league ${leagueId}.`);
  return {
    count: standingsData.length,
    checksum: computeChecksum(standingsData.map(s => s.id)),
    fallbackUsed
  };
}

export async function runDataSeeder() {
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
    const leagueSummaries: Array<{ leagueId: number; teams: number; standings: number; fallbackUsed: boolean }> = [];
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

        recordsWritten += teamsResult.count + standingsResult.count;
        leagueSummaries.push({
          leagueId: league.id,
          teams: teamsResult.count,
          standings: standingsResult.count,
          fallbackUsed: teamsResult.fallbackUsed || standingsResult.fallbackUsed
        });

        if (teamsResult.fallbackUsed || standingsResult.fallbackUsed) {
          fallbackLeagues.push(league.id);
        }

        const ingestionMetadata = {
          leagueId: league.id,
          season,
          teamCount: teamsResult.count,
          standingsCount: standingsResult.count,
          teamsChecksum: teamsResult.checksum,
          standingsChecksum: standingsResult.checksum,
          fallbackUsed: teamsResult.fallbackUsed || standingsResult.fallbackUsed
        };

        if (teamsResult.fallbackUsed || standingsResult.fallbackUsed) {
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: teamsResult.count + standingsResult.count,
            fallbackUsed: true,
            metadata: ingestionMetadata,
            checksum: computeChecksum([
              league.id,
              teamsResult.checksum,
              standingsResult.checksum,
              'fallback'
            ])
          });
        } else {
          await completeIngestionEvent(leagueCtx, {
            recordsWritten: teamsResult.count + standingsResult.count,
            metadata: ingestionMetadata,
            checksum: computeChecksum([
              league.id,
              teamsResult.checksum,
              standingsResult.checksum
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
