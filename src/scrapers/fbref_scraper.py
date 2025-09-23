"""
FBref scraper for xG data and advanced statistics using Playwright
"""
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from playwright.async_api import Page
from .base_scraper import PlaywrightScraper, ScrapedData


class FBrefScraper(PlaywrightScraper):
    """Scraper for FBref.com - Advanced football statistics using Playwright"""
    
    def __init__(self):
        super().__init__(
            base_url="https://fbref.com",
            site_name="FBref"
        )
    
    async def scrape_match_xg(self, fixture_id: int, home_team: str, away_team: str) -> Optional[ScrapedData]:
        """Scrape xG data for a specific match using Playwright"""
        cache_key = f"fbref_xg_{fixture_id}"
        
        # Try cache first
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            return ScrapedData(
                source="fbref",
                data_type="match_stats",
                fixture_id=fixture_id,
                team_id=None,
                data=cached_data,
                scraped_at=datetime.now().isoformat(),
                confidence=0.8  # Slightly lower confidence for cached data
            )
        
        page = None
        try:
            # Search for match by team names
            search_url = f"{self.base_url}/en/matches"
            page = await self._make_request(search_url)
            
            if not page:
                return await self._get_fallback_xg_data(fixture_id)
            
            # Look for match in recent fixtures using Playwright
            match_links = await page.query_selector_all('a[href*="/en/matches/"]')
            
            for link in match_links:
                link_text = await link.inner_text()
                href = await link.get_attribute('href')
                
                if (home_team.lower() in link_text.lower() and 
                    away_team.lower() in link_text.lower() and href):
                    match_url = f"{self.base_url}{href}"
                    return await self._scrape_match_page(match_url, fixture_id, cache_key)
            
            # If no exact match found, return fallback
            return await self._get_fallback_xg_data(fixture_id)
            
        except Exception as e:
            print(f"Error scraping FBref for fixture {fixture_id}: {e}")
            return await self._get_fallback_xg_data(fixture_id)
        finally:
            if page:
                await page.close()
    
    async def _scrape_match_page(self, match_url: str, fixture_id: int, cache_key: str) -> Optional[ScrapedData]:
        """Scrape individual match page for xG data using Playwright"""
        page = None
        try:
            page = await self._make_request(match_url)
            
            if not page:
                return None
            
            xg_data = {}
            
            # Look for xG data in match summary table
            summary_table = await page.query_selector('table#summary')
            if summary_table:
                rows = await summary_table.query_selector_all('tr')
                for row in rows:
                    row_text = await row.inner_text()
                    if 'Expected Goals' in row_text or 'xG' in row_text:
                        cells = await row.query_selector_all('td, th')
                        if len(cells) >= 3:
                            try:
                                home_xg_text = await cells[1].inner_text()
                                away_xg_text = await cells[2].inner_text()
                                xg_data['home_xg'] = float(home_xg_text.strip())
                                xg_data['away_xg'] = float(away_xg_text.strip())
                            except (ValueError, IndexError):
                                pass
            
            # Look for additional stats
            stats_table = await page.query_selector('table#stats')
            if stats_table:
                rows = await stats_table.query_selector_all('tr')
                for row in rows:
                    cells = await row.query_selector_all('td, th')
                    if len(cells) >= 3:
                        try:
                            stat_name = (await cells[0].inner_text()).strip().lower()
                            if 'possession' in stat_name:
                                home_poss_text = await cells[1].inner_text()
                                away_poss_text = await cells[2].inner_text()
                                home_poss = float(home_poss_text.replace('%', '').strip())
                                away_poss = float(away_poss_text.replace('%', '').strip())
                                xg_data['home_possession'] = home_poss
                                xg_data['away_possession'] = away_poss
                            elif 'shots on target' in stat_name:
                                home_shots_text = await cells[1].inner_text()
                                away_shots_text = await cells[2].inner_text()
                                xg_data['home_shots_on_target'] = int(home_shots_text.strip())
                                xg_data['away_shots_on_target'] = int(away_shots_text.strip())
                        except (ValueError, IndexError):
                            pass
            
            # Calculate momentum score based on xG and possession
            if 'home_xg' in xg_data and 'away_xg' in xg_data:
                home_momentum = (xg_data['home_xg'] * 0.6 + 
                               xg_data.get('home_possession', 50) * 0.004)
                away_momentum = (xg_data['away_xg'] * 0.6 + 
                               xg_data.get('away_possession', 50) * 0.004)
                xg_data['momentum_score'] = home_momentum - away_momentum
            
            # Cache the data
            self._save_to_cache(cache_key, xg_data)
            
            return ScrapedData(
                source="fbref",
                data_type="match_stats",
                fixture_id=fixture_id,
                team_id=None,
                data=xg_data,
                scraped_at=datetime.now().isoformat(),
                confidence=1.0
            )
            
        finally:
            if page:
                await page.close()
    
    async def scrape_team_form(self, team_id: int, team_name: str) -> Optional[ScrapedData]:
        """Scrape team form data and recent performance using Playwright"""
        cache_key = f"fbref_form_{team_id}"
        
        # Try cache first
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            return ScrapedData(
                source="fbref",
                data_type="team_form",
                fixture_id=None,
                team_id=team_id,
                data=cached_data,
                scraped_at=datetime.now().isoformat(),
                confidence=0.8
            )
        
        page = None
        try:
            # Search for team page
            search_url = f"{self.base_url}/en/search/search.fcgi?search={team_name.replace(' ', '+')}"
            page = await self._make_request(search_url)
            
            if not page:
                return await self._get_fallback_form_data(team_id)
            
            # Find team link
            team_links = await page.query_selector_all('a[href*="/en/squads/"]')
            
            for link in team_links:
                link_text = await link.inner_text()
                href = await link.get_attribute('href')
                
                if team_name.lower() in link_text.lower() and href:
                    team_url = f"{self.base_url}{href}"
                    return await self._scrape_team_page(team_url, team_id, cache_key)
            
            return await self._get_fallback_form_data(team_id)
            
        except Exception as e:
            print(f"Error scraping FBref form for team {team_id}: {e}")
            return await self._get_fallback_form_data(team_id)
        finally:
            if page:
                await page.close()
    
    async def _scrape_team_page(self, team_url: str, team_id: int, cache_key: str) -> Optional[ScrapedData]:
        """Scrape team page for form and statistics using Playwright"""
        page = None
        try:
            page = await self._make_request(team_url)
            
            if not page:
                return None
            
            form_data = {}
            
            # Look for recent matches table
            matches_table = await page.query_selector('table#matchlogs_for')
            if matches_table:
                recent_matches = []
                rows = await matches_table.query_selector_all('tr')
                # Skip header row, get last 5 matches
                for i in range(1, min(6, len(rows))):
                    row = rows[i]
                    cells = await row.query_selector_all('td, th')
                    if len(cells) > 5:
                        result_text = await cells[5].inner_text()
                        result = result_text.strip()
                        if result in ['W', 'D', 'L']:
                            recent_matches.append(result)
                
                if recent_matches:
                    form_data['form_string'] = ''.join(recent_matches)
                    form_data['last_5_results'] = recent_matches
                    
                    # Calculate points from last 5
                    points = sum(3 if r == 'W' else 1 if r == 'D' else 0 for r in recent_matches)
                    form_data['points_last_5'] = points
            
            # Look for season stats
            stats_table = await page.query_selector('table#stats_standard')
            if stats_table:
                rows = await stats_table.query_selector_all('tr')
                for row in rows:
                    row_text = await row.inner_text()
                    if 'Total' in row_text or team_url.split('/')[-1] in row_text:
                        cells = await row.query_selector_all('td, th')
                        if len(cells) > 10:
                            try:
                                goals_scored_text = await cells[7].inner_text()
                                goals_conceded_text = await cells[8].inner_text()
                                form_data['goals_scored_season'] = int(goals_scored_text.strip())
                                form_data['goals_conceded_season'] = int(goals_conceded_text.strip())
                            except (ValueError, IndexError):
                                pass
            
            # Cache the data
            self._save_to_cache(cache_key, form_data)
            
            return ScrapedData(
                source="fbref",
                data_type="team_form",
                fixture_id=None,
                team_id=team_id,
                data=form_data,
                scraped_at=datetime.now().isoformat(),
                confidence=1.0
            )
            
        finally:
            if page:
                await page.close()
    
    async def _get_fallback_xg_data(self, fixture_id: int) -> Optional[ScrapedData]:
        """Get fallback xG data from database"""
        fallback = await self.get_fallback_data('match_stats', fixture_id)
        
        if fallback:
            return ScrapedData(
                source="fbref_fallback",
                data_type="match_stats",
                fixture_id=fixture_id,
                team_id=None,
                data={
                    'home_xg': fallback.get('home_xg', 1.5),
                    'away_xg': fallback.get('away_xg', 1.2),
                    'momentum_score': fallback.get('momentum_score', 0.1)
                },
                scraped_at=datetime.now().isoformat(),
                confidence=0.5
            )
        
        # Return realistic defaults if no fallback
        return ScrapedData(
            source="fbref_default",
            data_type="match_stats",
            fixture_id=fixture_id,
            team_id=None,
            data={
                'home_xg': 1.5,
                'away_xg': 1.2,
                'momentum_score': 0.1,
                'home_possession': 52.0,
                'away_possession': 48.0
            },
            scraped_at=datetime.now().isoformat(),
            confidence=0.3
        )
    
    async def _get_fallback_form_data(self, team_id: int) -> Optional[ScrapedData]:
        """Get fallback form data"""
        return ScrapedData(
            source="fbref_default",
            data_type="team_form",
            fixture_id=None,
            team_id=team_id,
            data={
                'form_string': 'WWDLW',
                'points_last_5': 10,
                'goals_scored_last_5': 8,
                'goals_conceded_last_5': 4
            },
            scraped_at=datetime.now().isoformat(),
            confidence=0.3
        )