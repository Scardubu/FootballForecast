# Football Forecast Platform: Production Web Scraping & Data Enrichment Specification

**Role:** Senior full-stack/data engineer completing the Football Forecast Platform  
**Context:** Reference `FINAL_PRODUCTION_STATUS.md` for current system state  
**Constraint:** **NO API keys available** — all data acquisition via ethical web scraping  
**Mission:** Build production-grade scraping pipelines using only free, publicly accessible sources while maintaining performance, reliability, and legal compliance.

---

## 1. Core Requirements

### 1.1 Data Enrichment Goals
- Build **100% scraping-based ingestion** (no paid APIs, no authentication required)
- Maintain **≥3 seasons historical + current season** coverage
- Ensure **provenance tracking**, deduplication, and schema normalization
- Achieve **explicit explainability**: show which scraped signals influenced predictions

### 1.2 Performance & Compliance
- **Latency target:** <2s P95 for predictions
- **Zero-cost constraint:** Use only free, publicly accessible sources
- **Ethical scraping:** Respect robots.txt, implement aggressive rate limiting, rotate user agents
- **Resilience:** Graceful degradation when sources fail

---

## 2. Free Data Sources (No API Keys Required)

### 2.1 FBref ⭐ PRIMARY SOURCE (Highest Priority)
**Why:** Free, comprehensive, well-structured, rarely changes HTML  
**What to scrape:**
- League tables (current + historical seasons)
- Match results with detailed stats (xG, shots, possession, passes)
- Team stats per season
- Head-to-head records
- Fixture schedules

**Implementation:**
- **Tool:** BeautifulSoup + requests (static HTML, scraper-friendly)
- **URL patterns:**
  - League table: `https://fbref.com/en/comps/9/Premier-League-Stats`
  - Match results: `https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures`
  - Team detail: `https://fbref.com/en/squads/{team_id}/`
- **Cadence:** 
  - Historical backfill: One-time on deploy
  - Current season: Daily at 6 AM (post-match updates)
  - Matchday updates: Every 2 hours
- **Rate limit:** 1 request per 3 seconds (very conservative)
- **Priority fields:** `match_date`, `home_team`, `away_team`, `home_goals`, `away_goals`, `home_xg`, `away_xg`, `possession_home`, `possession_away`, `shots_on_target_home`, `shots_on_target_away`

**Robots.txt status:** ✅ Allows scraping with rate limiting

---

### 2.2 Understat ⭐ PRIMARY SOURCE (xG Specialist)
**Why:** Best free source for expected goals (xG) data  
**What to scrape:**
- Match-level xG
- Player-level xG
- Shot maps (for advanced analysis)
- Team xG trends

**Implementation:**
- **Tool:** BeautifulSoup + requests (JSON embedded in HTML)
- **Technique:** Extract JSON from `<script>` tags (data stored in JavaScript variables)
- **URL patterns:**
  - League: `https://understat.com/league/EPL`
  - Team: `https://understat.com/team/{team_name}/{season}`
  - Match: `https://understat.com/match/{match_id}`
- **Cadence:**
  - Historical: One-time backfill
  - Current: Daily post-match updates
- **Rate limit:** 1 request per 2 seconds
- **Priority fields:** `match_id`, `home_xg`, `away_xg`, `home_shots`, `away_shots`, `xg_per_player`

**Parsing tip:** Use regex to extract JSON: `var matchData = JSON.parse('...')`

---

### 2.3 FlashScore ⭐ REAL-TIME UPDATES
**Why:** Free live scores and fixtures (widely used, reliable)  
**What to scrape:**
- Live match events (goals, cards, substitutions)
- Fixture schedules
- Recent results
- Lineup confirmations (pre-match)

**Implementation:**
- **Tool:** Selenium/Playwright (heavy JavaScript, dynamic loading)
- **Challenge:** Aggressive anti-bot measures (CAPTCHA risk)
- **Mitigation:**
  - Rotate user agents
  - Random delays (3-8 seconds between actions)
  - Use undetected-chromedriver
  - Headless mode with real browser fingerprint
- **URL patterns:**
  - Fixtures: `https://www.flashscore.com/football/england/premier-league/fixtures/`
  - Live: `https://www.flashscore.com/match/{match_id}/`
- **Cadence:**
  - Fixtures: Daily at midnight
  - Live updates: Every 60 seconds during matches (only active matches)
- **Rate limit:** 1 request per 5 seconds minimum
- **Priority fields:** `match_status`, `live_score`, `match_minute`, `recent_events`, `lineups`

**⚠️ High-risk source:** Implement circuit breaker; if blocked, disable for 24h

---

### 2.4 SofaScore (Alternative Live Tracker)
**Why:** Comprehensive match stats, less aggressive anti-bot than FlashScore  
**What to scrape:**
- Live scores
- Match statistics (possession, shots, corners)
- Momentum/pressure indicators
- Player ratings

**Implementation:**
- **Tool:** Selenium + API endpoint discovery
- **Technique:** Intercept XHR requests (SofaScore loads data via API)
- **URL patterns:**
  - Match detail: `https://www.sofascore.com/match/{match_id}`
  - API endpoint (discover via DevTools): `https://api.sofascore.com/api/v1/event/{event_id}`
- **Cadence:** 
  - Live matches: Every 45-60 seconds
  - Completed matches: 2 hours post-match
- **Rate limit:** 1 request per 3 seconds
- **Priority fields:** `live_score`, `statistics`, `momentum`, `player_ratings`

**Pro tip:** API endpoints don't require JavaScript execution (faster than Selenium once discovered)

---

### 2.5 PhysioRoom (Injury Intelligence)
**Why:** Free, well-maintained injury database  
**What to scrape:**
- Current injury list per league
- Expected return dates
- Injury type/severity

**Implementation:**
- **Tool:** BeautifulSoup + requests (simple HTML tables)
- **URL patterns:**
  - Premier League: `https://www.physioroom.com/news/english_premier_league/epl_injury_table.php`
- **Cadence:**
  - Daily at 8 AM
  - Hourly on matchdays (6 hours before kickoff → 2 hours post-match)
- **Rate limit:** 1 request per 5 seconds
- **Priority fields:** `player_name`, `team`, `injury`, `expected_return_date`, `status`

**Parsing:** Simple table extraction, highly stable HTML structure

---

### 2.6 Transfermarkt (Squad Data & Market Values)
**Why:** Comprehensive squad information, free access  
**What to scrape:**
- Squad lists with player positions
- Injury updates (alternative to PhysioRoom)
- Market valuations (proxy for player quality)
- Transfer history

**Implementation:**
- **Tool:** BeautifulSoup + requests
- **Challenge:** Aggressive rate limiting (403 errors common)
- **Mitigation:**
  - Rotate user agents
  - Implement exponential backoff
  - Cache aggressively (24-48 hour TTL for squads)
- **URL patterns:**
  - Squad: `https://www.transfermarkt.com/{team_slug}/startseite/verein/{team_id}`
  - Injuries: `https://www.transfermarkt.com/{league}/verletztespieler/wettbewerb/{league_id}`
- **Cadence:**
  - Squad data: Weekly
  - Injuries: Daily
- **Rate limit:** 1 request per 8-10 seconds (very conservative)
- **Priority fields:** `player_name`, `position`, `age`, `market_value`, `injury_status`

**⚠️ Blocking risk:** Implement IP rotation if possible; fallback to manual CSV imports

---

### 2.7 OddsPortal (Market Odds - Free Tier)
**Why:** Free historical odds, no account required for basic data  
**What to scrape:**
- Closing odds (1X2, Over/Under)
- Odds movement (requires time-series scraping)
- Bookmaker consensus

**Implementation:**
- **Tool:** Selenium (JavaScript-heavy, dynamic content)
- **Challenge:** Anti-scraping measures, slow page loads
- **URL patterns:**
  - Match odds: `https://www.oddsportal.com/football/england/premier-league/{match_slug}/`
  - Odds archive: Available for historical matches
- **Cadence:**
  - Pre-match: 6 hours, 3 hours, 1 hour before kickoff
  - Post-match: One-time closing odds collection
- **Rate limit:** 1 request per 10 seconds
- **Priority fields:** `home_odds`, `draw_odds`, `away_odds`, `over_under_2_5`, `btts_odds`

**Alternative:** BetExplorer (similar data, slightly less aggressive anti-bot)

---

### 2.8 BBC Sport (News & Team News)
**Why:** Trusted source, RSS feeds available, less anti-scraping  
**What to scrape:**
- Match previews
- Team news headlines
- Lineup hints from manager quotes

**Implementation:**
- **Tool:** 
  - RSS feeds (primary): `feedparser` library
  - HTML scraping (fallback): BeautifulSoup
- **URL patterns:**
  - RSS: `http://feeds.bbci.co.uk/sport/football/rss.xml`
  - Match preview: `https://www.bbc.com/sport/football/{match_id}`
