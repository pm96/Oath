/**
 * Optimized Services Export
 *
 * Central export point for all performance-optimized services.
 * This provides a clean interface for consuming optimized habit tracking services.
 */

import { optimizedHabitService } from "./optimizedHabitService";

// Core optimized services
export { optimizedHabitService } from "./optimizedHabitService";

/**
 * Convenience function to initialize all optimized services
 */
export async function initializeOptimizedServices(
    userId: string,
    habitIds: string[] = [],
): Promise<void> {
    try {
        // Preload critical user data
        if (habitIds.length > 0) {
            await optimizedHabitService.preloadUserData(userId, habitIds);
        }

        console.log("Optimized services initialized successfully");
    } catch (error) {
        console.error("Failed to initialize optimized services:", error);
        // Don't throw - initialization failure shouldn't break the app
    }
}

/**
 * Convenience function to get performance overview
 */
export function getPerformanceOverview() {
    return optimizedHabitService.getPerformanceStats();
}

/**
 * Convenience function to reset all optimizations
 */
export async function resetAllOptimizations(): Promise<void> {
    await optimizedHabitService.resetOptimizations();
}
