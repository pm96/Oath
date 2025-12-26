/**
 * Optimized Analytics Service with caching and background computation
 */

import { HabitAnalytics, TrendData } from "../../types/habit-streaks";
import { analyticsService } from "./analyticsService";
import { cachingService } from "./cachingService";

/**
 * Optimized analytics service with intelligent caching
 */
export class OptimizedAnalyticsService {
    private static instance: OptimizedAnalyticsService;

    static getInstance(): OptimizedAnalyticsService {
        if (!OptimizedAnalyticsService.instance) {
            OptimizedAnalyticsService.instance = new OptimizedAnalyticsService();
        }
        return OptimizedAnalyticsService.instance;
    }

    /**
     * Get habit analytics with intelligent caching
     */
    async getHabitAnalytics(
        habitId: string,
        userId: string,
    ): Promise<HabitAnalytics> {
        const cacheKey = `analytics:${userId}:${habitId}`;

        try {
            // Check cache first
            const cached = await cachingService.get<HabitAnalytics>(
                cacheKey,
                "analytics",
            );
            if (cached !== null) {
                return cached;
            }

            // Compute fresh data
            const analytics = await analyticsService.calculateHabitAnalytics(
                habitId,
                userId,
            );

            // Cache result
            await cachingService.set(cacheKey, analytics, "analytics");

            return analytics;
        } catch (error) {
            console.error("Error getting habit analytics:", error);
            // Fallback to direct computation
            return analyticsService.calculateHabitAnalytics(habitId, userId);
        }
    }

    /**
     * Get completion trends with caching
     */
    async getCompletionTrends(
        habitId: string,
        userId: string,
        period: "week" | "month" | "quarter" | "year",
    ): Promise<TrendData[]> {
        const cacheKey = `trends:${userId}:${habitId}:${period}`;

        try {
            // Check cache first
            const cached = await cachingService.get<TrendData[]>(
                cacheKey,
                "analytics",
            );
            if (cached !== null) {
                return cached;
            }

            // Compute fresh trends
            const trends = await analyticsService.getCompletionTrends(
                habitId,
                userId,
                period,
            );

            // Cache result
            await cachingService.set(cacheKey, trends, "analytics");

            return trends;
        } catch (error) {
            console.error("Error getting completion trends:", error);
            return analyticsService.getCompletionTrends(habitId, userId, period);
        }
    }

    /**
     * Get overall consistency score with caching
     */
    async getOverallConsistencyScore(userId: string): Promise<number> {
        const cacheKey = `consistency:${userId}`;

        try {
            // Check cache first
            const cached = await cachingService.get<number>(cacheKey, "analytics");
            if (cached !== null) {
                return cached;
            }

            // Compute fresh score
            const score = await analyticsService.getOverallConsistencyScore(userId);

            // Cache result
            await cachingService.set(cacheKey, score, "analytics");

            return score;
        } catch (error) {
            console.error("Error getting consistency score:", error);
            return analyticsService.getOverallConsistencyScore(userId);
        }
    }

    /**
     * Precompute analytics for a user's habits
     */
    async precomputeUserAnalytics(
        userId: string,
        habitIds: string[],
    ): Promise<void> {
        try {
            // Precompute analytics for top habits
            const precomputePromises = habitIds
                .slice(0, 5)
                .map((habitId) =>
                    this.getHabitAnalytics(habitId, userId).catch(() => null),
                );

            await Promise.allSettled(precomputePromises);
        } catch (error) {
            console.error("Precompute error:", error);
            // Don't throw - precomputing is optional
        }
    }

    /**
     * Invalidate cache for specific analytics
     */
    async invalidateAnalytics(habitId: string, userId: string): Promise<void> {
        const keys = [
            `analytics:${userId}:${habitId}`,
            `trends:${userId}:${habitId}:week`,
            `trends:${userId}:${habitId}:month`,
            `trends:${userId}:${habitId}:quarter`,
            `trends:${userId}:${habitId}:year`,
            `consistency:${userId}`,
        ];

        await Promise.all(keys.map((key) => cachingService.invalidate(key)));
    }

    /**
     * Clear all cached analytics data
     */
    async clearCache(): Promise<void> {
        await cachingService.clearAll();
    }
}

// Export singleton instance
export const optimizedAnalyticsService =
    OptimizedAnalyticsService.getInstance();
