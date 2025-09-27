/**
 * Service Worker registration and management
 */

interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
  error?: string;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private status: ServiceWorkerStatus = {
    supported: false,
    registered: false,
    active: false,
    waiting: false,
  };

  constructor() {
    this.status.supported = 'serviceWorker' in navigator;
  }

  async register(): Promise<ServiceWorkerStatus> {
    if (!this.status.supported) {
      this.status.error = 'Service Workers are not supported in this browser';
      return this.status;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.status.registered = true;
      this.setupEventListeners();

      // Check initial state
      this.updateStatus();

      console.log('✅ Service Worker registered successfully');
      return this.status;
    } catch (error) {
      this.status.error = `Service Worker registration failed: ${error}`;
      console.error('❌ Service Worker registration failed:', error);
      return this.status;
    }
  }

  private setupEventListeners(): void {
    if (!this.registration) return;

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

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  private updateStatus(): void {
    if (!this.registration) return;

    this.status.active = !!this.registration.active;
    this.status.waiting = !!this.registration.waiting;
  }

  private notifyUpdate(): void {
    // You can customize this notification
    if (window.confirm('A new version is available. Reload to update?')) {
      this.skipWaiting();
    }
  }

  private handleMessage(data: any): void {
    console.log('📨 Message from Service Worker:', data);
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
    return { ...this.status };
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
  const [status, setStatus] = React.useState<ServiceWorkerStatus>(
    serviceWorkerManager.getStatus()
  );

  React.useEffect(() => {
    // Register service worker
    serviceWorkerManager.register().then(setStatus);

    // Set up periodic status checks
    const interval = setInterval(() => {
      setStatus(serviceWorkerManager.getStatus());
    }, 5000);

    return () => clearInterval(interval);
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
