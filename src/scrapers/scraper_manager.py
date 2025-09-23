"""
Scraper Manager - Orchestrates all scrapers for data collection
"""
import asyncio
import time
from typing import List, Dict, Optional
from datetime import datetime
from .fbref_scraper import FBrefScraper
from .whoscored_scraper import WhoScoredScraper
from .base_scraper import ScrapedData


class ScraperManager:
    """Manages and orchestrates multiple scrapers for comprehensive data collection"""
    
    def __init__(self):
        self.scrapers = {
            'fbref': FBrefScraper(),
            'whoscored': WhoScoredScraper()
        }
        self.last_scrape_times = {}
        self.scraping_active = False
    
    async def scrape_match_data(self, fixture_id: int, home_team: str, away_team: str) -> Dict[str, Optional[ScrapedData]]:
        """Scrape comprehensive match data from all available sources"""
        print(f"🕷️ Starting comprehensive scraping for fixture {fixture_id}: {home_team} vs {away_team}")
        
        results = {}
        
        # Scrape from FBref for xG data
        try:
            print("📊 Scraping xG data from FBref...")
            fbref_data = await self.scrapers['fbref'].scrape_match_xg(fixture_id, home_team, away_team)
            results['fbref_xg'] = fbref_data
            
            if fbref_data:
                if hasattr(fbref_data, 'save_to_database'):
                    await fbref_data.save_to_database()
                print(f"✅ FBref xG data: confidence {fbref_data.confidence}")
            else:
                print("❌ FBref xG scraping failed")
        except Exception as e:
            print(f"❌ FBref scraping error: {e}")
            results['fbref_xg'] = None
        
        # Add delay between scrapers to be respectful
        await asyncio.sleep(30)
        
        # Scrape from WhoScored for match insights
        try:
            print("🎯 Scraping match insights from WhoScored...")
            whoscored_data = await self.scrapers['whoscored'].scrape_match_insights(fixture_id, home_team, away_team)
            results['whoscored_insights'] = whoscored_data
            
            if whoscored_data:
                if hasattr(whoscored_data, 'save_to_database'):
                    await whoscored_data.save_to_database()
                print(f"✅ WhoScored insights: confidence {whoscored_data.confidence}")
            else:
                print("❌ WhoScored insights scraping failed")
        except Exception as e:
            print(f"❌ WhoScored scraping error: {e}")
            results['whoscored_insights'] = None
        
        return results
    
    async def scrape_team_data(self, team_id: int, team_name: str) -> Dict[str, Optional[ScrapedData]]:
        """Scrape comprehensive team data from all available sources"""
        print(f"🕷️ Starting team data scraping for {team_name} (ID: {team_id})")
        
        results = {}
        
        # Scrape team form from FBref
        try:
            print("📈 Scraping team form from FBref...")
            fbref_form = await self.scrapers['fbref'].scrape_team_form(team_id, team_name)
            results['fbref_form'] = fbref_form
            
            if fbref_form:
                if hasattr(fbref_form, 'save_to_database'):
                    await fbref_form.save_to_database()
                print(f"✅ FBref form data: confidence {fbref_form.confidence}")
            else:
                print("❌ FBref form scraping failed")
        except Exception as e:
            print(f"❌ FBref form scraping error: {e}")
            results['fbref_form'] = None
        
        # Add delay between scrapers
        await asyncio.sleep(45)
        
        # Scrape team ratings from WhoScored
        try:
            print("⭐ Scraping team ratings from WhoScored...")
            whoscored_ratings = await self.scrapers['whoscored'].scrape_team_ratings(team_id, team_name)
            results['whoscored_ratings'] = whoscored_ratings
            
            if whoscored_ratings:
                if hasattr(whoscored_ratings, 'save_to_database'):
                    await whoscored_ratings.save_to_database()
                print(f"✅ WhoScored ratings: confidence {whoscored_ratings.confidence}")
            else:
                print("❌ WhoScored ratings scraping failed")
        except Exception as e:
            print(f"❌ WhoScored ratings scraping error: {e}")
            results['whoscored_ratings'] = None
        
        return results
    
    async def cleanup_all_scrapers(self):
        """Clean up all scraper resources"""
        print("🧹 Cleaning up scraper resources...")
        
        for name, scraper in self.scrapers.items():
            try:
                await scraper.cleanup()
                print(f"✅ Cleaned up {name} scraper")
            except Exception as e:
                print(f"⚠️ Error cleaning up {name} scraper: {e}")
    
    def get_scraper_status(self) -> Dict[str, Dict]:
        """Get status of all scrapers"""
        status = {
            'scraping_active': self.scraping_active,
            'scrapers': {},
            'last_run': self.last_scrape_times
        }
        
        for name, scraper in self.scrapers.items():
            status['scrapers'][name] = {
                'site_name': scraper.site_name,
                'base_url': scraper.base_url,
                'proxy_count': len(scraper.proxy_pool),
                'min_delay': scraper.min_delay,
                'cache_enabled': True
            }
        
        return status


# Singleton instance for the application
scraper_manager = ScraperManager()


async def test_scraper_infrastructure():
    """Test the complete scraper infrastructure"""
    print("🧪 Testing scraper infrastructure...")
    
    try:
        # Test with sample data
        test_fixture_id = 999999
        test_home_team = "Liverpool"
        test_away_team = "Manchester City"
        test_team_id = 40
        
        # Test match data scraping
        print("\n🏈 Testing match data scraping...")
        match_results = await scraper_manager.scrape_match_data(
            test_fixture_id, test_home_team, test_away_team
        )
        
        print(f"Match scraping results: {len([r for r in match_results.values() if r])} successful out of {len(match_results)}")
        
        # Test team data scraping  
        print("\n👥 Testing team data scraping...")
        team_results = await scraper_manager.scrape_team_data(test_team_id, test_home_team)
        
        print(f"Team scraping results: {len([r for r in team_results.values() if r])} successful out of {len(team_results)}")
        
        # Show status
        print("\n📊 Scraper Status:")
        status = scraper_manager.get_scraper_status()
        for scraper_name, info in status['scrapers'].items():
            print(f"  {scraper_name}: {info['site_name']} (delay: {info['min_delay']}s)")
        
        print("✅ Scraper infrastructure test completed!")
        
    except Exception as e:
        print(f"❌ Scraper test failed: {e}")
    finally:
        await scraper_manager.cleanup_all_scrapers()


if __name__ == "__main__":
    # Run the test
    asyncio.run(test_scraper_infrastructure())