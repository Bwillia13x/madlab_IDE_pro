import { monitoringIntegrationService } from '@/lib/monitoring/integration';
import { openTelemetryTracer } from '@/lib/tracing/opentelemetry';

/**
 * Signal handler for graceful shutdown of the MAD Lab platform
 * Handles SIGINT, SIGTERM, and other termination signals
 */

let isShuttingDown = false;

export async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`Received ${signal} but shutdown already in progress, forcing exit...`);
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`\nReceived ${signal}, initiating graceful shutdown...`);

  try {
    // Set a timeout for the graceful shutdown
    const shutdownTimeout = setTimeout(() => {
      console.error('Shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, 10000); // 10 second timeout

    // Shutdown services in reverse order of initialization
    const shutdownPromises: Promise<void>[] = [];

    // Shutdown monitoring integration service
    try {
      console.log('Shutting down monitoring integration service...');
      shutdownPromises.push(monitoringIntegrationService.shutdown());
    } catch (error) {
      console.error('Error during monitoring service shutdown:', error);
    }

    // Shutdown OpenTelemetry tracer
    try {
      console.log('Shutting down OpenTelemetry tracer...');
      shutdownPromises.push(openTelemetryTracer.shutdown());
    } catch (error) {
      console.error('Error during OpenTelemetry shutdown:', error);
    }

    // Wait for all shutdown operations to complete
    await Promise.allSettled(shutdownPromises);

    clearTimeout(shutdownTimeout);
    console.log('Graceful shutdown completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

export function setupSignalHandlers(): void {
  // Handle common termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

  signals.forEach(signal => {
    process.on(signal, () => {
      handleShutdown(signal).catch(error => {
        console.error(`Error in ${signal} handler:`, error);
        process.exit(1);
      });
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    handleShutdown('uncaughtException').catch(() => {
      process.exit(1);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    handleShutdown('unhandledRejection').catch(() => {
      process.exit(1);
    });
  });

  console.log('Signal handlers configured for graceful shutdown');
}

// Initialize signal handlers when this module is loaded
if (typeof process !== 'undefined' && process.on) {
  setupSignalHandlers();
}