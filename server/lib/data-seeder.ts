import { storage } from '../storage';
import { logger } from '../middleware';
import { apiClient } from '../../client/src/lib/api-client'; // We can reuse the client
import type { League, Team, Standing } from '@shared/schema';

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 61, name: 'Ligue 1', country: 'France' },
];

async function seedTeamsForLeague(leagueId: number, season: number) {
  logger.info(`Seeding teams for league ${leagueId}...`);
  const teamsResponse = await apiClient.getTeams(leagueId, season);
  const teamsData = teamsResponse.response.map(({ team, venue }) => ({
    id: team.id,
    name: team.name,
    code: team.code,
    country: team.country,
    founded: team.founded,
    national: team.national,
    logo: team.logo,
  } as Team));
  await storage.updateTeams(teamsData);
  logger.info(`Seeded ${teamsData.length} teams for league ${leagueId}.`);
}

async function seedStandingsForLeague(leagueId: number, season: number) {
  logger.info(`Seeding standings for league ${leagueId}...`);
  const standingsResponse = await apiClient.getStandings(leagueId, season);
  const standings = standingsResponse.response[0]?.league?.standings[0];
  if (!standings) {
    logger.warn(`No standings found for league ${leagueId}`);
    return;
  }
  const standingsData = standings.map(s => ({
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
  await storage.updateStandings(standingsData);
  logger.info(`Seeded standings for ${standingsData.length} teams in league ${leagueId}.`);
}

export async function runDataSeeder() {
  logger.info('Checking if data seeding is required...');
  const leagues = await storage.getLeagues();
  if (leagues.length > 0) {
    logger.info('Database already seeded. Skipping.');
    return;
  }

  logger.info('Database is empty. Starting data seeding process...');
  const season = new Date().getFullYear();

  const leagueData: League[] = TOP_LEAGUES.map(l => ({
    id: l.id,
    name: l.name,
    country: l.country,
    logo: '', // Will be updated from API if available
    flag: '', // Will be updated from API if available
    season: season,
    type: 'League',
  }));
  await storage.updateLeagues(leagueData);
  logger.info(`Seeded ${leagueData.length} top leagues.`);

  for (const league of TOP_LEAGUES) {
    try {
      await seedTeamsForLeague(league.id, season);
      await seedStandingsForLeague(league.id, season);
    } catch (error) {
      logger.error({ err: error }, `Failed to seed data for league ${league.id}`);
    }
  }

  logger.info('Data seeding process completed.');
}
