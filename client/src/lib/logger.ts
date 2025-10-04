/**
 * Production-safe logger utility
 * Automatically switches between verbose and minimal logging based on environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isDevelopment = import.meta.env.DEV;
    
    this.config = {
      enabled: isDevelopment || config?.enabled || false,
      minLevel: isDevelopment ? 'debug' : 'warn',
      prefix: config?.prefix || '🏈',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): any[] {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = this.config.prefix;
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    return [`${prefix} ${levelEmoji} [${timestamp}]`, message, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      } else if (error) {
        console.error('Error details:', error);
      }
    }
  }

  group(label: string): void {
    if (this.config.enabled) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.enabled) {
      console.groupEnd();
    }
  }

  table(data: any): void {
    if (this.config.enabled && this.shouldLog('info')) {
      console.table(data);
    }
  }

  time(label: string): void {
    if (this.config.enabled && this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled && this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Create named loggers for different modules
export const createLogger = (prefix: string, config?: Partial<LoggerConfig>) => {
  return new Logger({ ...config, prefix });
};

// Specialized loggers
export const apiLogger = createLogger('🌐 API');
export const wsLogger = createLogger('🔌 WebSocket');
export const cacheLogger = createLogger('💾 Cache');
export const performanceLogger = createLogger('⚡ Performance');

export default logger;
