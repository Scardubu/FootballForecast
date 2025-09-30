/**
 * Database optimization and connection pooling
 */

import { drizzle } from 'drizzle-orm/postgres-js';
// @ts-ignore - postgres package may not be installed yet
import postgres from 'postgres';
import { logger } from '../middleware/index.js';
import { database as dbConfig } from '../config/index.js';

// Connection pool configuration
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10', 10);
const IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10); // 30 seconds
const CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10); // 5 seconds

// Track connection pool metrics
const poolMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  maxConnections: POOL_SIZE,
  connectionTimeouts: 0,
  queryTimeouts: 0,
  lastError: null as Error | null,
  lastErrorTime: null as Date | null
};

/**
 * Create optimized database client with connection pooling
 */
export function createDatabaseClient() {
  if (!dbConfig.url) {
    logger.warn('No DATABASE_URL provided, database client will not be created');
    return null;
  }

  try {
    // Create connection pool
    const connectionPool = postgres(dbConfig.url, {
      max: POOL_SIZE,
      idle_timeout: IDLE_TIMEOUT,
      connect_timeout: CONNECTION_TIMEOUT,
      debug: process.env.NODE_ENV === 'development',
      onnotice: (notice: any) => {
        logger.debug({ notice }, 'PostgreSQL notice received');
      },
      onparameter: (parameterStatus: any) => {
        if (parameterStatus.parameter === 'server_version') {
          logger.info(`Connected to PostgreSQL server version ${parameterStatus.value}`);
        }
      }
    });

    // Create drizzle ORM instance
    const db = drizzle(connectionPool);

    // Monitor connection pool
    monitorConnectionPool(connectionPool);

    logger.info({
      poolSize: POOL_SIZE,
      idleTimeout: IDLE_TIMEOUT,
      connectionTimeout: CONNECTION_TIMEOUT
    }, 'Database connection pool initialized');

    return db;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database connection pool');
    poolMetrics.lastError = error instanceof Error ? error : new Error(String(error));
    poolMetrics.lastErrorTime = new Date();
    return null;
  }
}

/**
 * Monitor connection pool metrics
 */
function monitorConnectionPool(pool: any) {
  // Check if pool exposes metrics
  if (pool.options && typeof pool.options === 'object') {
    // Update metrics periodically
    setInterval(() => {
      try {
        if (pool.pools && Array.isArray(pool.pools)) {
          poolMetrics.totalConnections = pool.pools.length;
          poolMetrics.activeConnections = pool.pools.filter((c: any) => c.active).length;
          poolMetrics.idleConnections = pool.pools.filter((c: any) => !c.active).length;
          poolMetrics.waitingClients = pool.waiting ? pool.waiting.length : 0;
        }
      } catch (error) {
        logger.debug({ error }, 'Error updating connection pool metrics');
      }
    }, 30000); // Every 30 seconds
  }
}

/**
 * Get connection pool metrics for monitoring
 */
export function getConnectionPoolMetrics() {
  return {
    ...poolMetrics,
    lastErrorMessage: poolMetrics.lastError?.message,
    lastErrorStack: poolMetrics.lastError?.stack,
    lastErrorTime: poolMetrics.lastErrorTime?.toISOString()
  };
}

/**
 * Optimize a query with pagination and efficient fetching
 */
export function optimizeQuery<T>(
  query: Promise<T[]>,
  options: {
    page?: number;
    pageSize?: number;
    maxItems?: number;
  } = {}
): Promise<{ data: T[]; meta: { page: number; pageSize: number; total: number; hasMore: boolean } }> {
  const { page = 1, pageSize = 20, maxItems = 1000 } = options;
  
  // Ensure reasonable limits
  const validPageSize = Math.min(Math.max(1, pageSize), 100);
  const validPage = Math.max(1, page);
  const skip = (validPage - 1) * validPageSize;
  
  return query.then(results => {
    const total = results.length;
    const paginatedData = results.slice(skip, skip + validPageSize);
    
    return {
      data: paginatedData,
      meta: {
        page: validPage,
        pageSize: validPageSize,
        total,
        hasMore: skip + validPageSize < total
      }
    };
  });
}
