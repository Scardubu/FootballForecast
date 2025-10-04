/**
 * Environment configuration utility
 * Centralizes environment variable access with type safety and defaults
 */

interface EnvConfig {
  // API Configuration
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // Stack Auth
  stackAuthProjectId: string;
  
  // Feature Flags
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
  
  // Performance
  apiTimeout: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

class EnvironmentConfig {
  private config: EnvConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvConfig {
    const isDevelopment = import.meta.env.DEV === true;
    const isProduction = import.meta.env.PROD === true;

    return {
      // API Configuration
      apiUrl: this.getEnvVar('VITE_API_URL', 
        isDevelopment ? 'http://localhost:5000' : window.location.origin
      ),
      isDevelopment,
      isProduction,

      // Stack Auth
      stackAuthProjectId: this.getEnvVar(
        'VITE_STACK_AUTH_PROJECT_ID',
        '8b0648c2-f267-44c1-b4c2-a64eccb6f737'
      ),

      // Feature Flags
      enableDebugMode: this.getBooleanEnvVar('VITE_ENABLE_DEBUG_MODE', isDevelopment),
      enablePerformanceMonitoring: this.getBooleanEnvVar(
        'VITE_ENABLE_PERFORMANCE_MONITORING',
        true
      ),

      // Performance
      apiTimeout: this.getNumberEnvVar('VITE_API_TIMEOUT', 10000),
      cacheEnabled: this.getBooleanEnvVar('VITE_CACHE_ENABLED', isProduction),
      cacheTTL: this.getNumberEnvVar('VITE_CACHE_TTL', 3600000), // 1 hour default
    };
  }

  private getEnvVar(key: string, defaultValue: string): string {
    return import.meta.env[key] || defaultValue;
  }

  private getBooleanEnvVar(key: string, defaultValue: boolean): boolean {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  }

  private getNumberEnvVar(key: string, defaultValue: number): number {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // Getters for easy access
  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  get isProduction(): boolean {
    return this.config.isProduction;
  }

  get stackAuthProjectId(): string {
    return this.config.stackAuthProjectId;
  }

  get enableDebugMode(): boolean {
    return this.config.enableDebugMode;
  }

  get enablePerformanceMonitoring(): boolean {
    return this.config.enablePerformanceMonitoring;
  }

  get apiTimeout(): number {
    return this.config.apiTimeout;
  }

  get cacheEnabled(): boolean {
    return this.config.cacheEnabled;
  }

  get cacheTTL(): number {
    return this.config.cacheTTL;
  }

  /**
   * Log configuration in development mode
   */
  logConfig(): void {
    if (this.isDevelopment) {
      console.log('🔧 Environment Configuration:', {
        environment: this.isProduction ? 'production' : 'development',
        apiUrl: this.apiUrl,
        stackAuthProjectId: this.stackAuthProjectId,
        features: {
          debugMode: this.enableDebugMode,
          performanceMonitoring: this.enablePerformanceMonitoring,
          caching: this.cacheEnabled,
        },
      });
    }
  }
}

// Export singleton instance
export const envConfig = new EnvironmentConfig();

// Export for testing
export { EnvironmentConfig };
