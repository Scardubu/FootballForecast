/**
 * Comprehensive Environment Variable Validation
 * 
 * Provides detailed validation and helpful error messages for all
 * environment variables required for production deployment.
 */

import { logger } from '../middleware/logger.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ConfigValidationOptions {
  strict?: boolean; // If true, warnings are treated as errors
  environment?: 'development' | 'production' | 'test';
}

/**
 * Validates a single environment variable with detailed feedback
 */
function validateEnvVar(
  key: string,
  value: string | undefined,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    description?: string;
    example?: string;
    suggestions?: string[];
  } = {}
): { valid: boolean; errors: string[]; warnings: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if required
  if (options.required && (!value || value.trim() === '')) {
    errors.push(`${key} is required but not set`);
    if (options.description) {
      suggestions.push(`${key}: ${options.description}`);
    }
    if (options.example) {
      suggestions.push(`Example: ${key}=${options.example}`);
    }
    return { valid: false, errors, warnings, suggestions };
  }

  // If not required and not set, skip further validation
  if (!value || value.trim() === '') {
    return { valid: true, errors, warnings, suggestions };
  }

  const trimmedValue = value.trim();

  // Length validation
  if (options.minLength && trimmedValue.length < options.minLength) {
    errors.push(`${key} must be at least ${options.minLength} characters long`);
  }

  if (options.maxLength && trimmedValue.length > options.maxLength) {
    warnings.push(`${key} is longer than recommended (${options.maxLength} chars)`);
  }

  // Pattern validation
  if (options.pattern && !options.pattern.test(trimmedValue)) {
    errors.push(`${key} format is invalid`);
    if (options.example) {
      suggestions.push(`Expected format: ${options.example}`);
    }
  }

  // Security checks
  const insecurePatterns = [
    /^(test|dev|demo|placeholder|dummy|sample|example)/i,
    /^(your-|my-|change-me)/i,
    /^(123|abc|password|secret)/i
  ];

  if (insecurePatterns.some(pattern => pattern.test(trimmedValue))) {
    if (process.env.NODE_ENV === 'production') {
      errors.push(`${key} appears to use a placeholder or insecure value`);
    } else {
      warnings.push(`${key} appears to use a placeholder value`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions: [...suggestions, ...(options.suggestions || [])]
  };
}

/**
 * Comprehensive validation of all environment variables
 */
export function validateEnvironmentConfig(options: ConfigValidationOptions = {}): ValidationResult {
  const { strict = false, environment = process.env.NODE_ENV as any || 'development' } = options;
  const isProduction = environment === 'production';

  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allSuggestions: string[] = [];

  // Database Configuration
  const dbResult = validateEnvVar('DATABASE_URL', process.env.DATABASE_URL, {
    required: false, // Optional - falls back to in-memory
    minLength: 20,
    pattern: /^postgres(ql)?:\/\/.+/,
    description: 'PostgreSQL connection string for persistent data storage',
    example: 'postgresql://user:password@host:5432/database',
    suggestions: [
      'For production, use a managed PostgreSQL service like Supabase or AWS RDS',
      'Ensure the database user has CREATE, READ, WRITE permissions'
    ]
  });

  // API Keys
  const apiKeyResult = validateEnvVar('API_FOOTBALL_KEY', process.env.API_FOOTBALL_KEY, {
    required: isProduction,
    minLength: isProduction ? 10 : 5, // More lenient in development
    description: 'API key from RapidAPI for API-Football service',
    example: 'your-rapidapi-key-here',
    suggestions: [
      'Get your API key from https://rapidapi.com/api-sports/api/api-football',
      'Ensure you have an active subscription with sufficient quota',
      'For development, any non-empty value is accepted'
    ]
  });

  // Authentication Tokens
  const bearerTokenResult = validateEnvVar('API_BEARER_TOKEN', process.env.API_BEARER_TOKEN, {
    required: isProduction,
    minLength: isProduction ? 20 : 5, // More lenient in development
    description: 'Secure token for API authentication',
    example: 'generated-secure-token-32-chars-long',
    suggestions: [
      'Generate with: openssl rand -hex 32',
      'Use a cryptographically secure random generator',
      'For development, any non-empty value is accepted'
    ]
  });

  const scraperTokenResult = validateEnvVar('SCRAPER_AUTH_TOKEN', process.env.SCRAPER_AUTH_TOKEN, {
    required: isProduction,
    minLength: isProduction ? 20 : 5, // More lenient in development
    description: 'Authentication token for web scraping services',
    example: 'another-secure-token-32-chars-long',
    suggestions: [
      'Generate with: openssl rand -hex 32',
      'Should be different from API_BEARER_TOKEN',
      'For development, any non-empty value is accepted'
    ]
  });

  // Optional Services
  const mlServiceResult = validateEnvVar('ML_SERVICE_URL', process.env.ML_SERVICE_URL, {
    required: false,
    pattern: /^https?:\/\/.+/,
    description: 'URL for the ML prediction service',
    example: 'https://your-ml-service.herokuapp.com',
    suggestions: [
      'Deploy the Python ML service separately',
      'Ensure the service is accessible from your main application'
    ]
  });

  // Session Configuration
  const sessionSecretResult = validateEnvVar('SESSION_SECRET', process.env.SESSION_SECRET, {
    required: isProduction,
    minLength: isProduction ? 32 : 5, // More lenient in development
    description: 'Secret key for session encryption',
    example: 'very-long-random-string-for-session-security',
    suggestions: [
      'Generate with: openssl rand -base64 48',
      'Keep this secret secure and rotate regularly',
      'For development, any non-empty value is accepted'
    ]
  });

  // Port Configuration
  const portResult = validateEnvVar('PORT', process.env.PORT, {
    required: false,
    pattern: /^\d+$/,
    description: 'Port number for the server (default: 5000)',
    example: '5000'
  });

  // Collect all results
  const results = [
    dbResult,
    apiKeyResult,
    bearerTokenResult,
    scraperTokenResult,
    mlServiceResult,
    sessionSecretResult,
    portResult
  ];

  // Aggregate results
  results.forEach(result => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    allSuggestions.push(...result.suggestions);
  });

  // Environment-specific checks
  if (isProduction) {
    if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
      allWarnings.push('NODE_ENV should be set to "production" for production deployments');
    }

    // Check for development-only variables
    if (process.env.VITE_DEV_MODE === 'true') {
      allWarnings.push('VITE_DEV_MODE is enabled in production');
    }
  }

  // Additional security checks for production
  if (isProduction) {
    const requiredVars = ['API_FOOTBALL_KEY', 'API_BEARER_TOKEN', 'SCRAPER_AUTH_TOKEN'];
    const missingRequired = requiredVars.filter(key => !process.env[key]);
    
    if (missingRequired.length > 0) {
      allErrors.push(`Critical production variables missing: ${missingRequired.join(', ')}`);
      allSuggestions.push('Set these variables in your deployment platform (Netlify, Heroku, etc.)');
    }
  }

  // Check for common configuration issues
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') && isProduction) {
    allErrors.push('DATABASE_URL points to localhost in production environment');
    allSuggestions.push('Use a cloud database service for production');
  }

  const finalValid = allErrors.length === 0 && (!strict || allWarnings.length === 0);

  return {
    valid: finalValid,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: allSuggestions
  };
}

