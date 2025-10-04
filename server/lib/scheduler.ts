import cron from 'node-cron';
import { logger } from '../middleware/index.js';
import { storage } from '../storage.js';
import { apiClient } from '../../client/src/lib/api-client';
import type { Fixture, Standing } from '../../shared/schema.js';
import {
  beginIngestionEvent,
  completeIngestionEvent,
  failIngestionEvent,
  markIngestionDegraded,
  computeChecksum
} from './ingestion-tracker.js';
import {
  getFallbackStandingsForLeague,
  getFallbackFixturesForLeague,
  withExponentialBackoff
} from './fallback-loader.js';

async function updateStandings() {
  logger.info('Scheduler: Starting standings update job.');
  const season = new Date().getFullYear();
  const leagues = await storage.getLeagues();

  const ctx = await beginIngestionEvent({
    source: 'api-football',
    scope: 'scheduler-standings',
    metadata: {
      season,
      leagueCount: leagues.length
    }
  });

  let recordsWritten = 0;
  const failedLeagues: number[] = [];
  const failureDetails: { leagueId: number; error: string }[] = [];
  const leagueSummaries: Array<{ leagueId: number; standings: number; fallbackUsed: boolean; retries: number; attempts: number; durationMs: number }> = [];
  const fallbackLeagues: number[] = [];
  const leagueRetryMetrics: Array<{
    leagueId: number;
    retries: number;
    attempts: number;
    durationMs: number;
    fallbackUsed: boolean;
    outcome: 'completed' | 'degraded' | 'failed';
  }> = [];

  const buildAggregateMetrics = () => {
    if (leagueRetryMetrics.length === 0) {
      return {
        leaguesProcessed: 0,
        totalRetries: 0,
        totalAttempts: 0,
        avgDurationMs: 0
      };
    }

    const totals = leagueRetryMetrics.reduce(
      (acc, entry) => {
        acc.retries += entry.retries;
        acc.attempts += entry.attempts;
        acc.duration += entry.durationMs;
        return acc;
      },
      { retries: 0, attempts: 0, duration: 0 }
    );

    return {
      leaguesProcessed: leagueRetryMetrics.length,
      totalRetries: totals.retries,
      totalAttempts: totals.attempts,
      avgDurationMs: Math.round(totals.duration / leagueRetryMetrics.length)
    };
  };

  try {
    if (leagues.length === 0) {
      logger.warn('Scheduler: No leagues available for standings update.');
      await markIngestionDegraded(ctx, {
        recordsWritten: 0,
        metadata: {
          reason: 'no-leagues-available'
        }
      });
      return;
    }

    for (const league of leagues) {
      const leagueCtx = await beginIngestionEvent({
        source: 'api-football',
        scope: `scheduler-standings-${league.id}`,
        metadata: {
          leagueId: league.id,
          season
        }
      });

      try {
        const leagueStart = Date.now();
        let leagueRetries = 0;
        let latestFetchError: unknown = null;

        logger.info(`Updating standings for league: ${league.name} (${league.id})`);
        let standingsResponse: Awaited<ReturnType<typeof apiClient.getStandings>> | null = null;

        try {
          standingsResponse = await withExponentialBackoff(
            () => apiClient.getStandings(league.id, season),
            {
              attempts: 4,
              baseDelayMs: 750,
              onRetry: (attempt, error) => {
                leagueRetries = attempt;
                latestFetchError = error;
                logger.warn(
                  {
                    leagueId: league.id,
                    attempt,
                    error: error instanceof Error ? error.message : String(error)
                  },
                  'Retrying standings fetch after failure'
                );
              }
            }
          );
        } catch (fetchError) {
          latestFetchError = fetchError;
          logger.error(
            {
              leagueId: league.id,
              error: fetchError instanceof Error ? fetchError.message : String(fetchError)
            },
            'Failed to fetch standings from API, attempting fallback'
          );
        }

        const standings = standingsResponse?.response?.[0]?.league?.standings?.[0];

        let standingsData: Standing[] = [];
        let fallbackUsed = false;

        if (Array.isArray(standings) && standings.length > 0) {
          standingsData = standings.map(s => ({
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
        } else {
          const fallbackStandings = getFallbackStandingsForLeague(league.id);
          if (fallbackStandings.length > 0) {
            fallbackUsed = true;
            standingsData = fallbackStandings;
            logger.warn(`Scheduler: using fallback standings for league ${league.id}.`);
          }
        }

        if (standingsData.length === 0) {
          logger.warn(`No standings found for league ${league.id} in scheduler.`);
          const durationMs = Date.now() - leagueStart;
          const attempts = leagueRetries + 1;
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: false,
            outcome: 'degraded'
          });
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: 0,
            fallbackUsed: false,
            metadata: {
              leagueId: league.id,
              season,
              reason: 'no-standings',
              retries: leagueRetries,
              attempts,
              fetchError: latestFetchError ? (latestFetchError instanceof Error ? latestFetchError.message : String(latestFetchError)) : undefined
            },
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            },
            checksum: computeChecksum([league.id, 'standings-none', attempts, leagueRetries])
          });
          continue;
        }

        await storage.updateStandings(standingsData);
        recordsWritten += standingsData.length;
        const durationMs = Date.now() - leagueStart;
        const attempts = leagueRetries + 1;
        const fetchErrorMessage = latestFetchError ? (latestFetchError instanceof Error ? latestFetchError.message : String(latestFetchError)) : undefined;
        leagueSummaries.push({
          leagueId: league.id,
          standings: standingsData.length,
          fallbackUsed,
          retries: leagueRetries,
          attempts,
          durationMs
        });

        const metadata = {
          leagueId: league.id,
          season,
          standingsCount: standingsData.length,
          checksum: computeChecksum(standingsData.map(s => s.id)),
          fallbackUsed,
          retries: leagueRetries,
          attempts,
          fetchError: fetchErrorMessage
        };

        if (fallbackUsed) {
          fallbackLeagues.push(league.id);
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: true,
            outcome: 'degraded'
          });
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: standingsData.length,
            fallbackUsed: true,
            metadata,
            checksum: computeChecksum([league.id, 'standings-fallback']),
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            }
          });
        } else {
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: false,
            outcome: 'completed'
          });
          await completeIngestionEvent(leagueCtx, {
            recordsWritten: standingsData.length,
            metadata,
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            }
          });
        }

        logger.info(`Successfully updated standings for league: ${league.name}.`);
      } catch (error) {
        failedLeagues.push(league.id);
        failureDetails.push({ leagueId: league.id, error: error instanceof Error ? error.message : String(error) });
        logger.error({ err: error }, `Failed to update standings for league ${league.id}`);
        const leagueRetries = 0;
        const attempts = leagueRetries + 1;
        const durationMs = 0;
        leagueRetryMetrics.push({
          leagueId: league.id,
          retries: leagueRetries,
          attempts,
          durationMs,
          fallbackUsed: false,
          outcome: 'failed'
        });
        await failIngestionEvent(leagueCtx, error, {
          recordsWritten: 0,
          metadata: {
            leagueId: league.id,
            season,
            retries: leagueRetries,
            attempts
          },
          metrics: {
            durationMs,
            retries: leagueRetries,
            attempts
          }
        });
      }
    }

    const summaryMetadata = {
      season,
      leagueCount: leagues.length,
      recordsWritten,
      failedLeagues,
      fallbackLeagues,
      failureDetails,
      leagueSummaries,
      retryMetrics: leagueRetryMetrics
    };

    const aggregateMetrics = buildAggregateMetrics();

    if (failedLeagues.length > 0 || fallbackLeagues.length > 0) {
      await markIngestionDegraded(ctx, {
        recordsWritten,
        fallbackUsed: fallbackLeagues.length > 0,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata),
        metrics: aggregateMetrics
      });
    } else {
      await completeIngestionEvent(ctx, {
        recordsWritten,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata),
        metrics: aggregateMetrics
      });
    }

    logger.info('Scheduler: Standings update job finished.');
  } catch (error) {
    logger.error({ err: error }, 'Scheduler: Standings update job failed');
    const aggregateMetrics = buildAggregateMetrics();
    await failIngestionEvent(ctx, error, {
      recordsWritten,
      metadata: {
        season,
        failedLeagues,
        fallbackLeagues,
        failureDetails,
        leagueSummaries,
        retryMetrics: leagueRetryMetrics
      },
      metrics: aggregateMetrics
    });
  }
}

