# Ethical Scraping Strategy

## Data Sources & Targets

### Primary Sources:
1. **FBref.com** - Advanced stats, xG data, team performance
2. **WhoScored.com** - Player ratings, team ratings, match insights
3. **SofaScore.com** - Live match data, momentum indicators
4. **Transfermarkt.com** - Squad info, injuries, market values
5. **Understat.com** - Expected goals (xG) detailed data

### Ethical Guidelines:
- Respect robots.txt files
- Maximum 1 request per minute per site
- User-Agent rotation with realistic headers
- IP rotation through free proxy pools
- Fair use disclaimers and attribution

## Stealth & Resilience Practices

### Anti-Detection:
```python
# User-Agent rotation
from fake_useragent import UserAgent
ua = UserAgent()

# Proxy rotation (5-10 free proxies)
PROXY_POOL = [
    "proxy1:port", "proxy2:port", "proxy3:port"
]

# Request intervals (10-30 seconds)
import random
time.sleep(random.uniform(10, 30))
```

### Fallback Strategy:
1. **Primary**: Live scraping with stealth
2. **Secondary**: Cached data from previous successful scrapes
3. **Tertiary**: Historical data from SQLite archive
4. **Emergency**: Static baseline models

## Data Persistence

### SQLite Schema:
```sql
-- Scraped match statistics
CREATE TABLE scraped_matches (
    id INTEGER PRIMARY KEY,
    fixture_id INTEGER,
    home_xg REAL,
    away_xg REAL,
    home_rating REAL,
    away_rating REAL,
    momentum_score REAL,
    scraped_at TIMESTAMP
);

-- Injury reports
CREATE TABLE injuries (
    id INTEGER PRIMARY KEY,
    player_name TEXT,
    team_id INTEGER,
    injury_type TEXT,
    expected_return DATE,
    scraped_at TIMESTAMP
);
```

### Caching Strategy:
- **L1 Cache**: In-memory (functools.lru_cache)
- **L2 Cache**: Local file system JSON
- **L3 Cache**: SQLite persistent storage
- **TTL**: 30 minutes for live data, 24 hours for historical