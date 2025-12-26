import {
    doc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
    HabitAnalytics,
    HabitCompletion,
    TrendData,
} from "../../types/habit-streaks";
import {
    getCurrentDateString,
    getDateNDaysAgo,
    getDayOfWeek,
    getUserTimezone,
    timestampToDateString
} from "../../utils/dateUtils";
import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "../../utils/errorHandling";
import {
    getHabitAnalyticsCollection,
    getHabitCompletionsCollection,
    getHabitStreaksCollection,
} from "./collections";
import { AnalyticsService as IAnalyticsService } from "./habitStreakInterfaces";
import {
    filterActiveCompletions,
    transformFirestoreToCompletion,
    transformFirestoreToStreak,
} from "./habitStreakSchemas";

/**
 * Analytics calculation interfaces
 */
interface DayOfWeekStats {
    [key: string]: {
        dayName: string;
        completions: number;
        totalPossible: number;
        rate: number;
    };
}

interface StreakAnalysis {
    totalStreaks: number;
    averageLength: number;
    longestStreak: number;
    currentStreak: number;
}

interface ConsistencyMetrics {
    completionRate: number;
    streakConsistency: number;
    dayOfWeekConsistency: number;
    overallScore: number;
}

/**
 * AnalyticsService Implementation
 *
 * Handles comprehensive analytics calculation for habit tracking including
 * trend analysis, consistency scoring, and performance improvement detection.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class AnalyticsService implements IAnalyticsService {
    /**
     * Calculate comprehensive analytics for a habit
     * Requirements: 6.1, 6.2, 6.3, 6.4
     */
    async calculateHabitAnalytics(
        habitId: string,
        userId: string,
    ): Promise<HabitAnalytics> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                // Get all completions for this habit
                const completions = await this.getAllCompletions(habitId, userId);

                if (completions.length === 0) {
                    return this.createEmptyAnalytics(habitId, userId);
                }

                // Calculate various metrics
                const timezone = getUserTimezone();
                const thirtyDaysAgo = getDateNDaysAgo(30, timezone);
                const recentCompletions = this.filterCompletionsByDateRange(
                    completions,
                    thirtyDaysAgo,
                    getCurrentDateString(timezone),
                    timezone,
                );

                const totalCompletions = completions.length;
                const completionRate30Days = this.calculateCompletionRate(
                    recentCompletions,
                    30,
                    timezone,
                );
                const averageStreakLength = await this.calculateAverageStreakLength(
                    habitId,
                    userId,
                    completions,
                );
                const bestDayOfWeek = this.calculateBestDayOfWeek(
                    completions,
                    timezone,
                );
                const consistencyScore = this.calculateConsistencyScore(
                    completions,
                    timezone,
                );

                const analytics: HabitAnalytics = {
                    habitId,
                    userId,
                    totalCompletions,
                    completionRate30Days,
                    averageStreakLength,
                    bestDayOfWeek,
                    consistencyScore,
                    lastUpdated: Timestamp.now(),
                };

                // Store analytics in database
                await this.storeAnalytics(analytics);

                return analytics;
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to calculate habit analytics: ${message}`);
        }
    }

    /**
     * Get completion trends over a specified period
     * Requirements: 6.1, 6.5
     */
    async getCompletionTrends(
        habitId: string,
        userId: string,
        period: "week" | "month" | "quarter" | "year",
    ): Promise<TrendData[]> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                const completions = await this.getAllCompletions(habitId, userId);
                const timezone = getUserTimezone();

                const periodDays = this.getPeriodDays(period);
                const trends: TrendData[] = [];

                // Calculate trends for each period segment
                for (let i = 0; i < periodDays; i += this.getSegmentSize(period)) {
                    const endDate = getDateNDaysAgo(i, timezone);
                    const startDate = getDateNDaysAgo(
                        i + this.getSegmentSize(period) - 1,
                        timezone,
                    );

                    const segmentCompletions = this.filterCompletionsByDateRange(
                        completions,
                        startDate,
                        endDate,
                        timezone,
                    );

                    const completionRate = this.calculateCompletionRate(
                        segmentCompletions,
                        this.getSegmentSize(period),
                        timezone,
                    );

                    const streakLength = this.calculateSegmentStreakLength(
                        segmentCompletions,
                        timezone,
                    );

                    trends.unshift({
                        period: this.formatPeriodLabel(startDate, endDate, period),
                        completionRate,
                        streakLength,
                        totalCompletions: segmentCompletions.length,
                    });
                }

                return trends;
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get completion trends: ${message}`);
        }
    }

    /**
     * Calculate overall consistency score across all user habits
     * Requirements: 6.4
     */
    async getOverallConsistencyScore(userId: string): Promise<number> {
        if (!userId) {
            throw new Error("User ID is required");
        }

        try {
            return await retryWithBackoff(async () => {
                // Get all habits for the user by finding unique habit IDs in completions
                const completionsCollection = getHabitCompletionsCollection();
                const allCompletionsQuery = query(
                    completionsCollection,
                    where("userId", "==", userId),
                );
                const allCompletionsSnapshot = await getDocs(allCompletionsQuery);

                const habitIds = new Set<string>();
                allCompletionsSnapshot.docs.forEach((doc) => {
                    const completion = transformFirestoreToCompletion(doc.id, doc.data());
                    habitIds.add(completion.habitId);
                });

                if (habitIds.size === 0) {
                    return 0;
                }

                // Calculate consistency score for each habit
                const habitScores: number[] = [];
                for (const habitId of habitIds) {
                    try {
                        const analytics = await this.calculateHabitAnalytics(
                            habitId,
                            userId,
                        );
                        habitScores.push(analytics.consistencyScore);
                    } catch {
                        // Skip habits that can't be analyzed
                        continue;
                    }
                }

                if (habitScores.length === 0) {
                    return 0;
                }

                // Calculate weighted average (more recent habits have higher weight)
                const totalScore = habitScores.reduce((sum, score) => sum + score, 0);
                return Math.round((totalScore / habitScores.length) * 100) / 100;
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get overall consistency score: ${message}`);
        }
    }

    /**
     * Get the most consistent day of the week for a habit
     * Requirements: 6.2
     */
    async getBestDayOfWeek(habitId: string, userId: string): Promise<string> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            const completions = await this.getAllCompletions(habitId, userId);
            const timezone = getUserTimezone();
            return this.calculateBestDayOfWeek(completions, timezone);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get best day of week: ${message}`);
        }
    }

    /**
     * Calculate completion rate for a specific time period
     * Requirements: 6.1, 6.3
     */
    async getCompletionRate(
        habitId: string,
        userId: string,
        startDate: string,
        endDate: string,
    ): Promise<number> {
        if (!habitId || !userId || !startDate || !endDate) {
            throw new Error(
                "All parameters are required for completion rate calculation",
            );
        }

        try {
            const completions = await this.getAllCompletions(habitId, userId);
            const timezone = getUserTimezone();

            const filteredCompletions = this.filterCompletionsByDateRange(
                completions,
                startDate,
                endDate,
                timezone,
            );

            const totalDays = this.calculateDaysBetween(startDate, endDate);
            return this.calculateCompletionRate(
                filteredCompletions,
                totalDays,
                timezone,
            );
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to calculate completion rate: ${message}`);
        }
    }

    /**
     * Get analytics for multiple habits (dashboard view)
     * Requirements: 6.4
     */
    async getMultiHabitAnalytics(
        habitIds: string[],
        userId: string,
    ): Promise<HabitAnalytics[]> {
        if (!habitIds.length || !userId) {
            throw new Error("Habit IDs and User ID are required");
        }

        try {
            const analyticsPromises = habitIds.map((habitId) =>
                this.calculateHabitAnalytics(habitId, userId),
            );

            const results = await Promise.allSettled(analyticsPromises);

            return results
                .filter(
                    (result): result is PromiseFulfilledResult<HabitAnalytics> =>
                        result.status === "fulfilled",
                )
                .map((result) => result.value);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get multi-habit analytics: ${message}`);
        }
    }

    // Private helper methods

    /**
     * Get all completions for a habit
     */
    private async getAllCompletions(
        habitId: string,
        userId: string,
    ): Promise<HabitCompletion[]> {
        const completionsCollection = getHabitCompletionsCollection();
        const completionsQuery = query(
            completionsCollection,
            where("habitId", "==", habitId),
            where("userId", "==", userId),
        );

        const completionsSnapshot = await getDocs(completionsQuery);
        return filterActiveCompletions(
            completionsSnapshot.docs.map((doc) =>
                transformFirestoreToCompletion(doc.id, doc.data()),
            ),
        ).sort((a, b) => a.completedAt.toMillis() - b.completedAt.toMillis());
    }

    /**
     * Filter completions by date range
     */
    private filterCompletionsByDateRange(
        completions: HabitCompletion[],
        startDate: string,
        endDate: string,
        timezone: string,
    ): HabitCompletion[] {
        return completions.filter((completion) => {
            const completionDate = timestampToDateString(
                completion.completedAt,
                timezone,
            );
            return completionDate >= startDate && completionDate <= endDate;
        });
    }

    /**
     * Calculate completion rate as percentage
     */
    private calculateCompletionRate(
        completions: HabitCompletion[],
        totalDays: number,
        timezone: string,
    ): number {
        if (totalDays <= 0) return 0;

        const uniqueDates = new Set(
            completions.map((completion) =>
                timestampToDateString(completion.completedAt, timezone),
            ),
        );

        return Math.round((uniqueDates.size / totalDays) * 10000) / 100; // Round to 2 decimal places
    }

    /**
     * Calculate the best day of the week based on completion frequency
     */
    private calculateBestDayOfWeek(
        completions: HabitCompletion[],
        timezone: string,
    ): string {
        if (completions.length === 0) return "Monday";

        const dayStats: DayOfWeekStats = {};
        const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];

        // Initialize day stats
        dayNames.forEach((dayName, index) => {
            dayStats[index] = {
                dayName,
                completions: 0,
                totalPossible: 0,
                rate: 0,
            };
        });

        // Count completions by day of week
        completions.forEach((completion) => {
            const completionDate = timestampToDateString(
                completion.completedAt,
                timezone,
            );
            const dayOfWeek = getDayOfWeek(completionDate);
            dayStats[dayOfWeek].completions++;
        });

        // Calculate total possible days for each day of the week
        if (completions.length > 0) {
            const firstCompletion = completions[0];
            const lastCompletion = completions[completions.length - 1];
            const startDate = timestampToDateString(
                firstCompletion.completedAt,
                timezone,
            );
            const endDate = timestampToDateString(
                lastCompletion.completedAt,
                timezone,
            );

            const totalDays = this.calculateDaysBetween(startDate, endDate);
            const weeksSpanned = Math.ceil(totalDays / 7);

            dayNames.forEach((_, index) => {
                dayStats[index].totalPossible = weeksSpanned;
                dayStats[index].rate =
                    dayStats[index].totalPossible > 0
                        ? dayStats[index].completions / dayStats[index].totalPossible
                        : 0;
            });
        }

        // Find the day with the highest completion rate
        let bestDay = dayStats[0];
        Object.values(dayStats).forEach((dayStat) => {
            if (dayStat.rate > bestDay.rate) {
                bestDay = dayStat;
            }
        });

        return bestDay.dayName;
    }

    /**
     * Calculate average streak length from completions
     */
    private async calculateAverageStreakLength(
        habitId: string,
        userId: string,
        completions: HabitCompletion[],
    ): Promise<number> {
        if (completions.length === 0) return 0;

        try {
            // Get current streak data
            const streaksCollection = getHabitStreaksCollection();
            const streakQuery = query(
                streaksCollection,
                where("habitId", "==", habitId),
                where("userId", "==", userId),
            );
            const streakSnapshot = await getDocs(streakQuery);

            if (!streakSnapshot.empty) {
                const streakDoc = streakSnapshot.docs[0];
                const streak = transformFirestoreToStreak(streakDoc.data());

                // Use best streak as a proxy for average (could be enhanced with historical data)
                return streak.bestStreak;
            }

            // Fallback: calculate from completion patterns
            return this.calculateStreakLengthFromCompletions(completions);
        } catch {
            // Fallback calculation if streak data is unavailable
            return this.calculateStreakLengthFromCompletions(completions);
        }
    }

    /**
     * Calculate streak length from completion patterns
     */
    private calculateStreakLengthFromCompletions(
        completions: HabitCompletion[],
    ): number {
        if (completions.length === 0) return 0;

        const timezone = getUserTimezone();
        const completionDates = completions
            .map((completion) =>
                timestampToDateString(completion.completedAt, timezone),
            )
            .sort();

        const uniqueDates = Array.from(new Set(completionDates));

        let streaks: number[] = [];
        let currentStreak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const diffDays = Math.round(
                (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (diffDays === 1) {
                currentStreak++;
            } else {
                streaks.push(currentStreak);
                currentStreak = 1;
            }
        }
        streaks.push(currentStreak);

        const totalStreakDays = streaks.reduce((sum, streak) => sum + streak, 0);
        return Math.round((totalStreakDays / streaks.length) * 100) / 100;
    }

    /**
     * Calculate consistency score based on multiple factors
     */
    private calculateConsistencyScore(
        completions: HabitCompletion[],
        timezone: string,
    ): number {
        if (completions.length === 0) return 0;

        const thirtyDaysAgo = getDateNDaysAgo(30, timezone);
        const recentCompletions = this.filterCompletionsByDateRange(
            completions,
            thirtyDaysAgo,
            getCurrentDateString(timezone),
            timezone,
        );

        // Factor 1: Completion rate (40% weight)
        const completionRate = this.calculateCompletionRate(
            recentCompletions,
            30,
            timezone,
        );
        const completionScore = Math.min(completionRate, 100);

        // Factor 2: Streak consistency (30% weight)
        const streakScore = this.calculateStreakConsistency(
            recentCompletions,
            timezone,
        );

        // Factor 3: Day-of-week consistency (30% weight)
        const dayConsistencyScore = this.calculateDayConsistency(
            recentCompletions,
            timezone,
        );

        // Weighted average
        const overallScore =
            completionScore * 0.4 + streakScore * 0.3 + dayConsistencyScore * 0.3;

        return Math.round(overallScore * 100) / 100;
    }

    /**
     * Calculate streak consistency score
     */
    private calculateStreakConsistency(
        completions: HabitCompletion[],
        timezone: string,
    ): number {
        if (completions.length === 0) return 0;

        const completionDates = completions
            .map((completion) =>
                timestampToDateString(completion.completedAt, timezone),
            )
            .sort();

        const uniqueDates = Array.from(new Set(completionDates));

        if (uniqueDates.length < 2) return 100;

        let consecutiveDays = 0;
        let totalGaps = 0;

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const diffDays = Math.round(
                (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (diffDays === 1) {
                consecutiveDays++;
            } else {
                totalGaps += diffDays - 1;
            }
        }

        const totalPossibleDays = uniqueDates.length - 1;
        const consistencyRatio =
            totalPossibleDays > 0 ? consecutiveDays / totalPossibleDays : 0;

        return Math.min(consistencyRatio * 100, 100);
    }

    /**
     * Calculate day-of-week consistency score
     */
    private calculateDayConsistency(
        completions: HabitCompletion[],
        timezone: string,
    ): number {
        if (completions.length === 0) return 0;

        const dayFrequency: { [key: number]: number } = {};

        completions.forEach((completion) => {
            const completionDate = timestampToDateString(
                completion.completedAt,
                timezone,
            );
            const dayOfWeek = getDayOfWeek(completionDate);
            dayFrequency[dayOfWeek] = (dayFrequency[dayOfWeek] || 0) + 1;
        });

        const frequencies = Object.values(dayFrequency);
        if (frequencies.length === 0) return 0;

        // Calculate coefficient of variation (lower is more consistent)
        const mean =
            frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
        const variance =
            frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) /
            frequencies.length;
        const stdDev = Math.sqrt(variance);

        const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

        // Convert to consistency score (0-100, higher is better)
        return Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
    }

    /**
     * Create empty analytics for habits with no completions
     */
    private createEmptyAnalytics(
        habitId: string,
        userId: string,
    ): HabitAnalytics {
        return {
            habitId,
            userId,
            totalCompletions: 0,
            completionRate30Days: 0,
            averageStreakLength: 0,
            bestDayOfWeek: "Monday",
            consistencyScore: 0,
            lastUpdated: Timestamp.now(),
        };
    }

    /**
     * Store analytics in the database
     */
    private async storeAnalytics(analytics: HabitAnalytics): Promise<void> {
        const analyticsId = `${analytics.userId}_${analytics.habitId}`;
        const analyticsCollection = getHabitAnalyticsCollection();
        const analyticsDocRef = doc(analyticsCollection, analyticsId);

        await runTransaction(db, async (transaction) => {
            const analyticsData = {
                habitId: analytics.habitId,
                userId: analytics.userId,
                totalCompletions: analytics.totalCompletions,
                completionRate30Days: analytics.completionRate30Days,
                averageStreakLength: analytics.averageStreakLength,
                bestDayOfWeek: analytics.bestDayOfWeek,
                consistencyScore: analytics.consistencyScore,
                lastUpdated: serverTimestamp(),
            };

            transaction.set(analyticsDocRef, analyticsData);
        });
    }

    /**
     * Get number of days for a period
     */
    private getPeriodDays(period: "week" | "month" | "quarter" | "year"): number {
        switch (period) {
            case "week":
                return 7;
            case "month":
                return 30;
            case "quarter":
                return 90;
            case "year":
                return 365;
            default:
                return 30;
        }
    }

    /**
     * Get segment size for trend analysis
     */
    private getSegmentSize(
        period: "week" | "month" | "quarter" | "year",
    ): number {
        switch (period) {
            case "week":
                return 1; // Daily segments
            case "month":
                return 7; // Weekly segments
            case "quarter":
                return 30; // Monthly segments
            case "year":
                return 30; // Monthly segments
            default:
                return 7;
        }
    }

    /**
     * Format period label for trends
     */
    private formatPeriodLabel(
        startDate: string,
        endDate: string,
        period: "week" | "month" | "quarter" | "year",
    ): string {
        if (period === "week") {
            return endDate; // Daily labels
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (period === "month") {
            return `Week of ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }

        return `${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short" })}`;
    }

    /**
     * Calculate streak length for a segment
     */
    private calculateSegmentStreakLength(
        completions: HabitCompletion[],
        timezone: string,
    ): number {
        if (completions.length === 0) return 0;

        const completionDates = completions
            .map((completion) =>
                timestampToDateString(completion.completedAt, timezone),
            )
            .sort();

        const uniqueDates = Array.from(new Set(completionDates));

        if (uniqueDates.length < 2) return uniqueDates.length;

        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const diffDays = Math.round(
                (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        return maxStreak;
    }

    /**
     * Calculate days between two date strings
     */
    private calculateDaysBetween(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
