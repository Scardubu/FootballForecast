import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware for production readiness.
 * - Sets standard security headers
 * - Applies a conservative CSP in production when serving static assets
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
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

  // Add a conservative CSP only in production for SPA static serving by Express
  if (process.env.NODE_ENV === 'production') {
    // Keep inline styles for Tailwind runtime classes, no inline scripts
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "style-src-elem 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
  }

  next();
}
