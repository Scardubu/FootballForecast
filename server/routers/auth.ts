import { Router } from "express";
import { asyncHandler } from "../middleware";
import { auth } from "../config";
import { createHash, createHmac } from "crypto";

export const authRouter = Router();

interface SessionPayload {
  issued: number;
  expires: number;
  clientHash: string;
}

// Session configuration
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_SECRET = auth.bearerToken; // Use secure bearer token as HMAC key

/**
 * Create a secure session token using HMAC
 */
function createSessionToken(clientIdentifier: string): string {
  const now = Date.now();
  const expires = now + SESSION_DURATION_MS;
  const clientHash = createHash('sha256').update(clientIdentifier).digest('hex').substring(0, 16);
  
  const payload: SessionPayload = {
    issued: now,
    expires,
    clientHash
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Validate and decode a session token
 */
function validateSessionToken(token: string, clientIdentifier: string): SessionPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;
    
    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    // Decode payload
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    
    // Verify expiration
    if (Date.now() > payload.expires) return null;
    
    // Verify client identity
    const clientHash = createHash('sha256').update(clientIdentifier).digest('hex').substring(0, 16);
    if (payload.clientHash !== clientHash) return null;
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Create client identifier based on environment
 * In development: Only use User-Agent (more permissive for testing)
 * In production: Use IP + User-Agent (more secure)
 */
function createClientIdentifier(req: any): string {
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  if (process.env.NODE_ENV === 'production') {
    return `${req.ip}:${userAgent}`;
  }
  
  // Development mode: Only bind to User-Agent for compatibility with testing tools
  return userAgent;
}

/**
 * Issue a secure session cookie for API access
 */
authRouter.post('/session', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const providedToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Verify the initial bearer token for session creation
  if (!providedToken || providedToken !== auth.bearerToken) {
    return res.status(401).json({ 
      error: 'Invalid authentication token',
      message: 'Valid API bearer token required to create session' 
    });
  }
  
  // Create client identifier based on environment
  const clientId = createClientIdentifier(req);
  const sessionToken = createSessionToken(clientId);
  
  // Set secure HttpOnly cookie
  res.cookie('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_MS,
    path: '/'
  });
  
  res.json({ 
    success: true, 
    message: 'Session created successfully',
    expires: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  });
}));

/**
 * Validate session for protected routes
 */
export function validateSession(req: any): boolean {
  const sessionToken = req.cookies?.session;
  if (!sessionToken) return false;
  
  const clientId = createClientIdentifier(req);
  const session = validateSessionToken(sessionToken, clientId);
  
  if (!session) return false;
  
  // Attach session info to request for logging/debugging
  req.session = session;
  return true;
}

/**
 * Clear session cookie
 */
authRouter.post('/logout', asyncHandler(async (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ success: true, message: 'Session cleared' });
}));

/**
 * Development auto-login endpoint - bypasses Bearer token requirement
 * Only available in development mode when VITE_AUTO_LOGIN_DEV is enabled
 */
authRouter.post('/dev-login', asyncHandler(async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ 
      error: 'Endpoint not available',
      message: 'Dev login only available in development mode' 
    });
  }

  // Create client identifier based on environment
  const clientId = createClientIdentifier(req);
  const sessionToken = createSessionToken(clientId);
  
  // Set secure HttpOnly cookie (use lax for development)
  res.cookie('session', sessionToken, {
    httpOnly: true,
    secure: false, // Allow over HTTP in development
    sameSite: 'lax', // More permissive for development
    maxAge: SESSION_DURATION_MS,
    path: '/'
  });
  
  res.json({ 
    success: true, 
    message: 'Development session created successfully',
    user: { id: 'dev-user', type: 'development' },
    expires: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  });
}));

/**
 * Check session status
 */
authRouter.get('/status', asyncHandler(async (req, res) => {
  const sessionToken = req.cookies?.session;
  if (!sessionToken) {
    return res.json({ authenticated: false });
  }
  
  const clientId = createClientIdentifier(req);
  const session = validateSessionToken(sessionToken, clientId);
  
  if (!session) {
    res.clearCookie('session', { path: '/' });
    return res.json({ authenticated: false });
  }
  
  res.json({ 
    authenticated: true, 
    user: { id: 'session-user', type: 'authenticated' },
    expires: new Date(session.expires).toISOString(),
    issued: new Date(session.issued).toISOString()
  });
}));