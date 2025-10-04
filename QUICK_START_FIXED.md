# Quick Start Guide - Fixed Version

## 🚀 Start the Application (3 Steps)

### Step 1: Install Dependencies (if not done)

```bash
npm install
```

### Step 2: Build the Client

```bash
npm run build
```

### Step 3: Start the Development Server

```bash
npm run dev
```

The server will start on **<http://localhost:5000>**

## ✅ What Happens Automatically

1. **Data Seeding** - Automatically seeds:
   - 5 leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
   - 15 teams (3-4 per league)
   - 6 fixtures (IDs: 1001-1006)
   - League standings

2. **Server Startup** - Starts Express server with:
   - API endpoints on `/api/*`
   - Static file serving
   - Error handling middleware
   - Logging

3. **Frontend** - Serves React application with:
   - Dashboard with predictions
   - Live matches (using seeded data)
   - League standings
   - Performance monitoring

## 🔍 Verify Everything Works

### Check Server Logs

You should see:

```
✅ API_FOOTBALL_KEY found in environment
✅ Using Memory storage
✅ Checking if data seeding is required...
✅ Database is empty. Starting data seeding process...
✅ Seeded 5 top leagues.
✅ Seeded 4 teams for league 39.
✅ Seeded 2 fixtures for league 39.
✅ Data seeding process completed.
✅ Server listening on port 5000
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Get fixtures
curl http://localhost:5000/api/fixtures

# Get prediction (should return 404 or prediction, NOT 500)
curl http://localhost:5000/api/predictions/1001

# Get telemetry (should return {} or data, NOT 500)
curl http://localhost:5000/api/predictions/telemetry
```

### Check Browser

1. Open <http://localhost:5000>
2. Open DevTools Console (F12)
3. Verify:
   - ✅ No 500 errors
   - ✅ Dashboard loads
   - ✅ Predictions panel shows fixtures
   - ✅ Minimal layout shifts

## 🐛 Troubleshooting

### Port 5000 Already in Use

```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Then restart
npm run dev
```

### Server Won't Start

```bash
# Check TypeScript compilation
npx tsc --noEmit -p tsconfig.server.json

# If errors, check:
# - server/lib/data-seeder.ts (no client imports)
# - All imports use .js extensions
```

### Still Getting 500 Errors

The fixes have been applied. If you still see 500 errors:

1. **Stop the server** (Ctrl+C)
2. **Clear any cached data**
3. **Restart:** `npm run dev`
4. **Check logs** for seeding completion

## 📊 What You'll See

### Dashboard Features

- **Today's Pulse** - Telemetry metrics (fixtures analyzed, calibration rate, latency)
- **Ingestion Health** - Data ingestion statistics
- **Live Matches** - Seeded fixture data
- **AI Predictions** - Predictions panel with 6 fixtures
- **League Standings** - Top 3 teams per league
- **Quick Stats** - At-a-glance metrics

### Available Fixtures

- **1001:** Manchester City vs Liverpool
- **1002:** Arsenal vs Manchester United
- **1003:** Real Madrid vs Barcelona
- **1004:** Inter vs AC Milan
- **1005:** Bayern Munich vs Borussia Dortmund
- **1006:** PSG vs Marseille

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build client only
npm run build

# Build server only
npm run build:server

# Start production server
npm start

# Run tests
npm test

# Type check
npm run check
```

## 📝 Notes

- **First run:** Data seeding takes ~1 second
- **Subsequent runs:** Skips seeding if data exists
- **Memory storage:** Data resets on server restart
- **Database storage:** Set `DATABASE_URL` to persist data

## ✨ All Fixed Issues

- ✅ No more 500 errors on `/api/predictions/*`
- ✅ Fixtures properly seeded
- ✅ Predictions panel functional
- ✅ Reduced layout shifts
- ✅ Better error messages
- ✅ Reliable startup

---

**Ready to go!** Just run `npm run dev` and open <http://localhost:5000>
