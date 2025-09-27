import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { queryClient } from '@/lib/queryClient';
import type { Fixture } from '@shared/schema';

interface WebSocketMessage {
  type: 'fixture_update' | 'live_scores' | 'match_events' | 'pong';
  data: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  sendMessage: (message: any) => void;
  connectionStats: {
    reconnectAttempts: number;
    lastConnected: Date | null;
    messagesReceived: number;
    messagesSent: number;
  };
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const { auth } = useAuth();
  
  // Track auth state to trigger reconnect on changes
  const authStateRef = useRef(auth?.authenticated);
  const authUserRef = useRef(auth?.user?.id);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState({
    reconnectAttempts: 0,
    lastConnected: null as Date | null,
    messagesReceived: 0,
    messagesSent: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getWebSocketUrl = useCallback(() => {
    // Managed provider via env flags (Vite)
    const managedEnabled = (import.meta as any).env?.VITE_WS_ENABLED === 'true';
    const managedUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
    const managedToken = (import.meta as any).env?.VITE_WS_AUTH_TOKEN as string | undefined;

    if (managedEnabled && managedUrl) {
      // Append token as query param if provided (headers not supported in WebSocket constructor)
      try {
        const url = new URL(managedUrl);
        if (managedToken) url.searchParams.set('token', managedToken);
        return url.toString();
      } catch {
        // Fallback to raw if URL parsing fails
        return managedToken ? `${managedUrl}${managedUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(managedToken)}` : managedUrl;
      }
    }

    // Production fallback for Netlify: WebSockets not supported if no managed provider configured
    if ((process.env.NODE_ENV === 'production' || import.meta.env.PROD === true) && 
        window.location.hostname.endsWith('netlify.app')) {
      console.log('WebSockets are not available on Netlify unless using a managed provider.');
      return null;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimeouts();
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', data: { timestamp: Date.now() } }));
        setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      }
    }, 30000); // Send ping every 30 seconds
  }, [clearTimeouts]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      setConnectionStats(prev => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }));
      
      // Handle different message types
      switch (message.type) {
        case 'fixture_update':
          // Update live fixtures in React Query cache
          if (message.data?.fixtures) {
            queryClient.setQueryData(['/api/fixtures/live'], message.data.fixtures);
            if (process.env.NODE_ENV === 'development') console.log('🔄 Live fixtures updated via WebSocket:', message.data.fixtures.length, 'matches');
          }
          break;
          
        case 'live_scores':
          // Handle individual score updates
          if (message.data?.fixtureId) {
            // Update specific fixture in cache
            queryClient.setQueryData(['/api/fixtures/live'], (old: Fixture[] | undefined) => {
              if (!old) return old;
              return old.map(fixture => 
                fixture.id === message.data.fixtureId 
                  ? { 
                      ...fixture, 
                      homeScore: message.data.homeScore,
                      awayScore: message.data.awayScore,
                      lastUpdated: message.data.updated 
                    }
                  : fixture
              );
            });
            if (process.env.NODE_ENV === 'development') console.log('⚽ Score update via WebSocket:', message.data.fixtureId, message.data.homeScore, '-', message.data.awayScore);
          }
          break;
          
        case 'match_events':
          // Handle real-time match events
          if (process.env.NODE_ENV === 'development') console.log('📱 Match event received:', message.data);
          break;
          
        case 'pong':
          // Handle heartbeat response
          startHeartbeat();
          break;
          
        default:
          if (process.env.NODE_ENV === 'development') console.log('📡 WebSocket message received:', message);
      }
      
      // Call custom onMessage handler
      onMessage?.(message);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('❌ Failed to parse WebSocket message:', error);
    }
  }, [onMessage, startHeartbeat]);

  const connect = useCallback(() => {
    if (isConnecting || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      if (process.env.NODE_ENV === 'development') console.log('🔄 WebSocket connection already in progress, skipping...');
      return;
    }

    setIsConnecting(true);
    setError(null);
    clearTimeouts();

    try {
      const wsUrl = getWebSocketUrl();
      if (!wsUrl) {
        setError('Live updates are not available in production on Netlify.');
        setIsConnecting(false);
        return;
      }
      if (process.env.NODE_ENV === 'development') console.log('🔗 Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (process.env.NODE_ENV === 'development') console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        setConnectionStats(prev => ({ 
          ...prev, 
          reconnectAttempts: 0,
          lastConnected: new Date() 
        }));

        // Authentication now handled automatically via secure handshake cookies
        // No need to send explicit auth messages - server validates session on connect
        if (process.env.NODE_ENV === 'development') console.log('🔐 WebSocket authentication handled via secure handshake');

        // Re-subscribe to all topics
        subscriptionsRef.current.forEach(topic => {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            data: { topic }
          }));
          setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
        });

        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onclose = (event) => {
        if (process.env.NODE_ENV === 'development') console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        clearTimeouts();
        
        onDisconnect?.();

        // Attempt to reconnect if enabled
        // Don't attempt to reconnect in production on Netlify or if the WebSocket URL is null
    const isNetlifyProduction = (process.env.NODE_ENV === 'production' || import.meta.env.PROD === true) && 
                               window.location.hostname.endsWith('netlify.app');
    
    if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts && !event.wasClean && !isNetlifyProduction) {
          reconnectAttemptsRef.current++;
          setConnectionStats(prev => ({ 
            ...prev, 
            reconnectAttempts: reconnectAttemptsRef.current 
          }));
          
          if (process.env.NODE_ENV === 'development') console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectAttemptsRef.current); // Exponential backoff
        }
      };

      wsRef.current.onerror = (error) => {
        if (process.env.NODE_ENV === 'development') console.error('❌ WebSocket error:', error);
        setError('WebSocket connection failed');
        setIsConnecting(false);
        onError?.(error);
      };

    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('❌ Failed to create WebSocket:', error);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [
    isConnecting, 
    getWebSocketUrl, 
    auth, 
    handleWebSocketMessage, 
    reconnect, 
    maxReconnectAttempts, 
    reconnectInterval, 
    clearTimeouts, 
    startHeartbeat, 
    onConnect, 
    onDisconnect, 
    onError
  ]);

  const disconnect = useCallback(() => {
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [clearTimeouts, maxReconnectAttempts]);

  const subscribe = useCallback((topic: string) => {
    subscriptionsRef.current.add(topic);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        data: { topic }
      }));
      setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      if (process.env.NODE_ENV === 'development') console.log('📡 Subscribed to WebSocket topic:', topic);
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    subscriptionsRef.current.delete(topic);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        data: { topic }
      }));
      setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      if (process.env.NODE_ENV === 'development') console.log('📡 Unsubscribed from WebSocket topic:', topic);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      setConnectionStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
    }
  }, []);

  // Connect once on mount, disconnect only on unmount
  useEffect(() => {
    // Use the explicit environment variable to detect Netlify builds
    const isNetlifyBuild = import.meta.env.VITE_NETLIFY_BUILD === 'true';

    if (!isNetlifyBuild) {
      connect();
    } else {
      console.log("Live updates via WebSockets are disabled in this environment.");
      setError('Live updates are not available in this environment.');
    }

    return () => {
      if (!isNetlifyBuild) {
        disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This effect should only run once on mount.
  
  // Reconnect when auth state changes to refresh handshake authentication
  useEffect(() => {
    const authChanged = authStateRef.current !== auth?.authenticated || 
                       authUserRef.current !== auth?.user?.id;
    
    if (authChanged && wsRef.current?.readyState === WebSocket.OPEN) {
      if (process.env.NODE_ENV === 'development') console.log('🔄 Auth state changed, reconnecting WebSocket for fresh authentication');
      disconnect();
      setTimeout(() => connect(), 100); // Brief delay for clean reconnect
    }
    
    authStateRef.current = auth?.authenticated;
    authUserRef.current = auth?.user?.id;
  }, [auth?.authenticated, auth?.user?.id, connect, disconnect]);

  // Auto-subscribe to live fixtures
  useEffect(() => {
    if (isConnected && auth?.authenticated) {
      subscribe('live_fixtures');
    }
  }, [isConnected, auth?.authenticated, subscribe]);

  return {
    isConnected,
    isConnecting,
    error,
    subscribe,
    unsubscribe,
    sendMessage,
    connectionStats
  };
}