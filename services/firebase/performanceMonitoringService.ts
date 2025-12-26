/**
 * Performance Monitoring Service
 *
 * Monitors and tracks performance metrics for the habit tracking system,
 * providing insights for optimization and alerting for performance issues.
 * Requirements: Performance and scalability
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    getDevicePerformanceTier,
    PerformanceTier,
} from "../../utils/performance";

/**
 * Performance metric types
 */
interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    context?: Record<string, any>;
}

/**
 * Performance thresholds for different operations
 */
interface PerformanceThresholds {
    streakCalculation: number;
    analyticsComputation: number;
    calendarRendering: number;
    cacheOperation: number;
    databaseQuery: number;
}

/**
 * Performance report
 */
interface PerformanceReport {
    deviceTier: PerformanceTier;
    averageMetrics: Record<string, number>;
    slowOperations: PerformanceMetric[];
    cacheHitRate: number;
    totalOperations: number;
    reportPeriod: {
        start: number;
        end: number;
    };
}

/**
 * Performance alert
 */
interface PerformanceAlert {
    type:
    | "slow_operation"
    | "memory_warning"
    | "cache_miss_rate"
    | "database_timeout";
    severity: "low" | "medium" | "high";
    message: string;
    metric: PerformanceMetric;
    timestamp: number;
}

/**
 * Performance Monitoring Service Implementation
 */
export class PerformanceMonitoringService {
    private static instance: PerformanceMonitoringService;
    private metrics: PerformanceMetric[] = [];
    private deviceTier: PerformanceTier;
    private thresholds: PerformanceThresholds;
    private alertCallbacks = new Set<(alert: PerformanceAlert) => void>();
    private isEnabled = true;
    private maxMetricsCount = 1000; // Keep last 1000 metrics

    private constructor() {
        this.deviceTier = getDevicePerformanceTier();
        this.thresholds = this.getThresholdsForDevice(this.deviceTier);
        this.loadStoredMetrics();
        this.startPeriodicCleanup();
    }

    public static getInstance(): PerformanceMonitoringService {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance =
                new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }

