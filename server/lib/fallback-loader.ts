import type { League, Team, Standing, Fixture } from "../../shared/schema.js";

const LEAGUE_LOGOS: Record<number, { logo: string; flag: string }> = {
  39: {
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg",
    flag: "https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg"
  },
  140: {
    logo: "https://upload.wikimedia.org/wikipedia/en/9/92/La_Liga.png",
    flag: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg"
  },
  135: {
    logo: "https://upload.wikimedia.org/wikipedia/en/e/e1/Serie_A_logo_%282019%29.svg",
    flag: "https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg"
  },
  78: {
    logo: "https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg",
    flag: "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg"
  },
  61: {
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Ligue1_Uber_Eats.svg",
    flag: "https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg"
  }
};

export interface BackoffOptions {
  attempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 400, onRetry }: BackoffOptions = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (onRetry) {
        onRetry(attempt, error);
      }
      if (attempt === attempts) {
        break;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const FALLBACK_TEAMS: Record<number, Array<Omit<Team, "id"> & { id: number }>> = {
  39: [
    {
      id: 40,
      name: "Liverpool",
      code: "LIV",
      country: "England",
      founded: 1892,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"
    },
    {
      id: 50,
      name: "Manchester City",
      code: "MCI",
      country: "England",
      founded: 1880,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg"
    },
    {
      id: 42,
      name: "Arsenal",
      code: "ARS",
      country: "England",
      founded: 1886,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg"
    },
    {
      id: 33,
      name: "Manchester United",
      code: "MUN",
      country: "England",
      founded: 1878,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg"
    }
  ],
  140: [
    {
      id: 529,
      name: "Barcelona",
      code: "BAR",
      country: "Spain",
      founded: 1899,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg"
    },
    {
      id: 541,
      name: "Real Madrid",
      code: "RMA",
      country: "Spain",
      founded: 1902,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"
    },
    {
      id: 798,
      name: "Atlético Madrid",
      code: "ATM",
      country: "Spain",
      founded: 1903,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg"
    }
  ],
  135: [
    {
      id: 489,
      name: "Juventus",
      code: "JUV",
      country: "Italy",
      founded: 1897,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg"
    },
    {
      id: 4891,
      name: "Inter",
      code: "INT",
      country: "Italy",
      founded: 1908,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/0/0b/Inter_Milan.svg"
    },
    {
      id: 4892,
      name: "AC Milan",
      code: "MIL",
      country: "Italy",
      founded: 1899,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"
    }
  ],
  78: [
    {
      id: 157,
      name: "Bayern Munich",
      code: "BAY",
      country: "Germany",
      founded: 1900,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/commons/1/1f/FC_Bayern_München_logo_%282017%29.svg"
    },
    {
      id: 165,
      name: "Borussia Dortmund",
      code: "BVB",
      country: "Germany",
      founded: 1909,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg"
    },
    {
      id: 174,
      name: "RB Leipzig",
      code: "RBL",
      country: "Germany",
      founded: 2009,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg"
    }
  ],
  61: [
    {
      id: 591,
      name: "Paris Saint-Germain",
      code: "PSG",
      country: "France",
      founded: 1970,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg"
    },
    {
      id: 548,
      name: "Olympique de Marseille",
      code: "OM",
      country: "France",
      founded: 1899,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/commons/8/83/Olympique_de_Marseille_logo.svg"
    },
    {
      id: 525,
      name: "Olympique Lyonnais",
      code: "LYO",
      country: "France",
      founded: 1950,
      national: false,
      logo: "https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais_logo.svg"
    }
  ]
};

const FALLBACK_STANDINGS: Record<number, Standing[]> = {
  39: [
    {
      id: "39-50",
      leagueId: 39,
      teamId: 50,
      position: 1,
      points: 89,
      played: 38,
      wins: 28,
      draws: 5,
      losses: 5,
      goalsFor: 95,
      goalsAgainst: 28,
      goalDifference: 67,
      form: "WWWLW"
    },
    {
      id: "39-40",
      leagueId: 39,
      teamId: 40,
      position: 2,
      points: 86,
      played: 38,
      wins: 26,
      draws: 8,
      losses: 4,
      goalsFor: 88,
      goalsAgainst: 30,
      goalDifference: 58,
      form: "WWLWW"
    },
    {
      id: "39-42",
      leagueId: 39,
      teamId: 42,
      position: 3,
      points: 78,
      played: 38,
      wins: 23,
      draws: 9,
      losses: 6,
      goalsFor: 75,
      goalsAgainst: 36,
      goalDifference: 39,
      form: "WDWLW"
    }
  ],
  140: [
    {
      id: "140-541",
      leagueId: 140,
      teamId: 541,
      position: 1,
      points: 90,
      played: 38,
      wins: 28,
      draws: 6,
      losses: 4,
      goalsFor: 87,
      goalsAgainst: 29,
      goalDifference: 58,
      form: "WWWLW"
    },
    {
      id: "140-529",
      leagueId: 140,
      teamId: 529,
      position: 2,
      points: 85,
      played: 38,
      wins: 26,
      draws: 7,
      losses: 5,
      goalsFor: 84,
      goalsAgainst: 35,
      goalDifference: 49,
      form: "WWWWD"
    },
    {
      id: "140-798",
      leagueId: 140,
      teamId: 798,
      position: 3,
      points: 76,
      played: 38,
      wins: 23,
      draws: 7,
      losses: 8,
      goalsFor: 70,
      goalsAgainst: 38,
      goalDifference: 32,
      form: "WDWLW"
    }
  ]
};

const FALLBACK_FIXTURES: Record<number, Fixture[]> = {
  39: [
    {
      id: 9993901,
      referee: "Fallback Ref",
      timezone: "UTC",
      date: new Date(),
      timestamp: Math.floor(Date.now() / 1000),
      status: "NS",
      elapsed: null,
      round: "Regular Season",
      homeTeamId: 50,
      awayTeamId: 40,
      leagueId: 39,
      venue: "Etihad Stadium",
      homeScore: null,
      awayScore: null,
      halftimeHomeScore: null,
      halftimeAwayScore: null
    }
  ]
};

export function getFallbackLeagues(season: number): League[] {
  return Object.entries(LEAGUE_LOGOS).map(([leagueId, branding]) => ({
    id: Number(leagueId),
    name: leagueName(Number(leagueId)),
    country: leagueCountry(Number(leagueId)),
    logo: branding.logo,
    flag: branding.flag,
    season,
    type: 'League'
  }));
}

export function getFallbackTeamsForLeague(leagueId: number): Team[] {
  const teams = FALLBACK_TEAMS[leagueId];
  if (!teams) {
    return [];
  }
  return teams.map(team => ({ ...team }));
}

export function getFallbackStandingsForLeague(leagueId: number): Standing[] {
  const standings = FALLBACK_STANDINGS[leagueId];
  if (!standings) {
    return [];
  }
  return standings.map(entry => ({ ...entry }));
}

export function getFallbackFixturesForLeague(leagueId: number): Fixture[] {
  const fixtures = FALLBACK_FIXTURES[leagueId];
  if (!fixtures) {
    return [];
  }
  return fixtures.map(fixture => ({ ...fixture }));
}

function leagueName(leagueId: number): string {
  switch (leagueId) {
    case 39:
      return 'Premier League';
    case 140:
      return 'La Liga';
    case 135:
      return 'Serie A';
    case 78:
      return 'Bundesliga';
    case 61:
      return 'Ligue 1';
    default:
      return `League ${leagueId}`;
  }
}

function leagueCountry(leagueId: number): string {
  switch (leagueId) {
    case 39:
      return 'England';
    case 140:
      return 'Spain';
    case 135:
      return 'Italy';
    case 78:
      return 'Germany';
    case 61:
      return 'France';
    default:
      return 'Unknown';
  }
}
