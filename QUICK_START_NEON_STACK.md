# Quick Start: Neon.tech + Stack Auth

## 🎯 3-Minute Setup

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Environment**

Create `.env` file:
```bash
# Neon.tech Database
DATABASE_URL=postgresql://[user]:[password]@ep-bitter-frost-addp6o5c.us-east-1.aws.neon.tech/neondb?sslmode=require

# Stack Auth (pre-configured for your project)
STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737
STACK_AUTH_JWKS_URL=https://api.stack-auth.com/api/v1/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737/.well-known/jwks.json
VITE_STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737

# Other required vars (from your existing .env)
API_FOOTBALL_KEY=your_api_key_here
API_BEARER_TOKEN=your_bearer_token_here
SCRAPER_AUTH_TOKEN=your_scraper_token_here
```

### 3. **Push Database Schema**
```bash
npm run db:push
```

### 4. **Start Development Server**
```bash
npm run dev
```

---

## 🔑 Key Files Created/Modified

### **New Files**
- ✅ `server/middleware/stack-auth.ts` - JWT verification middleware
- ✅ `server/services/featureEngineering/formCalculator.ts` - Form analysis
- ✅ `server/services/featureEngineering/xgCalculator.ts` - Expected goals
- ✅ `server/services/featureEngineering/featureExtractor.ts` - Feature orchestrator
- ✅ `server/services/predictionEngine.ts` - Enhanced predictions
- ✅ `client/src/hooks/use-prediction-store.ts` - Prediction state
- ✅ `client/src/components/match-prediction-card.tsx` - Betting UI
- ✅ `client/src/components/betting-insights-selector.tsx` - Fixture selector
- ✅ `client/src/pages/betting-insights.tsx` - Betting insights page
- ✅ `NEON_STACK_AUTH_MIGRATION.md` - Full migration guide
- ✅ `BETTING_INSIGHTS_IMPLEMENTATION.md` - Feature documentation

### **Modified Files**
- ✅ `.env.example` - Neon + Stack Auth configuration
- ✅ `server/config/index.ts` - Added Stack Auth config
- ✅ `server/routers/predictions.ts` - Added insights endpoints
- ✅ `package.json` - Added `jose@5.10.0`
- ✅ `client/src/App.tsx` - Added betting insights route
- ✅ `client/src/components/header.tsx` - Added navigation
- ✅ `client/src/components/lazy-wrapper.tsx` - Added lazy components

---

## 🚀 Features Ready

### **Betting Insights Platform** ✅
- Match outcome probabilities (Home/Draw/Away)
- Expected goals (xG) analysis
- Form trends with momentum indicators  
- Head-to-head statistics
- Venue advantage metrics
- Betting suggestions (Match Result, O/U 2.5, BTTS)
- Full explainability with key factors

### **Authentication** ✅
- Stack Auth JWT verification via JWKS
- Hybrid middleware (Stack Auth + legacy bearer)
- Backward compatible with existing tokens
- Stateless, scalable authentication

### **Database** ✅
- Neon.tech serverless PostgreSQL
- Same schema, optimized connections
- Auto-scaling, pay-per-use
- Connection pooling built-in

---

## 📊 API Endpoints

### **Betting Insights**
```bash
# Get enhanced prediction
GET /api/predictions/:fixtureId/insights

# Batch predictions (max 20)
POST /api/predictions/batch/insights
Body: { "fixtureIds": [123, 456, 789] }
```

### **Authentication**
```bash
# Check auth status
GET /api/auth/status
Headers: Authorization: Bearer <stack-auth-jwt>

# Legacy dev login (development only)
POST /api/auth/dev-login
```

---

## 🔧 Using Stack Auth in Code

### **Backend Middleware**
```typescript
import { hybridAuthMiddleware } from './middleware/stack-auth.js';

// Protects route with Stack Auth + legacy fallback
router.get('/protected', hybridAuthMiddleware, async (req, res) => {
  const user = req.user; // { id, email, projectId, ... }
  res.json({ user });
});
```

### **Frontend (Future)**
When ready to migrate client:
```tsx
import { StackProvider } from "@stackframe/stack";

<StackProvider projectId="8b0648c2-f267-44c1-b4c2-a64eccb6f737">
  <App />
</StackProvider>
```

---

## ✅ Verification

### **Test Database Connection**
```bash
psql "$DATABASE_URL" -c "SELECT 1;"
```

### **Test Stack Auth**
```bash
# Get a JWT from Stack Auth dashboard
curl -H "Authorization: Bearer <your-jwt>" \
  http://localhost:5000/api/auth/status
```

### **Test Betting Insights**
```bash
curl http://localhost:5000/api/predictions/12345/insights
```

---

## 📞 Support Resources

**Your Project**:
- Email: scardubu@gmail.com
- Stack Auth ID: `8b0648c2-f267-44c1-b4c2-a64eccb6f737`
- Neon Endpoint: `ep-bitter-frost-addp6o5c.us-east-1.aws.neon.tech`

**Dashboards**:
- Neon: https://console.neon.tech
- Stack Auth: https://app.stack-auth.com/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737

**Documentation**:
- Full Migration: `NEON_STACK_AUTH_MIGRATION.md`
- Betting Insights: `BETTING_INSIGHTS_IMPLEMENTATION.md`

---

## 🎉 You're Ready!

Everything is configured and ready to go:

1. ✅ Betting insights feature (complete)
2. ✅ Neon.tech database (configured)
3. ✅ Stack Auth JWT (integrated)
4. ✅ Hybrid middleware (backward compatible)
5. ✅ Documentation (comprehensive)

**Next Step**: Update your `.env` file with Neon credentials and run `npm install && npm run db:push && npm run dev`
