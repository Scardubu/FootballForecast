"""
Base scraper class with ethical practices and resilience patterns
"""
import time
import random
import sqlite3
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from fake_useragent import UserAgent
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential
import functools


@dataclass
class ScrapedData:
    """Standard data container for scraped information"""
    source: str
    data_type: str
    fixture_id: Optional[int]
    team_id: Optional[int]
    data: Dict[str, Any]
    scraped_at: str
    confidence: float = 1.0


class EthicalScraper:
    """Base scraper with ethical practices and resilience"""
    
    def __init__(self, base_url: str, site_name: str):
        self.base_url = base_url
        self.site_name = site_name
        self.ua = UserAgent()
        self.session = requests.Session()
        
        # Rate limiting - max 1 request per minute per site
        self.min_delay = 60  # seconds
        self.last_request_time = 0
        
        # Proxy rotation (free proxies from environment)
        self.proxy_pool = self._load_proxy_pool()
        self.current_proxy_index = 0
        
        # Initialize local storage
        self.db_path = Path("data/scraped_data.db")
        self.cache_dir = Path("data/cache")
        self._init_storage()
    
    def _load_proxy_pool(self) -> List[str]:
        """Load proxy pool from environment or config"""
        # In production, these would come from Replit secrets
        return [
            # Free proxy examples (to be populated from environment)
            "proxy1.example.com:8080",
            "proxy2.example.com:8080",
        ]
    
    def _init_storage(self):
        """Initialize SQLite database and cache directories"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables for different data types
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scraped_matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER,
                source TEXT,
                home_xg REAL,
                away_xg REAL,
                home_rating REAL,
                away_rating REAL,
                momentum_score REAL,
                scraped_at TEXT,
                confidence REAL DEFAULT 1.0
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS injuries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT,
                team_id INTEGER,
                injury_type TEXT,
                expected_return TEXT,
                scraped_at TEXT,
                source TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_form (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER,
                form_string TEXT,
                last_5_results TEXT,
                points_last_5 INTEGER,
                goals_scored_last_5 INTEGER,
                goals_conceded_last_5 INTEGER,
                scraped_at TEXT,
                source TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _get_headers(self) -> Dict[str, str]:
        """Generate realistic headers with rotation"""
        return {
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def _rotate_proxy(self) -> Optional[Dict[str, str]]:
        """Rotate through proxy pool"""
        if not self.proxy_pool:
            return None
        
        proxy = self.proxy_pool[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxy_pool)
        
        return {
            'http': f'http://{proxy}',
            'https': f'https://{proxy}'
        }
    
    def _respect_rate_limit(self):
        """Enforce rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_delay:
            sleep_time = self.min_delay - time_since_last + random.uniform(5, 15)
            print(f"Rate limiting: waiting {sleep_time:.1f}s for {self.site_name}")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _make_request(self, url: str) -> Optional[BeautifulSoup]:
        """Make HTTP request with retries and error handling"""
        self._respect_rate_limit()
        
        headers = self._get_headers()
        proxies = self._rotate_proxy()
        
        try:
            response = self.session.get(
                url, 
                headers=headers, 
                proxies=proxies,
                timeout=30
            )
            response.raise_for_status()
            
            return BeautifulSoup(response.content, 'html.parser')
            
        except requests.RequestException as e:
            print(f"Request failed for {url}: {e}")
            raise
    
    @functools.lru_cache(maxsize=1000)
    def _get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """Get data from file cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                
                # Check if cache is still valid (30 minutes for live data)
                cache_age = time.time() - data.get('cached_at', 0)
                if cache_age < 1800:  # 30 minutes
                    return data['content']
            except (json.JSONDecodeError, KeyError):
                pass
        
        return None
    
    def _save_to_cache(self, cache_key: str, data: Dict):
        """Save data to file cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        cache_data = {
            'cached_at': time.time(),
            'content': data
        }
        
        with open(cache_file, 'w') as f:
            json.dump(cache_data, f, indent=2)
    
    def save_to_database(self, data: ScrapedData):
        """Save scraped data to SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if data.data_type == 'match_stats':
            cursor.execute("""
                INSERT INTO scraped_matches 
                (fixture_id, source, home_xg, away_xg, home_rating, away_rating, 
                 momentum_score, scraped_at, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.fixture_id,
                data.source,
                data.data.get('home_xg'),
                data.data.get('away_xg'),
                data.data.get('home_rating'),
                data.data.get('away_rating'),
                data.data.get('momentum_score'),
                data.scraped_at,
                data.confidence
            ))
        
        elif data.data_type == 'injuries':
            cursor.execute("""
                INSERT INTO injuries 
                (player_name, team_id, injury_type, expected_return, scraped_at, source)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data.data.get('player_name'),
                data.team_id,
                data.data.get('injury_type'),
                data.data.get('expected_return'),
                data.scraped_at,
                data.source
            ))
        
        conn.commit()
        conn.close()
    
    def get_fallback_data(self, data_type: str, identifier: int) -> Optional[Dict]:
        """Get fallback data from database when scraping fails"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if data_type == 'match_stats':
            cursor.execute("""
                SELECT * FROM scraped_matches 
                WHERE fixture_id = ? 
                ORDER BY scraped_at DESC 
                LIMIT 1
            """, (identifier,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, result))
        
        return None