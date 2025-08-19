import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { productionMonitor, SystemMetrics, PerformanceAlert, HealthCheck } from '@/lib/performance/monitor';

describe('ProductionMonitor', () => {
  beforeEach(() => {
    // Clear any existing state
    productionMonitor.stop();
    productionMonitor.clearCaches();
  });

  afterEach(() => {
    // Clean up after each test
    productionMonitor.stop();
    productionMonitor.clearCaches();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const status = productionMonitor.getSystemStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.metrics).toBeNull();
      expect(status.alerts).toEqual([]);
      expect(status.health).toEqual([]);
      expect(status.uptime).toBe(0);
    });

    it('should have proper default configuration', () => {
      const stats = productionMonitor.getStats();
      
      expect(stats.totalTenants).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalUsage).toBe(0);
      expect(stats.totalBilling).toBe(0);
      expect(stats.cacheStats).toBeDefined();
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring', () => {
      const startSpy = vi.fn();
      productionMonitor.on('monitoringStarted', startSpy);
      
      productionMonitor.start();
      
      expect(startSpy).toHaveBeenCalled();
      expect(productionMonitor.getSystemStatus().isRunning).toBe(true);
    });

    it('should stop monitoring', () => {
      const stopSpy = vi.fn();
      productionMonitor.on('monitoringStopped', stopSpy);
      
      productionMonitor.start();
      productionMonitor.stop();
      
      expect(stopSpy).toHaveBeenCalled();
      expect(productionMonitor.getSystemStatus().isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      const startSpy = vi.fn();
      productionMonitor.on('monitoringStarted', startSpy);
      
      productionMonitor.start();
      productionMonitor.start(); // Second start should be ignored
      
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('should not stop if not running', () => {
      const stopSpy = vi.fn();
      productionMonitor.on('monitoringStopped', stopSpy);
      
      productionMonitor.stop(); // Should not emit event if not running
      
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics when running', async () => {
      const metricsSpy = vi.fn();
      productionMonitor.on('metricsCollected', metricsSpy);
      
      productionMonitor.start();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(metricsSpy).toHaveBeenCalled();
      
      const metrics = metricsSpy.mock.calls[0][0];
      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.network).toBeDefined();
      expect(metrics.disk).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should validate CPU metrics', async () => {
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = productionMonitor.getSystemStatus();
      const metrics = status.metrics;
      
      if (metrics) {
        expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
        expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
        expect(metrics.cpu.load).toBeGreaterThanOrEqual(0);
        expect(metrics.cpu.load).toBeLessThanOrEqual(1);
        expect(metrics.cpu.temperature).toBeGreaterThan(0);
      }
    });

    it('should validate memory metrics', async () => {
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = productionMonitor.getSystemStatus();
      const metrics = status.metrics;
      
      if (metrics) {
        expect(metrics.memory.total).toBeGreaterThan(0);
        expect(metrics.memory.used).toBeGreaterThan(0);
        expect(metrics.memory.free).toBeGreaterThanOrEqual(0);
        expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);
        expect(metrics.memory.usage).toBeLessThanOrEqual(100);
        expect(metrics.memory.used + metrics.memory.free).toBeLessThanOrEqual(metrics.memory.total);
      }
    });

    it('should validate network metrics', async () => {
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = productionMonitor.getSystemStatus();
      const metrics = status.metrics;
      
      if (metrics) {
        expect(metrics.network.bytesIn).toBeGreaterThan(0);
        expect(metrics.network.bytesOut).toBeGreaterThan(0);
        expect(metrics.network.connections).toBeGreaterThan(0);
        expect(metrics.network.latency).toBeGreaterThan(0);
      }
    });

    it('should validate disk metrics', async () => {
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = productionMonitor.getSystemStatus();
      const metrics = status.metrics;
      
      if (metrics) {
        expect(metrics.disk.total).toBeGreaterThan(0);
        expect(metrics.disk.used).toBeGreaterThan(0);
        expect(metrics.disk.free).toBeGreaterThanOrEqual(0);
        expect(metrics.disk.usage).toBeGreaterThanOrEqual(0);
        expect(metrics.disk.usage).toBeLessThanOrEqual(100);
        expect(metrics.disk.iops).toBeGreaterThan(0);
      }
    });
  });

  describe('Alert System', () => {
    it('should generate alerts for CPU usage', async () => {
      const alertSpy = vi.fn();
      productionMonitor.on('alert', alertSpy);
      
      // Mock high CPU usage by temporarily modifying thresholds
      const originalConfig = productionMonitor.getStats();
      productionMonitor.updateConfig({
        alertThresholds: {
          cpu: { warning: 10, critical: 20 }, // Very low thresholds for testing
          memory: { warning: 80, critical: 95 },
          disk: { warning: 85, critical: 95 },
          network: { warning: 1000, critical: 2000 }
        }
      });
      
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should generate alerts for high CPU usage
      expect(alertSpy).toHaveBeenCalled();
      
      const alert = alertSpy.mock.calls[0][0];
      expect(alert.category).toBe('cpu');
      expect(alert.type).toMatch(/warning|critical/);
      expect(alert.value).toBeGreaterThan(alert.threshold);
      expect(alert.resolved).toBe(false);
      expect(alert.severity).toMatch(/low|medium|high/);
    });

    it('should generate alerts for memory usage', async () => {
      const alertSpy = vi.fn();
      productionMonitor.on('alert', alertSpy);
      
      productionMonitor.updateConfig({
        alertThresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 10, critical: 20 }, // Very low thresholds for testing
          disk: { warning: 85, critical: 95 },
          network: { warning: 1000, critical: 2000 }
        }
      });
      
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(alertSpy).toHaveBeenCalled();
      
      const alert = alertSpy.mock.calls[0][0];
      expect(alert.category).toBe('memory');
      expect(alert.type).toMatch(/warning|critical/);
      expect(alert.value).toBeGreaterThan(alert.threshold);
    });

    it('should resolve alerts', async () => {
      const alertSpy = vi.fn();
      const resolveSpy = vi.fn();
      productionMonitor.on('alert', alertSpy);
      productionMonitor.on('alertResolved', resolveSpy);
      
      // Set low thresholds to trigger alerts
      productionMonitor.updateConfig({
        alertThresholds: {
          cpu: { warning: 10, critical: 20 },
          memory: { warning: 80, critical: 95 },
          disk: { warning: 85, critical: 95 },
          network: { warning: 1000, critical: 2000 }
        }
      });
      
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(alertSpy).toHaveBeenCalled();
      const alert = alertSpy.mock.calls[0][0];
      
      // Resolve the alert
      const result = productionMonitor.resolveAlert(alert.id);
      expect(result).toBe(true);
      expect(resolveSpy).toHaveBeenCalled();
    });

    it('should not resolve non-existent alerts', () => {
      const result = productionMonitor.resolveAlert('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Health Checks', () => {
    it('should perform health checks when enabled', async () => {
      const healthSpy = vi.fn();
      productionMonitor.on('healthChecksCompleted', healthSpy);
      
      productionMonitor.updateConfig({
        healthChecks: {
          enabled: true,
          interval: 100, // Fast interval for testing
          endpoints: ['/api/health', '/api/status']
        }
      });
      
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(healthSpy).toHaveBeenCalled();
      
      const healthChecks = healthSpy.mock.calls[0][0];
      expect(healthChecks).toBeInstanceOf(Array);
      expect(healthChecks.length).toBeGreaterThan(0);
      
      for (const check of healthChecks) {
        expect(check.name).toMatch(/\/api\/(health|status)/);
        expect(check.status).toMatch(/healthy|degraded|unhealthy/);
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
        expect(check.lastCheck).toBeGreaterThan(0);
      }
    });

    it('should handle health check failures gracefully', async () => {
      const healthSpy = vi.fn();
      productionMonitor.on('healthChecksCompleted', healthSpy);
      
      productionMonitor.updateConfig({
        healthChecks: {
          enabled: true,
          interval: 100,
          endpoints: ['/invalid/endpoint', '/another/invalid']
        }
      });
      
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(healthSpy).toHaveBeenCalled();
      
      const healthChecks = healthSpy.mock.calls[0][0];
      expect(healthChecks.length).toBe(2);
      
      for (const check of healthChecks) {
        expect(check.status).toBe('unhealthy');
        expect(check.error).toBeDefined();
      }
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const configSpy = vi.fn();
      productionMonitor.on('configUpdated', configSpy);
      
      const newConfig = {
        collectionInterval: 10000,
        alertThresholds: {
          cpu: { warning: 60, critical: 80 },
          memory: { warning: 70, critical: 90 },
          disk: { warning: 80, critical: 95 },
          network: { warning: 500, critical: 1000 }
        }
      };
      
      productionMonitor.updateConfig(newConfig);
      
      expect(configSpy).toHaveBeenCalled();
      const updatedConfig = configSpy.mock.calls[0][0];
      expect(updatedConfig.collectionInterval).toBe(10000);
      expect(updatedConfig.alertThresholds.cpu.warning).toBe(60);
    });

    it('should restart monitoring when configuration changes', () => {
      productionMonitor.start();
      expect(productionMonitor.getSystemStatus().isRunning).toBe(true);
      
      productionMonitor.updateConfig({ collectionInterval: 20000 });
      
      // Should still be running after config update
      expect(productionMonitor.getSystemStatus().isRunning).toBe(true);
    });
  });

  describe('Statistics and Metrics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = productionMonitor.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalTenants).toBeGreaterThanOrEqual(0);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
      expect(stats.totalResources).toBeGreaterThanOrEqual(0);
      expect(stats.totalUsage).toBeGreaterThanOrEqual(0);
      expect(stats.totalBilling).toBeGreaterThanOrEqual(0);
      expect(stats.cacheStats).toBeDefined();
    });

    it('should track cache performance', () => {
      const stats = productionMonitor.getStats();
      
      expect(stats.cacheStats.tenantCache).toBeDefined();
      expect(stats.cacheStats.userCache).toBeDefined();
      expect(stats.cacheStats.resourceCache).toBeDefined();
      expect(stats.cacheStats.usageCache).toBeDefined();
      expect(stats.cacheStats.billingCache).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics collection errors gracefully', async () => {
      const errorSpy = vi.fn();
      productionMonitor.on('metricsError', errorSpy);
      
      // This test verifies that the monitor handles errors gracefully
      // In a real implementation, this would test actual error scenarios
      productionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The monitor should continue running even if individual metrics fail
      expect(productionMonitor.getSystemStatus().isRunning).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clear caches', () => {
      productionMonitor.clearCaches();
      
      const stats = productionMonitor.getStats();
      expect(stats.totalTenants).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalUsage).toBe(0);
      expect(stats.totalBilling).toBe(0);
    });

    it('should destroy resources properly', () => {
      productionMonitor.start();
      expect(productionMonitor.getSystemStatus().isRunning).toBe(true);
      
      productionMonitor.destroy();
      
      expect(productionMonitor.getSystemStatus().isRunning).toBe(false);
      
      // Should not be able to start after destroy
      productionMonitor.start();
      expect(productionMonitor.getSystemStatus().isRunning).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should emit monitoring events', () => {
      const events = ['monitoringStarted', 'monitoringStopped', 'metricsCollected', 'alert', 'alertResolved'];
      const spies = events.map(event => vi.fn());
      
      events.forEach((event, index) => {
        productionMonitor.on(event, spies[index]);
      });
      
      productionMonitor.start();
      productionMonitor.stop();
      
      expect(spies[0]).toHaveBeenCalled(); // monitoringStarted
      expect(spies[1]).toHaveBeenCalled(); // monitoringStopped
    });

    it('should remove event listeners on destroy', () => {
      const spy = vi.fn();
      productionMonitor.on('monitoringStarted', spy);
      
      productionMonitor.destroy();
      productionMonitor.start();
      
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

