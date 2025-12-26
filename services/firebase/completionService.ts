import {
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { HabitCompletion } from "../../types/habit-streaks";
import {
    formatDateToString,
    getCurrentDateString,
    getDayName,
    getUserTimezone,
    timestampToDateString,
} from "../../utils/dateUtils";
import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "../../utils/errorHandling";
import { getHabitCompletionsCollection } from "./collections";
import {
    transformFirestoreToCompletion,
    validateUserOwnership,
} from "./habitStreakSchemas";

/**
 * Completion tracking interfaces and types
 */
export interface CompletionHistory {
    completions: HabitCompletion[];
    totalCount: number;
    completionRate: number;
    period: string;
}

export interface CompletionRate {
    period: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    completedDays: number;
    rate: number; // Percentage (0-100)
}

export interface GroupedCompletions {
    weekly: WeeklyGroup[];
    monthly: MonthlyGroup[];
}

export interface WeeklyGroup {
    weekStart: string; // YYYY-MM-DD format (Monday)
    weekEnd: string; // YYYY-MM-DD format (Sunday)
    completions: HabitCompletion[];
    completionCount: number;
    completionRate: number; // Percentage for that week
}

export interface MonthlyGroup {
    month: string; // YYYY-MM format
    monthName: string; // "January 2024"
    completions: HabitCompletion[];
    completionCount: number;
    completionRate: number; // Percentage for that month
}

export interface CompletionDetail {
    completion: HabitCompletion;
    dayOfWeek: string;
    timeOfDay: string;
    relativeTime: string; // "2 days ago", "Today", etc.
}

/**
 * CompletionService Implementation
 *
 * Handles habit completion tracking, history storage and retrieval,
 * completion rate calculations, and grouping logic for analytics.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1
 */
export class CompletionService {
    /**
     * Record a new habit completion with timestamp validation
     * Requirements: 5.1, 12.1
     */
    async recordCompletion(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion> {
        if (!completion.habitId || !completion.userId) {
            throw new Error("Habit ID and User ID are required");
        }

        // Validate timezone-aware completion
        const userTimezone = completion.timezone || getUserTimezone();
        const completionDateString = timestampToDateString(
            completion.completedAt,
            userTimezone,
        );
        const currentDateString = getCurrentDateString(userTimezone);

        // Ensure completion is for current day or earlier (prevent future completions)
        if (completionDateString > currentDateString) {
            throw new Error("Cannot record completions for future dates");
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Check for existing completion on the same date
                    const completionsCollection = getHabitCompletionsCollection();
                    const existingCompletionsQuery = query(
                        completionsCollection,
                        where("habitId", "==", completion.habitId),
                        where("userId", "==", completion.userId),
                    );
                    const existingSnapshot = await getDocs(existingCompletionsQuery);

                    const existingCompletions = existingSnapshot.docs
                        .map((doc) => transformFirestoreToCompletion(doc.id, doc.data()))
                        .filter((comp) => {
                            const compDateString = timestampToDateString(
                                comp.completedAt,
                                userTimezone,
                            );
                            return compDateString === completionDateString;
                        });

                    if (existingCompletions.length > 0) {
                        throw new Error("Habit already completed for this date");
                    }

                    // Create completion record with metadata
                    const completionData = {
                        habitId: completion.habitId,
                        userId: completion.userId,
                        completedAt: completion.completedAt,
                        timezone: userTimezone,
                        notes: completion.notes || "",
                        difficulty: completion.difficulty,
                        createdAt: serverTimestamp(),
                    };

            const completionRef = doc(completionsCollection);
            transaction.set(completionRef, completionData);

                    const newCompletion: HabitCompletion = {
                        id: completionRef.id,
                        ...completion,
                        timezone: userTimezone,
                    };

            return newCompletion;
        });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to record completion: ${message}`);
        }
    }

    /**
     * Revert a completion by toggling its isActive flag so it no longer counts.
     */
    async revertCompletionById(completionId: string): Promise<void> {
        if (!completionId) {
            throw new Error("Completion ID is required");
        }

        try {
            const completionDocRef = doc(
                getHabitCompletionsCollection(),
                completionId,
            );
            const completionDoc = await getDoc(completionDocRef);
            if (!completionDoc.exists()) {
                throw new Error("Completion document not found");
            }

            await updateDoc(completionDocRef, {
                isActive: false,
                revertedAt: serverTimestamp(),
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to revert completion: ${message}`);
        }
    }

    /**
     * Get completion history for a habit with pagination
     * Requirements: 5.2, 5.4
     */
    async getCompletionHistory(
        habitId: string,
        userId: string,
        limit: number = 50,
        startAfter?: Timestamp,
    ): Promise<CompletionHistory> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                const completionsCollection = getHabitCompletionsCollection();
                let completionsQuery = query(
                    completionsCollection,
                    where("habitId", "==", habitId),
                    where("userId", "==", userId),
                    orderBy("completedAt", "desc"),
                );

                // Add pagination if startAfter is provided
                if (startAfter) {
                    completionsQuery = query(
                        completionsQuery,
                        where("completedAt", "<", startAfter),
                    );
                }

                const completionsSnapshot = await getDocs(completionsQuery);
                const completions = completionsSnapshot.docs
                    .slice(0, limit)
                    .map((doc) => transformFirestoreToCompletion(doc.id, doc.data()));

                // Calculate completion rate for the period
                const totalCount = completions.length;
                const period = this.calculatePeriodFromCompletions(completions);
                const completionRate = await this.calculateCompletionRate(
                    habitId,
                    userId,
                    period.startDate,
                    period.endDate,
                );

                return {
                    completions,
                    totalCount,
                    completionRate: completionRate.rate,
                    period: period.description,
                };
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get completion history: ${message}`);
        }
    }

    /**
     * Calculate completion rate for a specific time period
     * Requirements: 5.3, 5.5
     */
    async calculateCompletionRate(
        habitId: string,
        userId: string,
        startDate: string,
        endDate: string,
    ): Promise<CompletionRate> {
        if (!habitId || !userId || !startDate || !endDate) {
            throw new Error(
                "All parameters are required for completion rate calculation",
            );
        }

        try {
            return await retryWithBackoff(async () => {
                const completionsCollection = getHabitCompletionsCollection();
                const completionsQuery = query(
                    completionsCollection,
                    where("habitId", "==", habitId),
                    where("userId", "==", userId),
                );

                const completionsSnapshot = await getDocs(completionsQuery);
                const allCompletions = completionsSnapshot.docs.map((doc) =>
                    transformFirestoreToCompletion(doc.id, doc.data()),
                );

                // Filter completions within the date range
                const timezone = getUserTimezone();
                const completionsInRange = allCompletions.filter((completion) => {
                    const completionDate = timestampToDateString(
                        completion.completedAt,
                        timezone,
                    );
                    return completionDate >= startDate && completionDate <= endDate;
                });

                // Calculate total days in the period
                const start = new Date(startDate);
                const end = new Date(endDate);
                const totalDays =
                    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
                    1;

                // Get unique completion dates
                const uniqueCompletionDates = new Set(
                    completionsInRange.map((completion) =>
                        timestampToDateString(completion.completedAt, timezone),
                    ),
                );

                const completedDays = uniqueCompletionDates.size;
                const rate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

                return {
                    period: `${startDate} to ${endDate}`,
                    startDate,
                    endDate,
                    totalDays,
                    completedDays,
                    rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
                };
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to calculate completion rate: ${message}`);
        }
    }

    /**
     * Get completions grouped by weekly and monthly periods
     * Requirements: 5.2
     */
    async getGroupedCompletions(
        habitId: string,
        userId: string,
        months: number = 6,
    ): Promise<GroupedCompletions> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                const timezone = getUserTimezone();
                const endDate = getCurrentDateString(timezone);
                const startDate = formatDateToString(
                    new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
                    timezone,
                );

                // Get all completions in the period
                const completionsCollection = getHabitCompletionsCollection();
                const completionsQuery = query(
                    completionsCollection,
                    where("habitId", "==", habitId),
                    where("userId", "==", userId),
                    orderBy("completedAt", "desc"),
                );

                const completionsSnapshot = await getDocs(completionsQuery);
                const allCompletions = completionsSnapshot.docs
                    .map((doc) => transformFirestoreToCompletion(doc.id, doc.data()))
                    .filter((completion) => {
                        const completionDate = timestampToDateString(
                            completion.completedAt,
                            timezone,
                        );
                        return completionDate >= startDate && completionDate <= endDate;
                    });

                // Group by weeks and months
                const weeklyGroups = this.groupCompletionsByWeek(
                    allCompletions,
                    timezone,
                );
                const monthlyGroups = this.groupCompletionsByMonth(
                    allCompletions,
                    timezone,
                );

                return {
                    weekly: weeklyGroups,
                    monthly: monthlyGroups,
                };
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get grouped completions: ${message}`);
        }
    }

    /**
     * Get detailed information about a specific completion
     * Requirements: 5.4
     */
    async getCompletionDetail(
        completionId: string,
        userId: string,
    ): Promise<CompletionDetail> {
        if (!completionId || !userId) {
            throw new Error("Completion ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                const completionsCollection = getHabitCompletionsCollection();
                const completionDoc = await getDocs(
                    query(completionsCollection, where("__name__", "==", completionId)),
                );

                if (completionDoc.empty) {
                    throw new Error("Completion not found");
                }

                const completionData = completionDoc.docs[0].data();
                const completion = transformFirestoreToCompletion(
                    completionDoc.docs[0].id,
                    completionData,
                );

                // Validate user ownership
                if (!validateUserOwnership(userId, completion.userId)) {
                    throw new Error("Unauthorized access to completion data");
                }

                const timezone = completion.timezone || getUserTimezone();
                const completionDate = timestampToDateString(
                    completion.completedAt,
                    timezone,
                );

                return {
                    completion,
                    dayOfWeek: getDayName(completionDate),
                    timeOfDay: completion.completedAt.toDate().toLocaleTimeString(),
                    relativeTime: this.getRelativeTimeString(completion.completedAt),
                };
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get completion detail: ${message}`);
        }
    }

    /**
     * Get completion statistics for multiple time periods
     * Requirements: 5.3, 5.5
     */
    async getCompletionStatistics(
        habitId: string,
        userId: string,
    ): Promise<{
        weekly: CompletionRate;
        monthly: CompletionRate;
        quarterly: CompletionRate;
        allTime: CompletionRate;
    }> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            const timezone = getUserTimezone();
            const today = getCurrentDateString(timezone);

            // Calculate different time periods
            const weekStart = formatDateToString(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                timezone,
            );
            const monthStart = formatDateToString(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                timezone,
            );
            const quarterStart = formatDateToString(
                new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                timezone,
            );

            // Get the first completion date for all-time calculation
            const firstCompletion = await this.getFirstCompletion(habitId, userId);
            const allTimeStart = firstCompletion
                ? timestampToDateString(firstCompletion.completedAt, timezone)
                : today;

            // Calculate rates for all periods
            const [weekly, monthly, quarterly, allTime] = await Promise.all([
                this.calculateCompletionRate(habitId, userId, weekStart, today),
                this.calculateCompletionRate(habitId, userId, monthStart, today),
                this.calculateCompletionRate(habitId, userId, quarterStart, today),
                this.calculateCompletionRate(habitId, userId, allTimeStart, today),
            ]);

            return {
                weekly,
                monthly,
                quarterly,
                allTime,
            };
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get completion statistics: ${message}`);
        }
    }

    // Private helper methods

    /**
     * Group completions by week (Monday to Sunday)
     */
    private groupCompletionsByWeek(
        completions: HabitCompletion[],
        timezone: string,
    ): WeeklyGroup[] {
        const weekGroups = new Map<string, HabitCompletion[]>();

        completions.forEach((completion) => {
            const completionDate = timestampToDateString(
                completion.completedAt,
                timezone,
            );
            const weekStart = this.getWeekStart(completionDate);
            const weekKey = weekStart;

            if (!weekGroups.has(weekKey)) {
                weekGroups.set(weekKey, []);
            }
            weekGroups.get(weekKey)!.push(completion);
        });

        return Array.from(weekGroups.entries())
            .map(([weekStart, weekCompletions]) => {
                const weekEnd = this.getWeekEnd(weekStart);
                const uniqueDates = new Set(
                    weekCompletions.map((c) =>
                        timestampToDateString(c.completedAt, timezone),
                    ),
                );

                return {
                    weekStart,
                    weekEnd,
                    completions: weekCompletions,
                    completionCount: weekCompletions.length,
                    completionRate: (uniqueDates.size / 7) * 100, // 7 days in a week
                };
            })
            .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    }

    /**
     * Group completions by month
     */
    private groupCompletionsByMonth(
        completions: HabitCompletion[],
        timezone: string,
    ): MonthlyGroup[] {
        const monthGroups = new Map<string, HabitCompletion[]>();

        completions.forEach((completion) => {
            const completionDate = timestampToDateString(
                completion.completedAt,
                timezone,
            );
            const monthKey = completionDate.substring(0, 7); // YYYY-MM

            if (!monthGroups.has(monthKey)) {
                monthGroups.set(monthKey, []);
            }
            monthGroups.get(monthKey)!.push(completion);
        });

        return Array.from(monthGroups.entries())
            .map(([month, monthCompletions]) => {
                const [year, monthNum] = month.split("-");
                const monthName = new Date(
                    parseInt(year),
                    parseInt(monthNum) - 1,
                    1,
                ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

                const daysInMonth = new Date(
                    parseInt(year),
                    parseInt(monthNum),
                    0,
                ).getDate();
                const uniqueDates = new Set(
                    monthCompletions.map((c) =>
                        timestampToDateString(c.completedAt, timezone),
                    ),
                );

                return {
                    month,
                    monthName,
                    completions: monthCompletions,
                    completionCount: monthCompletions.length,
                    completionRate: (uniqueDates.size / daysInMonth) * 100,
                };
            })
            .sort((a, b) => b.month.localeCompare(a.month));
    }

    /**
     * Get the Monday of the week for a given date
     */
    private getWeekStart(dateString: string): string {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1

        const monday = new Date(date);
        monday.setDate(date.getDate() - daysToMonday);

        return formatDateToString(monday);
    }

    /**
     * Get the Sunday of the week for a given Monday
     */
    private getWeekEnd(weekStart: string): string {
        const monday = new Date(weekStart);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return formatDateToString(sunday);
    }

    /**
     * Calculate period description from completions
     */
    private calculatePeriodFromCompletions(completions: HabitCompletion[]): {
        startDate: string;
        endDate: string;
        description: string;
    } {
        if (completions.length === 0) {
            const today = getCurrentDateString();
            return {
                startDate: today,
                endDate: today,
                description: "No completions",
            };
        }

        const timezone = getUserTimezone();
        const dates = completions
            .map((c) => timestampToDateString(c.completedAt, timezone))
            .sort();

        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        return {
            startDate,
            endDate,
            description: `${startDate} to ${endDate}`,
        };
    }

    /**
     * Get relative time string for a timestamp
     */
    private getRelativeTimeString(timestamp: Timestamp): string {
        const now = new Date();
        const completionDate = timestamp.toDate();
        const diffMs = now.getTime() - completionDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return "Today";
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return months === 1 ? "1 month ago" : `${months} months ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return years === 1 ? "1 year ago" : `${years} years ago`;
        }
    }

    /**
     * Get the first completion for a habit
     */
    private async getFirstCompletion(
        habitId: string,
        userId: string,
    ): Promise<HabitCompletion | null> {
        try {
            const completionsCollection = getHabitCompletionsCollection();
            const firstCompletionQuery = query(
                completionsCollection,
                where("habitId", "==", habitId),
                where("userId", "==", userId),
                orderBy("completedAt", "asc"),
            );

            const snapshot = await getDocs(firstCompletionQuery);
            if (snapshot.empty) {
                return null;
            }

            const firstDoc = snapshot.docs[0];
            return transformFirestoreToCompletion(firstDoc.id, firstDoc.data());
        } catch {
            return null; // Return null if there's an error getting first completion
        }
    }
}

// Export singleton instance
export const completionService = new CompletionService();
