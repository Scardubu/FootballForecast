/**
 * Global error monitoring and reporting utility
 * Centralizes error tracking, logging, and reporting for the application
 */

import logger from './logger.js';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  API = 'api',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL = 'internal',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

interface ErrorContext {
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  code?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: string;
  context: ErrorContext;
}

/**
 * Report an error to centralized error tracking
 */
export function reportError(
  error: Error | string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context: ErrorContext = {}
): ErrorReport {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;
  const errorCode = typeof error === 'string' ? undefined : (error as any).code;
  
  const report: ErrorReport = {
    message: errorMessage,
    stack: errorStack,
    code: errorCode,
    severity,
    category,
    timestamp: new Date().toISOString(),
    context
  };
  
  // Log the error with appropriate level based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      logger.fatal(report, `CRITICAL ERROR: ${errorMessage}`);
      break;
    case ErrorSeverity.HIGH:
      logger.error(report, `HIGH SEVERITY ERROR: ${errorMessage}`);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(report, `ERROR: ${errorMessage}`);
      break;
    case ErrorSeverity.LOW:
      logger.info(report, `Minor error: ${errorMessage}`);
      break;
  }
  
  // In production, send to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    sendToProductionMonitoring(report);
  }
  
  // Store error for analytics (in-memory for now, could be database)
  storeErrorForAnalytics(report);
  
  return report;
}

/**
 * Monitor a promise and report any errors
 */
export function monitorPromise<T>(
  promise: Promise<T>,
  errorMessage: string,
  category: ErrorCategory,
  context: ErrorContext = {}
): Promise<T> {
  return promise.catch(error => {
    reportError(
      error,
      error.fatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
      category,
      context
    );
    throw error; // Re-throw to allow further handling
  });
}

/**
 * Create a monitored version of a function
 */
export function createMonitoredFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  category: ErrorCategory,
  contextBuilder?: (...args: Parameters<T>) => ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const context = contextBuilder ? contextBuilder(...args) : {};
      reportError(
        error as Error,
        ErrorSeverity.HIGH,
        category,
        context
      );
      throw error;
    }
  }) as T;
}

// In-memory error storage for analytics (in production, use database)
const errorStore: ErrorReport[] = [];
const MAX_STORED_ERRORS = 1000;

/**
 * Send error to production monitoring service
 */
function sendToProductionMonitoring(report: ErrorReport): void {
  try {
    // In production, integrate with services like:
    // - Sentry: Sentry.captureException(error)
    // - Datadog: DD.logger.error(report)
    // - New Relic: newrelic.recordCustomEvent('Error', report)
    // - Custom webhook endpoint
    
    if (process.env.ERROR_WEBHOOK_URL) {
      fetch(process.env.ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(err => {
        logger.error({ err }, 'Failed to send error to monitoring service');
      });
    }
    
    // Log to Netlify Functions logs (visible in Netlify dashboard)
    if (process.env.NETLIFY) {
      console.error('PRODUCTION_ERROR:', JSON.stringify(report, null, 2));
    }
  } catch (err) {
    logger.error({ err }, 'Error in production monitoring');
  }
}

/**
 * Store error for local analytics
 */
function storeErrorForAnalytics(report: ErrorReport): void {
  try {
    errorStore.push(report);
    
    // Keep only the most recent errors
    if (errorStore.length > MAX_STORED_ERRORS) {
      errorStore.splice(0, errorStore.length - MAX_STORED_ERRORS);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to store error for analytics');
  }
}

/**
 * Get application-wide error statistics
 */
export function getErrorStats() {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentErrors = errorStore.filter(error => 
    new Date(error.timestamp) > last24Hours
  );
  
  const weeklyErrors = errorStore.filter(error => 
    new Date(error.timestamp) > last7Days
  );
  
  const categoryCounts = errorStore.reduce((acc, error) => {
    acc[error.category] = (acc[error.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const severityCounts = errorStore.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalErrors: errorStore.length,
    recentErrors: recentErrors.length,
    weeklyErrors: weeklyErrors.length,
    criticalErrors: severityCounts[ErrorSeverity.CRITICAL] || 0,
    highSeverityErrors: severityCounts[ErrorSeverity.HIGH] || 0,
    categories: categoryCounts,
    severityBreakdown: severityCounts,
    errorRate: weeklyErrors.length / 7, // errors per day
    lastError: errorStore.length > 0 ? errorStore[errorStore.length - 1] : null
  };
}

/**
 * Get recent errors for debugging
 */
export function getRecentErrors(limit: number = 50): ErrorReport[] {
  return errorStore.slice(-limit).reverse(); // Most recent first
}

/**
 * Clear error store (for testing or maintenance)
 */
export function clearErrorStore(): void {
  errorStore.length = 0;
}