- **Cadence:**
  - RSS: Every 30 minutes on matchdays
  - Article scraping: Only for critical team news
- **Rate limit:** 1 request per 5 seconds (HTML), no limit on RSS
- **Priority fields:** `headline`, `snippet`, `publish_time`, `article_url`

**Legal note:** Extract only headlines/summaries (fair use), always link to source

---

### 2.9 WhoScored (Detailed Match Stats)
**Why:** Rich tactical statistics, free access  
**What to scrape:**
- Player ratings
- Tactical formations
- Pass maps and heatmaps
- Key match events

**Implementation:**
- **Tool:** Selenium (JavaScript-rendered content)
- **Challenge:** Requires careful parsing of dynamically loaded data
- **URL patterns:**
  - Match center: `https://www.whoscored.com/Matches/{match_id}/Live/`
- **Cadence:** Post-match only (2-6 hours after final whistle)
- **Rate limit:** 1 request per 5 seconds
- **Priority fields:** `player_ratings`, `formation`, `key_passes`, `dribbles`, `tackles`

**⚠️ Moderate risk:** Has anti-bot measures; implement graceful failures

---

### 2.10 OpenWeatherMap (Free Tier - No Key Required)
**Alternative:** Weather.com (No API key needed)  
**What to scrape:**
- Current conditions at stadium locations
- 5-day forecasts (covers upcoming fixtures)

**Implementation:**
- **Tool:** BeautifulSoup + requests
- **URL patterns:**
  - Weather.com: `https://weather.com/weather/today/l/{lat},{lon}`
  - Or use HTML scraping of city-based forecasts
- **Cadence:** Every 3 hours on matchdays
- **Rate limit:** 1 request per 10 seconds
- **Priority fields:** `temperature`, `wind_speed`, `precipitation`, `conditions`

**Note:** OpenWeatherMap free tier allows limited API calls, but HTML scraping is backup

---

## 3. Technical Architecture

### 3.1 Scraper Service Design
```
┌──────────────────────────────────────────────────┐
│            Scraper Orchestrator                  │
│  (Scheduler + Task Queue + Circuit Breaker)     │
└─────────────┬────────────────────────────────────┘
              │
    ┌─────────┴─────────┬─────────────┬─────────────┐
    │                   │             │             │
┌───▼────┐      ┌───────▼──┐   ┌──────▼───┐  ┌─────▼────┐
│BeautifulSoup│  │  Selenium│   │  Playwright│  │RSS Parser│
│  Workers  │    │  Workers │   │  Workers  │  │ Workers  │
└───┬────┘      └───────┬──┘   └──────┬───┘  └─────┬────┘
    │                   │             │             │
    └─────────┬─────────┴─────────────┴─────────────┘
              │
        ┌─────▼──────┐
        │ Raw Data   │
        │ Validation │
        └─────┬──────┘
              │
        ┌─────▼──────────┐
        │ Normalization  │
        │ & Deduplication│
        └─────┬──────────┘
              │
        ┌─────▼─────────┐
        │ Provenance DB │
        │ + Feature Store│
        └───────────────┘
```

### 3.2 Technology Stack (Zero-Cost)
- **Python 3.10+** (scraping language)
- **BeautifulSoup4** (static HTML parsing)
- **Selenium** with undetected-chromedriver (dynamic content)
- **Playwright** (alternative to Selenium, better performance)
- **requests** + **httpx** (HTTP client)
- **feedparser** (RSS feeds)
- **pandas** (data normalization)
- **SQLite** or **PostgreSQL** (provenance storage)
- **Redis** (caching layer, optional)
- **Scrapy** (for large-scale crawls, FBref historical backfill)

### 3.3 Provenance Schema
```python
{
  "scrape_id": "uuid",
  "source_name": "FBref|Understat|FlashScore|...",
  "source_url": "https://...",
  "scrape_timestamp": "2025-10-04T14:30:00Z",
  "scrape_duration_ms": 1250,
  "scrape_status": "success|partial|failed",
  "raw_html": "string (compressed)",  # Store for re-parsing
  "normalized_data": {
    "match_id": "canonical_id",
    "home_team": "string",
    "away_team": "string",
    # ... extracted fields
  },
  "validation_errors": [],
  "confidence_score": 0.95,  # Based on data completeness
  "parser_version": "v1.2.3"  # Track schema changes
}
```

### 3.4 Anti-Bot Mitigation Strategies

#### User Agent Rotation
```python
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...',
    # Rotate 10-15 realistic user agents
]
```

#### Rate Limiting (Per-Domain Config)
```python
RATE_LIMITS = {
    "fbref.com": {
        "requests_per_second": 0.33,  # 1 req per 3 sec
        "concurrent": 1,
        "backoff_on_error": "exponential"
    },
    "flashscore.com": {
        "requests_per_second": 0.2,  # 1 req per 5 sec
        "concurrent": 1,
        "backoff_on_error": "exponential",
        "max_retries": 2,
        "circuit_breaker_threshold": 5  # Stop after 5 failures
    },
    "transfermarkt.com": {
        "requests_per_second": 0.1,  # 1 req per 10 sec
        "concurrent": 1,
        "backoff_on_error": "exponential"
    }
}
```

#### Request Headers
```python
HEADERS = {
    'User-Agent': random.choice(USER_AGENTS),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/'  # Simulate organic traffic
}
```

#### Selenium Stealth Configuration
```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import undetected_chromedriver as uc

def get_stealthy_driver():
    options = uc.ChromeOptions()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--no-sandbox')
    options.add_argument(f'user-agent={random.choice(USER_AGENTS)}')
    
    driver = uc.Chrome(options=options)
    
    # Remove webdriver property
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver
```

#### Random Delays
```python
import random
import time

def human_delay(min_sec=2, max_sec=8):
    """Simulate human browsing patterns"""
    delay = random.uniform(min_sec, max_sec)
    time.sleep(delay)
```

#### Circuit Breaker Pattern
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=3600):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # 1 hour cooldown
        self.last_failure_time = None
        self.state = "closed"  # closed = working, open = blocked
    
    def call(self, func):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half_open"  # Try again
            else:
                raise Exception(f"Circuit breaker OPEN for {func.__name__}")
        
        try:
            result = func()
            self.failure_count = 0  # Reset on success
            self.state = "closed"
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
                # Alert monitoring system
            
            raise e
```

---

## 4. Implementation Roadmap (6-Week Plan)

### Week 1: Foundation
**Goal:** Infrastructure + FBref scraper (primary source)

- [ ] Set up scraper project structure (`scrapers/`, `parsers/`, `models/`)
- [ ] Implement base scraper class with rate limiting, user agent rotation
- [ ] Build provenance database schema
- [ ] Create FBref scraper for:
  - [ ] League tables (current season)
  - [ ] Match results with xG
  - [ ] Historical data (3 seasons backfill)
- [ ] Implement normalization pipeline
- [ ] Add unit tests for FBref parser
- [ ] **Milestone:** Successfully scrape & store 100+ matches from FBref

---

### Week 2: Core Stats Sources
**Goal:** Add Understat + injury data

- [ ] Build Understat scraper:
  - [ ] Extract JSON from `<script>` tags
  - [ ] Parse match-level xG
  - [ ] Backfill historical xG data
- [ ] Build PhysioRoom scraper:
  - [ ] Parse injury tables
  - [ ] Store injury history for impact analysis
- [ ] Implement deduplication logic (match canonical IDs between sources)
- [ ] Add conflict resolution (FBref xG vs Understat xG)
- [ ] Build data quality dashboard (Grafana or simple Flask app)
- [ ] **Milestone:** 95% data coverage for current season (FBref + Understat)

---

### Week 3: Live Data + Odds
**Goal:** Real-time scraping for live matches + market odds

- [ ] Build FlashScore scraper (Selenium):
  - [ ] Live score tracking
  - [ ] Lineup confirmations
  - [ ] Fixture schedule updates
- [ ] Implement circuit breaker for FlashScore (high block risk)
- [ ] Build SofaScore scraper (backup for live data):
  - [ ] Discover API endpoints
  - [ ] Parse match statistics
- [ ] Build OddsPortal scraper:
  - [ ] Pre-match odds collection
  - [ ] Closing odds (post-match)
- [ ] Implement caching layer (Redis) for live data
- [ ] **Milestone:** Successfully track 5+ live matches without getting blocked

---

### Week 4: Enrichment Sources
**Goal:** Squad data, news, weather

- [ ] Build Transfermarkt scraper:
  - [ ] Squad lists
  - [ ] Market values
  - [ ] Implement aggressive rate limiting (high block risk)
- [ ] Build BBC Sport news scraper:
  - [ ] RSS feed parser
  - [ ] Article headline extraction
- [ ] Build WhoScored scraper (post-match stats):
  - [ ] Player ratings
  - [ ] Tactical formations
- [ ] Build Weather scraper (Weather.com):
  - [ ] Stadium-based forecasts
  - [ ] Match-time weather conditions
- [ ] **Milestone:** Complete enrichment pipeline (injuries + news + weather)

---

### Week 5: Feature Integration
**Goal:** Wire scraped data into prediction model

- [ ] Map scraped fields to model features:
  - [ ] Injury-adjusted squad strength
  - [ ] Odds-implied probabilities
  - [ ] Weather adjustments for xG
  - [ ] Form indicators from recent results
- [ ] Build feature engineering pipeline:
  - [ ] Compute derived metrics (rolling averages, momentum scores)
  - [ ] Handle missing data gracefully
- [ ] Implement explainability logging:
  - [ ] Track which signals changed predictions
  - [ ] Store adjustment magnitudes
- [ ] Add A/B testing framework:
  - [ ] Seed-data-only predictions (baseline)
  - [ ] Seed + scraped predictions (experimental)
- [ ] **Milestone:** Predictions using scraped signals with <2s latency

---

### Week 6: Testing, Monitoring & Polish
**Goal:** Production-ready system

- [ ] Comprehensive testing:
  - [ ] Parser regression tests (detect HTML changes)
  - [ ] End-to-end scraping → prediction flow
  - [ ] Load testing (1000+ concurrent predictions)
  - [ ] Failure mode testing (sources down)
- [ ] Build monitoring dashboard:
  - [ ] Scraper health (success rates, latency)
  - [ ] Data freshness indicators
  - [ ] Source reliability scores
  - [ ] Prediction latency P95/P99
- [ ] Implement alerting:
  - [ ] Scraper failures >5 consecutive
  - [ ] Data freshness >2x expected lag
  - [ ] Prediction latency >3s
  - [ ] Circuit breaker activation
- [ ] Documentation:
  - [ ] Scraper maintenance guide
  - [ ] Parser update procedures
  - [ ] Troubleshooting runbook
- [ ] **Milestone:** Production deployment with 95% uptime target

---

## 5. Scraper Code Templates

### 5.1 BeautifulSoup Base Class
```python
import requests
from bs4 import BeautifulSoup
import time
import random
from typing import Optional, Dict, Any
import logging

