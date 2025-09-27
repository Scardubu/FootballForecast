import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { parse as parseCookie } from 'cookie';
import { validateSession } from './routers/auth';
import type { Fixture } from '@shared/schema';

interface WebSocketClient extends WebSocket {
  id: string;
  userId?: string;
  authenticated: boolean;
  subscriptions: Set<string>;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'auth' | 'ping';
  data?: any;
  token?: string;
}

interface BroadcastMessage {
  type: 'fixture_update' | 'live_scores' | 'match_events' | 'pong';
  data: any;
  timestamp: number;
}

export class FootballWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient>;
  private subscriptions: Map<string, Set<string>>; // topic -> client IDs
  
  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: false
    });
    
    this.clients = new Map();
    this.subscriptions = new Map();
    
    console.log('🔌 WebSocket Server initialized on /ws');
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      // WebSocket CSRF protection - validate Origin
      const origin = req.headers.origin;
      const allowedOrigins = [
        'http://localhost:3001',
        'https://localhost:3001',
        'http://localhost:5000', // Keep for backward compatibility
        'https://localhost:5000',
        process.env.REPLIT_URL,
        process.env.VITE_APP_URL
      ].filter(Boolean);
      
      // Add Replit domain patterns for development/production  
      const isReaplitDomain = origin && (origin.includes('.replit.dev') || origin.includes('.repl.co'));
      const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
      
      if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed || '')) && !isReaplitDomain && !isLocalhost) {
        console.warn(`🚫 WebSocket connection rejected - invalid origin: ${origin}`);
        ws.close(1008, 'Invalid origin');
        return;
      }
      const client = ws as WebSocketClient;
      client.id = randomUUID();
      client.authenticated = false;
      client.subscriptions = new Set();
      
      // Authenticate via handshake cookies (secure approach)
      await this.authenticateHandshake(client, req);
      
      this.clients.set(client.id, client);
      console.log(`🔗 WebSocket client connected: ${client.id} (authenticated: ${client.authenticated}) (${this.clients.size} total)`);

      // Send welcome message
      this.sendToClient(client.id, {
        type: 'live_scores',
        data: { 
          message: 'Connected to SabiScore real-time updates',
          clientId: client.id,
          authenticated: client.authenticated
        },
        timestamp: Date.now()
      });

      client.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
          this.sendError(client.id, 'Invalid message format');
        }
      });

      client.on('close', () => {
        this.handleClientDisconnect(client.id);
      });

      client.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${client.id}:`, error);
        this.handleClientDisconnect(client.id);
      });
    });
  }

  private async authenticateHandshake(client: WebSocketClient, req: IncomingMessage) {
    try {
      // Parse cookies from handshake request using proper parser
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        console.log(`🔓 Client ${client.id} connected without cookies - unauthenticated`);
        return;
      }

      const cookies = parseCookie(cookieHeader);
      const sessionId = cookies.session;
      
      if (!sessionId) {
        console.log(`🔓 Client ${client.id} connected without session cookie - unauthenticated`);
        return;
      }
      
      // Create proper request object for session validation (same method as HTTP routes)
      const reqLike = {
        headers: req.headers,
        cookies: cookies,
        ip: req.socket?.remoteAddress || req.connection?.remoteAddress,
        socket: req.socket
      } as any;
      
      if (validateSession(reqLike)) {
        client.authenticated = true;
        // Remove hardcoded userId - use session-based authentication without specific identity
        console.log(`🔐 Client ${client.id} authenticated via handshake session`);
      } else {
        console.log(`🔓 Client ${client.id} session validation failed - unauthenticated`);
      }
    } catch (error) {
      console.error(`❌ Handshake auth error for client ${client.id}:`, error);
      client.authenticated = false;
    }
  }

  private handleClientMessage(client: WebSocketClient, message: WebSocketMessage) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(client.id, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;

      case 'auth':
        // Authentication now handled at handshake - this is for manual re-auth if needed
        this.sendToClient(client.id, {
          type: 'live_scores',
          data: { 
            authenticated: client.authenticated,
            message: client.authenticated ? 'Already authenticated' : 'Authentication required at connection time'
          },
          timestamp: Date.now()
        });
        break;

      case 'subscribe':
        const topic = message.data?.topic;
        if (topic) {
          this.subscribe(client.id, topic);
        }
        break;

      case 'unsubscribe':
        const unsubTopic = message.data?.topic;
        if (unsubTopic) {
          this.unsubscribe(client.id, unsubTopic);
        }
        break;

      default:
        this.sendError(client.id, `Unknown message type: ${message.type}`);
    }
  }

  private subscribe(clientId: string, topic: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Require authentication for sensitive data subscriptions using patterns
    const isSensitiveTopic = topic === 'live_fixtures' || 
                           topic === 'match_events' || 
                           topic === 'live_scores' ||
                           topic.startsWith('match_');
    
    if (isSensitiveTopic && !client.authenticated) {
      this.sendError(clientId, `Authentication required to subscribe to ${topic}`);
      return;
    }

    client.subscriptions.add(topic);
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(clientId);

    console.log(`📡 Client ${clientId} subscribed to ${topic}`);
    this.sendToClient(clientId, {
      type: 'live_scores',
      data: { 
        subscribed: topic,
        message: `Subscribed to ${topic}`
      },
      timestamp: Date.now()
    });
  }

  private unsubscribe(clientId: string, topic: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(topic);
    this.subscriptions.get(topic)?.delete(clientId);

    console.log(`📡 Client ${clientId} unsubscribed from ${topic}`);
  }

  private handleClientDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    client.subscriptions.forEach(topic => {
      this.subscriptions.get(topic)?.delete(clientId);
    });

    this.clients.delete(clientId);
    console.log(`🔌 WebSocket client disconnected: ${clientId} (${this.clients.size} remaining)`);
  }

  private sendToClient(clientId: string, message: BroadcastMessage) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send message to client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      }
    }
  }

  private sendError(clientId: string, error: string) {
    this.sendToClient(clientId, {
      type: 'live_scores',
      data: { error },
      timestamp: Date.now()
    });
  }

  // Public methods for broadcasting updates
  public broadcastLiveFixtures(fixtures: Fixture[]) {
    this.broadcast('live_fixtures', {
      type: 'fixture_update',
      data: { fixtures },
      timestamp: Date.now()
    });
  }

  public broadcastMatchEvent(fixtureId: number, event: any) {
    this.broadcast(`match_${fixtureId}`, {
      type: 'match_events',
      data: { fixtureId, event },
      timestamp: Date.now()
    });
  }

  public broadcastScoreUpdate(fixtureId: number, homeScore: number | null, awayScore: number | null) {
    this.broadcast('live_fixtures', {
      type: 'live_scores',
      data: { 
        fixtureId, 
        homeScore, 
        awayScore,
        updated: new Date().toISOString()
      },
      timestamp: Date.now()
    });
  }

  private broadcast(topic: string, message: BroadcastMessage) {
    const subscribers = this.subscriptions.get(topic);
    if (!subscribers) return;

    let successCount = 0;
    let failureCount = 0;

    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          successCount++;
        } catch (error) {
          console.error(`❌ Broadcast failed to client ${clientId}:`, error);
          this.handleClientDisconnect(clientId);
          failureCount++;
        }
      } else {
        // Clean up dead connections
        subscribers.delete(clientId);
        failureCount++;
      }
    });

    if (successCount > 0) {
      console.log(`📡 Broadcasted ${message.type} to ${successCount} clients on topic '${topic}'`);
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch (error) {
            console.error(`❌ Heartbeat failed for client ${clientId}:`, error);
            this.handleClientDisconnect(clientId);
          }
        } else {
          this.handleClientDisconnect(clientId);
        }
      });
    }, 30000); // Heartbeat every 30 seconds
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      topics: Array.from(this.subscriptions.keys()),
      subscriptions: Object.fromEntries(
        Array.from(this.subscriptions.entries()).map(([topic, clients]) => [
          topic,
          clients.size
        ])
      )
    };
  }
}

export let footballWebSocket: FootballWebSocketServer;

export function initializeWebSocket(server: Server) {
  footballWebSocket = new FootballWebSocketServer(server);
  return footballWebSocket;
}