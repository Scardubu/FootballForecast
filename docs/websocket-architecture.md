# WebSocket Architecture

## Overview

The Football Forecast application uses WebSockets for real-time updates in **production environments only**. In development, WebSockets are intentionally disabled to prevent conflicts with Vite's Hot Module Replacement (HMR) system.

## Architecture Decision

### Development Mode
- **WebSocket Status**: ❌ Disabled
- **Reason**: Vite's HMR uses its own WebSocket connection on the same server
- **Fallback**: HTTP polling via React Query with smart refetch intervals
- **Benefits**:
  - No port conflicts
  - No connection errors in console
  - Faster development iteration
  - Reliable HMR functionality

### Production Mode
- **WebSocket Status**: ✅ Enabled (on compatible platforms)
- **Platforms**: Railway, Render, DigitalOcean, AWS, etc.
- **Not Supported**: Netlify (serverless functions don't support persistent connections)
- **Fallback**: HTTP polling for Netlify deployments

## Implementation Details

### Server-Side (`server/index.ts`)

```typescript
// Development: WebSocket disabled (lines 129-132)
if (serverConfig.nodeEnv === 'development') {
  await setupVite(app, server);
  logger.info('[INFO] Application WebSocket disabled in development (Vite HMR priority)');
  logger.info('[INFO] Real-time features will use HTTP polling fallback');
}

// Production: WebSocket enabled (lines 138-152)
else {
  if (websocketModule) {
    websocketModule.initializeWebSocket(server);
    logger.info('[OK] Application WebSocket server initialized on /ws');
  }
}
```

### Client-Side (`client/src/hooks/use-websocket.ts`)

```typescript
// Skip WebSocket entirely in development mode (lines 352-364)
useEffect(() => {
  const isDevelopment = import.meta.env.DEV === true;
  
  if (isDevelopment) {
    console.log('ℹ️ WebSocket disabled in development (Vite HMR priority)');
    setError('WebSocket disabled in development mode');
    return; // Exit early, no connection attempt
  }
  
  // Only connect in production...
}, []);
```

### UI Components

**LiveStatusBannerAuto** (`client/src/components/live-status-banner-auto.tsx`):
- Hides WebSocket status banner in development
- Only shows in production when WebSocket is unavailable
- Provides clear user feedback about connection status

## HTTP Polling Fallback

When WebSockets are unavailable, the application uses React Query with intelligent polling:

### Live Data (30-second intervals)
- Live fixtures
- Match scores
- Real-time events

### Predictions (10-minute intervals)
- Match predictions
- ML model outputs
- Statistical analysis

### Static Data (On-demand)
- Team information
- League standings
- Historical data

## API Endpoint

Check WebSocket availability programmatically:

```bash
GET /api/websocket/status
```

**Response (Development)**:
```json
{
  "available": false,
  "reason": "WebSocket disabled in development (Vite HMR priority)",
  "fallback": "HTTP polling",
  "endpoint": null
}
```

**Response (Production - Netlify)**:
```json
{
  "available": false,
  "reason": "WebSocket not supported on Netlify",
  "fallback": "HTTP polling",
  "endpoint": null
}
```

**Response (Production - Railway)**:
```json
{
  "available": true,
  "reason": "WebSocket available",
  "fallback": "HTTP polling",
  "endpoint": "/ws"
}
```

## Benefits of This Architecture

### 1. **Clean Development Experience**
- No WebSocket connection errors in console
- No conflicts with Vite HMR
- Faster development iteration
- Reliable hot reloading

### 2. **Production Flexibility**
- Works on serverless platforms (Netlify)
- Works on traditional servers (Railway, Render)
- Automatic fallback to HTTP polling
- No configuration required

### 3. **User Experience**
- Seamless real-time updates when available
- Graceful degradation to polling
- No visible difference in functionality
- Clear status indicators

### 4. **Maintainability**
- Single codebase for all environments
- Environment-aware behavior
- Easy to debug and test
- Clear separation of concerns

## Testing

### Development
```bash
npm run dev:full
# WebSocket will be disabled
# Check console: "ℹ️ WebSocket disabled in development"
```

### Production (Local)
```bash
npm run build
npm start
# WebSocket will be enabled
# Check console: "[OK] Application WebSocket server initialized on /ws"
```

### Check Status
```bash
curl http://localhost:5000/api/websocket/status
```

## Troubleshooting

### "WebSocket connection failed" in Development
**Expected behavior** - WebSocket is intentionally disabled. The application uses HTTP polling instead.

### No Real-Time Updates in Production
1. Check platform compatibility (Netlify doesn't support WebSockets)
2. Verify `/api/websocket/status` endpoint
3. Check server logs for WebSocket initialization
4. Ensure firewall allows WebSocket connections

### HMR Not Working
1. Ensure WebSocket is disabled in development
2. Check Vite configuration
3. Verify no other services are using the same port
4. Clear browser cache and restart dev server

## Future Enhancements

1. **Server-Sent Events (SSE)**: Alternative to WebSockets for one-way updates
2. **WebRTC**: For peer-to-peer real-time features
3. **GraphQL Subscriptions**: For more complex real-time queries
4. **Redis Pub/Sub**: For multi-server WebSocket scaling

## References

- [Vite HMR Documentation](https://vitejs.dev/guide/api-hmr.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Query Polling](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
- [Netlify Functions Limitations](https://docs.netlify.com/functions/overview/)
