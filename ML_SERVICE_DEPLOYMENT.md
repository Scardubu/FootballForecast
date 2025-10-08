# ML Service Production Deployment Guide

**Python FastAPI ML Service for Football Forecast**

---

## 📋 Overview

The ML service provides AI-powered match predictions using XGBoost. Currently running in development, this guide covers production deployment options.

### Current Status
- **Development:** ✅ Running on <http://127.0.0.1:8000>
- **Production:** ⏳ Pending deployment
- **Fallback:** ✅ Statistical predictions active

---

## 🏗️ Deployment Options

### Option 1: Railway (Recommended) ⭐

**Pros:**
- Simple deployment
- Automatic HTTPS
- Free tier available
- Built-in monitoring

**Steps:**

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
cd src
railway init
```

4. **Create railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn api.ml_endpoints:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

5. **Create requirements.txt** (if not exists)
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
xgboost==2.0.3
scikit-learn==1.3.2
pandas==2.1.3
numpy==1.26.2
pydantic==2.5.0
python-multipart==0.0.6
```

6. **Deploy**
```bash
railway up
```

7. **Get Production URL**
```bash
railway domain
# Copy the URL (e.g., https://sabiscore-ml.up.railway.app)
```

8. **Update Netlify Environment**
```bash
netlify env:set ML_SERVICE_URL https://sabiscore-ml.up.railway.app
netlify env:set ML_FALLBACK_ENABLED false
```

---

### Option 2: Render

**Pros:**
- Free tier with auto-sleep
- Easy GitHub integration
- Automatic deployments

**Steps:**

