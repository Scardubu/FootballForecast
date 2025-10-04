"""
Enhanced base scraper with Playwright stealth mode and production-grade resilience
"""
import time
import random
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from fake_useragent import UserAgent
from playwright.async_api import async_playwright, Page, BrowserContext, Browser
from tenacity import retry, stop_after_attempt, wait_exponential
import functools
import os
import aiohttp


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


class PlaywrightScraper:
    """Production-grade Playwright scraper with stealth mode and resilience"""
    
    def __init__(self, base_url: str, site_name: str):
        self.base_url = base_url
        self.site_name = site_name
        self.ua = UserAgent()
        
        # Rate limiting - adaptive based on site
        self.min_delay = 45  # seconds - more conservative
        self.last_request_time = 0
        
        # Proxy rotation from environment secrets
        self.proxy_pool = self._load_proxy_pool()
        self.current_proxy_index = 0
        
        # Playwright instances
        self.playwright = None
        self.browser = None
        self.context = None
        
        # Initialize cache storage
        self.cache_dir = Path("data/cache")
        self._init_storage()
    
    def _load_proxy_pool(self) -> List[Dict[str, str]]:
        """Load proxy pool from Replit secrets or environment"""
        proxy_list = []
        
        # Load from Replit secrets - format: PROXY_1, PROXY_2, etc.
        for i in range(1, 11):  # Support up to 10 proxies
            proxy = os.getenv(f'PROXY_{i}')
            if proxy:
                # Format: "server:port:username:password" or "server:port"
                parts = proxy.split(':')
                if len(parts) >= 2:
                    proxy_config = {
                        'server': f"{parts[0]}:{parts[1]}",
                        'username': parts[2] if len(parts) > 2 else None,
                        'password': parts[3] if len(parts) > 3 else None
                    }
                    proxy_list.append(proxy_config)
        
        return proxy_list
    
    def _init_storage(self):
        """Initialize cache directories and database connection info"""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Database connection will be handled by the main application's storage layer
        # We'll use the existing PostgreSQL database instead of SQLite
        self.database_url = os.getenv('DATABASE_URL')
    
    def _get_stealth_headers(self) -> Dict[str, str]:
        """Generate realistic headers for stealth mode"""
        return {
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-Ch-Ua': '"Chromium";v="140", "Google Chrome";v="140", "Not A;Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Linux"'
        }
    
    def _get_proxy_config(self) -> Optional[Dict[str, str]]:
        """Get next proxy configuration for Playwright"""
        if not self.proxy_pool:
            return None
        
        proxy = self.proxy_pool[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxy_pool)
        
        config = {'server': proxy['server']}
        if proxy['username'] and proxy['password']:
            config['username'] = proxy['username']
            config['password'] = proxy['password']
        
        return config
    
    async def _respect_rate_limit(self):
        """Enforce rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_delay:
            sleep_time = self.min_delay - time_since_last + random.uniform(5, 15)
            print(f"Rate limiting: waiting {sleep_time:.1f}s for {self.site_name}")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    async def _init_browser(self):
        """Initialize Playwright browser with stealth mode"""
        if self.playwright is None:
            self.playwright = await async_playwright().start()
            
            # Launch browser with stealth settings
            browser_args = [
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-default-apps',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--hide-scrollbars',
                '--mute-audio'
            ]
            
            proxy_config = self._get_proxy_config()
            
            launch_options = {
                'headless': True,
                'args': browser_args
            }
            
            if proxy_config:
                launch_options['proxy'] = proxy_config
            
            self.browser = await self.playwright.chromium.launch(**launch_options)
            
            # Create stealth context
            self.context = await self.browser.new_context(
                user_agent=self.ua.random,
                viewport={'width': 1920, 'height': 1080},
                screen={'width': 1920, 'height': 1080},
                device_scale_factor=1,
                is_mobile=False,
                has_touch=False,
                default_browser_type='chromium',
                locale='en-US',
                timezone_id='America/New_York',
                permissions=[],
                extra_http_headers={
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'max-age=0'
                }
            )
            
            # Add stealth scripts to avoid detection
            await self.context.add_init_script("""
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {get: () => false});
                
                // Mock plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                
                // Mock languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
                
                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            """)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _make_request(self, url: str) -> Optional[Page]:
        """Make request using Playwright with stealth mode"""
        await self._respect_rate_limit()
        
        try:
            await self._init_browser()
            
            if not self.context:
                raise Exception("Browser context not initialized")
                
            page = await self.context.new_page()
            
            # Add additional stealth measures
            await page.route('**/*', lambda route: route.continue_(
                headers={**route.request.headers, 'User-Agent': self.ua.random}
            ))
            
            # Navigate with realistic timing
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Random delay to simulate human behavior
            await asyncio.sleep(random.uniform(1, 3))
            
            return page
            
        except Exception as e:
            print(f"Playwright request failed for {url}: {e}")
            raise
    
    @functools.lru_cache(maxsize=1000)
    def _get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """Get data from file cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                
                # Check if cache is still valid (default 30 minutes for live data)
                cache_age = time.time() - data.get('cached_at', 0)
                if cache_age < 1800:  # default 30 minutes
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

    def _get_ttl_seconds(self, data_type: str) -> int:
        """Return TTL seconds based on data type requirements"""
        mapping = {
            'odds': 600,           # 10 minutes
            'injuries': 3600,      # 1 hour
            'weather': 10800,      # 3 hours
            'advanced_stats': 86400, # 24 hours
            'match_stats': 86400,
            'team_form': 86400,
        }
        return mapping.get(data_type, 1800)  # default 30 min

    def _get_cached_data_ttl(self, cache_key: str, ttl_seconds: int) -> Optional[Dict]:
        """TTL-aware cache accessor without breaking existing callers"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                cache_age = time.time() - data.get('cached_at', 0)
                if cache_age < ttl_seconds:
                    return data['content']
            except (json.JSONDecodeError, KeyError):
                return None
        return None
    
    async def save_to_database(self, data: ScrapedData):
        """Save scraped data to API with Authorization header (compat shim)"""
        # Prefer persist_scraped_data for retries; keep this for backward compatibility
        try:
            import requests
            api_base = os.getenv('API_BASE_URL', 'http://localhost:5000')
            token = os.getenv('SCRAPER_BEARER_TOKEN') or os.getenv('SCRAPER_AUTH_TOKEN')

            payload = {
                'source': data.source,
                'data_type': data.data_type,
                'fixture_id': data.fixture_id,
                'team_id': data.team_id,
                'data': data.data,
                'scraped_at': data.scraped_at,
                'confidence': data.confidence
            }

            headers = {'Content-Type': 'application/json'}
            if token:
                headers['Authorization'] = f'Bearer {token}'

            response = requests.post(f"{api_base}/api/scraped-data", json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            print(f"✅ Saved {data.data_type} data from {data.source}")
        except Exception as e:
            print(f"⚠️ Failed to save scraped data: {e}")
            cache_key = f"failed_{data.source}_{data.fixture_id or data.team_id}_{int(time.time())}"
            self._save_to_cache(cache_key, {
                'data': data.__dict__,
                'error': str(e),
                'retry_after': time.time() + 300
            })
    
    async def get_fallback_data(self, data_type: str, identifier: int) -> Optional[Dict]:
        """Get fallback data from cache and database when scraping fails"""
        try:
            # First try local cache
            cache_key = f"fallback_{data_type}_{identifier}"
            cached = self._get_cached_data(cache_key)
            if cached:
                return cached
            
            # Then try main database via API
            import requests
            response = requests.get(f'http://localhost:5000/api/scraped-data/{data_type}/{identifier}')
            if response.status_code == 200:
                data = response.json()
                # Cache the fallback data
                self._save_to_cache(cache_key, data)
                return data
                
        except Exception as e:
            print(f"Failed to get fallback data: {e}")
        
        return None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=5, max=60)
    )
    async def persist_scraped_data(self, scraped_data: ScrapedData) -> bool:
        """Persist scraped data to API with authentication and retry logic"""
        api_url = os.getenv('API_BASE_URL', 'http://localhost:5000')
        bearer_token = os.getenv('SCRAPER_BEARER_TOKEN')
        
        if not bearer_token:
            print("⚠️ Warning: SCRAPER_BEARER_TOKEN not set, cannot persist scraped data")
            return False
        
        headers = {
            'Authorization': f'Bearer {bearer_token}',
            'Content-Type': 'application/json'
        }
        
        # Convert ScrapedData to JSON payload
        payload = {
            'source': scraped_data.source,
            'dataType': scraped_data.data_type,
            'fixtureId': scraped_data.fixture_id,
            'teamId': scraped_data.team_id,
            'data': scraped_data.data,
            'scrapedAt': scraped_data.scraped_at,
            'confidence': scraped_data.confidence
        }
        
        try:
            timeout = aiohttp.ClientTimeout(total=30)  # 30 second timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(f'{api_url}/api/scraped-data', 
                                      json=payload, 
                                      headers=headers) as response:
                    
                    if response.status == 201:
                        print(f"✅ Successfully persisted {scraped_data.source} data for fixture {scraped_data.fixture_id}")
                        return True
                    elif response.status == 401:
                        print(f"❌ Authentication failed when persisting {scraped_data.source} data")
                        return False
                    else:
                        error_text = await response.text()
                        print(f"❌ Failed to persist {scraped_data.source} data: {response.status} - {error_text}")
                        raise aiohttp.ClientError(f"HTTP {response.status}: {error_text}")
                        
        except Exception as e:
            print(f"❌ Error persisting {scraped_data.source} data: {e}")
            raise  # Re-raise to trigger retry

    async def cleanup(self):
        """Cleanup Playwright resources"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            print(f"Cleanup error: {e}")