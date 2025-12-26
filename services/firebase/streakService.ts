import {
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
    CalendarDay,
    HabitCompletion,
    HabitStreak,
    MILESTONE_DAYS,
    StreakMilestone,
} from "../../types/habit-streaks";
import {
    areConsecutiveDays,
    formatDateToString,
    generateDateRange,
    getCurrentDateString,
    getUserTimezone,
    isToday,
    parseDateString,
    timestampToDateString,
} from "../../utils/dateUtils";
import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "../../utils/errorHandling";
import {
    getHabitCompletionsCollection,
    getHabitStreaksCollection,
} from "./collections";
import { dataIntegrityService } from "./dataIntegrityService";
import { StreakService as IStreakService } from "./habitStreakInterfaces";
import {
    generateStreakId,
    filterActiveCompletions,
    transformFirestoreToCompletion,
    transformFirestoreToStreak,
    transformStreakToFirestore,
    validateStreakDocument,
    validateUserOwnership,
} from "./habitStreakSchemas";
import { streakValidationService } from "./streakValidationService";
import { syncService } from "./syncService";

/**
 * StreakService Implementation
 *
 * Handles all streak calculation, tracking, and management functionality
 * with timezone awareness and data integrity protection.
 */
export class StreakService implements IStreakService {
    /**
     * Calculate and update streak information for a habit
     * Requirements: 1.1, 1.2, 1.3, 10.2, 12.4
     */
    async calculateStreak(habitId: string, userId: string): Promise<HabitStreak> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Get current streak data
                    const streakId = generateStreakId(userId, habitId);
                    const streaksCollection = getHabitStreaksCollection();
                    const streakDocRef = doc(streaksCollection, streakId);
                    const streakDoc = await transaction.get(streakDocRef);

                    // Get all completions for this habit
                    const completionsCollection = getHabitCompletionsCollection();
                    const completionsQuery = query(
                        completionsCollection,
                        where("habitId", "==", habitId),
                        where("userId", "==", userId),
                    );
                    const completionsSnapshot = await getDocs(completionsQuery);

                    const completions = filterActiveCompletions(
                        completionsSnapshot.docs.map((completionDoc) =>
                            transformFirestoreToCompletion(
                                completionDoc.id,
                                completionDoc.data(),
                            ),
                        ),
                    ).sort(
                        (a, b) => a.completedAt.toMillis() - b.completedAt.toMillis(),
                    );

                    // Calculate streak from completions
                    const calculatedStreak = this.calculateStreakFromCompletions(
                        completions,
                        habitId,
                        userId,
                    );

                    // Merge with existing data if available
                    let existingStreak: HabitStreak | null = null;
                    if (streakDoc.exists()) {
                        existingStreak = transformFirestoreToStreak(streakDoc.data());
                    }

                    const updatedStreak = this.mergeStreakData(
                        calculatedStreak,
                        existingStreak,
                    );

                    // Server-side validation of streak calculation (Requirements 12.2)
                    const validationResult =
                        await streakValidationService.validateStreakCalculation(
                            updatedStreak,
                            completions,
                            userId,
                        );

                    if (!validationResult.isValid) {
                        console.warn(
                            "Streak calculation validation failed:",
                            validationResult.errors,
                        );

                        await streakValidationService.createAuditLog(
                            userId,
                            "streak_calculation_validation_failed",
                            "streak",
                            streakId,
                            existingStreak,
                            updatedStreak,
                            validationResult,
                        );

                        const finalStreak = validationResult.correctedData || updatedStreak;
                        const streakData = transformStreakToFirestore(finalStreak);
                        transaction.set(streakDocRef, streakData);
                        return finalStreak;
                    }

                    // Verify data integrity before saving (Requirements 12.4)
                    const integrityCheck =
                        await dataIntegrityService.verifyStreakIntegrity(
                            habitId,
                            userId,
                            updatedStreak,
                        );

                    if (!integrityCheck.isValid) {
                        console.warn(
                            "Streak integrity issues detected:",
                            integrityCheck.errors,
                        );

                        await streakValidationService.createAuditLog(
                            userId,
                            "streak_integrity_check_failed",
                            "streak",
                            streakId,
                            existingStreak,
                            updatedStreak,
                            {
                                isValid: false,
                                errors: integrityCheck.errors,
                                warnings: integrityCheck.warnings,
                            },
                        );

                        const finalStreak = integrityCheck.correctedData || updatedStreak;
                        const streakData = transformStreakToFirestore(finalStreak);
                        transaction.set(streakDocRef, streakData);
                        return finalStreak;
                    }

