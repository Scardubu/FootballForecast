# SabiScore Analytics - ML-Powered Betting Insights Platform

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │ Live Match  │ │ Predictions │ │  Standings  │ │ Team Analytics││
│  │  Tracker    │ │   Panel     │ │   Display   │ │   Dashboard   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌─────────────────────┐
                    │   Express API       │
                    │   Gateway           │
                    └─────────────────────┘
                               │
            ┌─────────────────────────────────────────┐
            │            ML Pipeline                   │
            ├─────────────────────────────────────────┤
            │  ┌──────────┐ ┌─────────────┐ ┌─────────┐│
            │  │ Scrapers │ │ Feature Eng.│ │ Models  ││
            │  │ (Multi-  │ │ (xG, Form,  │ │ (XGBoost││
            │  │ Source)  │ │ Injuries)   │ │ Calibr.)││
            │  └──────────┘ └─────────────┘ └─────────┘│
            └─────────────────────────────────────────┘
                               │
                    ┌─────────────────────┐
                    │   Storage Layer     │
                    ├─────────────────────┤
                    │ ┌─────────┐ ┌──────┐│
                    │ │ SQLite  │ │Cache │││
                    │ │ (Main)  │ │(Redis││
                    │ └─────────┘ │-like)│││
                    │             └──────┘││
                    └─────────────────────┘│
                               │
            ┌─────────────────────────────────────────┐
            │        Data Sources (Scraped)           │
            ├─────────────────────────────────────────┤
            │ FBref │ WhoScored │ SofaScore │ Understat│
            │  xG   │ Ratings   │  Live     │   xG    │
            └─────────────────────────────────────────┘
```

## Current System Analysis

### Existing Infrastructure:
- **Frontend**: React/TypeScript with shadcn/ui components
- **Backend**: Express.js with in-memory storage
- **Real-time**: 15-second polling of API-Football
- **Data Models**: 7 core entities (teams, fixtures, predictions, etc.)

### Key Strengths:
- Solid component architecture with proper separation
- Real-time data updates working
- Professional UI with ESPN-inspired design
- TypeScript type safety throughout

### Areas for Enhancement:
- No ML prediction models (using static mock data)
- Single API source dependency
- In-memory storage (not persistent)
- No advanced analytics or xG data
- Limited data sources and features

## ML Enhancement Strategy

### Phase 1: Data Ingestion
- Multi-source web scraping with rotation and stealth
- Persistent SQLite storage with fallback caching
- Feature engineering pipeline (xG, form, injuries)

### Phase 2: Model Development
- Time-series validated XGBoost models
- Probability calibration with Platt scaling
- SHAP explanations for transparency

### Phase 3: Production Integration
- FastAPI inference endpoints
- Real-time prediction serving
- Enhanced UI with explainable AI

## Data Flow Architecture

```
Scrapers → Feature Engineering → ML Models → API → Frontend
    ↓              ↓                ↓         ↓       ↓
 SQLite ←→      Cache          Calibration  JSON   React
(Persist)     (Speed)         (Accuracy)  (Fast) (UX)
```