async function updateFixtures() {
  logger.info('Scheduler: Starting fixtures update job.');
  const leagues = await storage.getLeagues();
  const runDate = new Date();
  const dateParam = runDate.toISOString().split('T')[0];

  const ctx = await beginIngestionEvent({
    source: 'api-football',
    scope: 'scheduler-fixtures',
    metadata: {
      date: dateParam,
      leagueCount: leagues.length
    }
  });

  let recordsWritten = 0;
  const failedLeagues: number[] = [];
  const failureDetails: { leagueId: number; error: string }[] = [];
  const leagueSummaries: Array<{ leagueId: number; fixtures: number; fallbackUsed: boolean; retries: number; attempts: number; durationMs: number }> = [];
  const fallbackLeagues: number[] = [];
  const leagueRetryMetrics: Array<{
    leagueId: number;
    retries: number;
    attempts: number;
    durationMs: number;
    fallbackUsed: boolean;
    outcome: 'completed' | 'degraded' | 'failed';
  }> = [];

  const buildAggregateMetrics = () => {
    if (leagueRetryMetrics.length === 0) {
      return {
        leaguesProcessed: 0,
        totalRetries: 0,
        totalAttempts: 0,
        avgDurationMs: 0
      };
    }

    const totals = leagueRetryMetrics.reduce(
      (acc, entry) => {
        acc.retries += entry.retries;
        acc.attempts += entry.attempts;
        acc.duration += entry.durationMs;
        return acc;
      },
      { retries: 0, attempts: 0, duration: 0 }
    );

    return {
      leaguesProcessed: leagueRetryMetrics.length,
      totalRetries: totals.retries,
      totalAttempts: totals.attempts,
      avgDurationMs: Math.round(totals.duration / leagueRetryMetrics.length)
    };
  };

  try {
    if (leagues.length === 0) {
      logger.warn('Scheduler: No leagues available for fixtures update.');
      await markIngestionDegraded(ctx, {
        recordsWritten: 0,
        metadata: {
          reason: 'no-leagues-available'
        }
      });
      return;
    }

    for (const league of leagues) {
      const leagueCtx = await beginIngestionEvent({
        source: 'api-football',
        scope: `scheduler-fixtures-${league.id}`,
        metadata: {
          leagueId: league.id,
          date: dateParam
        }
      });

      try {
        const leagueStart = Date.now();
        let leagueRetries = 0;
        let latestFetchError: unknown = null;

        logger.info(`Updating fixtures for league: ${league.name} (${league.id})`);
        let fixturesResponse: Awaited<ReturnType<typeof apiClient.getFixtures>> | null = null;

        try {
          fixturesResponse = await withExponentialBackoff(
            () => apiClient.getFixtures(league.id, dateParam),
            {
              attempts: 4,
              baseDelayMs: 750,
              onRetry: (attempt, error) => {
                leagueRetries = attempt;
                latestFetchError = error;
                logger.warn(
                  {
                    leagueId: league.id,
                    attempt,
                    error: error instanceof Error ? error.message : String(error)
                  },
                  'Retrying fixtures fetch after failure'
                );
              }
            }
          );
        } catch (fetchError) {
          latestFetchError = fetchError;
          logger.error(
            {
              leagueId: league.id,
              error: fetchError instanceof Error ? fetchError.message : String(fetchError)
            },
            'Failed to fetch fixtures from API, attempting fallback'
          );
        }

        let fixturesData: Fixture[] = fixturesResponse?.response?.map(f => {
          const rawFixture = f.fixture as Record<string, unknown> & {
            venue?: { name?: string | null };
          };
          const venueName = rawFixture?.venue?.name ?? null;

          return {
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
            venue: venueName,
          } as Fixture;
        }) ?? [];

        let fallbackUsed = false;
        if (fixturesData.length === 0) {
          const fallbackFixtures = getFallbackFixturesForLeague(league.id);
          if (fallbackFixtures.length > 0) {
            fallbackUsed = true;
            fixturesData = fallbackFixtures.map(fixture => ({
              ...fixture,
              date: new Date(),
              timestamp: Math.floor(Date.now() / 1000)
            }));
            logger.warn(`Scheduler: using fallback fixtures for league ${league.id}.`);
          }
        }

        if (fixturesData.length === 0) {
          logger.warn(`No fixtures returned for league ${league.id} on ${dateParam}.`);
          const durationMs = Date.now() - leagueStart;
          const attempts = leagueRetries + 1;
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: false,
            outcome: 'degraded'
          });
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: 0,
            fallbackUsed: false,
            metadata: {
              leagueId: league.id,
              date: dateParam,
              reason: 'no-fixtures',
              retries: leagueRetries,
              attempts,
              fetchError: latestFetchError ? (latestFetchError instanceof Error ? latestFetchError.message : String(latestFetchError)) : undefined
            },
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            },
            checksum: computeChecksum([league.id, 'fixtures-none', attempts, leagueRetries])
          });
          continue;
        }

        await storage.updateFixtures(fixturesData);
        recordsWritten += fixturesData.length;
        const durationMs = Date.now() - leagueStart;
        const attempts = leagueRetries + 1;
        const fetchErrorMessage = latestFetchError ? (latestFetchError instanceof Error ? latestFetchError.message : String(latestFetchError)) : undefined;
        leagueSummaries.push({
          leagueId: league.id,
          fixtures: fixturesData.length,
          fallbackUsed,
          retries: leagueRetries,
          attempts,
          durationMs
        });

        const metadata = {
          leagueId: league.id,
          date: dateParam,
          fixturesCount: fixturesData.length,
          checksum: computeChecksum(fixturesData.map(f => f.id)),
          fallbackUsed,
          retries: leagueRetries,
          attempts,
          fetchError: fetchErrorMessage
        };

        if (fallbackUsed) {
          fallbackLeagues.push(league.id);
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: true,
            outcome: 'degraded'
          });
          await markIngestionDegraded(leagueCtx, {
            recordsWritten: fixturesData.length,
            fallbackUsed: true,
            metadata,
            checksum: computeChecksum([league.id, 'fixtures-fallback']),
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            }
          });
        } else {
          leagueRetryMetrics.push({
            leagueId: league.id,
            retries: leagueRetries,
            attempts,
            durationMs,
            fallbackUsed: false,
            outcome: 'completed'
          });
          await completeIngestionEvent(leagueCtx, {
            recordsWritten: fixturesData.length,
            metadata,
            metrics: {
              durationMs,
              retries: leagueRetries,
              attempts
            }
          });
        }

        logger.info(`Successfully updated fixtures for league: ${league.name}.`);
      } catch (error) {
        const leagueStart = Date.now();
        failedLeagues.push(league.id);
        failureDetails.push({ leagueId: league.id, error: error instanceof Error ? error.message : String(error) });
        logger.error({ err: error }, `Failed to update fixtures for league ${league.id}`);
        const leagueRetries = 0;
        const attempts = leagueRetries + 1;
        const durationMs = 0;
        leagueRetryMetrics.push({
          leagueId: league.id,
          retries: leagueRetries,
          attempts,
          durationMs,
          fallbackUsed: false,
          outcome: 'failed'
        });
        await failIngestionEvent(leagueCtx, error, {
          recordsWritten: 0,
          metadata: {
            leagueId: league.id,
            date: dateParam,
            retries: leagueRetries,
            attempts
          },
          metrics: {
            durationMs,
            retries: leagueRetries,
            attempts
          }
        });
      }
    }

    const summaryMetadata = {
      date: dateParam,
      leagueCount: leagues.length,
      recordsWritten,
      failedLeagues,
      fallbackLeagues,
      failureDetails,
      leagueSummaries,
      retryMetrics: leagueRetryMetrics
    };

    const aggregateMetrics = buildAggregateMetrics();

    if (failedLeagues.length > 0 || fallbackLeagues.length > 0) {
      await markIngestionDegraded(ctx, {
        recordsWritten,
        fallbackUsed: fallbackLeagues.length > 0,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata),
        metrics: aggregateMetrics
      });
    } else {
      await completeIngestionEvent(ctx, {
        recordsWritten,
        metadata: summaryMetadata,
        checksum: computeChecksum(summaryMetadata),
        metrics: aggregateMetrics
      });
    }

    logger.info('Scheduler: Fixtures update job finished.');
  } catch (error) {
    logger.error({ err: error }, 'Scheduler: Fixtures update job failed');
    const aggregateMetrics = buildAggregateMetrics();
    await failIngestionEvent(ctx, error, {
      recordsWritten,
      metadata: {
        date: dateParam,
        failedLeagues,
        fallbackLeagues,
        failureDetails,
        leagueSummaries,
        retryMetrics: leagueRetryMetrics
      },
      metrics: aggregateMetrics
    });
  }
}

export function initializeSchedulers() {
  logger.info('Initializing cron jobs...');

  // Schedule standings to update every 6 hours
  cron.schedule('0 */6 * * *', () => {
    updateStandings().catch(error => {
      logger.error({ err: error }, 'Scheduler: standings cron execution failed');
    });
  });
  logger.info('Scheduled standings update job to run every 6 hours.');

  // Schedule fixtures to update every hour
  cron.schedule('0 * * * *', () => {
    updateFixtures().catch(error => {
      logger.error({ err: error }, 'Scheduler: fixtures cron execution failed');
    });
  });
  logger.info('Scheduled fixtures update job to run every hour.');

  // Run jobs on startup if not in production to ensure data is fresh for development
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Running initial data update for development environment...');
    updateStandings().catch(error => logger.error({ err: error }, 'Initial standings update failed'));
    updateFixtures().catch(error => logger.error({ err: error }, 'Initial fixtures update failed'));
  }
}