class BaseScraper:
    def __init__(self, source_name: str, base_url: str, rate_limit: float = 1.0):
        self.source_name = source_name
        self.base_url = base_url
        self.rate_limit = rate_limit  # Requests per second
        self.last_request_time = 0
        self.session = requests.Session()
        self.logger = logging.getLogger(f"scraper.{source_name}")
        
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            # Add more user agents
        ]
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/',
            'DNT': '1'
        }
    
    def _throttle(self):
        """Enforce rate limiting"""
        elapsed = time.time() - self.last_request_time
        min_interval = 1.0 / self.rate_limit
        
        if elapsed < min_interval:
            sleep_time = min_interval - elapsed + random.uniform(0.5, 2.0)
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def fetch(self, url: str, retries: int = 3) -> Optional[BeautifulSoup]:
        """Fetch and parse HTML with retries"""
        self._throttle()
        
        for attempt in range(retries):
            try:
                response = self.session.get(
                    url,
                    headers=self._get_headers(),
                    timeout=30
                )
                
                if response.status_code == 200:
                    self.logger.info(f"Successfully fetched {url}")
                    return BeautifulSoup(response.content, 'html.parser')
                
                elif response.status_code == 429:
                    wait_time = 2 ** attempt * 60  # Exponential backoff
                    self.logger.warning(f"Rate limited. Waiting {wait_time}s")
                    time.sleep(wait_time)
                
                else:
                    self.logger.error(f"HTTP {response.status_code} for {url}")
                    
            except Exception as e:
                self.logger.error(f"Attempt {attempt+1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
        
        return None
    
    def save_raw(self, data: Dict[str, Any]):
        """Save raw scraped data with provenance"""
        from datetime import datetime
        import json
        
        record = {
            "scrape_id": str(uuid.uuid4()),
            "source_name": self.source_name,
            "scrape_timestamp": datetime.utcnow().isoformat(),
            "raw_data": data
        }
        
        # Save to database (implement your DB logic)
        # db.insert("scraped_raw", record)
        
        self.logger.info(f"Saved scrape_id: {record['scrape_id']}")
```

### 5.2 FBref Match Scraper Example
```python
class FBrefScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="FBref",
            base_url="https://fbref.com",
            rate_limit=0.33  # 1 request per 3 seconds
        )
    
    def scrape_league_table(self, league_id: str = "9", season: str = "2024-2025"):
        """Scrape Premier League table"""
        url = f"{self.base_url}/en/comps/{league_id}/{season}/schedule/{season}-Premier-League-Scores-and-Fixtures"
        
        soup = self.fetch(url)
        if not soup:
            return []
        
        matches = []
        table = soup.find('table', {'id': 'sched_2024-2025_9_1'})
        
        if not table:
            self.logger.error("Could not find fixtures table")
            return []
        
        rows = table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                cells = row.find_all('td')
                if len(cells) < 10:
                    continue
                
                match_data = {
                    'date': cells[1].text.strip(),
                    'home_team': cells[3].text.strip(),
                    'away_team': cells[5].text.strip(),
                    'home_goals': cells[4].text.strip() or None,
                    'away_goals': cells[6].text.strip() or None,
                    'home_xg': cells[7].text.strip() or None,
                    'away_xg': cells[8].text.strip() or None,
                    'attendance': cells[9].text.strip() or None,
                    'source_url': url
                }
                
                matches.append(match_data)
                
            except Exception as e:
                self.logger.warning(f"Failed to parse row: {e}")
                continue
        
        self.save_raw({'matches': matches})
        return matches
```

### 5.3 Understat xG Scraper
```python
import re
import json

class UnderstatScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Understat",
            base_url="https://understat.com",
            rate_limit=0.5  # 1 request per 2 seconds
        )
    
    def scrape_match_xg(self, match_id: str):
        """Extract xG data from embedded JSON"""
        url = f"{self.base_url}/match/{match_id}"
        
        soup = self.fetch(url)
        if not soup:
            return None
        
        # Find script tag containing match data
        scripts = soup.find_all('script')
        
        for script in scripts:
            if 'matchData' in script.text:
                # Extract JSON using regex
                match = re.search(r'var matchData = JSON\.parse\(\'(.+?)\'\)', script.text)
                if match:
                    json_str = match.group(1).encode().decode('unicode_escape')
                    data = json.loads(json_str)
                    
                    match_data = {
                        'match_id': match_id,
                        'home_team': data['h']['title'],
                        'away_team': data['a']['title'],
                        'home_xg': float(data['h']['xG']),
                        'away_xg': float(data['a']['xG']),
                        'home_shots': len(data['h']['shots']),
                        'away_shots': len(data['a']['shots']),
                        'source_url': url
                    }
                    
                    self.save_raw(match_data)
                    return match_data
        
        self.logger.error(f"Could not find matchData for {match_id}")
        return None
```

### 5.4 Selenium Scraper for FlashScore
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import undetected_chromedriver as uc

class FlashScoreScraper:
    def __init__(self):
        self.source_name = "FlashScore"
        self.base_

```python
        self.base_url = "https://www.flashscore.com"
        self.driver = None
        self.logger = logging.getLogger(f"scraper.{self.source_name}")
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=3600)
    
    def _init_driver(self):
        """Initialize stealthy Chrome driver"""
        if self.driver:
            return
        
        options = uc.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--no-sandbox')
        options.add_argument('--headless')  # Run in background
        options.add_argument(f'user-agent={random.choice(USER_AGENTS)}')
        
        self.driver = uc.Chrome(options=options)
        
        # Remove webdriver property
        self.driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
    
    def scrape_live_matches(self):
        """Scrape currently live matches"""
        def _scrape():
            self._init_driver()
            url = f"{self.base_url}/football/england/premier-league/"
            
            self.driver.get(url)
            time.sleep(random.uniform(3, 6))  # Human-like delay
            
            # Wait for match elements to load
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "event__match"))
                )
            except Exception as e:
                self.logger.error(f"Timeout waiting for matches: {e}")
                return []
            
            matches = []
            match_elements = self.driver.find_elements(By.CLASS_NAME, "event__match")
            
            for element in match_elements:
                try:
                    # Check if match is live
                    status_elem = element.find_element(By.CLASS_NAME, "event__stage")
                    status = status_elem.text.strip()
                    
                    if "'" not in status:  # Not live if no minute marker
                        continue
                    
                    home_team = element.find_element(By.CLASS_NAME, "event__participant--home").text
                    away_team = element.find_element(By.CLASS_NAME, "event__participant--away").text
                    
                    score_elem = element.find_element(By.CLASS_NAME, "event__score")
                    score_parts = score_elem.text.split(' - ')
                    
                    match_data = {
                        'home_team': home_team,
                        'away_team': away_team,
                        'home_score': int(score_parts[0]) if len(score_parts) == 2 else None,
                        'away_score': int(score_parts[1]) if len(score_parts) == 2 else None,
                        'minute': status,
                        'status': 'live',
                        'timestamp': datetime.utcnow().isoformat(),
                        'source_url': url
                    }
                    
                    matches.append(match_data)
                    
                except Exception as e:
                    self.logger.warning(f"Failed to parse match element: {e}")
                    continue
            
            return matches
        
        try:
            return self.circuit_breaker.call(_scrape)
        except Exception as e:
            self.logger.error(f"Circuit breaker blocked or scraping failed: {e}")
            return []
    
    def close(self):
        """Clean up driver"""
        if self.driver:
            self.driver.quit()
            self.driver = None
