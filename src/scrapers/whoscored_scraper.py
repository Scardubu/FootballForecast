"""
WhoScored scraper for team ratings and match insights using Playwright
"""
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from playwright.async_api import Page
from .base_scraper import PlaywrightScraper, ScrapedData


class WhoScoredScraper(PlaywrightScraper):
    """Scraper for WhoScored.com - Team ratings and match insights"""
    
    def __init__(self):
        super().__init__(
            base_url="https://www.whoscored.com",
            site_name="WhoScored"
        )
        # WhoScored is more protective, need longer delays
        self.min_delay = 90  # 1.5 minutes between requests
    
    async def scrape_team_ratings(self, team_id: int, team_name: str) -> Optional[ScrapedData]:
        """Scrape team ratings and performance metrics"""
        cache_key = f"whoscored_ratings_{team_id}"
        
        # Try cache first
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            return ScrapedData(
                source="whoscored",
                data_type="team_ratings",
                fixture_id=None,
                team_id=team_id,
                data=cached_data,
                scraped_at=datetime.now().isoformat(),
                confidence=0.8
            )
        
        page = None
        try:
            # Search for team
            search_url = f"{self.base_url}/Search"
            page = await self._make_request(search_url)
            
            if not page:
                return await self._get_fallback_ratings_data(team_id)
            
            # Search for team by name
            search_input = await page.query_selector('input[name="q"]')
            if search_input:
                await search_input.fill(team_name)
                await search_input.press('Enter')
                await page.wait_for_timeout(2000)
                
                # Look for team link in results
                team_links = await page.query_selector_all('a[href*="/Teams/"]')
                
                for link in team_links:
                    link_text = await link.inner_text()
                    href = await link.get_attribute('href')
                    
                    if (team_name.lower() in link_text.lower() and href):
                        team_url = f"{self.base_url}{href}"
                        return await self._scrape_team_ratings_page(team_url, team_id, cache_key)
            
            return await self._get_fallback_ratings_data(team_id)
            
        except Exception as e:
            print(f"Error scraping WhoScored ratings for team {team_id}: {e}")
            return await self._get_fallback_ratings_data(team_id)
        finally:
            if page:
                await page.close()
    
    async def _scrape_team_ratings_page(self, team_url: str, team_id: int, cache_key: str) -> Optional[ScrapedData]:
        """Scrape team ratings page for performance data"""
        page = None
        try:
            page = await self._make_request(team_url)
            
            if not page:
                return None
            
            ratings_data = {}
            
            # Look for team rating elements
            rating_elements = await page.query_selector_all('.rating, .team-rating, .overall-rating')
            
            for element in rating_elements:
                try:
                    rating_text = await element.inner_text()
                    rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                    if rating_match:
                        rating_value = float(rating_match.group(1))
                        if 0 <= rating_value <= 10:
                            ratings_data['overall_rating'] = rating_value
                            break
                except:
                    continue
            
            # Look for recent performance stats
            stats_sections = await page.query_selector_all('.stats-section, .performance-stats')
            
            for section in stats_sections:
                try:
                    section_text = await section.inner_text()
                    
                    # Extract various stats
                    if 'goals' in section_text.lower():
                        goals_match = re.search(r'(\d+\.?\d*)', section_text)
                        if goals_match:
                            ratings_data['avg_goals_per_game'] = float(goals_match.group(1))
                    
                    if 'shots' in section_text.lower():
                        shots_match = re.search(r'(\d+\.?\d*)', section_text)
                        if shots_match:
                            ratings_data['avg_shots_per_game'] = float(shots_match.group(1))
                    
                    if 'possession' in section_text.lower():
                        poss_match = re.search(r'(\d+)%', section_text)
                        if poss_match:
                            ratings_data['avg_possession'] = float(poss_match.group(1))
                            
                except:
                    continue
            
            # Look for defensive stats
            defensive_stats = await page.query_selector_all('.defensive-stats, .defence-stats')
            
            for stat in defensive_stats:
                try:
                    stat_text = await stat.inner_text()
                    
                    if 'clean sheets' in stat_text.lower():
                        cs_match = re.search(r'(\d+)', stat_text)
                        if cs_match:
                            ratings_data['clean_sheets'] = int(cs_match.group(1))
                    
                    if 'goals conceded' in stat_text.lower():
                        gc_match = re.search(r'(\d+\.?\d*)', stat_text)
                        if gc_match:
                            ratings_data['avg_goals_conceded'] = float(gc_match.group(1))
                            
                except:
                    continue
            
            # Calculate momentum indicator
            if ratings_data:
                base_rating = ratings_data.get('overall_rating', 6.5)
                goal_factor = min(ratings_data.get('avg_goals_per_game', 1.0) * 0.5, 1.0)
                defensive_factor = max(0, 1.0 - ratings_data.get('avg_goals_conceded', 1.5) * 0.3)
                
                ratings_data['momentum_indicator'] = (base_rating * 0.6 + 
                                                    goal_factor * 2.0 + 
                                                    defensive_factor * 1.5)
            
            # Cache the data
            self._save_to_cache(cache_key, ratings_data)
            
            return ScrapedData(
                source="whoscored",
                data_type="team_ratings",
                fixture_id=None,
                team_id=team_id,
                data=ratings_data,
                scraped_at=datetime.now().isoformat(),
                confidence=1.0
            )
            
        finally:
            if page:
                await page.close()
    
    async def scrape_match_insights(self, fixture_id: int, home_team: str, away_team: str) -> Optional[ScrapedData]:
        """Scrape match insights and predictions"""
        cache_key = f"whoscored_match_{fixture_id}"
        
        # Try cache first
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            return ScrapedData(
                source="whoscored",
                data_type="match_insights",
                fixture_id=fixture_id,
                team_id=None,
                data=cached_data,
                scraped_at=datetime.now().isoformat(),
                confidence=0.8
            )
        
        page = None
        try:
            # Search for live matches or fixtures
            fixtures_url = f"{self.base_url}/LiveScores"
            page = await self._make_request(fixtures_url)
            
            if not page:
                return await self._get_fallback_match_data(fixture_id)
            
            # Look for the specific match
            match_elements = await page.query_selector_all('.fixture, .match-item')
            
            for match in match_elements:
                try:
                    match_text = await match.inner_text()
                    
                    if (home_team.lower() in match_text.lower() and 
                        away_team.lower() in match_text.lower()):
                        
                        # Try to extract basic match insights from overview
                        insights_data = {
                            'home_team': home_team,
                            'away_team': away_team,
                            'match_found': True
                        }
                        
                        # Look for ratings within the match element
                        rating_elements = await match.query_selector_all('.rating, [data-rating]')
                        
                        for i, rating_el in enumerate(rating_elements):
                            rating_text = await rating_el.inner_text()
                            rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                            if rating_match and i < 2:  # First two ratings are usually team ratings
                                key = 'home_rating' if i == 0 else 'away_rating'
                                insights_data[key] = float(rating_match.group(1))
                        
                        # Cache and return
                        self._save_to_cache(cache_key, insights_data)
                        
                        return ScrapedData(
                            source="whoscored",
                            data_type="match_insights",
                            fixture_id=fixture_id,
                            team_id=None,
                            data=insights_data,
                            scraped_at=datetime.now().isoformat(),
                            confidence=0.7
                        )
                        
                except:
                    continue
            
            return await self._get_fallback_match_data(fixture_id)
            
        except Exception as e:
            print(f"Error scraping WhoScored match insights for fixture {fixture_id}: {e}")
            return await self._get_fallback_match_data(fixture_id)
        finally:
            if page:
                await page.close()
    
    async def _get_fallback_ratings_data(self, team_id: int) -> Optional[ScrapedData]:
        """Get fallback ratings data"""
        return ScrapedData(
            source="whoscored_default",
            data_type="team_ratings",
            fixture_id=None,
            team_id=team_id,
            data={
                'overall_rating': 6.5,
                'avg_goals_per_game': 1.2,
                'avg_goals_conceded': 1.1,
                'avg_possession': 52.0,
                'momentum_indicator': 6.8,
                'clean_sheets': 3
            },
            scraped_at=datetime.now().isoformat(),
            confidence=0.3
        )
    
    async def _get_fallback_match_data(self, fixture_id: int) -> Optional[ScrapedData]:
        """Get fallback match insights data"""
        return ScrapedData(
            source="whoscored_default",
            data_type="match_insights",
            fixture_id=fixture_id,
            team_id=None,
            data={
                'home_rating': 6.5,
                'away_rating': 6.3,
                'match_found': False,
                'prediction_confidence': 0.3
            },
            scraped_at=datetime.now().isoformat(),
            confidence=0.3
        )