/**
 * Centralized configuration management with secure defaults and validation
 */

interface DatabaseConfig {
  url: string;
}

interface ApiConfig {
  footballApiKey: string;
  host: string;
}

interface AuthConfig {
  bearerToken: string;
  scraperToken: string;
  stackAuth: {
    projectId: string;
    jwksUrl: string;
    apiUrl: string;
  };
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  version: string;
}

interface AppConfig {
  database: DatabaseConfig;
  api: ApiConfig;
  auth: AuthConfig;
  server: ServerConfig;
}

class ConfigurationError extends Error {
  constructor(message: string, public readonly key: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Get required environment variable with validation
 */
function getRequiredEnv(key: string, description?: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new ConfigurationError(
      `Missing required environment variable: ${key}${description ? ` (${description})` : ''}. ` +
      `Please set this in your environment or Replit Secrets.`,
      key
    );
  }
  return value.trim();
}

/**
 * Get optional environment variable with secure default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return (value && value.trim() !== '') ? value.trim() : defaultValue;
}

/**
 * Validate API key format and reject insecure defaults
 */
function validateApiKey(key: string, name: string): string {
  if (!key) {
    throw new ConfigurationError(`${name} is required for production use`, name);
  }
  
  // Reject known insecure defaults
  const insecureDefaults = ['your-api-key', 'dev-key', 'test-key', 'placeholder', 'dummy'];
  if (insecureDefaults.some(insecure => key.toLowerCase().includes(insecure))) {
    throw new ConfigurationError(
      `${name} appears to be a placeholder value. Please set a real API key.`,
      name
    );
  }
  
  // Basic format validation for API keys
  if (key.length < 10) {
    throw new ConfigurationError(`${name} appears to be too short to be valid`, name);
  }
  
  return key;
}

/**
 * Validate auth token and reject insecure defaults
 */
function validateAuthToken(token: string, name: string): string {
  if (!token) {
    throw new ConfigurationError(`${name} is required for secure authentication`, name);
  }
  
  // Reject known insecure defaults
  const insecureDefaults = ['dev-token-12345', 'test-token', 'placeholder', 'dummy-token'];
  if (insecureDefaults.includes(token)) {
    throw new ConfigurationError(
      `${name} is using an insecure default value. Please set a secure token.`,
      name
    );
  }
  
  // Minimum security requirements
  if (token.length < 20) {
    throw new ConfigurationError(`${name} must be at least 20 characters for security`, name);
  }
  
  return token;
}

/**
 * Load and validate application configuration
 */
function loadConfig(): AppConfig {
  const nodeEnv = getOptionalEnv('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  
  try {
    // Database configuration (optional to enable memory storage fallback)
    const databaseUrl = process.env.DATABASE_URL?.trim() || '';
    if (!databaseUrl) {
      console.warn('⚠️ DATABASE_URL not set. Falling back to in-memory storage.');
    }
    
    // API configuration with multiple fallback env var names
    const apiKeyValue = process.env.API_FOOTBALL_KEY || process.env.RAPIDAPI_KEY;
    if (!apiKeyValue) {
      console.error('🔴 Missing API key: API_FOOTBALL_KEY environment variable is not set.');
      console.error('Please check your .env file and ensure API_FOOTBALL_KEY is properly configured.');
      console.error('You can run "npm run check-env" to verify your environment setup.');
      throw new ConfigurationError(
        'API-Football API key is required. Set either API_FOOTBALL_KEY or RAPIDAPI_KEY environment variable.',
        'API_FOOTBALL_KEY'
      );
    }
    const apiKey = apiKeyValue.trim();
    console.log('[OK] API_FOOTBALL_KEY found in environment');
    
    const validatedApiKey = validateApiKey(apiKey, 'API-Football API key');
    
    // Authentication configuration with secure validation
    let bearerToken;
    try {
      bearerToken = validateAuthToken(
        getRequiredEnv('API_BEARER_TOKEN', 'API Bearer token for authentication'),
        'API_BEARER_TOKEN'
      );
      console.log('[OK] API_BEARER_TOKEN found in environment');
    } catch (error) {
      console.error('[ERROR] Missing or invalid API_BEARER_TOKEN');
      console.error('Please check your .env file and ensure API_BEARER_TOKEN is properly configured.');
      throw error;
    }
    
    let scraperToken;
    try {
      scraperToken = validateAuthToken(
        getRequiredEnv('SCRAPER_AUTH_TOKEN', 'Scraper authentication token'),
        'SCRAPER_AUTH_TOKEN'
      );
      console.log('[OK] SCRAPER_AUTH_TOKEN found in environment');
    } catch (error) {
      console.error('[ERROR] Missing or invalid SCRAPER_AUTH_TOKEN');
      console.error('Please check your .env file and ensure SCRAPER_AUTH_TOKEN is properly configured.');
      throw error;
    }
    
    // Stack Auth configuration
    const stackAuthProjectId = getOptionalEnv('STACK_AUTH_PROJECT_ID', '8b0648c2-f267-44c1-b4c2-a64eccb6f737');
    const stackAuthJwksUrl = getOptionalEnv(
      'STACK_AUTH_JWKS_URL', 
      `https://api.stack-auth.com/api/v1/projects/${stackAuthProjectId}/.well-known/jwks.json`
    );
    const stackAuthApiUrl = getOptionalEnv('STACK_AUTH_API_URL', 'https://api.stack-auth.com');
    
    console.log('[OK] Stack Auth configuration loaded');
    
    // Server configuration
    const port = parseInt(getOptionalEnv('PORT', '5000'), 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new ConfigurationError('PORT must be a valid port number (1-65535)', 'PORT');
    }
    
    return {
      database: {
        url: databaseUrl,
      },
      api: {
        footballApiKey: validatedApiKey,
        host: 'v3.football.api-sports.io',
      },
      auth: {
        bearerToken,
        scraperToken,
        stackAuth: {
          projectId: stackAuthProjectId,
          jwksUrl: stackAuthJwksUrl,
          apiUrl: stackAuthApiUrl,
        },
      },
      server: {
        port,
        nodeEnv,
        logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
        version: getOptionalEnv('npm_package_version', '1.0.0'),
      },
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`🔴 Configuration Error: ${error.message}`);
      
      // In development, provide helpful setup guidance
      if (nodeEnv === 'development') {
        console.error('\n📋 Setup Guide:');
        console.error('1. Set required environment variables in .env file or Replit Secrets:');
        console.error('   - DATABASE_URL (optional: in-memory fallback will be used if missing)');
        console.error('   - API_FOOTBALL_KEY (from RapidAPI API-Football subscription)');
        console.error('   - API_BEARER_TOKEN (generate secure random token)');
        console.error('   - SCRAPER_AUTH_TOKEN (generate secure random token)');
        console.error('2. Use Replit Secrets tab for secure credential storage');
        console.error('3. Generate secure tokens: openssl rand -hex 32\n');
      }
      
      // Do not exit on configuration error to allow degraded operation in serverless contexts
      // Re-throw to let callers decide, but avoid hard exit here
      throw error;
    }
    throw error;
  }
}

// Load configuration once at startup
export const config = loadConfig();

// Export configuration sections for easy imports
export const { database, api, auth, server } = config;

// Export validation functions for testing
export { validateApiKey, validateAuthToken, ConfigurationError };

/**
 * Get configuration summary for health endpoints (without sensitive data)
 */
export function getConfigSummary() {
  return {
    environment: server.nodeEnv,
    version: server.version,
    port: server.port,
    logLevel: server.logLevel,
    apiHost: api.host,
    hasDatabase: !!database.url,
    hasApiKey: !!api.footballApiKey && api.footballApiKey.length > 0,
    hasBearerToken: !!auth.bearerToken && auth.bearerToken.length > 0,
    hasScraperToken: !!auth.scraperToken && auth.scraperToken.length > 0,
  };
}

/**
 * Validate all configuration at runtime
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Test database URL format
    if (!database.url.startsWith('postgres')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    // Validate API key is not a placeholder
    if (api.footballApiKey.toLowerCase().includes('your-api-key')) {
      errors.push('API_FOOTBALL_KEY appears to be a placeholder value');
    }
    
    // Validate auth tokens are not defaults
    if (auth.bearerToken === 'dev-token-12345') {
      errors.push('API_BEARER_TOKEN is using insecure default value');
    }
    
    if (auth.scraperToken.length < 20) {
      errors.push('SCRAPER_AUTH_TOKEN should be at least 20 characters');
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors };
  }
}