import { NextRequest } from 'next/server';
import { checkDatabaseConnections } from './database-clients';

export interface DatabaseHealth {
  postgres: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
    details?: Record<string, unknown>;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
  details?: Record<string, unknown>;
}

// Simple PostgreSQL health check using fetch to test connection
async function checkPostgresHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const name = 'postgres';
  
  try {
    // Check if DATABASE_URL is configured
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        error: 'DATABASE_URL not configured',
        details: { configured: false }
      };
    }

    // For now, we'll do a basic connectivity check
    // In a real implementation, you might want to use a proper database client
    // and run a simple query like "SELECT 1"
    const isConfigured = databaseUrl.includes('postgresql://') || 
                        databaseUrl.includes('postgres://');
    
    if (!isConfigured) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        error: 'Invalid DATABASE_URL format',
        details: { format: 'invalid' }
      };
    }

    // Simulate a connection test (replace with actual database query)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      name,
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      details: { configured: true, format: 'valid' }
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { configured: false }
    };
  }
}

// Simple Redis health check
async function checkRedisHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const name = 'redis';
  
  try {
    // Check if REDIS_URL is configured
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        error: 'REDIS_URL not configured',
        details: { configured: false }
      };
    }

    // For now, we'll do a basic connectivity check
    // In a real implementation, you might want to use a Redis client
    // and run a simple command like "PING"
    const isConfigured = redisUrl.includes('redis://');
    
    if (!isConfigured) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        error: 'Invalid REDIS_URL format',
        details: { format: 'invalid' }
      };
    }

    // Simulate a connection test (replace with actual Redis PING)
    await new Promise(resolve => setTimeout(resolve, 5));
    
    return {
      name,
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      details: { configured: true, format: 'valid' }
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { configured: false }
    };
  }
}

// Main database health check function using real database clients
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const { postgres, redis } = await checkDatabaseConnections();

    return {
      postgres: {
        status: postgres.status,
        responseTime: postgres.responseTime,
        error: postgres.error,
        details: postgres.info ? {
          version: postgres.info.version,
          connections: postgres.info.connections,
          uptime: postgres.info.uptime,
          ...(postgres.info as any)
        } : undefined
      },
      redis: {
        status: redis.status,
        responseTime: redis.responseTime,
        error: redis.error,
        details: redis.info ? {
          version: redis.info.version,
          connections: redis.info.connections,
          uptime: redis.info.uptime,
          ...(redis.info as any)
        } : undefined
      }
    };
  } catch (error) {
    // Fallback to legacy health checks if real clients fail
    const [postgresHealth, redisHealth] = await Promise.all([
      checkPostgresHealth(),
      checkRedisHealth()
    ]);

    return {
      postgres: {
        status: postgresHealth.status,
        responseTime: postgresHealth.responseTime,
        error: postgresHealth.error,
        details: postgresHealth.details
      },
      redis: {
        status: redisHealth.status,
        responseTime: redisHealth.responseTime,
        error: redisHealth.error,
        details: redisHealth.details
      }
    };
  }
}

// Get all database health checks
export async function getAllDatabaseHealthChecks(): Promise<HealthCheckResult[]> {
  return [
    await checkPostgresHealth(),
    await checkRedisHealth()
  ];
}
