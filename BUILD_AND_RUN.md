# 🚀 Build & Run Guide

## Quick Start Commands

### Development Mode (Recommended for Testing)
```bash
# Start development server (hot reload enabled)
npm run dev
```
**Server will start on:** <http://localhost:5000>

---

## Build Commands

### Clean Build Environment
```bash
# Remove previous builds and cache
npm run clean
```
This removes:
- `dist/` folder (all compiled output)
- `node_modules/.vite/` (Vite cache)

### Build for Production

#### Option 1: Client Only (Static Site)
```bash
# Build optimized client bundle
npm run build
```
**Output:** `dist/public/` folder containing:
- `index.html`
- `assets/` folder with JS/CSS bundles
- Static assets (fonts, icons, etc.)

#### Option 2: Full Stack Build
```bash
# Build client
npm run build

# Build server
npm run build:server
```
**Output:**
- Client: `dist/public/`
- Server: `dist/server/`

---

## Running the Application

### Development
```bash
# Start dev server with hot reload
npm run dev
```
**Features:**
- ✅ Hot Module Replacement (HMR)
- ✅ TypeScript compilation on-the-fly
- ✅ API proxy configured
- ✅ CSP relaxed for development

### Production
```bash
# Start production server
npm start
```
**Features:**
- ✅ Serves pre-built static files
- ✅ Full Express backend
- ✅ Strict CSP enforced
- ✅ Production optimizations

---

## Verification Steps

### 1. After Clean
```bash
npm run clean
```
**Expected:** `dist/` folder deleted

### 2. After Build
```bash
npm run build
```
**Check output:**
```powershell
# PowerShell
dir dist\public

# Should see:
# - index.html
# - assets\ (folder with JS/CSS bundles)
# - manifest.webmanifest
# - favicon files
```

### 3. After Starting Server
```bash
npm run dev
```
**Check:**
- Server starts without errors
- Console shows: "Server listening on port 5000"
- No CSP violations in browser console
- Navigate to <http://localhost:5000>

---

## Common Issues & Solutions

### Issue: `npm run clean` fails
**Solution:** Already fixed! The script is now added to `package.json`

### Issue: Port 5000 already in use
**Solution:**
```powershell
# Kill existing Node processes
taskkill /F /IM node.exe

# Then restart
npm run dev
```

### Issue: Build fails with EPERM errors
**Solution:**
```bash
# Clean first
npm run clean

# Wait a moment, then rebuild
npm run build
```

### Issue: "Cannot find module" errors
**Solution:**
```bash
# Reinstall dependencies
npm install

# Then rebuild
npm run build
```

### Issue: TypeScript errors during build
**Solution:**
```bash
# Check types without building
npm run check

# Fix any reported errors
```

---

## Build Output Structure

```
dist/
├── public/              # Client build output
│   ├── index.html      # Main HTML file
│   ├── assets/         # JS/CSS bundles
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   ├── manifest.webmanifest
│   └── favicon.*
│
└── server/             # Server build output (if built)
    ├── index.js        # Main server entry
    ├── routes.js
    ├── middleware/
    └── routers/
```

---

## Available NPM Scripts

### Core Commands
- `npm run dev` - Start development server
- `npm run build` - Build client for production
- `npm run build:server` - Build server for production
- `npm start` - Start production server
- `npm run clean` - Clean build artifacts

### Testing
- `npm test` - Run all tests
- `npm run test:client` - Run client tests only
- `npm run test:server` - Run server tests only
- `npm run test:watch` - Run tests in watch mode

### Quality Checks
- `npm run check` - Type check without building
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Deployment
- `npm run deploy` - Deploy to configured platform
- `npm run deploy:netlify` - Deploy to Netlify
- `npm run verify-deployment` - Verify deployment status

---

## Environment Variables

### Required for Development
```env
# None required - uses defaults
```

### Required for Production
```env
NODE_ENV=production
PORT=5000

# Optional: API-Football key
VITE_API_FOOTBALL_KEY=your_key_here

# Optional: Database URL
DATABASE_URL=your_database_url
```

---

## Performance Tips

### Faster Builds
```bash
# Skip type checking (faster, but less safe)
npm run build -- --skipTypeCheck

# Use more CPU cores
npm run build -- --parallel
```

### Faster Development
```bash
# Use the optimized dev command
npm run dev
```

### Clear Cache if Builds are Slow
```bash
npm run clean
npm install
npm run build
```

---

## Next Steps After Successful Build

1. **Test Locally**
   - Start server: `npm run dev`
   - Open browser: <http://localhost:5000>
   - Verify all features work

2. **Check Console**
   - No CSP violations
   - No JavaScript errors
   - API calls succeed or fallback gracefully

3. **Test Dropdown**
   - Click league selector
   - Should show leagues
   - Selection should work

4. **Deploy**
   - Follow deployment guide in `PRODUCTION_READY_FINAL.md`
   - Or use: `npm run deploy:netlify`

---

**Status:** Ready to build and deploy! 🚀