/**
 * Logs validation results in a user-friendly format
 */
export function logValidationResults(result: ValidationResult, options: ConfigValidationOptions = {}) {
  const { environment = process.env.NODE_ENV || 'development' } = options;

  logger.info('🔧 Environment Configuration Validation');
  logger.info(`📍 Environment: ${environment}`);
  logger.info('─'.repeat(50));

  if (result.valid) {
    logger.info('✅ All environment variables are properly configured');
  } else {
    logger.error('❌ Environment configuration issues detected');
  }

  if (result.errors.length > 0) {
    logger.error('\n🚨 ERRORS (must be fixed):');
    result.errors.forEach(error => logger.error(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    logger.warn('\n⚠️  WARNINGS (recommended fixes):');
    result.warnings.forEach(warning => logger.warn(`  • ${warning}`));
  }

  if (result.suggestions.length > 0) {
    logger.info('\n💡 SUGGESTIONS:');
    result.suggestions.forEach(suggestion => logger.info(`  • ${suggestion}`));
  }

  if (!result.valid) {
    logger.info('\n📚 For setup help, see: DEPLOYMENT.md');
    logger.info('🔗 Environment variables guide: https://docs.netlify.com/configure-builds/environment-variables/');
  }

  logger.info('─'.repeat(50));
}

/**
 * Validates configuration and exits if critical errors are found
 */
export function validateConfigOrExit(options: ConfigValidationOptions = {}) {
  const result = validateEnvironmentConfig(options);
  logValidationResults(result, options);

  const { environment = process.env.NODE_ENV as any || 'development' } = options;
  const isProduction = environment === 'production';

  if (!result.valid) {
    // In development mode, only exit if there are no environment variables at all
    if (!isProduction) {
      const criticalVars = ['API_FOOTBALL_KEY', 'API_BEARER_TOKEN', 'SCRAPER_AUTH_TOKEN'];
      const hasSomeVars = criticalVars.some(key => process.env[key] && process.env[key]?.trim() !== '');
      
      if (hasSomeVars) {
        logger.warn('⚠️ Running with incomplete configuration in development mode');
        logger.warn('⚠️ Some features may not work correctly');
        return result;
      }
    }
    
    logger.error('💥 Cannot start application due to configuration errors');
    process.exit(1);
  }

  return result;
}
