"""
PhysioRoom scraper for injury intel using Playwright
"""
from typing import Dict, Optional, List
from datetime import datetime
from .base_scraper import PlaywrightScraper, ScrapedData


class PhysioRoomScraper(PlaywrightScraper):
    """Scraper for PhysioRoom - team injury lists"""

    def __init__(self):
        super().__init__(
            base_url="https://www.physioroom.com",
            site_name="PhysioRoom",
        )

    async def scrape_team_injuries(self, team_id: int, team_name: str) -> Optional[ScrapedData]:
        """Scrape injuries for a given team. Returns standardized injury payload."""
        cache_key = f"physioroom_inj_{team_id}"
        ttl = self._get_ttl_seconds('injuries')
        cached = self._get_cached_data_ttl(cache_key, ttl)
        if cached:
            return ScrapedData(
                source="physioroom",
                data_type="injuries",
                fixture_id=None,
                team_id=team_id,
                data=cached,
                scraped_at=datetime.now().isoformat(),
                confidence=0.8,
            )

        page = None
        try:
            # Best-effort search page
            search_url = f"{self.base_url}/search?query={team_name.replace(' ', '+')}"
            page = await self._make_request(search_url)
            if not page:
                return await self._fallback_injuries(team_id)

            # Attempt to find injuries page link
            links = await page.query_selector_all('a')
            team_link = None
            for link in links:
                text = (await link.inner_text()).lower().strip()
                href = await link.get_attribute('href')
                if not href:
                    continue
                if team_name.lower() in text and 'injur' in text:
                    team_link = href if href.startswith('http') else f"{self.base_url}{href}"
                    break

            if not team_link:
                # fallback to first link result
                for link in links:
                    href = await link.get_attribute('href')
                    if href:
                        team_link = href if href.startswith('http') else f"{self.base_url}{href}"
                        break

            if not team_link:
                return await self._fallback_injuries(team_id)

            detail = await self._make_request(team_link)
            if not detail:
                return await self._fallback_injuries(team_id)

            # Heuristic extraction: look for injury list table, fall back to text parsing
            players: List[Dict] = []
            items = await detail.query_selector_all('li, tr')
            for el in items:
                try:
                    t = (await el.inner_text()).strip()
                except Exception:
                    continue
                low = t.lower()
                # Heuristic matching for a player injury line
                if any(k in low for k in ['ankle', 'hamstring', 'knee', 'groin', 'calf', 'shoulder', 'back', 'muscle', 'fracture']):
                    # crude parse: "Player - Injury (Expected return: date)"
                    name = t.split('-')[0].strip()[:64]
                    severity = 2
                    if any(k in low for k in ['acl', 'fracture', 'surgery', 'rupture']):
                        severity = 4
                    elif any(k in low for k in ['strain', 'tear', 'hamstring', 'ankle']):
                        severity = 3
                    expected = None
                    if 'return' in low or 'expected' in low:
                        expected = t[-64:]
                    players.append({
                        'name': name,
                        'issue': t,
                        'severity': severity,  # 1-4 scale
                        'expected': expected,
                        'position': None,
                    })

            data = {
                'team_name': team_name,
                'players': players,
                'count': len(players),
                'severity_sum': sum(p.get('severity', 2) for p in players),
            }

            self._save_to_cache(cache_key, data)
            return ScrapedData(
                source="physioroom",
                data_type="injuries",
                fixture_id=None,
                team_id=team_id,
                data=data,
                scraped_at=datetime.now().isoformat(),
                confidence=0.9 if players else 0.6,
            )
        except Exception:
            return await self._fallback_injuries(team_id)
        finally:
            if page:
                await page.close()

    async def _fallback_injuries(self, team_id: int) -> ScrapedData:
        return ScrapedData(
            source="physioroom",
            data_type="injuries",
            fixture_id=None,
            team_id=team_id,
            data={
                'players': [],
                'count': 0,
                'severity_sum': 0,
            },
            scraped_at=datetime.now().isoformat(),
            confidence=0.4,
        )
