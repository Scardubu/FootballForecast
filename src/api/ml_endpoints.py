"""
FastAPI endpoints for ML-powered football predictions
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from ml.feature_engineering import FeatureEngineering
from ml.predictor import FootballPredictor

# Import scrapers - make them all optional for graceful degradation
try:
    from scrapers.fbref_scraper import FBrefScraper
except ImportError:
    FBrefScraper = None
    print("WARNING: FBrefScraper not available")

try:
    from scrapers.oddsportal_scraper import OddsPortalScraper
except ImportError:
    OddsPortalScraper = None
    print("WARNING: OddsPortalScraper not available")

try:
    from scrapers.physioroom_scraper import PhysioRoomScraper
except ImportError:
    PhysioRoomScraper = None
    print("WARNING: PhysioRoomScraper not available")

# OpenWeather scraper - optional, will be initialized if available
try:
    from scrapers.openweather_scraper import OpenWeatherScraper
    OPENWEATHER_AVAILABLE = True
except ImportError:
    OpenWeatherScraper = None
    OPENWEATHER_AVAILABLE = False
    print("WARNING: OpenWeatherScraper not available - weather data will be skipped")


app = FastAPI(
    title="SabiScore ML Prediction API",
    description="ML-powered football match predictions with explainable AI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global predictor instance
predictor = FootballPredictor()


class PredictionRequest(BaseModel):
    fixture_id: Optional[int] = None
    home_team_id: int
    away_team_id: int
    home_team_name: Optional[str] = None
    away_team_name: Optional[str] = None


class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}  # Disable protected namespace warnings
    
    fixture_id: Optional[int]
    predicted_outcome: str
    probabilities: Dict[str, float]
    confidence: float
    expected_goals: Dict[str, float]
    additional_markets: Dict[str, float]
    key_features: List[Dict]
    model_version: str
    model_trained: Optional[bool] = None
    latency_ms: Optional[float] = None
    model_calibrated: Optional[bool] = None
    calibration: Optional[Dict] = None
    explanation: Optional[str] = None


class TrainingRequest(BaseModel):
    start_date: str
    end_date: str
    retrain: bool = True


class ScrapeRequest(BaseModel):
    team_ids: List[int]
    team_names: List[str]
    fixture_ids: Optional[List[int]] = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SabiScore ML Prediction API",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest):
    """
    Predict match outcome with ML model and explainable AI
    """
    try:
        # Get prediction from ML model
        prediction = predictor.predict_match(
            request.home_team_id,
            request.away_team_id,
            request.fixture_id
        )
        # Add explanation
        prediction['explanation'] = generate_prediction_explanation(prediction)
        # Pass through all fields (including latency, calibration, etc)
        return PredictionResponse(**prediction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predictions/batch")
async def predict_batch_matches(requests: List[PredictionRequest]):
    """
    Predict multiple matches in batch
    """
    try:
        predictions = []
        for request in requests:
            prediction = predictor.predict_match(
                request.home_team_id,
                request.away_team_id,
                request.fixture_id
            )
            prediction['explanation'] = generate_prediction_explanation(prediction)
            predictions.append(PredictionResponse(**prediction))
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.post("/train")
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Train or retrain the ML model with historical data
    """
    try:
        if request.retrain:
            background_tasks.add_task(
                retrain_model_background,
                request.start_date,
                request.end_date
            )
            
            return {
                "message": "Model retraining started in background",
                "start_date": request.start_date,
                "end_date": request.end_date
            }
        else:
            # Quick training status check
            return {
                "message": "Training not requested",
                "model_status": "current"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/scrape")
async def scrape_data(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Trigger data scraping for specified teams
    """
    try:
        background_tasks.add_task(
            scrape_team_data_background,
            request.team_ids,
            request.team_names,
            request.fixture_ids or []
        )
        
        return {
            "message": "Data scraping started in background",
            "teams": len(request.team_ids),
            "fixtures": len(request.fixture_ids or [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


@app.get("/model/status")
async def get_model_status():
    """
    Get current model status and performance metrics
    """
    try:
        # Try to load model metadata
        predictor._load_model()
        
        if predictor.model is None:
            return {
                "status": "not_trained",
                "message": "No trained model available"
            }
        
        return {
            "status": "ready",
            "metadata": predictor.get_model_status(),
            "features_count": len(predictor.feature_names or [])
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Model status check failed: {str(e)}"
        }


@app.get("/features/{fixture_id}")
async def get_match_features(fixture_id: int, home_team_id: int, away_team_id: int):
    """
    Get raw features for a match (for debugging/analysis)
    """
    try:
        fe = FeatureEngineering()
        features = fe.create_match_features(fixture_id, home_team_id, away_team_id)
        
        return {
            "fixture_id": fixture_id,
            "features": features,
            "feature_count": len(features)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}")


@app.get("/insights/team/{team_id}")
async def get_team_insights(team_id: int):
    """
    Get detailed insights for a specific team
    """
    try:
        fe = FeatureEngineering()
        
        # Get team features for both home and away scenarios
        home_features = fe._get_team_features(team_id, is_home=True)
        away_features = fe._get_team_features(team_id, is_home=False)
        
        insights = {
            "team_id": team_id,
            "attack_strength": {
                "home": home_features.get('avg_xg_for', 1.4),
                "away": away_features.get('avg_xg_for', 1.4),
                "overall": (home_features.get('avg_xg_for', 1.4) + away_features.get('avg_xg_for', 1.4)) / 2
            },
            "defense_strength": {
                "home": home_features.get('avg_xg_against', 1.4),
                "away": away_features.get('avg_xg_against', 1.4),
                "overall": (home_features.get('avg_xg_against', 1.4) + away_features.get('avg_xg_against', 1.4)) / 2
            },
            "recent_form": home_features.get('form_data', {}),
            "momentum": home_features.get('recent_momentum', 0.0)
        }
        
        return insights
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Team insights failed: {str(e)}")


def generate_prediction_explanation(prediction: Dict) -> str:
    """Generate human-readable explanation for prediction"""
    outcome = prediction['predicted_outcome']
    confidence = prediction['confidence']
    key_features = prediction.get('key_features', [])
    
    explanation = f"The model predicts a {outcome} with {confidence:.0f}% confidence. "
    
    if key_features:
        top_feature = key_features[0]
        feature_name = top_feature['name']
        impact = top_feature['impact']
        
        explanation += f"The most influential factor is {feature_name}, which has a {impact.lower()} impact on the home team's chances."
        
        if len(key_features) > 1:
            second_feature = key_features[1]
            explanation += f" Additionally, {second_feature['name']} also plays a significant role."
    
    # Add expected goals context
    home_xg = prediction['expected_goals']['home']
    away_xg = prediction['expected_goals']['away']
    
    if home_xg > away_xg + 0.5:
        explanation += f" The home team is expected to create significantly more chances ({home_xg:.1f} vs {away_xg:.1f} xG)."
    elif away_xg > home_xg + 0.5:
        explanation += f" The away team is expected to create more scoring opportunities ({away_xg:.1f} vs {home_xg:.1f} xG)."
    else:
        explanation += f" Both teams are expected to create similar amounts of chances ({home_xg:.1f} vs {away_xg:.1f} xG)."
    
    return explanation


async def retrain_model_background(start_date: str, end_date: str):
    """Background task for model retraining"""
    try:
        # Train model with date range - the predictor handles data preparation internally
        success = predictor.train_model(start_date, end_date)
        
        if success:
            print(f"Model retrained successfully for period: {start_date} to {end_date}")
        else:
            print("Model training failed - check logs for details")
            
    except Exception as e:
        print(f"Background model training failed: {e}")


async def scrape_team_data_background(team_ids: List[int], team_names: List[str], fixture_ids: List[int]):
    """Background task for data scraping"""
    try:
        fbref = FBrefScraper()
        odds = OddsPortalScraper()
        physio = PhysioRoomScraper()
        weather = None
        
        # Initialize weather scraper if API key is available and module exists
        if OPENWEATHER_AVAILABLE and os.getenv('OPENWEATHER_API_KEY'):
            try:
                weather = OpenWeatherScraper()
            except Exception as e:
                print(f"⚠️ Weather scraper initialization failed: {e}")
        elif not OPENWEATHER_AVAILABLE:
            print("ℹ️ OpenWeather scraper not available - skipping weather data collection")
        
        # Scrape team form data
        for team_id, team_name in zip(team_ids, team_names):
            form_data = await fbref.scrape_team_form(team_id, team_name)
            if form_data:
                await fbref.save_to_database(form_data)
                print(f"Scraped form data for team {team_name}")

            # Scrape injuries per team (PhysioRoom)
            injuries = await physio.scrape_team_injuries(team_id, team_name)
            if injuries:
                await physio.save_to_database(injuries)
                print(f"Scraped injuries for team {team_name}")
        
        # Scrape match data if fixture IDs provided
        for fixture_id in fixture_ids:
            if len(team_names) >= 2:
                match_data = await fbref.scrape_match_xg(fixture_id, team_names[0], team_names[1])
                if match_data:
                    await fbref.save_to_database(match_data)
                    print(f"Scraped match data for fixture {fixture_id}")

                # Scrape odds drift for the fixture (OddsPortal)
                odds_data = await odds.scrape_fixture_odds(fixture_id, team_names[0], team_names[1])
                if odds_data:
                    await odds.save_to_database(odds_data)
                    print(f"Scraped odds data for fixture {fixture_id}")
                
                # Scrape weather data for the fixture (OpenWeather) if available
                # Note: Requires venue coordinates to be available from fixture metadata
                # This is a placeholder - actual implementation needs venue lat/lon lookup
                if weather:
                    # TODO: Fetch fixture details to get venue coordinates and timestamp
                    # For now, skip weather scraping in background task
                    # Weather should be scraped on-demand when coordinates are available
                    pass
        
        print("Background scraping completed")
        
    except Exception as e:
        print(f"Background scraping failed: {e}")
    finally:
        # Cleanup Playwright resources
        try:
            await fbref.cleanup()
        except Exception:
            pass
        try:
            await odds.cleanup()
        except Exception:
            pass
        try:
            await physio.cleanup()
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)