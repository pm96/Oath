/**
 * Offline-Aware Streak Service
 *
 * Wraps the existing StreakService with offline support and caching
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";
import { HabitCompletion, HabitStreak } from "../../types/habit-streaks";
import { isOnline } from "../../utils/errorHandling";
import { StreakService } from "./streakService";
import { syncService } from "./syncService";

/**
 * Offline-aware wrapper for StreakService
 */
export class OfflineStreakService {
    private streakService: StreakService;
    private static readonly CACHE_PREFIX = "@offline_streak_";

    constructor() {
        this.streakService = new StreakService();
    }

    /**
     * Record completion with offline support
     * Requirements: 10.4
     */
    async recordCompletion(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion> {
        const online = await isOnline();

        if (online) {
            try {
                // Try to record online first
                const result = await this.streakService.recordCompletion(completion);

                // Cache the successful result
                await this.cacheCompletion(result);

                return result;
            } catch (error) {
                console.warn(
                    "Online completion failed, falling back to offline mode:",
                    error,
                );
                return await this.recordCompletionOffline(completion);
            }
        } else {
            return await this.recordCompletionOffline(completion);
        }
    }

    /**
     * Record completion in offline mode
     * Requirements: 10.4
     */
    private async recordCompletionOffline(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion> {
        // Generate temporary ID for offline completion
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const offlineCompletion: HabitCompletion = {
            ...completion,
            id: tempId,
        };

        // Cache the completion locally
        await this.cacheCompletion(offlineCompletion);

        // Queue for sync when online
        await syncService.queueOperation({
            type: "completion",
            action: "create",
            data: completion,
            userId: completion.userId,
            habitId: completion.habitId,
        });

        return offlineCompletion;
    }

    /**
     * Calculate streak with offline support
     * Requirements: 10.3, 10.4
     */
    async calculateStreak(habitId: string, userId: string): Promise<HabitStreak> {
        const online = await isOnline();

        if (online) {
            try {
                // Try to get fresh data from server
                const streak = await this.streakService.calculateStreak(
                    habitId,
                    userId,
                );

                // Cache the result
                await this.cacheStreak(streak);

                return streak;
            } catch (error) {
                console.warn(
                    "Online streak calculation failed, using cached data:",
                    error,
                );
                return await this.getStreakFromCache(habitId, userId);
            }
        } else {
            return await this.getStreakFromCache(habitId, userId);
        }
    }

    /**
     * Get streak from cache with fallback
     * Requirements: 10.3
     */
    private async getStreakFromCache(
        habitId: string,
        userId: string,
    ): Promise<HabitStreak> {
        const cacheKey = `${OfflineStreakService.CACHE_PREFIX}streak_${userId}_${habitId}`;

        try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);

                // Convert timestamp fields back to Timestamp objects
                if (parsed.milestones) {
                    parsed.milestones = parsed.milestones.map((m: any) => ({
                        ...m,
                        achievedAt: Timestamp.fromMillis(m.achievedAt),
                    }));
                }

                return parsed;
            }
        } catch (error) {
            console.error("Failed to get streak from cache:", error);
        }