```

### 5.5 PhysioRoom Injury Scraper
```python
class PhysioRoomScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="PhysioRoom",
            base_url="https://www.physioroom.com",
            rate_limit=0.2  # 1 request per 5 seconds
        )
    
    def scrape_premier_league_injuries(self):
        """Scrape Premier League injury table"""
        url = f"{self.base_url}/news/english_premier_league/epl_injury_table.php"
        
        soup = self.fetch(url)
        if not soup:
            return []
        
        injuries = []
        
        # Find the injury table
        table = soup.find('table', {'class': 'injury-table'})
        if not table:
            # Try alternative selector
            table = soup.find('table')
        
        if not table:
            self.logger.error("Could not find injury table")
            return []
        
        rows = table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                cells = row.find_all('td')
                if len(cells) < 5:
                    continue
                
                injury_data = {
                    'player_name': cells[0].text.strip(),
                    'team': cells[1].text.strip(),
                    'injury': cells[2].text.strip(),
                    'status': cells[3].text.strip(),
                    'expected_return': cells[4].text.strip(),
                    'scrape_date': datetime.utcnow().isoformat(),
                    'source_url': url
                }
                
                injuries.append(injury_data)
                
            except Exception as e:
                self.logger.warning(f"Failed to parse injury row: {e}")
                continue
        
        self.save_raw({'injuries': injuries})
        return injuries
```

---

## 6. Data Normalization Pipeline

### 6.1 Schema Normalization
```python
from typing import Dict, Any, Optional
import re
from datetime import datetime

