// Types that strictly match the structure of the API-Football vendor responses.

export interface APIFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: any; // Define if needed
  teams: {
    home: { id: number; name: string; logo: string; };
    away: { id: number; name: string; logo: string; };
  };
  goals: any; // Define if needed
  score: any; // Define if needed
}

export interface APITeamData {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: any; // Define if needed
}

export interface APIStanding {
  rank: number;
  team: { id: number; name: string; logo: string; };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number; }; };
  home: any;
  away: any;
  update: string;
}

export interface APIPrediction {
  predictions: {
    winner: { id: number; name: string; comment: string };
    win_or_draw: boolean;
    under_over: string | null;
    goals: { home: string; away: string };
    advice: string;
    percent: { home: string; draw: string; away: string };
  };
  league: any;
  teams: any;
  comparison: any;
  h2h: any[];
}