        // Return default streak if no cache available
        return {
            habitId,
            userId,
            currentStreak: 0,
            bestStreak: 0,
            lastCompletionDate: "",
            streakStartDate: "",
            freezesAvailable: 0,
            freezesUsed: 0,
            milestones: [],
        };
    }
    /**
     * Use streak freeze with offline support
     * Requirements: 10.4
     */
    async useStreakFreeze(
        habitId: string,
        userId: string,
        missedDate: string,
    ): Promise<boolean> {
        const online = await isOnline();

        if (online) {
            try {
                const result = await this.streakService.useStreakFreeze(
                    habitId,
                    userId,
                    missedDate,
                );

                // Update cached streak if successful
                if (result) {
                    const updatedStreak = await this.streakService.getHabitStreak(
                        habitId,
                        userId,
                    );
                    if (updatedStreak) {
                        await this.cacheStreak(updatedStreak);
                    }
                }

                return result;
            } catch (error) {
                console.warn("Online freeze usage failed, queuing for later:", error);
                return await this.useStreakFreezeOffline(habitId, userId, missedDate);
            }
        } else {
            return await this.useStreakFreezeOffline(habitId, userId, missedDate);
        }
    }

    /**
     * Use streak freeze in offline mode
     * Requirements: 10.4
     */
    private async useStreakFreezeOffline(
        habitId: string,
        userId: string,
        missedDate: string,
    ): Promise<boolean> {
        // Get cached streak to check freeze availability
        const cachedStreak = await this.getStreakFromCache(habitId, userId);

        if (cachedStreak.freezesAvailable <= 0) {
            return false;
        }

        // Update cached streak optimistically
        const updatedStreak: HabitStreak = {
            ...cachedStreak,
            freezesAvailable: cachedStreak.freezesAvailable - 1,
            freezesUsed: cachedStreak.freezesUsed + 1,
        };

        await this.cacheStreak(updatedStreak);

        // Queue the operation for sync
        await syncService.queueOperation({
            type: "streak",
            action: "update",
            data: updatedStreak,
            userId,
            habitId,
        });

        return true;
    }

    /**
     * Get habit calendar with offline support
     * Requirements: 10.3, 10.4
     */
    async getHabitCalendar(
        habitId: string,
        userId: string,
        days: number,
        timezone: string,
    ) {
        const online = await isOnline();

        if (online) {
            try {
                const calendar = await this.streakService.getHabitCalendar(
                    habitId,
                    userId,
                    days,
                    timezone,
                );

                // Cache calendar data
                await this.cacheCalendar(habitId, userId, calendar);

                return calendar;
            } catch (error) {
                console.warn("Online calendar fetch failed, using cached data:", error);
                return await this.getCalendarFromCache(habitId, userId);
            }
        } else {
            return await this.getCalendarFromCache(habitId, userId);
        }
    }

    /**
     * Cache completion data
     */
    private async cacheCompletion(completion: HabitCompletion): Promise<void> {
        const cacheKey = `${OfflineStreakService.CACHE_PREFIX}completion_${completion.id}`;

        try {
            // Serialize timestamp for storage
            const serialized = {
                ...completion,
                completedAt: completion.completedAt.toMillis(),
            };

            await AsyncStorage.setItem(cacheKey, JSON.stringify(serialized));
        } catch (error) {
            console.error("Failed to cache completion:", error);
        }
    }

    /**
     * Cache streak data
     */
    private async cacheStreak(streak: HabitStreak): Promise<void> {
        const cacheKey = `${OfflineStreakService.CACHE_PREFIX}streak_${streak.userId}_${streak.habitId}`;

        try {
            // Serialize timestamps for storage
            const serialized = {
                ...streak,
                milestones: streak.milestones.map((m) => ({
                    ...m,
                    achievedAt: m.achievedAt.toMillis(),
                })),
            };

            await AsyncStorage.setItem(cacheKey, JSON.stringify(serialized));
        } catch (error) {
            console.error("Failed to cache streak:", error);
        }
    }

    /**
     * Cache calendar data
     */
    private async cacheCalendar(
        habitId: string,
        userId: string,
        calendar: any,
    ): Promise<void> {
        const cacheKey = `${OfflineStreakService.CACHE_PREFIX}calendar_${userId}_${habitId}`;

        try {
            const serialized = {
                calendar,
                timestamp: Date.now(),
            };

            await AsyncStorage.setItem(cacheKey, JSON.stringify(serialized));
        } catch (error) {
            console.error("Failed to cache calendar:", error);
        }
    }

    /**
     * Get calendar from cache
     */
    private async getCalendarFromCache(habitId: string, userId: string) {
        const cacheKey = `${OfflineStreakService.CACHE_PREFIX}calendar_${userId}_${habitId}`;

        try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);

                // Check if cache is not too old (24 hours)
                const cacheAge = Date.now() - parsed.timestamp;
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    return parsed.calendar;
                }
            }
        } catch (error) {
            console.error("Failed to get calendar from cache:", error);
        }

        // Return empty calendar if no valid cache
        return [];
    }

    /**
     * Clear all cached data for a user
     */
    async clearUserCache(userId: string): Promise<void> {
        try {
            // Get all keys and filter for this user
            const allKeys = await AsyncStorage.getAllKeys();
            const userKeys = allKeys.filter(
                (key) =>
                    key.startsWith(OfflineStreakService.CACHE_PREFIX) &&
                    key.includes(userId),
            );

            if (userKeys.length > 0) {
                await AsyncStorage.multiRemove(userKeys);
            }
        } catch (error) {
            console.error("Failed to clear user cache:", error);
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(userId: string): Promise<{
        totalItems: number;
        totalSize: number;
        lastUpdated: number | null;
    }> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const userKeys = allKeys.filter(
                (key) =>
                    key.startsWith(OfflineStreakService.CACHE_PREFIX) &&
                    key.includes(userId),
            );

            let totalSize = 0;
            let lastUpdated: number | null = null;

            for (const key of userKeys) {
                const data = await AsyncStorage.getItem(key);
                if (data) {
                    totalSize += data.length;

                    try {
                        const parsed = JSON.parse(data);
                        if (
                            parsed.timestamp &&
                            (!lastUpdated || parsed.timestamp > lastUpdated)
                        ) {
                            lastUpdated = parsed.timestamp;
                        }
                    } catch {
                        // Ignore parsing errors for timestamp extraction
                    }
                }
            }

            return {
                totalItems: userKeys.length,
                totalSize,
                lastUpdated,
            };
        } catch (error) {
            console.error("Failed to get cache stats:", error);
            return {
                totalItems: 0,
                totalSize: 0,
                lastUpdated: null,
            };
        }
    }
}

// Export singleton instance
export const offlineStreakService = new OfflineStreakService();
