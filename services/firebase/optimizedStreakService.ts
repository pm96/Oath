/**
 * Optimized Streak Service with Caching
 */

import {
    CalendarDay,
    HabitCompletion,
    HabitStreak,
} from "../../types/habit-streaks";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";
import { cachingService } from "./cachingService";
import { streakService } from "./streakService";

/**
 * Optimized Streak Service Implementation
 */
export class OptimizedStreakService {
    private static instance: OptimizedStreakService;
    private calculationQueue = new Map<string, Promise<HabitStreak>>();
    private backgroundSyncEnabled = true;

    private constructor() { }

    public static getInstance(): OptimizedStreakService {
        if (!OptimizedStreakService.instance) {
            OptimizedStreakService.instance = new OptimizedStreakService();
        }
        return OptimizedStreakService.instance;
    }

    /**
     * Get streak with intelligent caching
     */
    async getHabitStreak(
        habitId: string,
        userId: string,
    ): Promise<HabitStreak | null> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        const cacheKey = `streak:${userId}:${habitId}`;

        try {
            // Try cache first
            const cached = await cachingService.get<HabitStreak>(cacheKey, "streaks");
            if (cached) {
                return cached;
            }

            // Cache miss - calculate and cache
            const streak = await streakService.calculateStreak(habitId, userId);

            // Cache the result
            await cachingService.set(cacheKey, streak, "streaks");

            return streak;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get optimized habit streak: ${message}`);
        }
    }

    /**
     * Record completion with optimized caching
     */
    async recordCompletion(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion> {
        try {
            // Record completion using base service
            const result = await streakService.recordCompletion(completion);

            // Invalidate related caches
            const cacheKey = `streak:${completion.userId}:${completion.habitId}`;
            await cachingService.invalidate(cacheKey);

            return result;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to record optimized completion: ${message}`);
        }
    }

    /**
     * Get calendar data with smart caching
     */
    async getHabitCalendar(
        habitId: string,
        userId: string,
        days: number,
        timezone: string,
    ): Promise<CalendarDay[]> {
        const cacheKey = `calendar:${userId}:${habitId}:${days}:${timezone}`;

        try {
            // Check cache first
            const cached = await cachingService.get<CalendarDay[]>(
                cacheKey,
                "calendar",
            );
            if (cached) {
                return cached;
            }

            // Cache miss - load and cache
            const calendarData = await streakService.getHabitCalendar(
                habitId,
                userId,
                days,
                timezone,
            );

            // Cache the result
            await cachingService.set(cacheKey, calendarData, "calendar");

            return calendarData;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get optimized calendar: ${message}`);
        }
    }

    /**
     * Preload user data for better performance
     */
    async preloadUserData(userId: string, habitIds: string[]): Promise<void> {
        try {
            // Preload recent streaks in background
            const preloadPromises = habitIds
                .slice(0, 5)
                .map((habitId) =>
                    this.getHabitStreak(habitId, userId).catch(() => null),
                );

            await Promise.allSettled(preloadPromises);
        } catch (error) {
            console.error("Preload error:", error);
            // Don't throw - preloading is optional
        }
    }

    /**
     * Enable/disable background sync
     */
    setBackgroundSyncEnabled(enabled: boolean): void {
        this.backgroundSyncEnabled = enabled;
    }

    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return cachingService.getStats();
    }

    /**
     * Clear all cached data
     */
    async clearCache(): Promise<void> {
        await cachingService.clearAll();
    }
}

// Export singleton instance
export const optimizedStreakService = OptimizedStreakService.getInstance();