class DataNormalizer:
    def __init__(self):
        self.team_name_mapping = {
            # Map variations to canonical names
            'Man United': 'Manchester United',
            'Man City': 'Manchester City',
            'Spurs': 'Tottenham Hotspur',
            # Add comprehensive mappings
        }
    
    def normalize_team_name(self, name: str) -> str:
        """Standardize team names across sources"""
        name = name.strip()
        return self.team_name_mapping.get(name, name)
    
    def normalize_match(self, raw_match: Dict[str, Any], source: str) -> Dict[str, Any]:
        """Normalize match data from different sources"""
        
        normalized = {
            'match_id': self._generate_match_id(raw_match),
            'home_team': self.normalize_team_name(raw_match.get('home_team', '')),
            'away_team': self.normalize_team_name(raw_match.get('away_team', '')),
            'match_date': self._parse_date(raw_match.get('date')),
            'home_goals': self._safe_int(raw_match.get('home_goals')),
            'away_goals': self._safe_int(raw_match.get('away_goals')),
            'home_xg': self._safe_float(raw_match.get('home_xg')),
            'away_xg': self._safe_float(raw_match.get('away_xg')),
            'source': source,
            'source_url': raw_match.get('source_url'),
            'confidence': self._calculate_confidence(raw_match, source),
            'normalized_at': datetime.utcnow().isoformat()
        }
        
        return normalized
    
    def _generate_match_id(self, match: Dict) -> str:
        """Generate canonical match ID"""
        home = self.normalize_team_name(match.get('home_team', ''))
        away = self.normalize_team_name(match.get('away_team', ''))
        date = self._parse_date(match.get('date'))
        
        # Format: YYYYMMDD_HOME_AWAY
        date_str = date.strftime('%Y%m%d') if date else 'unknown'
        return f"{date_str}_{home.replace(' ', '_')}_{away.replace(' ', '_')}".lower()
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse various date formats"""
        if not date_str:
            return None
        
        date_formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%d.%m.%Y',
            '%b %d, %Y',
            '%d %b %Y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return None
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert to integer"""
        if value is None or value == '':
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert to float"""
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _calculate_confidence(self, match: Dict, source: str) -> float:
        """Calculate confidence score based on data completeness"""
        source_reliability = {
            'FBref': 0.95,
            'Understat': 0.90,
            'FlashScore': 0.85,
            'SofaScore': 0.85,
            'PhysioRoom': 0.90,
            'OddsPortal': 0.80
        }
        
        base_confidence = source_reliability.get(source, 0.70)
        
        # Adjust based on data completeness
        required_fields = ['home_team', 'away_team', 'date']
        optional_fields = ['home_goals', 'away_goals', 'home_xg', 'away_xg']
        
        required_complete = sum(1 for f in required_fields if match.get(f))
        optional_complete = sum(1 for f in optional_fields if match.get(f))
        
        completeness = (required_complete / len(required_fields)) * 0.7 + \
                       (optional_complete / len(optional_fields)) * 0.3
        
        return base_confidence * completeness
```

### 6.2 Deduplication & Conflict Resolution
```python
class DataDeduplicator:
    def __init__(self):
        self.normalizer = DataNormalizer()
    
    def merge_match_data(self, matches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge match data from multiple sources"""
        if not matches:
            return {}
        
        # Group by canonical match_id
        grouped = {}
        for match in matches:
            match_id = match.get('match_id')
            if match_id not in grouped:
                grouped[match_id] = []
            grouped[match_id].append(match)
        
        merged_matches = []
        
        for match_id, versions in grouped.items():
            merged = self._merge_versions(versions)
            merged_matches.append(merged)
        
        return merged_matches
    
    def _merge_versions(self, versions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge multiple versions of the same match"""
        # Sort by confidence score
        versions = sorted(versions, key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Start with highest confidence version
        merged = versions[0].copy()
        merged['sources'] = [versions[0]['source']]
        
        # Fill in missing fields from other sources
        for version in versions[1:]:
            merged['sources'].append(version['source'])
            
            for key, value in version.items():
                # Skip metadata fields
                if key in ['source', 'source_url', 'confidence', 'normalized_at']:
                    continue
                
                # Fill missing fields
                if merged.get(key) is None and value is not None:
                    merged[key] = value
                
                # Resolve conflicts for critical fields
                elif key in ['home_xg', 'away_xg'] and merged.get(key) != value:
                    # Average xG values from multiple sources
                    current = merged[key]
                    if current is not None and value is not None:
                        merged[key] = (current + value) / 2
                        merged[f'{key}_sources'] = merged['sources']
        
        merged['merge_count'] = len(versions)
        merged['merged_at'] = datetime.utcnow().isoformat()
        
        return merged
```

---

## 7. Feature Engineering Integration

### 7.1 Injury Impact Calculator
```python
class InjuryImpactCalculator:
    def __init__(self):
        self.position_weights = {
            'Goalkeeper': 0.15,
            'Defender': 0.10,
            'Midfielder': 0.12,
            'Forward': 0.15
        }
    
    def calculate_team_impact(self, injuries: List[Dict], squad: List[Dict]) -> float:
        """Calculate overall team strength impact from injuries"""
        if not injuries:
            return 0.0
        
        total_impact = 0.0
        
        for injury in injuries:
            player_name = injury.get('player_name')
            player = self._find_player(player_name, squad)
            
            if not player:
                continue
            
            # Base impact by position
            position = player.get('position', 'Midfielder')
            base_impact = self.position_weights.get(position, 0.10)
            
            # Adjust by player importance (market value proxy)
            market_value = player.get('market_value', 0)
            squad_max_value = max([p.get('market_value', 0) for p in squad]) or 1
            importance_factor = market_value / squad_max_value
            
            # Adjust by injury severity
            severity_multiplier = self._get_severity_multiplier(injury)
            
            player_impact = base_impact * importance_factor * severity_multiplier
            total_impact += player_impact
        
        # Cap at -0.30 (max 30% reduction)
        return min(total_impact, 0.30)
    
    def _find_player(self, name: str, squad: List[Dict]) -> Optional[Dict]:
        """Find player in squad by name"""
        name_lower = name.lower()
        for player in squad:
            if name_lower in player.get('name', '').lower():
                return player
        return None
    
    def _get_severity_multiplier(self, injury: Dict) -> float:
        """Estimate severity multiplier from injury description"""
        injury_text = injury.get('injury', '').lower()
        status = injury.get('status', '').lower()
        
        # Long-term injuries
        if any(term in injury_text for term in ['acl', 'cruciate', 'fracture']):
            return 1.0
        
        # Medium-term
        if any(term in injury_text for term in ['hamstring', 'groin', 'calf']):
            return 0.8
        
        # Short-term
        if 'doubtful' in status or 'knock' in injury_text:
            return 0.5
        
        return 0.7  # Default
```

### 7.2 Odds-Based Probability Calculator
```python
class OddsConverter:
    @staticmethod
    def odds_to_probability(decimal_odds: float) -> float:
        """Convert decimal odds to implied probability"""
        if decimal_odds <= 1.0:
            return 0.0
        return 1.0 / decimal_odds
    
    @staticmethod
    def remove_vig(probabilities: Dict[str, float]) -> Dict[str, float]:
        """Remove bookmaker margin (vig) from probabilities"""
        total = sum(probabilities.values())
        
        if total <= 1.0:
            return probabilities
        
        # Normalize to sum to 1.0
        return {k: v / total for k, v in probabilities.items()}
    
    def calculate_market_consensus(self, odds_data: List[Dict]) -> Dict[str, float]:
        """Calculate consensus probability from multiple bookmakers"""
        home_probs = []
        draw_probs = []
        away_probs = []
        
        for odds in odds_data:
            if odds.get('home_odds'):
                home_probs.append(self.odds_to_probability(odds['home_odds']))
            if odds.get('draw_odds'):
                draw_probs.append(self.odds_to_probability(odds['draw_odds']))
            if odds.get('away_odds'):
                away_probs.append(self.odds_to_probability(odds['away_odds']))
        
        consensus = {
            'home_win': np.mean(home_probs) if home_probs else None,
            'draw': np.mean(draw_probs) if draw_probs else None,
            'away_win': np.mean(away_probs) if away_probs else None
        }
        
        # Remove vig
        if all(consensus.values()):
            consensus = self.remove_vig(consensus)
        
        return consensus
    
    def calculate_odds_drift(self, historical_odds: List[Dict]) -> Dict[str, float]:
        """Calculate odds movement over time"""
        if len(historical_odds) < 2:
            return {'drift': 0.0}
        
        # Sort by timestamp
        sorted_odds = sorted(historical_odds, key=lambda x: x.get('timestamp', ''))
        
        earliest = sorted_odds[0]
        latest = sorted_odds[-1]
        
        drift = {}
        
        for outcome in ['home_odds', 'draw_odds', 'away_odds']:
            early_prob = self.odds_to_probability(earliest.get(outcome, 0))
            late_prob = self.odds_to_probability(latest.get(outcome, 0))
            
            if early_prob > 0:
                drift[outcome] = ((late_prob - early_prob) / early_prob) * 100
        
        return drift
```

### 7.3 Weather Impact Adjuster
```python
class WeatherAdjuster:
    def adjust_xg_for_weather(self, base_xg: float, weather: Dict) -> float:
        """Adjust expected goals based on weather conditions"""
        adjusted_xg = base_xg
        
        # Heavy rain reduces goals
        precipitation = weather.get('precipitation_mm', 0)
        if precipitation > 5:
            adjusted_xg *= 0.95  # 5% reduction
        elif precipitation > 10:
            adjusted_xg *= 0.90  # 10% reduction
        
        # Strong wind affects play
        wind_speed = weather.get('wind_speed_kmh', 0)
        if wind_speed > 30:
            adjusted_xg *= 0.92  # 8% reduction
        elif wind_speed > 50:
            adjusted_xg *= 0.85  # 15% reduction
        
        # Extreme cold
        temperature = weather.get('temperature_c', 15)
        if temperature < 0:
            adjusted_xg *= 0.93  # 7% reduction
        
        return adjusted_xg
```

---

## 8. Monitoring & Alerting

### 8.1 Scraper Health Monitor
```python
import sqlite3
from datetime import datetime, timedelta

class ScraperHealthMonitor:
    def __init__(self, db_path: str = 'monitoring.db'):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize monitoring database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scraper_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scraper_name TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                status TEXT,
                records_scraped INTEGER,
                errors TEXT,
                duration_ms INTEGER
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                scraper_name TEXT,
                message TEXT,
                severity TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def log_scraper_run(self, scraper_name: str, status: str, 
                        records: int, duration_ms: int, errors: str = None):
        """Log scraper execution"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO scraper_runs 
            (scraper_name, start_time, end_time, status, records_scraped, errors, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            scraper_name,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat(),
            status,
            records,
            errors,
            duration_ms
        ))
        
        conn.commit()
        conn.close()
    
    def check_health(self) -> Dict[str, Any]:
        """Check overall scraper health"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Success rate last 24 hours
        cursor.execute('''
            SELECT scraper_name, 
                   COUNT(*) as total,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
            FROM scraper_runs
            WHERE start_time > datetime('now', '-24 hours')
            GROUP BY scraper_name
        ''')
        
        health = {}
        
        for row in cursor.fetchall():
            scraper_name, total, successful = row
            success_rate = (successful / total) * 100 if total > 0 else 0
            
            health[scraper_name] = {
                'success_rate': success_rate,
                'total_runs': total,
                'status': 'healthy' if success_rate >= 95 else 'degraded' if success_rate >= 80 else 'unhealthy'
            }
            
            # Create alert if unhealthy
            if success_rate < 80:
                self.create_alert(
                    alert_type='low_success_rate',
                    scraper_name=scraper_name,
                    message=f'Success rate dropped to {success_rate:.1f}%',
                    severity='critical' if success_rate < 50 else 'warning'
                )
        
        conn.close()
        return health
    
    def create_alert(self, alert_type: str, scraper_name: str, 
                     message: str, severity: str):
        """Create alert"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if alert already exists (not resolved)
        cursor.execute('''
            SELECT id FROM alerts
            WHERE alert_type = ? AND scraper_name = ? AND resolved_at IS NULL
        ''', (alert_type, scraper_name))
        
        if cursor.fetchone():
            conn.close()
            return  # Alert already exists
        
        cursor.execute('''
            INSERT INTO alerts (alert_type, scraper_name, message, severity, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (alert_type, scraper_name, message, severity, datetime.utcnow().isoformat()))
        
        conn.commit()
        conn.close()
        
        # Send notification (implement your notification logic)
        self._send_notification(severity, message)
    
    def _send_notification(self, severity: str, message: str):
        """Send alert notification"""
        # Implement: Email, Slack, Discord, etc.
        print(f"[{severity.upper()}] {message}")
```

### 8.2 Data Freshness Checker
```python
class DataFreshnessChecker:
    def __init__(self, db_connection):
        self.db = db_connection
        self.expected_cadence = {
            'FBref': timedelta(hours=24),
            'Understat': timedelta(hours=24),
            'FlashScore': timedelta(minutes=5),  # During matches
            'PhysioRoom': timedelta(hours=24),
            'OddsPortal': timedelta(hours=6)
        }
    
    def check_freshness(self) -> Dict[str, Any]:
        """Check data freshness for all sources"""
        results = {}
        
        for source, expected_lag in self.expected_cadence.items():
            last_scrape = self._get_last_scrape_time(source)
            
            if not last_scrape:
                results[source] = {'status': 'no_data', 'lag': None}
                continue
            
            lag = datetime.utcnow() - last_scrape
            is_stale = lag > (expected_lag * 2)  # Alert if 2x expected lag
            
            results[source] = {
                'status': 'stale' if is_stale else 'fresh',
                'lag_hours': lag.total_seconds() / 3600,
                'expected_lag_hours': expected_lag.total_seconds() / 3600,
                'last_scrape': last_scrape.isoformat()
            }
        
        return results
    
    def _get_last_scrape_time(self, source: str) -> Optional[datetime]:
        """Get timestamp of last successful scrape"""
        # Query your database
        # This is a placeholder - implement based on your DB schema
        pass
```

---

## 9. Deployment & Operations

### 9.1 Docker Compose Setup
```yaml
version: '3.8'

services:
  scraper-orchestrator:
    build: ./scrapers
    environment:
      - PYTHONUNBUFFERED=1
      - LOG_LEVEL=INFO
    volumes:
      - ./scrapers:/app
      - ./data:/data
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    command: python orchestrator.py

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: football_forecast
      POSTGRES_USER: scraper
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  monitoring:
    build: ./monitoring
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      - DB_HOST=postgres
      - DB_NAME=football_forecast

volumes:
  postgres_data:
  redis_data:
```

### 9.2 Cron Schedule Configuration
```python
# scheduler_config.py

SCRAPER_SCHEDULE = {
    'fbref_historical': {
        'scraper': 'FBrefScraper',
        'method': 'scrape_league_table',
        'cron': '0 6 * * *',  # Daily at 6 AM
        'enabled': True
    },
    'fbref_live': {
        'scraper': 'FBrefScraper',
        'method': 'scrape_league_table',
        'cron': '0 */2 * * *',  # Every 2 hours on matchdays
        'enabled_on_matchdays_only': True
    },
    'understat_daily': {
        'scraper': 'UnderstatScraper',
        'method': 'scrape_league_matches',
        'cron': '0 7 * * *',  # Daily at 7 AM
        'enabled': True
    },
    'physioroom_injuries': {
        'scraper': 'PhysioRoomScraper',
        'method': 'scrape_premier_league_injuries',
        'cron': '0 8 * * *',  # Daily at 8 AM
        'enabled': True
    },
    'physioroom_matchday': {
        'scraper': 'PhysioRoomScraper',
        'method': 'scrape_premier_league_injuries',
        'cron': '0 */1 * * *',  # Hourly on matchdays
        'enabled_on_matchdays_only': True
    },
    'flashscore_live': {
        'scraper': 'FlashScoreScraper',
        'method': 'scrape_live_matches',
        'cron': '*/1 * * * *',  # Every minute during matches
        'enabled_during_matches_only': True
    },
    'oddsportal_pre_match': {
        'scraper': 'OddsPortalScraper',
        'method': 'scrape_match_odds',
        'cron': '*/15 * * * *',  # Every 15 minutes pre-match
        'enabled_pre_match_only': True,
        'hours_before_kickoff': 6
    }
}
```

### 9.3 Graceful Degradation Strategy
```python
class PredictionEngine:
    def __init__(self, scraped_data_client, seed_data_client):
        self.scraped_client = scraped_data_client
        self.seed_client = seed_data_client
    
    def predict_match(self, match_id: str) -> Dict[str, Any]:
        """Generate prediction with fallback strategy"""
        
        # Try to get enriched data from scrapers
        try:
            scraped_data = self.scraped_client.get_match_data(match_id, timeout=1.0)
            data_source = 'scraped+seed'
        except (TimeoutError, ConnectionError) as e:
            logger.warning(f"Scraped data unavailable: {e}. Falling back to seed data.")
            scraped_data = {}
            data_source = 'seed_only'
        
        # Always get seed data as baseline
        seed_data = self.seed_client.get_match_data(match_id)
        
        # Merge data with priority to scraped
        merged_data = {**seed_data, **scraped_data}
        
        # Generate prediction
        prediction = self.model.predict(merged_data)
        
        # Add metadata about data sources used
        prediction['metadata'] = {
            'data_source': data_source,
            'has_scraped_injuries': 'injuries' in scraped_data,
            'has_scraped_odds': 'odds' in scraped_data,
            'has_scraped_weather': 'weather' in scraped_data,
            'confidence_adjustment': 0.0 if data_source == 'seed_only' else 0.1
        }
        
        return prediction
```

---

## 10. Testing Strategy

### 10.1 Parser Regression Tests
```python
import unittest
from unittest.mock import Mock, patch

class TestFBrefParser(unittest.TestCase):
    def setUp(self):
        self.scraper = FBrefScraper()
        
        # Load saved HTML fixture
        with open('tests/fixtures/fbref_match_table.html', 'r') as f:
            self.sample_html = f.read()
    
    def test_parse_match_table(self):
        """Test parsing match table from HTML"""
        soup = BeautifulSoup(self.sample_html, 'html.parser')
        
        # Mock the fetch method to return our fixture
        with patch.object(self.scraper, 'fetch', return_value=soup):
            matches = self.scraper.scrape_league_table()
        
        # Assertions
        self.assertGreater(len(matches), 0, "Should parse at least one match")
        
        first_match = matches[0]
        self.assertIn('home_team', first_match)
        self.assertIn('away_team', first_match)
        self.assertIn('home_xg', first_match)
        self.assertIn('away_xg', first_match)
        
        # Validate data types
        if first_match['home_xg']:
            self.assertIsInstance(float(first_match['home_xg']), float)
    
    def test_html_structure_change_detection(self):
        """Detect if FBref changed their HTML structure"""
        soup = BeautifulSoup(self.sample_html, 'html.parser')
        
        # Check for expected table structure
        table = soup.find('table', {'id': re.compile(r'sched_.*')})
        self.assertIsNotNone(table, "Expected table structure not found - HTML may have changed")
        
        # Check for expected columns
        headers = [th.text.strip() for th in table.find('thead').find_all('th')]
        required_headers = ['Date', 'Home', 'Away', 'xG']
        
        for header in required_headers:
            self.assertTrue(
                any(header in h for h in headers),
                f"Required column '{header}' not found - parser may need update"
            )
    
    def test_handles_missing_data_gracefully(self):
        """Test parser handles incomplete data"""
        incomplete_html = '''
        <table id="sched_2024-2025_9_1">
            <tbody>
                <tr>
                    <td>2024-10-04</td>
                    <td></td>  <!-- Missing home team -->
                    <td>Arsenal</td>
                    <td></td>  <!-- Missing xG -->
                </tr>
            </tbody>
        </table>
        '''
        soup = BeautifulSoup(incomplete_html, 'html.parser')
        
        with patch.object(self.scraper, 'fetch', return_value=soup):
            matches = self.scraper.scrape_league_table()
        
        # Should not crash, may return empty or partial data
        self.assertIsInstance(matches, list)


class TestUnderstatParser(unittest.TestCase):
    def setUp(self):
        self.scraper = UnderstatScraper()
        
        # Sample embedded JSON (as it appears in Understat pages)
        self.sample_html = '''
        <html>
            <script>
                var matchData = JSON.parse('{"h":{"title":"Manchester City","xG":"2.34","shots":[...]},"a":{"title":"Arsenal","xG":"1.87","shots":[...]}}');
            </script>
        </html>
        '''
    
    def test_extract_json_from_script(self):
        """Test extracting match data from JavaScript"""
        soup = BeautifulSoup(self.sample_html, 'html.parser')
        
        with patch.object(self.scraper, 'fetch', return_value=soup):
            match_data = self.scraper.scrape_match_xg('12345')
        
        self.assertIsNotNone(match_data)
        self.assertEqual(match_data['home_team'], 'Manchester City')
        self.assertEqual(match_data['away_team'], 'Arsenal')
        self.assertAlmostEqual(match_data['home_xg'], 2.34, places=2)
        self.assertAlmostEqual(match_data['away_xg'], 1.87, places=2)
    
    def test_handles_malformed_json(self):
        """Test graceful handling of malformed JSON"""
        bad_html = '<script>var matchData = JSON.parse("invalid json");</script>'
        soup = BeautifulSoup(bad_html, 'html.parser')
        
        with patch.object(self.scraper, 'fetch', return_value=soup):
            match_data = self.scraper.scrape_match_xg('12345')
        
        self.assertIsNone(match_data, "Should return None for invalid data")


class TestDataNormalizer(unittest.TestCase):
    def setUp(self):
        self.normalizer = DataNormalizer()
    
    def test_team_name_normalization(self):
        """Test team name variations are normalized"""
        variations = [
            ('Man United', 'Manchester United'),
            ('Man City', 'Manchester City'),
            ('Spurs', 'Tottenham Hotspur'),
            ('Leicester', 'Leicester City')
        ]
        
        for variation, expected in variations:
            self.assertEqual(
                self.normalizer.normalize_team_name(variation),
                expected
            )
    
    def test_match_id_generation(self):
        """Test consistent match ID generation"""
        match1 = {
            'home_team': 'Manchester United',
            'away_team': 'Arsenal',
            'date': '2024-10-04'
        }
        
        match2 = {
            'home_team': 'Man United',  # Variation
            'away_team': 'Arsenal',
            'date': '2024-10-04'
        }
        
        id1 = self.normalizer._generate_match_id(match1)
        id2 = self.normalizer._generate_match_id(match2)
        
        self.assertEqual(id1, id2, "Same match should generate same ID despite team name variation")
    
    def test_confidence_scoring(self):
        """Test confidence calculation"""
        complete_match = {
            'home_team': 'Arsenal',
            'away_team': 'Chelsea',
            'date': '2024-10-04',
            'home_goals': 2,
            'away_goals': 1,
            'home_xg': 2.1,
            'away_xg': 0.9
        }
        
        incomplete_match = {
            'home_team': 'Arsenal',
            'away_team': 'Chelsea',
            'date': '2024-10-04'
        }
        
        confidence_complete = self.normalizer._calculate_confidence(complete_match, 'FBref')
        confidence_incomplete = self.normalizer._calculate_confidence(incomplete_match, 'FBref')
        
        self.assertGreater(confidence_complete, confidence_incomplete)
        self.assertLessEqual(confidence_complete, 1.0)
        self.assertGreaterEqual(confidence_incomplete, 0.0)
```

### 10.2 Integration Tests
```python
class TestScrapingPipeline(unittest.TestCase):
    def setUp(self):
        # Use test database
        self.db = TestDatabase()
        self.normalizer = DataNormalizer()
        self.deduplicator = DataDeduplicator()
    
    def test_end_to_end_scraping_flow(self):
        """Test complete flow: scrape -> normalize -> dedupe -> store"""
        
        # Step 1: Scrape (using mocked data)
        fbref_scraper = FBrefScraper()
        with patch.object(fbref_scraper, 'fetch') as mock_fetch:
            mock_fetch.return_value = self._get_mock_html()
            raw_matches = fbref_scraper.scrape_league_table()
        
        self.assertGreater(len(raw_matches), 0)
        
        # Step 2: Normalize
        normalized = [
            self.normalizer.normalize_match(match, 'FBref')
            for match in raw_matches
        ]
        
        # Step 3: Deduplicate (simulate duplicate from another source)
        duplicate_match = normalized[0].copy()
        duplicate_match['source'] = 'Understat'
        duplicate_match['confidence'] = 0.85
        
        all_matches = normalized + [duplicate_match]
        deduplicated = self.deduplicator.merge_match_data(all_matches)
        
        # Should have one less match after deduplication
        self.assertEqual(len(deduplicated), len(normalized))
        
        # Check merged match has multiple sources
        merged = [m for m in deduplicated if len(m.get('sources', [])) > 1]
        self.assertGreater(len(merged), 0)
        
        # Step 4: Store
        for match in deduplicated:
            self.db.insert_match(match)
        
        # Verify storage
        stored_matches = self.db.get_matches()
        self.assertEqual(len(stored_matches), len(deduplicated))
    
    def _get_mock_html(self):
        """Load mock HTML fixture"""
        with open('tests/fixtures/fbref_sample.html', 'r') as f:
            return BeautifulSoup(f.read(), 'html.parser')


class TestRateLimiting(unittest.TestCase):
    def test_rate_limiter_enforces_delay(self):
        """Test rate limiting actually delays requests"""
        scraper = BaseScraper('test', 'http://example.com', rate_limit=2.0)  # 2 req/sec
        
        start_time = time.time()
        
        # Make 3 requests
        for _ in range(3):
            with patch.object(scraper.session, 'get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.content = '<html></html>'
                scraper.fetch('http://example.com/test')
        
        elapsed = time.time() - start_time
        
        # Should take at least 1 second (3 requests at 2 req/sec = 1.5s minimum)
        self.assertGreater(elapsed, 1.0)
    
    def test_circuit_breaker_opens_after_failures(self):
        """Test circuit breaker stops requests after threshold"""
        breaker = CircuitBreaker(failure_threshold=3, timeout=10)
        
        def failing_function():
            raise Exception("Simulated failure")
        
        # Trigger failures
        for _ in range(3):
            with self.assertRaises(Exception):
                breaker.call(failing_function)
        
        # Circuit should now be open
        self.assertEqual(breaker.state, 'open')
        
        # Next call should fail immediately without calling function
        with self.assertRaises(Exception) as context:
            breaker.call(failing_function)
        
        self.assertIn('Circuit breaker OPEN', str(context.exception))
```

### 10.3 Performance Tests
```python
class TestPredictionLatency(unittest.TestCase):
    def setUp(self):
        self.engine = PredictionEngine(
            scraped_data_client=MockScrapedDataClient(),
            seed_data_client=MockSeedDataClient()
        )
    
    def test_prediction_latency_under_2s(self):
        """Test predictions complete within 2s P95"""
        latencies = []
        
        # Generate 100 predictions
        for i in range(100):
            match_id = f"test_match_{i}"
            
            start = time.time()
            prediction = self.engine.predict_match(match_id)
            elapsed = time.time() - start
            
            latencies.append(elapsed)
            self.assertIsNotNone(prediction)
        
        # Calculate P95
        p95_latency = np.percentile(latencies, 95)
        
        print(f"\nLatency stats:")
        print(f"  Mean: {np.mean(latencies):.3f}s")
        print(f"  P50: {np.median(latencies):.3f}s")
        print(f"  P95: {p95_latency:.3f}s")
        print(f"  P99: {np.percentile(latencies, 99):.3f}s")
        
        self.assertLess(p95_latency, 2.0, f"P95 latency {p95_latency:.3f}s exceeds 2s target")
    
    def test_graceful_degradation_performance(self):
        """Test performance when scraped data unavailable"""
        # Simulate scraped data timeout
        slow_client = MockScrapedDataClient(delay=3.0)
        engine = PredictionEngine(
            scraped_data_client=slow_client,
            seed_data_client=MockSeedDataClient()
        )
        
        start = time.time()
        prediction = engine.predict_match('test_match')
        elapsed = time.time() - start
        
        # Should fall back quickly without waiting for timeout
        self.assertLess(elapsed, 2.0)
        self.assertEqual(prediction['metadata']['data_source'], 'seed_only')
```

---

## 11. Troubleshooting Runbook

### 11.1 Common Issues & Solutions

#### Issue: Scraper Getting Blocked (403/429 errors)

**Symptoms:**
- HTTP 403 Forbidden or 429 Too Many Requests
- Circuit breaker triggering frequently
- Success rate drops below 50%

**Diagnosis:**
```python
# Check recent errors
python manage.py check_scraper_errors --source FlashScore --hours 24

# Check rate limit violations
python manage.py analyze_request_patterns --source FlashScore
```

**Solutions:**
1. **Increase rate limit delay:**
   ```python
   # In scraper config
   RATE_LIMITS['flashscore.com']['requests_per_second'] = 0.1  # Slower
   ```

2. **Rotate user agents more aggressively:**
   ```python
   # Add more realistic user agents to pool
   ```

3. **Add random delays:**
   ```python
   time.sleep(random.uniform(5, 15))  # Longer human-like delays
   ```

4. **Temporarily disable scraper:**
   ```python
   python manage.py disable_scraper --source FlashScore --duration 24h
   ```

5. **Check if source changed ToS - may need to stop permanently**

---

#### Issue: HTML Structure Changed (Parser Failures)

**Symptoms:**
- Scraper returns empty results
- Parsing errors in logs
- Data validation failures increase

**Diagnosis:**
```python
# Compare current HTML to saved fixture
python manage.py compare_html_structure --source FBref --save-current

# Run parser regression tests
pytest tests/test_parsers.py::TestFBrefParser -v
```

**Solutions:**
1. **Inspect current HTML:**
   ```bash
   curl "https://fbref.com/..." > current_page.html
   diff tests/fixtures/fbref_sample.html current_page.html
   ```

2. **Update parser selectors:**
   ```python
   # Old: table.find('thead')
   # New: table.find('thead', class_='new-class-name')
   ```

3. **Save new fixture for tests:**
   ```bash
   cp current_page.html tests/fixtures/fbref_sample_v2.html
   ```

4. **Update parser version:**
   ```python
   PARSER_VERSION = "v1.3.0"  # Increment for tracking
   ```

---

#### Issue: Data Freshness Alert

**Symptoms:**
- Data lag exceeds 2x expected cadence
- Predictions using stale data
- Dashboard shows "stale" status

**Diagnosis:**
```python
# Check last successful scrape
python manage.py check_freshness --source FBref

# Check scraper logs
tail -f logs/scrapers/fbref.log
```

**Solutions:**
1. **Manual trigger scrape:**
   ```python
   python manage.py run_scraper --source FBref --force
   ```

2. **Check if cron job is running:**
   ```bash
   systemctl status scraper-orchestrator
   docker logs scraper-orchestrator
   ```

3. **Verify source website is accessible:**
   ```bash
   curl -I https://fbref.com/
   ```

4. **Check for IP ban:**
   ```python
   # Try from different IP
   python manage.py test_connectivity --source FBref --use-proxy
   ```

---

#### Issue: High Prediction Latency

**Symptoms:**
- P95 latency > 2s
- Slow response times
- Timeout errors

**Diagnosis:**
```python
# Profile prediction pipeline
python manage.py profile_prediction --match-id test_123

# Check database query performance
python manage.py analyze_slow_queries
```

**Solutions:**
1. **Add caching for scraped data:**
   ```python
   @cache.memoize(timeout=300)  # 5 min cache
   def get_match_enrichment(match_id):
       # ...
   ```

2. **Optimize database queries:**
   ```sql
   CREATE INDEX idx_match_date ON matches(match_date);
   CREATE INDEX idx_source_scrape_time ON scraped_data(source_name, scrape_time);
   ```

3. **Reduce feature engineering complexity:**
   ```python
   # Precompute derived features nightly
   python manage.py precompute_features --days 7
   ```

4. **Enable query result caching:**
   ```python
   # Cache team stats, injury impacts, etc.
   ```

---

#### Issue: Duplicate Data / Conflict Resolution Failing

**Symptoms:**
- Same match appearing multiple times
- Inconsistent predictions for same fixture
- Data quality warnings

**Diagnosis:**
```python
# Check for duplicates
python manage.py find_duplicates --days 7

# Analyze conflict resolution
python manage.py audit_merges --match-id 20241004_arsenal_chelsea
```

**Solutions:**
1. **Improve canonical ID generation:**
   ```python
   # Ensure consistent team name normalization
   self.team_name_mapping.update({
       'Arsenal FC': 'Arsenal',
       'Arsenal London': 'Arsenal'
   })
   ```

2. **Review merge logic:**
   ```python
   # Add conflict detection logging
   if abs(version1['home_xg'] - version2['home_xg']) > 0.5:
       logger.warning(f"Large xG discrepancy: {version1} vs {version2}")
   ```

3. **Manual deduplication:**
   ```python
   python manage.py deduplicate --match-id 20241004_arsenal_chelsea --keep-source FBref
   ```

---

### 11.2 Emergency Procedures

#### Complete Scraper Shutdown
```bash
# Stop all scrapers immediately
docker-compose stop scraper-orchestrator

# Or disable via config
python manage.py disable_all_scrapers --reason "Emergency maintenance"

# Predictions will fall back to seed data only
```

#### Rollback to Previous Parser Version
```bash
# Revert code
git revert HEAD

# Redeploy
docker-compose up -d --build scraper-orchestrator

# Verify
python manage.py test_scraper --source FBref
```

#### Clear Corrupted Data
```python
# Clear scraped data for specific date range
python manage.py clear_scraped_data \
    --source FBref \
    --start-date 2024-10-01 \
    --end-date 2024-10-04 \
    --reason "Corrupted data from parser bug"

# Re-scrape
python manage.py backfill --source FBref --days 3
```

---

## 12. Success Metrics Dashboard

### 12.1 Key Metrics to Track

```python
# metrics_dashboard.py

class MetricsDashboard:
    def get_overview(self) -> Dict[str, Any]:
        """Get high-level health metrics"""
        return {
            'scraping': {
                'overall_success_rate': self._get_success_rate(hours=24),
                'active_scrapers': self._get_active_scraper_count(),
                'circuit_breakers_open': self._get_open_circuit_breakers(),
                'data_freshness': self._get_freshness_summary()
            },
            'predictions': {
                'p95_latency_ms': self._get_latency_p95(),
                'predictions_using_scraped_data_pct': self._get_enrichment_rate(),
                'average_confidence': self._get_avg_confidence()
            },
            'data_quality': {
                'deduplication_rate': self._get_dedup_rate(),
                'validation_pass_rate': self._get_validation_rate(),
                'data_coverage': self._get_coverage_by_source()
            },
            'model_performance': {
                'prediction_accuracy': self._get_accuracy(days=7),
                'calibration_score': self._get_calibration(),
                'improvement_vs_baseline': self._get_ab_test_results()
            }
        }
    
    def _get_success_rate(self, hours=24) -> float:
        """Calculate scraper success rate"""
        # Query database
        total = self.db.count_scraper_runs(hours=hours)
        successful = self.db.count_successful_runs(hours=hours)
        return (successful / total * 100) if total > 0 else 0
    
    def _get_enrichment_rate(self) -> float:
        """% of predictions using scraped data"""
        total = self.db.count_predictions(hours=24)
        enriched = self.db.count_predictions_with_scraped_data(hours=24)
        return (enriched / total * 100) if total > 0 else 0
    
    def _get_ab_test_results(self) -> Dict[str, float]:
        """Compare API-only vs API+scraped predictions"""
        baseline_accuracy = self.db.get_baseline_accuracy(days=30)
        enriched_accuracy = self.db.get_enriched_accuracy(days=30)
        
        improvement = ((enriched_accuracy - baseline_accuracy) / baseline_accuracy) * 100
        
        return {
            'baseline_accuracy': baseline_accuracy,
            'enriched_accuracy': enriched_accuracy,
            'improvement_pct': improvement
        }
```

### 12.2 Visualization (Simple Flask Dashboard)
```python
# dashboard.py

from flask import Flask, render_template, jsonify
import plotly.graph_objs as go
import plotly

app = Flask(__name__)
metrics = MetricsDashboard()

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/metrics')
def get_metrics():
    return jsonify(metrics.get_overview())

@app.route('/api/scraper_health')
def scraper_health():
    """Scraper success rate over time"""
    data = metrics.get_scraper_health_timeseries(hours=24)
    
    fig = go.Figure()
    for scraper_name, timeseries in data.items():
        fig.add_trace(go.Scatter(
            x=timeseries['timestamps'],
            y=timeseries['success_rates'],
            name=scraper_name,
            mode='lines+markers'
        ))
    
    fig.update_layout(
        title='Scraper Success Rate (24h)',
        yaxis_title='Success Rate (%)',
        yaxis_range=[0, 100]
    )
    
    return jsonify(plotly.io.to_json(fig))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

---

## 13. Final Checklist

### Pre-Deployment Checklist
- [ ] All scrapers tested with real sources (not just mocks)
- [ ] Rate limiting configured conservatively for each source
- [ ] robots.txt compliance verified for all sources
- [ ] Circuit breakers tested and thresholds tuned
- [ ] Provenance schema implemented and tested
- [ ] Deduplication logic handles all edge cases
- [ ] Feature engineering pipeline integrated
- [ ] Explainability logging captures all signal adjustments
- [ ] Prediction latency under 2s P95 (load tested)
- [ ] Graceful degradation works (scrapers disabled → predictions still work)
- [ ] Monitoring dashboard deployed and accessible
- [ ] Alerting configured (Slack/email/etc.)
- [ ] Documentation complete (runbook, parser update guide)
- [ ] A/B test framework ready to measure impact
- [ ] Backup/rollback procedure documented
- [ ] Legal compliance reviewed (ToS, fair use)

### Week 1 Deliverables
- [ ] FBref scraper operational (current season + 3 historical seasons)
- [ ] Normalization pipeline processing FBref data
- [ ] Provenance database storing raw + normalized data
- [ ] Basic monitoring dashboard showing scraper health

### Week 2 Deliverables
- [ ] Understat xG scraper operational
- [ ] PhysioRoom injury scraper operational
- [ ] Deduplication merging FBref + Understat data
- [ ] Data quality metrics dashboard

### Week 3 Deliverables
- [ ] FlashScore live scraper operational (with circuit breaker)
- [ ] SofaScore backup scraper operational
- [ ] OddsPortal odds scraper operational
- [ ] Caching layer for live data

### Week 4 Deliverables
- [ ] Transfermarkt squad scraper operational
- [ ] BBC Sport news scraper operational
- [ ] WhoScored stats scraper operational
- [ ] Weather scraper operational

### Week 5 Deliverables
- [ ] Injury impact calculator integrated into predictions
- [ ] Odds-based probability adjuster integrated
- [ ] Weather impact adjuster integrated
- [ ] Explainability UI showing scraped signal impacts
- [ ] A/B test comparing baseline vs enriched predictions

### Week 6 Deliverables
- [ ] All acceptance tests passing
- [ ] Load testing confirms <2s P95 latency at scale
- [ ] Monitoring alerts configured and tested
- [ ] Production deployment complete
- [ ] Documentation finalized

---

## 14. Quick Start Commands

```bash
# Setup
git clone <repo>
cd football-forecast-platform
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python manage.py init_db

# Test individual scraper
python manage.py test_scraper --source FBref

# Run full scraping cycle (one-time)
python manage.py run_all_scrapers

# Start orchestrator (production)
docker-compose up -d

# Check health
python manage.py health_check

# View logs
docker logs -f scraper-orchestrator

# Access dashboard
open http://localhost:8080
```

---

## Conclusion

This refined specification provides a **complete, zero-API-key scraping solution** for the Football Forecast Platform. Key improvements:

1. ✅ **Removed all API key dependencies** - 100% free data sources
2. ✅ **Detailed anti-bot mitigation** strategies for each source
3. ✅ **Complete code templates** ready to use
4. ✅ **Comprehensive testing strategy** with examples
5. ✅ **Production monitoring and alerting** framework
6. ✅ **Troubleshooting runbook** for common issues
7. ✅ **Clear 6-week roadmap** with deliverables
8. ✅ **Ethical scraping practices** emphasized throughout

**Estimated Development Time:** 6 weeks (1 FTE)  
**Monthly Operating Cost:** $0 (no API fees, optional hosting costs only)  
**Risk Level:** Medium (scraping risks mitigated with circuit breakers, graceful degradation)

Ready to start implementation? Choose which component to tackle first:
1. FBref scraper (foundational)
2. Complete scraper framework (base classes)
3. Monitoring dashboard (observability first)