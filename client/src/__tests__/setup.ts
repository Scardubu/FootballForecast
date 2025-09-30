/**
 * Test setup configuration for React Testing Library and Jest
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { vi, afterEach, beforeAll, afterAll } from 'vitest';

// Mock IntersectionObserver for components that use it
(global as any).IntersectionObserver = class {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver for chart components
(global as any).ResizeObserver = class {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Indicate test environment to app code
(window as any).__TEST__ = true;

// Mock window.isServerOffline for offline testing (configurable so tests can delete)
Object.defineProperty(window, 'isServerOffline', {
  writable: true,
  configurable: true,
  value: false,
});

// Mock localStorage with in-memory store
(() => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  } as Storage;
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  // Ensure globalThis.localStorage references the same mock
  (global as any).localStorage = (window as any).localStorage;
})();

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Setup before all tests
beforeAll(() => {
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Stub scrollIntoView used by radix-ui select to avoid JSDOM errors
  // @ts-ignore
  if (!Element.prototype.scrollIntoView) {
    // @ts-ignore
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Module mocks (after vi is available)
vi.mock('@/lib/auth-context', () => {
  return {
    useAuth: () => ({
      auth: { authenticated: false, user: null },
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn().mockResolvedValue({ authenticated: false, user: null }),
    })
  };
});

// Mock useWebSocket to avoid real timers and network during tests
vi.mock('@/hooks/use-websocket', () => {
  return {
    useWebSocket: () => ({
      isConnected: false,
      isConnecting: false,
      error: null,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      sendMessage: vi.fn(),
      connectionStats: {
        reconnectAttempts: 0,
        lastConnected: null,
        messagesReceived: 0,
        messagesSent: 0,
      },
    }),
  };
});
