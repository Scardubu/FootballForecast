/**
 * Canonical Team Mapping System
 * Provides consistent team names, country mapping, and fallback data
 */

export interface CanonicalTeam {
  id: number;
  canonicalName: string;
  displayName: string;
  aliases: string[];
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  founded?: number;
  colors: {
    primary: string;
    secondary: string;
  };
  fallbackLogo?: string; // Local fallback if external logo fails
}

export const CANONICAL_TEAMS: Record<number, CanonicalTeam> = {
  // Premier League Teams
  40: {
    id: 40,
    canonicalName: "Liverpool FC",
    displayName: "Liverpool",
    aliases: ["Liverpool", "Liverpool FC", "The Reds", "LFC"],
    country: "England",
    countryCode: "GB",
    founded: 1892,
    colors: {
      primary: "#C8102E",
      secondary: "#F6EB61"
    }
  },
  50: {
    id: 50,
    canonicalName: "Manchester City FC",
    displayName: "Manchester City", 
    aliases: ["Manchester City", "Man City", "City", "MCFC"],
    country: "England",
    countryCode: "GB",
    founded: 1880,
    colors: {
      primary: "#6CABDD",
      secondary: "#1C2C5B"
    }
  },
  42: {
    id: 42,
    canonicalName: "Arsenal FC",
    displayName: "Arsenal",
    aliases: ["Arsenal", "Arsenal FC", "The Gunners", "AFC"],
    country: "England", 
    countryCode: "GB",
    founded: 1886,
    colors: {
      primary: "#EF0107",
      secondary: "#023474"
    }
  },
  49: {
    id: 49,
    canonicalName: "Chelsea FC",
    displayName: "Chelsea",
    aliases: ["Chelsea", "Chelsea FC", "The Blues", "CFC"],
    country: "England",
    countryCode: "GB", 
    founded: 1905,
    colors: {
      primary: "#034694",
      secondary: "#FFFFFF"
    }
  },
  33: {
    id: 33,
    canonicalName: "Manchester United FC",
    displayName: "Manchester United",
    aliases: ["Manchester United", "Man United", "Man Utd", "United", "MUFC"],
    country: "England",
    countryCode: "GB",
    founded: 1878,
    colors: {
      primary: "#DA020E",
      secondary: "#FFF200"
    }
  },

  // La Liga Teams
  541: {
    id: 541,
    canonicalName: "Real Madrid CF", 
    displayName: "Real Madrid",
    aliases: ["Real Madrid", "Real Madrid CF", "Los Blancos", "Madrid"],
    country: "Spain",
    countryCode: "ES",
    founded: 1902,
    colors: {
      primary: "#FFFFFF",
      secondary: "#A50044"
    }
  },
  529: {
    id: 529,
    canonicalName: "FC Barcelona",
    displayName: "Barcelona", 
    aliases: ["Barcelona", "FC Barcelona", "Barca", "Barça", "FCB"],
    country: "Spain",
    countryCode: "ES",
    founded: 1899,
    colors: {
      primary: "#A50044",
      secondary: "#004D98"
    }
  },
  530: {
    id: 530,
    canonicalName: "Club Atlético de Madrid",
    displayName: "Atlético Madrid",
    aliases: ["Atlético Madrid", "Atletico Madrid", "Atleti", "ATM"],
    country: "Spain", 
    countryCode: "ES",
    founded: 1903,
    colors: {
      primary: "#CE2029",
      secondary: "#FFFFFF"
    }
  }
};

export const COUNTRY_FLAGS: Record<string, string> = {
  // SVG flag icons as data URLs for fast loading
  "GB": `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
      <clipPath id="t"><path d="m30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath>
      <path d="m0,0v30h60v-30z" fill="#012169"/>
      <path d="m0,0 60,30m0-30-60,30" stroke="#fff" stroke-width="6"/>
      <path d="m0,0 60,30m0-30-60,30" clip-path="url(#t)" stroke="#C8102E" stroke-width="4"/>
      <path d="m30,0v30m-30-15h60" stroke="#fff" stroke-width="10"/>
      <path d="m30,0v30m-30-15h60" stroke="#C8102E" stroke-width="6"/>
    </svg>
  `)}`,
  "ES": `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2">
      <path fill="#AA151B" d="M0,0H3V2H0"/>
      <path fill="#F1BF00" d="M0,.5H3V1.5H0"/>
    </svg>
  `)}`
};

/**
 * Get canonical team information by ID
 */
export function getCanonicalTeam(teamId: number): CanonicalTeam | undefined {
  return CANONICAL_TEAMS[teamId];
}

/**
 * Get team name with fallback to canonical name
 */
export function getTeamDisplayName(teamId: number, fallbackName?: string): string {
  const canonical = getCanonicalTeam(teamId);
  if (canonical) {
    return canonical.displayName;
  }
  return fallbackName || `Team ${teamId}`;
}

/**
 * Get country flag URL for team
 */
export function getTeamFlag(teamId: number): string | undefined {
  const canonical = getCanonicalTeam(teamId);
  if (canonical && COUNTRY_FLAGS[canonical.countryCode]) {
    return COUNTRY_FLAGS[canonical.countryCode];
  }
  return undefined;
}

/**
 * Get team colors for consistent theming
 */
export function getTeamColors(teamId: number): { primary: string; secondary: string } | undefined {
  const canonical = getCanonicalTeam(teamId);
  return canonical?.colors;
}

/**
 * Check if team name matches any alias (for search/filtering)
 */
export function matchesTeamAlias(teamId: number, searchName: string): boolean {
  const canonical = getCanonicalTeam(teamId);
  if (!canonical) return false;
  
  const searchLower = searchName.toLowerCase();
  return canonical.aliases.some(alias => 
    alias.toLowerCase().includes(searchLower)
  );
}