1. **Create render.yaml in src/**
```yaml
services:
  - type: web
    name: sabiscore-ml
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn api.ml_endpoints:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: PORT
        value: 8000
```

2. **Push to GitHub**
```bash
git add src/
git commit -m "Add ML service for Render deployment"
git push origin main
```

3. **Deploy on Render**
- Go to <https://render.com>
- New → Web Service
- Connect GitHub repo
- Select `src` directory
- Deploy

4. **Update Netlify**
```bash
netlify env:set ML_SERVICE_URL https://sabiscore-ml.onrender.com
```

---

### Option 3: Google Cloud Run

**Pros:**
- Serverless auto-scaling
- Pay per use
- Enterprise-grade

**Steps:**

1. **Create Dockerfile in src/**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD uvicorn api.ml_endpoints:app --host 0.0.0.0 --port $PORT
```

2. **Build and Deploy**
```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build container
cd src
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/sabiscore-ml

# Deploy to Cloud Run
gcloud run deploy sabiscore-ml \
  --image gcr.io/YOUR_PROJECT_ID/sabiscore-ml \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000
```

3. **Update Netlify**
```bash
netlify env:set ML_SERVICE_URL https://sabiscore-ml-xxx.run.app
```

---

### Option 4: Fly.io

**Pros:**
- Global edge deployment
- Free allowance
- Fast cold starts

**Steps:**

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login**
```bash
fly auth login
```

3. **Create fly.toml in src/**
```toml
app = "sabiscore-ml"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 8000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

4. **Deploy**
```bash
cd src
fly launch
fly deploy
```

5. **Update Netlify**
```bash
netlify env:set ML_SERVICE_URL https://sabiscore-ml.fly.dev
```

---

## 🔧 Environment Configuration

### ML Service Environment Variables

```bash
# Optional: Model configuration
MODEL_PATH=/app/models/xgboost_model.json
ENABLE_MODEL_CACHE=true
PREDICTION_TIMEOUT=5000

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### Netlify Environment (After ML Deployment)

```bash
# Set ML service URL
netlify env:set ML_SERVICE_URL https://your-ml-service.com

# Disable fallback (use real ML only)
netlify env:set ML_FALLBACK_ENABLED false

# Set timeout
netlify env:set ML_SERVICE_TIMEOUT 10000
```

---

## 🧪 Testing Production ML Service

### Health Check
```bash
curl https://your-ml-service.com/
# Expected: {"message":"SabiScore ML Prediction API","status":"healthy","version":"1.0.0"}
```

### Prediction Test
```bash
curl -X POST https://your-ml-service.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": 12345,
    "home_team_id": 1,
    "away_team_id": 2,
    "home_team_name": "Arsenal",
    "away_team_name": "Chelsea",
    "league_id": 39,
    "season": 2024
  }'
```

### Model Status
```bash
curl https://your-ml-service.com/model/status
```

---

## 📊 Performance Optimization

### 1. Model Caching
```python
# In api/ml_endpoints.py
from functools import lru_cache

@lru_cache(maxsize=1)
def load_model():
    return xgboost.Booster(model_file='model.json')
```

### 2. Request Batching
```python
# Enable batch predictions
@app.post("/predictions/batch")
async def batch_predict(requests: List[PredictionRequest]):
    predictions = model.predict_batch(requests)
    return predictions
```

### 3. Response Compression
```python
# Add gzip middleware
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

## 🔐 Security Considerations

### 1. API Authentication
```python
# Add API key validation
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != os.getenv("ML_API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
```

### 2. Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/predict")
@limiter.limit("100/minute")
async def predict(request: PredictionRequest):
    ...
```

### 3. CORS Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sabiscore.netlify.app"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

---

## 📈 Monitoring & Logging

### 1. Sentry Integration
```python
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=1.0,
)
```

### 2. Structured Logging
```python
import logging
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

@app.post("/predict")
async def predict(request: PredictionRequest):
    logger.info(json.dumps({
        "event": "prediction_request",
        "fixture_id": request.fixture_id,
        "teams": f"{request.home_team_name} vs {request.away_team_name}"
    }))
```

### 3. Metrics Collection
```python
from prometheus_client import Counter, Histogram

prediction_counter = Counter('predictions_total', 'Total predictions')
prediction_latency = Histogram('prediction_latency_seconds', 'Prediction latency')

@app.post("/predict")
@prediction_latency.time()
async def predict(request: PredictionRequest):
    prediction_counter.inc()
    ...
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Test ML service locally (`npm run dev:python`)
- [ ] Verify model file exists and loads
- [ ] Check all dependencies in requirements.txt
- [ ] Test prediction endpoint with sample data
- [ ] Review environment variables

### Deployment
- [ ] Choose hosting platform (Railway/Render/GCP/Fly)
- [ ] Configure deployment files (railway.json/render.yaml/Dockerfile)
- [ ] Deploy ML service
- [ ] Verify health endpoint
- [ ] Test prediction endpoint
- [ ] Check logs for errors

### Post-Deployment
- [ ] Update Netlify ML_SERVICE_URL
- [ ] Set ML_FALLBACK_ENABLED=false
- [ ] Test integration with frontend
- [ ] Monitor performance metrics
- [ ] Set up error alerts
- [ ] Configure auto-scaling (if applicable)

---

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy-ml.yml
name: Deploy ML Service

on:
  push:
    branches: [main]
    paths:
      - 'src/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          cd src && railway up
```

---

## 📝 Cost Estimates

### Railway (Recommended for Start)
- **Free Tier:** $5 credit/month
- **Hobby Plan:** $5/month
- **Expected:** ~$0-10/month for moderate traffic

### Render
- **Free Tier:** Auto-sleep after 15min inactivity
- **Starter:** $7/month (always on)
- **Expected:** $0-7/month

### Google Cloud Run
- **Free Tier:** 2M requests/month
- **Pay-per-use:** $0.40 per million requests
- **Expected:** $0-5/month for moderate traffic

### Fly.io
- **Free Allowance:** 3 shared-cpu VMs
- **Expected:** $0-5/month

---

## 🎯 Recommended Deployment Path

### For Development/Testing
1. **Use Railway** (simplest, free tier)
2. Deploy in 5 minutes
3. Get HTTPS URL automatically

### For Production (Low Traffic)
1. **Use Render** (free tier with auto-sleep)
2. Upgrade to Starter ($7/month) when needed
3. GitHub auto-deploy enabled

### For Production (High Traffic)
1. **Use Google Cloud Run** (serverless, auto-scale)
2. Pay only for actual usage
3. Enterprise-grade reliability

---

## 🔗 Integration with Main App

### Update Backend to Use Production ML
```typescript
// server/lib/ml-client.ts
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
```

### Frontend Configuration
```typescript
// No changes needed - backend handles ML communication
```

### Verify Integration
```bash
# Check health endpoint includes ML status
curl https://sabiscore.netlify.app/api/health
# Should show: "ml": "healthy"
```

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Cold Start Latency**
- Solution: Use Railway/Fly.io (faster cold starts)
- Alternative: Keep-alive ping every 5 minutes

**2. Model Not Found**
- Solution: Ensure model file is in deployment
- Check: Model path in environment variables

**3. Memory Limits**
- Solution: Optimize model size or upgrade plan
- Monitor: Memory usage in platform dashboard

**4. CORS Errors**
- Solution: Add Netlify domain to CORS origins
- Verify: Response headers include Access-Control-Allow-Origin

---

## ✅ Success Criteria

ML service is production-ready when:

- [x] Health endpoint returns 200
- [x] Predictions return valid JSON
- [x] Response time < 2 seconds
- [x] Error rate < 1%
- [x] Uptime > 99.5%
- [x] Logs are accessible
- [x] Monitoring is active

---

**Next Step:** Choose a platform and deploy using the guide above!