                    const streakData = transformStreakToFirestore(updatedStreak);
                    transaction.set(streakDocRef, streakData);

                    await streakValidationService.createAuditLog(
                        userId,
                        "streak_calculated",
                        "streak",
                        streakId,
                        existingStreak,
                        updatedStreak,
                        validationResult,
                    );

                    return updatedStreak;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to calculate streak: ${message}`);
        }
    }

    /**
     * Record a new habit completion and update streak
     * Requirements: 5.1, 12.1, 10.4
     */
    async recordCompletion(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion> {
        if (!completion.habitId || !completion.userId) {
            throw new Error("Habit ID and User ID are required");
        }

        // Get existing completions for validation
        const completionsCollection = getHabitCompletionsCollection();
        const existingCompletionsQuery = query(
            completionsCollection,
            where("habitId", "==", completion.habitId),
            where("userId", "==", completion.userId),
        );
        const existingSnapshot = await getDocs(existingCompletionsQuery);
        const existingCompletions = filterActiveCompletions(
            existingSnapshot.docs.map((doc) =>
                transformFirestoreToCompletion(doc.id, doc.data()),
            ),
        );

        // Server-side validation of completion data (Requirements 12.1, 12.3)
        const validationResult =
            await streakValidationService.validateCompletionData(
                completion,
                completion.userId,
                existingCompletions,
            );

        if (!validationResult.isValid) {
            // Create audit log for validation failure
            await streakValidationService.createAuditLog(
                completion.userId,
                "completion_validation_failed",
                "completion",
                "pending",
                null,
                completion,
                validationResult,
            );

            throw new Error(
                `Completion validation failed: ${validationResult.errors.join(", ")}`,
            );
        }

        // Log suspicious activity if detected
        if (validationResult.suspiciousActivity) {
            console.warn(
                "Suspicious completion activity detected:",
                validationResult.warnings,
            );
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
                    // Double-check for existing completion on the same date
                    const sameDay = existingCompletions.filter((comp) => {
                        const compDateString = timestampToDateString(
                            comp.completedAt,
                            userTimezone,
                        );
                        return compDateString === completionDateString;
                    });

                    if (sameDay.length > 0) {
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

                    // Create audit log for successful completion
                    await streakValidationService.createAuditLog(
                        completion.userId,
                        "completion_recorded",
                        "completion",
                        completionRef.id,
                        null,
                        completionData,
                        validationResult,
                    );

                    // Queue for sync to other devices
                    await syncService.queueOperation({
                        type: "completion",
                        action: "create",
                        data: completionData,
                        userId: completion.userId,
                        habitId: completion.habitId,
                    });

                    return newCompletion;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to record completion: ${message}`);
        }
    }

    /**
     * Record completion and check for milestone achievements
     * This is the main method that should be called when a user completes a habit
     * Requirements: 3.1, 3.2, 5.1
     */
    async recordCompletionWithMilestoneCheck(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<{
        completion: HabitCompletion;
        newMilestones: StreakMilestone[];
        updatedStreak: HabitStreak;
    }> {
        // Record the completion
        const recordedCompletion = await this.recordCompletion(completion);

        // Recalculate streak with the new completion
        const updatedStreak = await this.calculateStreak(
            completion.habitId,
            completion.userId,
        );

        // Check for new milestones
        const newMilestones = await this.checkMilestones(updatedStreak);

        return {
            completion: recordedCompletion,
            newMilestones,
            updatedStreak,
        };
    }

    /**
     * Use a streak freeze to protect from a missed day
     * Requirements: 4.1, 4.2, 4.5
     */
    async useStreakFreeze(
        habitId: string,
        userId: string,
        missedDate: string,
    ): Promise<boolean> {
        if (!habitId || !userId || !missedDate) {
            throw new Error("Habit ID, User ID, and missed date are required");
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    const streakId = generateStreakId(userId, habitId);
                    const streaksCollection = getHabitStreaksCollection();
                    const streakDocRef = doc(streaksCollection, streakId);
                    const streakDoc = await transaction.get(streakDocRef);

                    if (!streakDoc.exists()) {
                        throw new Error("Streak data not found");
                    }

                    const streak = transformFirestoreToStreak(streakDoc.data());

                    // Validate user ownership
                    if (!validateUserOwnership(userId, streak.userId)) {
                        throw new Error("Unauthorized access to streak data");
                    }

                    // Check if freeze is available
                    if (streak.freezesAvailable <= 0) {
                        return false;
                    }

                    // Use the freeze
                    const updatedStreak: HabitStreak = {
                        ...streak,
                        freezesAvailable: streak.freezesAvailable - 1,
                        freezesUsed: streak.freezesUsed + 1,
                    };

                    // Create a "protected" completion record for the missed date
                    const protectedCompletion = {
                        habitId,
                        userId,
                        completedAt: Timestamp.fromDate(parseDateString(missedDate)),
                        timezone: getUserTimezone(),
                        notes: "Protected by streak freeze",
                        difficulty: "easy" as const,
                        createdAt: serverTimestamp(),
                    };

                    const completionsCollection = getHabitCompletionsCollection();
                    const completionRef = doc(completionsCollection);
                    transaction.set(completionRef, protectedCompletion);

                    // Update streak data
                    const streakData = transformStreakToFirestore(updatedStreak);
                    transaction.set(streakDocRef, streakData);

                    return true;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to use streak freeze: ${message}`);
        }
    }

    /**
     * Get calendar data for a habit showing completion status
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    async getHabitCalendar(
        habitId: string,
        userId: string,
        days: number,
        timezone: string,
    ): Promise<CalendarDay[]> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            return await retryWithBackoff(async () => {
                // Get date range for calendar
                const endDate = getCurrentDateString(timezone);
                const startDate = formatDateToString(
                    new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000),
                    timezone,
                );

                // Get completions for the date range
                const completionsCollection = getHabitCompletionsCollection();
                const completionsQuery = query(
                    completionsCollection,
                    where("habitId", "==", habitId),
                    where("userId", "==", userId),
                );
                const completionsSnapshot = await getDocs(completionsQuery);

                const completions = filterActiveCompletions(
                    completionsSnapshot.docs.map((doc) =>
                        transformFirestoreToCompletion(doc.id, doc.data()),
                    ),
                ).filter((completion) => {
                        const compDateString = timestampToDateString(
                            completion.completedAt,
                            timezone,
                        );
                        return compDateString >= startDate && compDateString <= endDate;
                    });

                // Get streak data for highlighting
                const streak = await this.getHabitStreak(habitId, userId);

                // Generate calendar days
                const dateRange = generateDateRange(startDate, endDate);
                const calendarDays: CalendarDay[] = dateRange.map((date) => {
                    const completion = completions.find(
                        (comp) =>
                            timestampToDateString(comp.completedAt, timezone) === date,
                    );

                    const isInStreak = this.isDateInCurrentStreak(date, streak);

                    return {
                        date,
                        completed: !!completion,
                        isToday: isToday(date, timezone),
                        isInStreak,
                        completionTime: completion
                            ? completion.completedAt.toDate().toLocaleTimeString()
                            : undefined,
                        notes: completion?.notes,
                    };
                });

                return calendarDays;
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get habit calendar: ${message}`);
        }
    }

    /**
     * Check for new milestones and return any that should be celebrated
     * Requirements: 3.1, 3.2, 4.4, 11.2
     */
    async checkMilestones(streak: HabitStreak): Promise<StreakMilestone[]> {
        const newMilestones: StreakMilestone[] = [];
        const existingMilestoneDays = streak.milestones.map((m) => m.days);

        for (const milestoneDay of MILESTONE_DAYS) {
            if (
                streak.currentStreak >= milestoneDay &&
                !existingMilestoneDays.includes(milestoneDay)
            ) {
                const milestone: StreakMilestone = {
                    days: milestoneDay,
                    achievedAt: Timestamp.now(),
                    celebrated: false,
                };
                newMilestones.push(milestone);

                // Award streak freeze for 30-day milestones (Requirement 4.4)
                if (milestoneDay === 30) {
                    streak.freezesAvailable += 1;
                }
            }
        }

        // Update streak with new milestones
        if (newMilestones.length > 0) {
            const updatedStreak: HabitStreak = {
                ...streak,
                milestones: [...streak.milestones, ...newMilestones],
                // Update freezes if 30-day milestone was achieved
                freezesAvailable: streak.freezesAvailable,
            };

            const streakId = generateStreakId(streak.userId, streak.habitId);
            const streaksCollection = getHabitStreaksCollection();
            const streakDocRef = doc(streaksCollection, streakId);
            const streakData = transformStreakToFirestore(updatedStreak);

            await runTransaction(db, async (transaction) => {
                transaction.set(streakDocRef, streakData);
            });

            // Send milestone notifications for new milestones
            // Requirements: 11.2
            for (const milestone of newMilestones) {
                try {
                    const habitName = await this.getHabitName(streak.habitId);
                    // Note: Notification service integration would be added here
                    console.log(
                        `Milestone achieved: ${milestone.days} days for ${habitName}`,
                    );
                } catch (error) {
                    console.error("Error logging milestone achievement:", error);
                    // Don't throw - milestone was achieved successfully
                }
            }
        }

        return newMilestones;
    }

    /**
     * Get streak information for a specific habit
     */
    async getHabitStreak(
        habitId: string,
        userId: string,
    ): Promise<HabitStreak | null> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        try {
            const streakId = generateStreakId(userId, habitId);
            const streaksCollection = getHabitStreaksCollection();
            const streakDocRef = doc(streaksCollection, streakId);
            const streakDoc = await getDoc(streakDocRef);

            if (!streakDoc.exists()) {
                return null;
            }

            const streakData = streakDoc.data();
            if (!validateStreakDocument(streakData)) {
                throw new Error("Invalid streak data format");
            }

            return transformFirestoreToStreak(streakData);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get habit streak: ${message}`);
        }
    }

    /**
     * Get streak information for friend display with integrity verification
     * Requirements: 12.4
     */
    async getHabitStreakForFriend(
        habitId: string,
        userId: string,
        friendId: string,
    ): Promise<HabitStreak | null> {
        if (!habitId || !userId || !friendId) {
            throw new Error("Habit ID, User ID, and Friend ID are required");
        }

        try {
            const streak = await this.getHabitStreak(habitId, userId);

            if (!streak) {
                return null;
            }

            // Validate data integrity before displaying to friend (Requirements 12.4)
            const validationResult =
                await streakValidationService.validateDataForFriendDisplay(
                    streak,
                    userId,
                    friendId,
                );

            if (!validationResult.isValid) {
                console.warn(
                    "Streak data failed friend display validation:",
                    validationResult.errors,
                );

                // Create audit log for failed friend access
                await streakValidationService.createAuditLog(
                    userId,
                    "friend_display_validation_failed",
                    "streak",
                    generateStreakId(userId, habitId),
                    null,
                    streak,
                    validationResult,
                );

                // Don't show invalid data to friends
                return null;
            }

            // Create audit log for successful friend access
            await streakValidationService.createAuditLog(
                userId,
                "friend_accessed_streak",
                "streak",
                generateStreakId(userId, habitId),
                null,
                { friendId, habitId },
                validationResult,
            );

            return streak;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get habit streak for friend: ${message}`);
        }
    }

    /**
     * Initialize streak data for a new habit
     */
    async initializeHabitStreak(
        habitId: string,
        userId: string,
    ): Promise<HabitStreak> {
        if (!habitId || !userId) {
            throw new Error("Habit ID and User ID are required");
        }

        const currentDate = getCurrentDateString(getUserTimezone());
        const initialStreak: HabitStreak = {
            habitId,
            userId,
            currentStreak: 0,
            bestStreak: 0,
            lastCompletionDate: "",
            streakStartDate: currentDate,
            freezesAvailable: 0,
            freezesUsed: 0,
            milestones: [],
        };

        try {
            const streakId = generateStreakId(userId, habitId);
            const streaksCollection = getHabitStreaksCollection();
            const streakDocRef = doc(streaksCollection, streakId);
            const streakData = transformStreakToFirestore(initialStreak);

            await runTransaction(db, async (transaction) => {
                transaction.set(streakDocRef, streakData);
            });

            return initialStreak;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to initialize habit streak: ${message}`);
        }
    }

    /**
     * Reset a streak (used when streak is broken and no freeze available)
     * Requirements: 1.2, 11.3
     */
    async resetStreak(
        habitId: string,
        userId: string,
        resetDate: string,
    ): Promise<HabitStreak> {
        if (!habitId || !userId || !resetDate) {
            throw new Error("Habit ID, User ID, and reset date are required");
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    const streakId = generateStreakId(userId, habitId);
                    const streaksCollection = getHabitStreaksCollection();
                    const streakDocRef = doc(streaksCollection, streakId);
                    const streakDoc = await transaction.get(streakDocRef);

                    if (!streakDoc.exists()) {
                        throw new Error("Streak data not found");
                    }

                    const streak = transformFirestoreToStreak(streakDoc.data());

                    // Validate user ownership
                    if (!validateUserOwnership(userId, streak.userId)) {
                        throw new Error("Unauthorized access to streak data");
                    }

                    const resetStreak: HabitStreak = {
                        ...streak,
                        currentStreak: 0,
                        lastCompletionDate: "",
                        streakStartDate: resetDate,
                    };

                    const streakData = transformStreakToFirestore(resetStreak);
                    transaction.set(streakDocRef, streakData);

                    // Send recovery notification after streak is broken
                    // Requirements: 11.3
                    try {
                        const habitName = await this.getHabitName(habitId);
                        // Schedule recovery notification for tomorrow (handled by Cloud Functions)
                        // The notification will be sent by the scheduled function
                        console.log(
                            `Streak broken for ${habitName}, recovery notification will be scheduled`,
                        );
                    } catch (error) {
                        console.error("Error scheduling recovery notification:", error);
                        // Don't throw - streak reset was successful
                    }

                    return resetStreak;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to reset streak: ${message}`);
        }
    }

    // Private helper methods

    /**
     * Calculate streak from completion records
     */
    private calculateStreakFromCompletions(
        completions: HabitCompletion[],
        habitId: string,
        userId: string,
    ): HabitStreak {
        if (completions.length === 0) {
            return {
                habitId,
                userId,
                currentStreak: 0,
                bestStreak: 0,
                lastCompletionDate: "",
                streakStartDate: getCurrentDateString(getUserTimezone()),
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            };
        }

        const timezone = completions[0]?.timezone || getUserTimezone();
        const completionDates = completions.map((comp) =>
            timestampToDateString(comp.completedAt, timezone),
        );

        // Remove duplicates and sort
        const uniqueDates = Array.from(new Set(completionDates)).sort();

        // Calculate current streak (from most recent completion backwards)
        let currentStreak = 0;
        let streakStartDate = "";
        const today = getCurrentDateString(timezone);
        const yesterday = formatDateToString(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            timezone,
        );

        // Check if there's a completion today or yesterday to start counting
        const lastCompletionDate = uniqueDates[uniqueDates.length - 1];
        if (lastCompletionDate === today || lastCompletionDate === yesterday) {
            currentStreak = 1;
            streakStartDate = lastCompletionDate;

            // Count backwards for consecutive days
            for (let i = uniqueDates.length - 2; i >= 0; i--) {
                const currentDate = uniqueDates[i + 1];
                const previousDate = uniqueDates[i];

                if (areConsecutiveDays(previousDate, currentDate)) {
                    currentStreak++;
                    streakStartDate = previousDate;
                } else {
                    break;
                }
            }
        }

        // Calculate best streak (longest consecutive sequence)
        let bestStreak = 0;
        let tempStreak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
            if (areConsecutiveDays(uniqueDates[i - 1], uniqueDates[i])) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

        return {
            habitId,
            userId,
            currentStreak,
            bestStreak,
            lastCompletionDate,
            streakStartDate,
            freezesAvailable: 0,
            freezesUsed: 0,
            milestones: [],
        };
    }

    /**
     * Merge calculated streak with existing streak data
     */
    private mergeStreakData(
        calculated: HabitStreak,
        existing: HabitStreak | null,
    ): HabitStreak {
        if (!existing) {
            return calculated;
        }

        return {
            ...calculated,
            freezesAvailable: existing.freezesAvailable,
            freezesUsed: existing.freezesUsed,
            milestones: existing.milestones,
            // Ensure best streak never decreases
            bestStreak: Math.max(calculated.bestStreak, existing.bestStreak),
        };
    }

    private async getHabitName(habitId: string): Promise<string> {
        try {
            // Assuming habits are stored in the goals collection
            const goalRef = doc(
                db,
                `artifacts/oath-app/public/data/goals/${habitId}`,
            );
            const goalDoc = await getDoc(goalRef);

            if (goalDoc.exists()) {
                const goalData = goalDoc.data();
                return goalData.description || "Your habit";
            }

            return "Your habit";
        } catch (error) {
            console.error("Error getting habit name:", error);
            return "Your habit";
        }
    }

    /**
     * Check if a date is within the current streak period
     */
    private isDateInCurrentStreak(
        date: string,
        streak: HabitStreak | null,
    ): boolean {
        if (!streak || streak.currentStreak === 0 || !streak.streakStartDate) {
            return false;
        }

        const streakStart = parseDateString(streak.streakStartDate);
        const checkDate = parseDateString(date);
        const streakEnd = new Date(streakStart);
        streakEnd.setDate(streakEnd.getDate() + streak.currentStreak - 1);

        return checkDate >= streakStart && checkDate <= streakEnd;
    }
}

// Export singleton instance
export const streakService = new StreakService();
