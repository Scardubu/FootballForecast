/**
 * Service Worker registration and management
 */

import { useEffect, useState } from 'react';
import { createLogger } from './logger';

const logger = createLogger('🔧 SW');

interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
  error?: string;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private registerPromise: Promise<ServiceWorkerStatus> | null = null;
  private listeners = new Set<(status: ServiceWorkerStatus) => void>();
  private navigatorListenersAttached = false;
  private status: ServiceWorkerStatus = {
    supported: false,
    registered: false,
    active: false,
    waiting: false,
  };

  constructor() {
    this.status.supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  }

  async register(): Promise<ServiceWorkerStatus> {
    if (this.registerPromise) {
      return this.registerPromise;
    }

    if (!this.status.supported || typeof navigator === 'undefined') {
      this.status.error = 'Service Workers are not supported in this environment';
      return this.snapshotStatus();
    }

    if (this.registration) {
      this.updateStatus();
      return this.snapshotStatus();
    }

    this.registerPromise = (async () => {
      // Enforce secure context except on localhost to avoid registration failures
      const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
      if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        this.status.error = 'Service Worker requires a secure context (https) or localhost';
        return this.snapshotStatus();
      }

      try {
        const runtimeBaseUrl = (import.meta as any)?.env?.BASE_URL ?? '/';

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const normalizedBaseUrl = (() => {
          if (!runtimeBaseUrl) return '/';
          // Ensure leading slash, strip query/hash, and collapse multiple trailing slashes
          const base = runtimeBaseUrl.split(/[?#]/)[0];
          const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
          const withTrailingSlash = withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
          const collapsed = withTrailingSlash.replace(/\/+/g, '/');
          return collapsed === '' ? '/' : collapsed;
        })();

        const swUrl = origin
          ? `${origin}${normalizedBaseUrl}sw.js`
          : `${normalizedBaseUrl}sw.js`;
        const scope = normalizedBaseUrl;

        if (!this.registration) {
          try {
            const existingRegistration = await navigator.serviceWorker.getRegistration(
              scope === '/' ? undefined : scope
            );
            if (existingRegistration) {
              this.registration = existingRegistration;
              this.status.registered = true;
              this.setupEventListeners();
              this.updateStatus();
            }
          } catch (lookupError) {
            logger.warn('Unable to inspect existing registration', lookupError);
          }
        }

        this.registration = await navigator.serviceWorker.register(swUrl, { scope });

        this.status.registered = true;
        this.setupEventListeners();

        // Check initial state
        this.updateStatus();

        logger.info('Service Worker registered successfully');
        return this.snapshotStatus();
      } catch (error) {
        this.status.error = `Service Worker registration failed: ${error}`;
        logger.error('Service Worker registration failed', error);
        return this.snapshotStatus();
      } finally {
        this.registerPromise = null;
      }
    })();

    return this.registerPromise;
  }

  private setupEventListeners(): void {
    if (!this.registration || typeof navigator === 'undefined') return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          this.updateStatus();

          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.notifyUpdate();
          }
        });
      }
    });

    if (this.navigatorListenersAttached) {
      return;
    }

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('Service Worker controller changed - reloading');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });

    this.navigatorListenersAttached = true;
  }

  private updateStatus(): void {
    if (!this.registration) return;

    this.status.active = !!this.registration.active;
    this.status.waiting = !!this.registration.waiting;
    this.emitStatus();
  }

  private notifyUpdate(): void {
    // You can customize this notification
    if (window.confirm('A new version is available. Reload to update?')) {
      this.skipWaiting();
    }
  }

  private handleMessage(data: any): void {
    logger.debug('Message from Service Worker', data);
    this.emitStatus();
  }

  private emitStatus(): void {
    const snapshot = this.snapshotStatus();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private snapshotStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  async clearCache(cacheName?: string): Promise<void> {
    if (!this.registration?.active) return;

    this.registration.active.postMessage({
      type: 'CLEAR_CACHE',
      payload: { cacheName },
    });
  }

  async getCacheStatus(): Promise<any> {
    if (!this.registration?.active) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      );
    });
  }

  getStatus(): ServiceWorkerStatus {
    return this.snapshotStatus();
  }

  subscribe(listener: (status: ServiceWorkerStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshotStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      this.status.registered = false;
      this.status.active = false;
      this.status.waiting = false;
      return result;
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error);
      return false;
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker status
export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>(
    serviceWorkerManager.getStatus()
  );

  useEffect(() => {
    const unsubscribe = serviceWorkerManager.subscribe(setStatus);
    // Register service worker
    serviceWorkerManager.register().catch((error) => {
      console.error('Service Worker registration error:', error);
    });

    return () => unsubscribe();
  }, []);

  const clearCache = (cacheName?: string) => serviceWorkerManager.clearCache(cacheName);
  const getCacheStatus = () => serviceWorkerManager.getCacheStatus();
  const skipWaiting = () => serviceWorkerManager.skipWaiting();

  return {
    status,
    clearCache,
    getCacheStatus,
    skipWaiting,
  };
}

// Auto-register service worker in production
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  serviceWorkerManager.register().catch(console.error);
}