    /**
     * Start timing a performance-critical operation
     */
    startTiming(
        operationName: string,
        context?: Record<string, any>,
    ): () => void {
        if (!this.isEnabled) {
            return () => { }; // No-op if disabled
        }

        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            this.recordMetric({
                name: operationName,
                value: duration,
                timestamp: Date.now(),
                context,
            });
        };
    }

    /**
     * Record a performance metric
     */
    recordMetric(metric: PerformanceMetric): void {
        if (!this.isEnabled) return;

        this.metrics.push(metric);

        // Enforce metrics limit
        if (this.metrics.length > this.maxMetricsCount) {
            this.metrics = this.metrics.slice(-this.maxMetricsCount);
        }

        // Check for performance issues
        this.checkPerformanceThresholds(metric);

        // Persist metrics periodically
        if (this.metrics.length % 50 === 0) {
            this.persistMetrics();
        }
    }

    /**
     * Record cache operation metrics
     */
    recordCacheOperation(
        operation: "hit" | "miss" | "set" | "invalidate",
        duration: number,
        key?: string,
    ): void {
        this.recordMetric({
            name: `cache_${operation}`,
            value: duration,
            timestamp: Date.now(),
            context: { key: key?.substring(0, 50) }, // Truncate long keys
        });
    }

    /**
     * Record database operation metrics
     */
    recordDatabaseOperation(
        operation: string,
        duration: number,
        collection?: string,
    ): void {
        this.recordMetric({
            name: `db_${operation}`,
            value: duration,
            timestamp: Date.now(),
            context: { collection },
        });
    }

    /**
     * Record UI rendering metrics
     */
    recordRenderingMetric(
        component: string,
        duration: number,
        itemCount?: number,
    ): void {
        this.recordMetric({
            name: `render_${component}`,
            value: duration,
            timestamp: Date.now(),
            context: { itemCount },
        });
    }

    /**
     * Generate performance report
     */
    generateReport(periodHours: number = 24): PerformanceReport {
        const now = Date.now();
        const periodStart = now - periodHours * 60 * 60 * 1000;

        const periodMetrics = this.metrics.filter(
            (metric) => metric.timestamp >= periodStart,
        );

        // Calculate averages by operation type
        const averageMetrics: Record<string, number> = {};
        const operationGroups: Record<string, number[]> = {};

        periodMetrics.forEach((metric) => {
            if (!operationGroups[metric.name]) {
                operationGroups[metric.name] = [];
            }
            operationGroups[metric.name].push(metric.value);
        });

        Object.entries(operationGroups).forEach(([name, values]) => {
            averageMetrics[name] =
                values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        // Find slow operations
        const slowOperations = periodMetrics
            .filter((metric) => {
                const threshold = this.getThresholdForOperation(metric.name);
                return metric.value > threshold;
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 slowest

        // Calculate cache hit rate
        const cacheHits = periodMetrics.filter(
            (m) => m.name === "cache_hit",
        ).length;
        const cacheMisses = periodMetrics.filter(
            (m) => m.name === "cache_miss",
        ).length;
        const cacheHitRate =
            cacheHits + cacheMisses > 0
                ? (cacheHits / (cacheHits + cacheMisses)) * 100
                : 0;

        return {
            deviceTier: this.deviceTier,
            averageMetrics,
            slowOperations,
            cacheHitRate,
            totalOperations: periodMetrics.length,
            reportPeriod: {
                start: periodStart,
                end: now,
            },
        };
    }

    /**
     * Subscribe to performance alerts
     */
    onPerformanceAlert(callback: (alert: PerformanceAlert) => void): () => void {
        this.alertCallbacks.add(callback);

        return () => {
            this.alertCallbacks.delete(callback);
        };
    }

    /**
     * Enable or disable performance monitoring
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Get current performance statistics
     */
    getCurrentStats(): {
        metricsCount: number;
        deviceTier: PerformanceTier;
        isEnabled: boolean;
        recentAverages: Record<string, number>;
    } {
        const recentMetrics = this.metrics.slice(-100); // Last 100 metrics
        const recentAverages: Record<string, number> = {};

        const groups: Record<string, number[]> = {};
        recentMetrics.forEach((metric) => {
            if (!groups[metric.name]) {
                groups[metric.name] = [];
            }
            groups[metric.name].push(metric.value);
        });

        Object.entries(groups).forEach(([name, values]) => {
            recentAverages[name] =
                values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        return {
            metricsCount: this.metrics.length,
            deviceTier: this.deviceTier,
            isEnabled: this.isEnabled,
            recentAverages,
        };
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        AsyncStorage.removeItem("@performance_metrics");
    }

    // Private helper methods

    /**
     * Get performance thresholds based on device tier
     */
    private getThresholdsForDevice(tier: PerformanceTier): PerformanceThresholds {
        switch (tier) {
            case PerformanceTier.LOW:
                return {
                    streakCalculation: 500, // 500ms
                    analyticsComputation: 1000, // 1s
                    calendarRendering: 300, // 300ms
                    cacheOperation: 50, // 50ms
                    databaseQuery: 2000, // 2s
                };
            case PerformanceTier.MEDIUM:
                return {
                    streakCalculation: 300,
                    analyticsComputation: 600,
                    calendarRendering: 200,
                    cacheOperation: 30,
                    databaseQuery: 1500,
                };
            case PerformanceTier.HIGH:
            default:
                return {
                    streakCalculation: 200,
                    analyticsComputation: 400,
                    calendarRendering: 150,
                    cacheOperation: 20,
                    databaseQuery: 1000,
                };
        }
    }

    /**
     * Get threshold for specific operation
     */
    private getThresholdForOperation(operationName: string): number {
        if (operationName.includes("streak")) {
            return this.thresholds.streakCalculation;
        } else if (operationName.includes("analytics")) {
            return this.thresholds.analyticsComputation;
        } else if (
            operationName.includes("render") ||
            operationName.includes("calendar")
        ) {
            return this.thresholds.calendarRendering;
        } else if (operationName.includes("cache")) {
            return this.thresholds.cacheOperation;
        } else if (operationName.includes("db")) {
            return this.thresholds.databaseQuery;
        }

        return 1000; // Default threshold
    }

    /**
     * Check if metric exceeds performance thresholds
     */
    private checkPerformanceThresholds(metric: PerformanceMetric): void {
        const threshold = this.getThresholdForOperation(metric.name);

        if (metric.value > threshold) {
            const severity = this.calculateSeverity(metric.value, threshold);

            const alert: PerformanceAlert = {
                type: "slow_operation",
                severity,
                message: `${metric.name} took ${metric.value.toFixed(2)}ms (threshold: ${threshold}ms)`,
                metric,
                timestamp: Date.now(),
            };

            this.emitAlert(alert);
        }

        // Check cache hit rate
        if (metric.name === "cache_miss") {
            this.checkCacheHitRate();
        }
    }

    /**
     * Calculate alert severity based on how much threshold was exceeded
     */
    private calculateSeverity(
        value: number,
        threshold: number,
    ): "low" | "medium" | "high" {
        const ratio = value / threshold;

        if (ratio > 3) return "high";
        if (ratio > 2) return "medium";
        return "low";
    }

    /**
     * Check cache hit rate and emit alert if too low
     */
    private checkCacheHitRate(): void {
        const recentMetrics = this.metrics.slice(-50); // Last 50 operations
        const cacheHits = recentMetrics.filter(
            (m) => m.name === "cache_hit",
        ).length;
        const cacheMisses = recentMetrics.filter(
            (m) => m.name === "cache_miss",
        ).length;

        if (cacheHits + cacheMisses >= 10) {
            // Only check if we have enough data
            const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;

            if (hitRate < 60) {
                // Less than 60% hit rate
                const alert: PerformanceAlert = {
                    type: "cache_miss_rate",
                    severity: hitRate < 40 ? "high" : "medium",
                    message: `Cache hit rate is low: ${hitRate.toFixed(1)}%`,
                    metric: {
                        name: "cache_hit_rate",
                        value: hitRate,
                        timestamp: Date.now(),
                    },
                    timestamp: Date.now(),
                };

                this.emitAlert(alert);
            }
        }
    }

    /**
     * Emit performance alert to subscribers
     */
    private emitAlert(alert: PerformanceAlert): void {
        this.alertCallbacks.forEach((callback) => {
            try {
                callback(alert);
            } catch (error) {
                console.error("Performance alert callback error:", error);
            }
        });
    }

    /**
     * Load stored metrics from AsyncStorage
     */
    private async loadStoredMetrics(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem("@performance_metrics");
            if (stored) {
                const metrics = JSON.parse(stored);
                // Only keep recent metrics (last 24 hours)
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                this.metrics = metrics.filter(
                    (m: PerformanceMetric) => m.timestamp > oneDayAgo,
                );
            }
        } catch (error) {
            console.error("Failed to load stored metrics:", error);
        }
    }

    /**
     * Persist metrics to AsyncStorage
     */
    private async persistMetrics(): Promise<void> {
        try {
            // Only persist recent metrics to save space
            const recentMetrics = this.metrics.slice(-500);
            await AsyncStorage.setItem(
                "@performance_metrics",
                JSON.stringify(recentMetrics),
            );
        } catch (error) {
            console.error("Failed to persist metrics:", error);
        }
    }

    /**
     * Start periodic cleanup of old metrics
     */
    private startPeriodicCleanup(): void {
        setInterval(
            () => {
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                this.metrics = this.metrics.filter(
                    (metric) => metric.timestamp > oneDayAgo,
                );
            },
            60 * 60 * 1000,
        ); // Every hour
    }
}

// Export singleton instance
export const performanceMonitoringService =
    PerformanceMonitoringService.getInstance();
