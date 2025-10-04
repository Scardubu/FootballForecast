# Development Server Startup Guide

**Status:** 🟡 Server Starting...  
**Last Updated:** 2025-10-02 21:11:00

---

## Current Situation

The browser is showing continuous reload loops because:

1. **Dev server was terminated** - The `npm run dev` process was stopped (batch job terminated)
2. **Browser still trying to connect** - The React app keeps polling for the HMR WebSocket at `ws://localhost:5000`
3. **No server responding** - All WebSocket connection attempts fail, triggering Vite's auto-reload logic

---

## Fixes Applied (Ready to Test)

### ✅ Server-Side Routing Fix (`server/vite.ts`)
Added intelligent path filtering to prevent SPA fallback from intercepting:
- Vite HMR paths (`/@vite/*`, `/@react-refresh`, `/__vite`)
- Source file requests (`/src/*`)
- API endpoints (`/api/*`)
- WebSocket endpoint (`/ws`)
- Any files with extensions (`.svg`, `.webmanifest`, `.woff2`, etc.)

**Before:**
```typescript
app.use("*", async (req, res, next) => {
  // Always served index.html for ALL requests
  const page = await vite.transformIndexHtml(url, template);
  res.status(200).set({ "Content-Type": "text/html" }).end(page);
});
```

**After:**
```typescript
app.use("*", async (req, res, next) => {
  // Skip fallback for assets, API, HMR paths
  if (hasExtension || isSpecialPath) {
    return next(); // Let Vite/Express handle normally
  }
  // Only fallback to index.html for SPA routes
  const page = await vite.transformIndexHtml(url, template);
  res.status(200).set({ "Content-Type": "text/html" }).end(page);
});
```

### ✅ HMR Configuration (`server/vite.ts`)
Simplified to let Vite auto-configure WebSocket settings:
```typescript
const hmrConfig = {
  server,
  clientPort: resolvedClientPort,
  protocol: resolvedProtocol,
};
// Only override if explicitly set via env vars
```

### ✅ File System Access (`vite.config.ts`)
Expanded allow-list for font and asset serving:
```typescript
fs: {
  allow: [
    path.resolve(__dirname, "client"),
    path.resolve(__dirname, "node_modules"),
    path.resolve(__dirname)
  ],
}
```

### ✅ API Proxy (`vite.config.ts`)
Corrected target port:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000', // Was: 3001
    changeOrigin: true,
  },
}
```

---

## Startup Sequence

### 1. **Start Server**
```bash
npm run dev
```

**Expected logs (in order):**
```
🟡 Bootstrapping server entry
🔧 Environment Configuration Validation
✅ All environment variables are properly configured
ℹ️ Attempting to load WebSocket module from ./websocket
✅ WebSocket module resolved from ./websocket
✅ WebSocket server initialized
🔌 WebSocket Server initialized on /ws
✅ Vite development server initialized
🚀 Server listening on http://0.0.0.0:5000
📱 Frontend available at: http://localhost:5000
🔌 WebSocket endpoint: ws://localhost:5000/ws
  ➜  Local:   http://localhost:5000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 2. **Wait for Full Initialization**
- ⏳ Wait for "Server listening" message
- ⏳ Wait for Vite "ready" message
- ⏳ Server should NOT auto-restart or show errors
- ✅ Both Express and Vite should be operational

### 3. **Browser Connection**
After server is fully up:
1. Close all browser tabs pointing to `http://localhost:5000`
2. Open a fresh tab
3. Navigate to `http://localhost:5000`
4. Open DevTools Console (F12)

**Expected console output:**
```
🔧 Offline Mode Tester loaded!
🔗 Connecting to WebSocket: ws://localhost:5000/ws
✅ WebSocket connected successfully
🔐 WebSocket authentication handled via secure handshake
[vite] connected
```

**Should NOT see:**
```
❌ WebSocket connection to 'ws://localhost:5000/?token=...' failed
❌ [vite] server connection lost. Polling for restart...
❌ Error while trying to use the following icon from the Manifest
```

---

## Troubleshooting

### If Server Won't Start

**Check for port conflicts:**
```bash
netstat -ano | findstr :5000
```
If something is using port 5000:
```bash
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Clear node processes:**
```bash
taskkill /F /IM node.exe
```

**Check environment variables:**
```bash
node check-env.js
```

### If HMR Still Fails

1. **Hard refresh:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   ```
3. **Check Network tab:**
   - Verify `/manifest.webmanifest` returns JSON (not HTML)
   - Verify `/favicon.svg` returns SVG (not HTML)
   - Verify `/@vite/client` loads successfully

### If Page Keeps Refreshing

**Symptoms:**
- Console shows "Navigated to http://localhost:5000/" repeatedly
- "[vite] server connection lost. Polling for restart..."

**Causes:**
1. Server not fully started
2. HMR WebSocket can't connect
3. Server crashing/restarting

**Solution:**
1. Stop browser from accessing the page
2. Let server fully start without interruption
3. Check server logs for errors
4. Only open browser AFTER server shows "ready"

---

## Post-Startup Validation

### ✅ Server Health Check
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T21:11:00.000Z",
  "environment": "development",
  "version": "1.0.0",
  "uptime": 123.456
}
```

### ✅ WebSocket Endpoint
Open browser console and run:
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');
ws.onopen = () => console.log('✅ WS Connected');
ws.onerror = (e) => console.error('❌ WS Error', e);
ws.onmessage = (m) => console.log('📨 WS Message', JSON.parse(m.data));
```

Expected:
```
✅ WS Connected
📨 WS Message {type: "live_scores", data: {…}, timestamp: 1234567890}
```

### ✅ Asset Loading
Check Network tab for these requests (all should be 200 OK):
- `/manifest.webmanifest` - Content-Type: `application/manifest+json`
- `/favicon.svg` - Content-Type: `image/svg+xml`
- `/@vite/client` - Content-Type: `application/javascript`
- `/src/main.tsx` - Content-Type: `application/javascript`
- Fonts: `/node_modules/@fontsource/inter/files/*.woff2` - Content-Type: `font/woff2`

---

## Success Criteria

Before proceeding with further development, confirm:

- [ ] Server starts without errors
- [ ] Browser console shows `[vite] connected` (no WebSocket errors)
- [ ] Page loads once and stays loaded (no auto-refresh loop)
- [ ] `/api/health` returns 200 OK
- [ ] `ws://localhost:5000/ws` connects successfully
- [ ] All assets (manifest, favicon, fonts) load with correct MIME types
- [ ] No console errors related to authentication or API calls
- [ ] Dashboard UI renders with data (even if mock data)

---

## Current Task

**Waiting for server to fully start...**

Once the server shows "Server listening" and Vite shows "ready", we can test the browser connection with all the fixes applied. The continuous reload loop should stop because:

1. Assets now served with correct MIME types (no more manifest syntax error)
2. HMR WebSocket can connect properly (middleware won't intercept `/@vite/*` paths)
3. SPA fallback only applies to actual route navigation (not asset requests)

**Next steps after successful startup:**
1. Test browser connection
2. Verify HMR functionality (edit a file, see hot reload)
3. Confirm API calls work (`/api/leagues`, `/api/fixtures`)
4. Validate WebSocket real-time updates
5. Proceed with remaining integration tasks

---

**Status:** 🟢 Ready to test once server completes startup
