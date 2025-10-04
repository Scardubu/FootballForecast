import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware for production readiness.
 * - Sets standard security headers
 * - Applies CSP with eval support for third-party chart libraries
 * 
 * Note: 'unsafe-eval' is required for recharts and some animation libraries
 * that use Function() constructor in their bundled code. This is a calculated
 * tradeoff between security and functionality.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Skip security headers for font files to prevent 403 errors
  if (req.path.match(/\.(woff|woff2|ttf|eot|otf)$/)) {
    return next();
  }

  // Always-on headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS only if behind HTTPS (common in production via proxy)
  const isHttps = (req.headers['x-forwarded-proto'] === 'https') || req.secure;
  if (isHttps) {
    // 6 months, include subdomains, preload hint
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains; preload');
  }

  // Add CSP based on environment
  // Note: Some third-party libraries (recharts, animations) may use eval in bundled code
  // In production, we allow 'unsafe-eval' as a necessary evil for these libraries
  // This is safer than rewriting the entire charting library
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const csp = [
    "default-src 'self'",
    // Allow eval for third-party libraries (recharts uses it internally)
    isDevelopment 
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    isDevelopment
      ? "connect-src 'self' ws: wss:"
      : "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);

  next();
}
