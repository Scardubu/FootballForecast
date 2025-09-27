// Service Worker for Football Forecast App
// Provides offline capabilities and performance optimizations

const CACHE_NAME = 'football-forecast-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/teams/, strategy: 'cache-first', ttl: 24 * 60 * 60 * 1000 }, // 24 hours
  { pattern: /\/api\/leagues/, strategy: 'cache-first', ttl: 24 * 60 * 60 * 1000 }, // 24 hours
  { pattern: /\/api\/standings/, strategy: 'stale-while-revalidate', ttl: 60 * 60 * 1000 }, // 1 hour
  { pattern: /\/api\/fixtures\/live/, strategy: 'network-first', ttl: 30 * 1000 }, // 30 seconds
  { pattern: /\/api\/predictions/, strategy: 'stale-while-revalidate', ttl: 10 * 60 * 1000 }, // 10 minutes
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Handle API requests with different caching strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cachePattern = API_CACHE_PATTERNS.find(p => p.pattern.test(url.pathname));
  
  if (!cachePattern) {
    // No caching strategy defined, use network only
    return fetch(request);
  }

  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  switch (cachePattern.strategy) {
    case 'cache-first':
      return handleCacheFirst(request, cache, cachedResponse, cachePattern.ttl);
    
    case 'network-first':
      return handleNetworkFirst(request, cache, cachedResponse, cachePattern.ttl);
    
    case 'stale-while-revalidate':
      return handleStaleWhileRevalidate(request, cache, cachedResponse, cachePattern.ttl);
    
    default:
      return fetch(request);
  }
}

// Cache-first strategy
async function handleCacheFirst(request, cache, cachedResponse, ttl) {
  if (cachedResponse && !isExpired(cachedResponse, ttl)) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    return networkResponse;
  } catch (error) {
    // Return cached response even if expired when network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network-first strategy
async function handleNetworkFirst(request, cache, cachedResponse, ttl) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse && !isExpired(cachedResponse, ttl)) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function handleStaleWhileRevalidate(request, cache, cachedResponse, ttl) {
  // Always try to update cache in background
  const networkUpdate = fetch(request).then(async (response) => {
    if (response.ok) {
      const responseToCache = response.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    return response;
  }).catch(() => {
    // Ignore network errors in background update
  });

  // Return cached response if available and not expired
  if (cachedResponse && !isExpired(cachedResponse, ttl)) {
    // Don't await the network update
    networkUpdate;
    return cachedResponse;
  }

  // Wait for network response if no valid cache
  return networkUpdate;
}

// Handle static assets
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests (SPA)
async function handleNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached index.html for SPA routing
    const cachedIndex = await cache.match('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    throw error;
  }
}

// Utility functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function isExpired(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > ttl;
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CLEAR_CACHE':
      clearCache(payload?.cacheName);
      break;
    
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }
  
  return status;
}

console.log('Service Worker loaded successfully');
