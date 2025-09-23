"""
Advanced feature engineering for football match predictions
"""
import pandas as pd
import numpy as np
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json


# FootballPredictor will be imported separately to avoid circular imports

class FeatureEngineering:
    """Create advanced features for match prediction"""
    
    def __init__(self, db_path: str = "data/scraped_data.db"):
        self.db_path = db_path
        
    def create_match_features(self, fixture_id: int, home_team_id: int, away_team_id: int) -> Dict:
        """Create comprehensive feature set for a match"""
        features = {}
        
        # Get team performance features
        home_features = self._get_team_features(home_team_id, is_home=True)
        away_features = self._get_team_features(away_team_id, is_home=False)
        
        # xG-based features
        features.update(self._create_xg_features(home_features, away_features))
        
        # Form-based features
        features.update(self._create_form_features(home_features, away_features))
        
        # Head-to-head features
        features.update(self._create_h2h_features(home_team_id, away_team_id))
        
        # Momentum and trend features
        features.update(self._create_momentum_features(home_features, away_features))
        
        # Home advantage features
        features.update(self._create_home_advantage_features(home_team_id))
        
        # Injury and availability features
        features.update(self._create_injury_features(home_team_id, away_team_id))
        
        # Derived combination features
        features.update(self._create_combination_features(features))
        
        return features
    
    def _get_team_features(self, team_id: int, is_home: bool) -> Dict:
        """Get comprehensive team statistics"""
        conn = sqlite3.connect(self.db_path)
        
        # Get recent matches (last 5)
        query = """
            SELECT * FROM scraped_matches 
            WHERE (home_team_id = ? OR away_team_id = ?) 
            ORDER BY scraped_at DESC 
            LIMIT 10
        """
        matches_df = pd.read_sql_query(query, conn, params=[team_id, team_id])
        
        # Get team form data
        form_query = """
            SELECT * FROM team_form 
            WHERE team_id = ? 
            ORDER BY scraped_at DESC 
            LIMIT 1
        """
        form_df = pd.read_sql_query(form_query, conn, params=[team_id])
        
        conn.close()
        
        features = {
            'team_id': team_id,
            'is_home': is_home,
            'recent_matches': matches_df.to_dict('records') if not matches_df.empty else [],
            'form_data': form_df.to_dict('records')[0] if not form_df.empty else {}
        }
        
        # Calculate derived stats
        features.update(self._calculate_team_stats(matches_df, team_id))
        
        return features
    
    def _calculate_team_stats(self, matches_df: pd.DataFrame, team_id: int) -> Dict:
        """Calculate team statistics from recent matches"""
        if matches_df.empty:
            return self._get_default_team_stats()
        
        stats = {}
        
        # Separate home and away matches
        home_matches = matches_df[matches_df['home_team_id'] == team_id]
        away_matches = matches_df[matches_df['away_team_id'] == team_id]
        
        # xG statistics
        home_xg_for = pd.Series(home_matches['home_xg']).fillna(1.5).mean() if not home_matches.empty else 1.5
        home_xg_against = pd.Series(home_matches['away_xg']).fillna(1.2).mean() if not home_matches.empty else 1.2
        away_xg_for = pd.Series(away_matches['away_xg']).fillna(1.2).mean() if not away_matches.empty else 1.2
        away_xg_against = pd.Series(away_matches['home_xg']).fillna(1.5).mean() if not away_matches.empty else 1.5
        
        stats['avg_xg_for'] = float(np.mean([float(home_xg_for), float(away_xg_for)]))
        stats['avg_xg_against'] = float(np.mean([float(home_xg_against), float(away_xg_against)]))
        stats['xg_difference'] = stats['avg_xg_for'] - stats['avg_xg_against']
        
        # Home/away splits
        stats['home_xg_for'] = home_xg_for
        stats['home_xg_against'] = home_xg_against
        stats['away_xg_for'] = away_xg_for
        stats['away_xg_against'] = away_xg_against
        
        # Momentum based on recent performance
        recent_momentum = matches_df['momentum_score'].fillna(0).tail(3).mean()
        stats['recent_momentum'] = recent_momentum
        
        # Performance trends
        if len(matches_df) >= 5:
            early_xg = matches_df['home_xg'].fillna(1.5).tail(5).head(3).mean()
            late_xg = matches_df['home_xg'].fillna(1.5).tail(2).mean()
            stats['xg_trend'] = late_xg - early_xg
        else:
            stats['xg_trend'] = 0.0
        
        return stats
    
    def _get_default_team_stats(self) -> Dict:
        """Default statistics when no data available"""
        return {
            'avg_xg_for': 1.4,
            'avg_xg_against': 1.4,
            'xg_difference': 0.0,
            'home_xg_for': 1.5,
            'home_xg_against': 1.3,
            'away_xg_for': 1.3,
            'away_xg_against': 1.5,
            'recent_momentum': 0.0,
            'xg_trend': 0.0
        }
    
    def _create_xg_features(self, home_features: Dict, away_features: Dict) -> Dict:
        """Create xG-based features"""
        return {
            'home_avg_xg_for': home_features.get('avg_xg_for', 1.4),
            'home_avg_xg_against': home_features.get('avg_xg_against', 1.4),
            'away_avg_xg_for': away_features.get('avg_xg_for', 1.4),
            'away_avg_xg_against': away_features.get('avg_xg_against', 1.4),
            'xg_advantage': (
                home_features.get('avg_xg_for', 1.4) - away_features.get('avg_xg_against', 1.4)
            ) - (
                away_features.get('avg_xg_for', 1.4) - home_features.get('avg_xg_against', 1.4)
            ),
            'home_xg_differential': home_features.get('xg_difference', 0),
            'away_xg_differential': away_features.get('xg_difference', 0),
        }
    
    def _create_form_features(self, home_features: Dict, away_features: Dict) -> Dict:
        """Create form-based features"""
        home_form = home_features.get('form_data', {})
        away_form = away_features.get('form_data', {})
        
        home_points = home_form.get('points_last_5', 8)
        away_points = away_form.get('points_last_5', 8)
        
        return {
            'home_form_points': home_points,
            'away_form_points': away_points,
            'form_advantage': home_points - away_points,
            'home_form_string': self._form_string_to_numeric(home_form.get('form_string', 'WWDLW')),
            'away_form_string': self._form_string_to_numeric(away_form.get('form_string', 'WLDLW')),
        }
    
    def _form_string_to_numeric(self, form_string: str) -> float:
        """Convert form string (e.g., 'WWDLW') to numeric value"""
        if not form_string:
            return 0.5
        
        values = {'W': 1.0, 'D': 0.5, 'L': 0.0}
        return float(np.mean([values.get(char, 0.5) for char in form_string]))
    
    def _create_h2h_features(self, home_team_id: int, away_team_id: int) -> Dict:
        """Create head-to-head features"""
        conn = sqlite3.connect(self.db_path)
        
        # Get historical meetings (last 5 meetings)
        query = """
            SELECT * FROM scraped_matches 
            WHERE (home_team_id = ? AND away_team_id = ?) 
               OR (home_team_id = ? AND away_team_id = ?)
            ORDER BY scraped_at DESC 
            LIMIT 5
        """
        h2h_df = pd.read_sql_query(
            query, conn, 
            params=[home_team_id, away_team_id, away_team_id, home_team_id]
        )
        
        conn.close()
        
        if h2h_df.empty:
            return {
                'h2h_advantage': 0.0,
                'h2h_goals_for_advantage': 0.0,
                'h2h_meetings': 0,
                'h2h_home_wins': 0,
                'h2h_away_wins': 0,
                'h2h_draws': 0
            }
        
        # Calculate H2H statistics
        home_wins = len(h2h_df[
            (h2h_df['home_team_id'] == home_team_id) & 
            (h2h_df['home_xg'] > h2h_df['away_xg'])
        ])
        away_wins = len(h2h_df[
            (h2h_df['away_team_id'] == home_team_id) & 
            (h2h_df['away_xg'] > h2h_df['home_xg'])
        ])
        draws = len(h2h_df) - home_wins - away_wins
        
        return {
            'h2h_advantage': (home_wins - away_wins) / len(h2h_df),
            'h2h_goals_for_advantage': 0.0,  # Would need actual goals data
            'h2h_meetings': len(h2h_df),
            'h2h_home_wins': home_wins,
            'h2h_away_wins': away_wins,
            'h2h_draws': draws
        }
    
    def _create_momentum_features(self, home_features: Dict, away_features: Dict) -> Dict:
        """Create momentum and trend features"""
        return {
            'home_momentum': home_features.get('recent_momentum', 0.0),
            'away_momentum': away_features.get('recent_momentum', 0.0),
            'momentum_advantage': (
                home_features.get('recent_momentum', 0.0) - 
                away_features.get('recent_momentum', 0.0)
            ),
            'home_xg_trend': home_features.get('xg_trend', 0.0),
            'away_xg_trend': away_features.get('xg_trend', 0.0),
        }
    
    def _create_home_advantage_features(self, home_team_id: int) -> Dict:
        """Create home advantage features"""
        conn = sqlite3.connect(self.db_path)
        
        # Get home performance
        query = """
            SELECT * FROM scraped_matches 
            WHERE home_team_id = ? 
            ORDER BY scraped_at DESC 
            LIMIT 5
        """
        home_matches = pd.read_sql_query(query, conn, params=[home_team_id])
        
        conn.close()
        
        if home_matches.empty:
            return {
                'home_advantage_goals': 0.15,
                'home_advantage_defense': 0.1,
                'overall_home_advantage': 0.25
            }
        
        # Calculate home advantage from data
        avg_home_xg = home_matches['home_xg'].fillna(1.5).mean()
        avg_home_defense = home_matches['away_xg'].fillna(1.2).mean()
        
        return {
            'home_advantage_goals': min((avg_home_xg - 1.4) / 2, 0.3),
            'home_advantage_defense': min((1.4 - avg_home_defense) / 2, 0.2),
            'overall_home_advantage': 0.25  # Standard home advantage
        }
    
    def _create_injury_features(self, home_team_id: int, away_team_id: int) -> Dict:
        """Create injury impact features"""
        conn = sqlite3.connect(self.db_path)
        
        # Get recent injuries
        query = """
            SELECT * FROM injuries 
            WHERE (team_id = ? OR team_id = ?) 
              AND expected_return > date('now') 
            ORDER BY scraped_at DESC
        """
        injuries_df = pd.read_sql_query(
            query, conn, 
            params=[home_team_id, away_team_id]
        )
        
        conn.close()
        
        home_injuries = len(injuries_df[injuries_df['team_id'] == home_team_id])
        away_injuries = len(injuries_df[injuries_df['team_id'] == away_team_id])
        
        # Simple injury impact (each injury reduces performance by ~2%)
        return {
            'home_injury_impact': -home_injuries * 0.02,
            'away_injury_impact': -away_injuries * 0.02,
            'injury_advantage': (away_injuries - home_injuries) * 0.02,
            'home_key_injuries': home_injuries,
            'away_key_injuries': away_injuries
        }
    
    def _create_combination_features(self, features: Dict) -> Dict:
        """Create combination and interaction features"""
        # Overall advantages
        overall_home_advantage = (
            features.get('xg_advantage', 0) * 0.4 +
            features.get('form_advantage', 0) * 0.01 +
            features.get('momentum_advantage', 0) * 0.3 +
            features.get('h2h_advantage', 0) * 0.2 +
            features.get('injury_advantage', 0) * 5.0 +
            features.get('overall_home_advantage', 0.25)
        )
        
        # Attack vs Defense matchups
        home_attack_vs_away_defense = (
            features.get('home_avg_xg_for', 1.4) / 
            max(features.get('away_avg_xg_against', 1.4), 0.5)
        )
        
        away_attack_vs_home_defense = (
            features.get('away_avg_xg_for', 1.4) / 
            max(features.get('home_avg_xg_against', 1.4), 0.5)
        )
        
        return {
            'overall_home_advantage': overall_home_advantage,
            'home_attack_vs_away_defense': home_attack_vs_away_defense,
            'away_attack_vs_home_defense': away_attack_vs_home_defense,
            'total_expected_goals': (
                features.get('home_avg_xg_for', 1.4) + 
                features.get('away_avg_xg_for', 1.4)
            ),
            'expected_goal_difference': (
                features.get('home_avg_xg_for', 1.4) - 
                features.get('away_avg_xg_for', 1.4)
            )
        }
    
    def create_training_dataset(self, start_date: str, end_date: str) -> Tuple[pd.DataFrame, pd.Series]:
        """Create training dataset from historical data"""
        conn = sqlite3.connect(self.db_path)
        
        # Get historical matches with results
        query = """
            SELECT sm.*, 
                   CASE 
                     WHEN sm.home_xg > sm.away_xg THEN 1
                     WHEN sm.home_xg < sm.away_xg THEN 0
                     ELSE 2
                   END as outcome
            FROM scraped_matches sm
            WHERE sm.scraped_at BETWEEN ? AND ?
              AND sm.home_xg IS NOT NULL 
              AND sm.away_xg IS NOT NULL
            ORDER BY sm.scraped_at
        """
        
        matches_df = pd.read_sql_query(query, conn, params=[start_date, end_date])
        conn.close()
        
        if matches_df.empty:
            return pd.DataFrame(), pd.Series()
        
        # Create features for each match
        features_list = []
        labels = []
        
        for _, match in matches_df.iterrows():
            # Skip rows with null team IDs using scalar values
            try:
                home_team_val = match['home_team_id']
                away_team_val = match['away_team_id'] 
                if home_team_val is None or away_team_val is None or \
                   str(home_team_val).lower() == 'nan' or str(away_team_val).lower() == 'nan':
                    continue
            except (KeyError, TypeError):
                continue
                
            features = self.create_match_features(
                int(match['fixture_id']), 
                int(match['home_team_id']), 
                int(match['away_team_id'])
            )
            
            features_list.append(features)
            labels.append(match['outcome'])
        
        if not features_list:
            return pd.DataFrame(), pd.Series()
        
        # Convert to DataFrame
        features_df = pd.DataFrame(features_list)
        
        # Fill missing values
        features_df = features_df.fillna(0)
        
        return features_df, pd.Series(labels)