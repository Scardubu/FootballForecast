# Football Forecast - Quick Start Guide

## 🚀 Start Development Environment

### Prerequisites
- ✅ Node.js 18.18.0 or higher
- ✅ Python 3.11.0
- ✅ npm 8.19.0 or higher

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
# OR using uv (faster)
uv sync
```

### Step 2: Configure Environment

Create a `.env` file in the root directory:

```env
# Database (optional - uses in-memory if not set)
DATABASE_URL=postgresql://user:password@localhost:5432/football_forecast

# API Keys
API_FOOTBALL_KEY=your_rapidapi_key_here
API_BEARER_TOKEN=your_secure_bearer_token_here
SCRAPER_AUTH_TOKEN=your_secure_scraper_token_here

# Server Configuration
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

### Step 3: Start Services

**Option A: Run All Services (Recommended)**

Open two terminal windows:

```bash
# Terminal 1: Backend + Frontend
npm run dev:node

# Terminal 2: ML Service
npm run dev:python
```

**Option B: Run Individual Services**

```bash
# Backend only
npm run dev:node

# Frontend only (Netlify dev)
npm run dev:netlify

# Python ML service only
cd src && python -m uvicorn api.ml_endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Access Application

- **Frontend:** http://localhost:5000
- **Backend API:** http://localhost:5000/api
- **ML Service:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server

# Run tests in watch mode
npm run test:watch
```

---

## 🏗️ Building for Production

```bash
# Build both client and server
npm run build

# Build client only
npm run build:client

# Build server only
npm run build:server

# Start production server
npm start
```

---

## 🔍 Health Checks

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check ML service health
curl http://localhost:8000/health

# Check if services are running
netstat -ano | findstr ":5000"
netstat -ano | findstr ":8000"
```

---

## 🛠️ Troubleshooting

### Server Won't Start

**Error:** `ERR_UNSUPPORTED_ESM_URL_SCHEME`
- **Solution:** Ensure tsx version is 4.7.0
  ```bash
  npm install --save-dev tsx@4.7.0
  ```

**Error:** `Port 5000 already in use`
- **Solution:** Kill the process or use a different port
  ```bash
  # Find process using port 5000
  netstat -ano | findstr ":5000"
  # Kill process (replace PID)
  taskkill /PID <process_id> /F
  ```

### Python Service Issues

**Error:** `ModuleNotFoundError: No module named 'uvicorn'`
- **Solution:** Install Python dependencies
  ```bash
  pip install -r requirements.txt
  ```

**Error:** `Port 8000 already in use`
- **Solution:** Kill the process or change port
  ```bash
  # Find and kill process
  netstat -ano | findstr ":8000"
  taskkill /PID <process_id> /F
  ```

### Frontend Issues

**Issue:** Blank screen
- **Solution:** Check browser console, verify backend is running

**Issue:** API calls failing
- **Solution:** Verify environment variables are set correctly

---

## 📦 Key npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:node` | Start backend + frontend in dev mode |
| `npm run dev:python` | Start Python ML service |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run check-env` | Verify environment configuration |
| `npm run db:push` | Push database schema changes |
| `npm run db:studio` | Open Drizzle Studio |

---

## 🎯 Development Workflow

1. **Start backend:** `npm run dev:node`
2. **Start ML service:** `npm run dev:python`
3. **Make changes** to code (HMR will auto-reload)
4. **Test changes** in browser at http://localhost:5000
5. **Run tests:** `npm test`
6. **Commit changes** when ready

---

## 📊 Service URLs

### Development
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api
- ML Service: http://localhost:8000
- WebSocket: ws://localhost:5000/ws

### Production (Netlify)
- Frontend: https://resilient-souffle-0daafe.netlify.app
- Note: WebSocket requires separate deployment

---

## 🔐 Security Notes

- Never commit `.env` file
- Use strong tokens (minimum 20 characters)
- Rotate API keys regularly
- Enable HTTPS in production
- Review CORS settings before deployment

---

## 📚 Additional Documentation

- [Integration Status](./INTEGRATION_STATUS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)
- [Architecture](./docs/architecture.md)
- [API Documentation](./docs/api-documentation.md)

---

**Need Help?** Check the troubleshooting section or review the integration status report.
