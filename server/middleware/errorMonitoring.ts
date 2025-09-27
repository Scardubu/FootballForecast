/**
 * Global error monitoring and reporting utility
 * Centralizes error tracking, logging, and reporting for the application
 */

import logger from './logger';

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
  
  // In production, you could send to external monitoring service here
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorMonitoring(report);
  }
  
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

/**
 * Get application-wide error statistics
 */
export function getErrorStats() {
  // In a real app, this would return actual error stats from storage
  return {
    totalErrors: 0,
    criticalErrors: 0,
    highSeverityErrors: 0,
    categories: {}
  };
}
