/**
 * Server-side Streak Validation Service
 *
 * Handles server-side validation for all streak calculations to prevent manipulation
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */

import { Timestamp } from "firebase/firestore";
import { HabitCompletion, HabitStreak } from "../../types/habit-streaks";
import {
    formatDateToString,
    getCurrentDateString,
    getUserTimezone,
    timestampToDateString,
} from "../../utils/dateUtils";
import { dataIntegrityService } from "./dataIntegrityService";
import { securityAuditService } from "./securityAuditService";

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    correctedData?: any;
    suspiciousActivity?: boolean;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
    timestamp: Timestamp;
    userId: string;
    action: string;
    entityType: "completion" | "streak" | "analytics";
    entityId: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    validationResult?: ValidationResult;
}

/**
 * Server-side Streak Validation Service
 */
export class StreakValidationService {
    private static readonly MAX_COMPLETIONS_PER_HOUR = 10;
    private static readonly MAX_COMPLETIONS_PER_DAY = 50;
    private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 5;

    /**
     * Validate streak calculation against completion data
     * Requirements: 12.2
     */
    async validateStreakCalculation(
        streak: HabitStreak,
        completions: HabitCompletion[],
        userId: string,
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        let correctedData: HabitStreak | undefined;
        let suspiciousActivity = false;

        try {
            // Validate user ownership
            if (streak.userId !== userId) {
                errors.push("User ID mismatch in streak data");
                suspiciousActivity = true;
            }

            // Validate streak logic against actual completions
            const calculatedStreak = this.calculateStreakFromCompletions(
                completions,
                streak.habitId,
                userId,
            );

            // Check current streak accuracy
            if (Math.abs(streak.currentStreak - calculatedStreak.currentStreak) > 1) {
                warnings.push(
                    `Current streak mismatch: reported ${streak.currentStreak}, calculated ${calculatedStreak.currentStreak}`,
                );
                correctedData = {
                    ...streak,
                    currentStreak: calculatedStreak.currentStreak,
                };
            }

            // Check best streak accuracy (should never decrease)
            if (streak.bestStreak < calculatedStreak.bestStreak) {
                warnings.push(
                    `Best streak should be updated: current ${streak.bestStreak}, calculated ${calculatedStreak.bestStreak}`,
                );
                correctedData = {
                    ...correctedData,
                    bestStreak: calculatedStreak.bestStreak,
                } as HabitStreak;
            }

            // Validate milestone consistency
            const milestoneValidation = this.validateMilestones(streak, completions);
            if (!milestoneValidation.isValid) {
                errors.push(...milestoneValidation.errors);
                warnings.push(...milestoneValidation.warnings);
            }

            // Validate freeze usage
            const freezeValidation = this.validateFreezeUsage(streak);
            if (!freezeValidation.isValid) {
                errors.push(...freezeValidation.errors);
                warnings.push(...freezeValidation.warnings);
            }

            // Check for suspicious patterns
            const suspiciousCheck = await this.detectSuspiciousStreakActivity(
                streak,
                completions,
            );
            if (suspiciousCheck.isSuspicious) {
                suspiciousActivity = true;
                warnings.push(...suspiciousCheck.flags);
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                correctedData,
                suspiciousActivity,
            };
        } catch (error) {
            errors.push(`Validation failed: ${error}`);
            return {
                isValid: false,
                errors,
                warnings,
                suspiciousActivity: true,
            };
        }
    }

    /**
     * Validate completion data before recording
     * Requirements: 12.1, 12.3
     */
    async validateCompletionData(
        completion: Omit<HabitCompletion, "id">,
        userId: string,
        existingCompletions: HabitCompletion[],
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        let suspiciousActivity = false;

        try {
            // Validate user ownership
            if (completion.userId !== userId) {
                errors.push("User ID mismatch in completion data");
                suspiciousActivity = true;
            }

            // Validate timestamp is within acceptable range (Requirements 12.1)
            const now = Timestamp.now();
            const completionTime = completion.completedAt;
            const timeDiff = now.toMillis() - completionTime.toMillis();

            // Allow completions up to 24 hours in the past, but not in the future
            if (timeDiff < 0) {
                errors.push("Completion timestamp is in the future");
                suspiciousActivity = true;
            } else if (timeDiff > 24 * 60 * 60 * 1000) {
                warnings.push("Completion is more than 24 hours old");
            }

            // Validate timezone
            const userTimezone = completion.timezone || getUserTimezone();
            const completionDateString = timestampToDateString(
                completionTime,
                userTimezone,
            );
            const currentDateString = getCurrentDateString(userTimezone);

            if (completionDateString > currentDateString) {
                errors.push("Completion date is in the future");
                suspiciousActivity = true;
            }

            // Check for duplicate completions on the same date
            const sameDay = existingCompletions.filter((comp) => {
                const compDateString = timestampToDateString(
                    comp.completedAt,
                    userTimezone,
                );
                return compDateString === completionDateString;
            });

            if (sameDay.length > 0) {
                errors.push("Completion already exists for this date");
            }

            // Validate difficulty level
            const validDifficulties = ["easy", "medium", "hard"];
            if (!validDifficulties.includes(completion.difficulty)) {
                errors.push("Invalid difficulty level");
            }

            // Check for suspicious completion patterns
            const suspiciousCheck = await this.detectSuspiciousCompletionActivity(
                completion,
                existingCompletions,
            );
            if (suspiciousCheck.isSuspicious) {
                suspiciousActivity = true;
                warnings.push(...suspiciousCheck.flags);
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suspiciousActivity,
            };
        } catch (error) {
            errors.push(`Validation failed: ${error}`);
            return {
                isValid: false,
                errors,
                warnings,
                suspiciousActivity: true,
            };
        }
    }

    /**
     * Validate data integrity before displaying to friends
     * Requirements: 12.4
     */
    async validateDataForFriendDisplay(
        streak: HabitStreak,
        userId: string,
        friendId: string,
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Verify data integrity
            const integrityCheck = await dataIntegrityService.verifyStreakIntegrity(
                streak.habitId,
                userId,
                streak,
            );

            if (!integrityCheck.isValid) {
                errors.push("Data integrity check failed");
                warnings.push(...integrityCheck.errors);
            }

            // Validate that the streak belongs to the user
            if (streak.userId !== userId) {
                errors.push("Streak data ownership mismatch");
            }

            // Check if the data is suitable for friend display
            const displayValidation = this.validateStreakForDisplay(streak);
            if (!displayValidation.isValid) {
                errors.push(...displayValidation.errors);
                warnings.push(...displayValidation.warnings);
            }

            // Log the friend access for audit purposes
            await this.logFriendAccess(userId, friendId, streak.habitId);

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Friend display validation failed: ${error}`);
            return {
                isValid: false,
                errors,
                warnings,
            };
        }
    }

    /**
     * Create audit log entry for data modifications
     * Requirements: 12.5
     */
    async createAuditLog(
        userId: string,
        action: string,
        entityType: "completion" | "streak" | "analytics",
        entityId: string,
        oldData?: any,
        newData?: any,
        validationResult?: ValidationResult,
        metadata?: {
            ipAddress?: string;
            userAgent?: string;
        },
    ): Promise<void> {
        try {
            // Map action to audit event type
            const eventTypeMap: Record<string, any> = {
                completion_recorded: "completion_recorded",
                completion_validation_failed: "completion_validation_failed",
                streak_calculated: "streak_calculated",
                streak_calculation_validation_failed: "streak_validation_failed",
                streak_integrity_check_failed: "streak_integrity_check_failed",
                friend_accessed_streak: "friend_accessed_streak",
                friend_display_validation_failed: "friend_display_validation_failed",
                streak_freeze_used: "streak_freeze_used",
            };

            const eventType = eventTypeMap[action] || action;

            // Use the security audit service for comprehensive logging
            const suspiciousFlags =
                validationResult?.suspiciousActivity &&
                    (validationResult?.warnings?.length ?? 0) > 0
                    ? validationResult.warnings
                    : undefined;

            await securityAuditService.createAuditEntry(
                userId,
                eventType,
                entityType,
                entityId,
                {
                    action,
                    oldData,
                    newData,
                    validationErrors: validationResult?.errors,
                    suspiciousFlags,
                    ipAddress: metadata?.ipAddress,
                    userAgent: metadata?.userAgent,
                    metadata: {
                        validationResult,
                        timestamp: Date.now(),
                    },
                },
            );
        } catch (error) {
            console.error("Failed to create audit log:", error);
            // Don't throw - audit logging failure shouldn't block the operation
        }
    }

    // Private helper methods

    /**
     * Calculate streak from completions (server-side validation)
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
        const completionDates = completions
            .map((comp) => timestampToDateString(comp.completedAt, timezone))
            .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
            .sort();

        // Calculate current streak
        let currentStreak = 0;
        let streakStartDate = "";
        const today = getCurrentDateString(timezone);
        const yesterday = formatDateToString(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            timezone,
        );

        const lastCompletionDate = completionDates[completionDates.length - 1];
        if (lastCompletionDate === today || lastCompletionDate === yesterday) {
            currentStreak = 1;
            streakStartDate = lastCompletionDate;

            // Count backwards for consecutive days
            for (let i = completionDates.length - 2; i >= 0; i--) {
                const currentDate = new Date(completionDates[i + 1]);
                const previousDate = new Date(completionDates[i]);
                const dayDiff =
                    (currentDate.getTime() - previousDate.getTime()) /
                    (1000 * 60 * 60 * 24);

                if (dayDiff === 1) {
                    currentStreak++;
                    streakStartDate = completionDates[i];
                } else {
                    break;
                }
            }
        }

        // Calculate best streak
        let bestStreak = 0;
        let tempStreak = 1;

        for (let i = 1; i < completionDates.length; i++) {
            const currentDate = new Date(completionDates[i]);
            const previousDate = new Date(completionDates[i - 1]);
            const dayDiff =
                (currentDate.getTime() - previousDate.getTime()) /
                (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
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
     * Validate milestone consistency
     */
    private validateMilestones(
        streak: HabitStreak,
        completions: HabitCompletion[],
    ): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check that milestones don't exceed best streak
        const invalidMilestones = streak.milestones.filter(
            (m) => m.days > streak.bestStreak,
        );
        if (invalidMilestones.length > 0) {
            warnings.push(
                `${invalidMilestones.length} milestones exceed best streak`,
            );
        }

        // Check for duplicate milestone days
        const milestoneDays = streak.milestones.map((m) => m.days);
        const uniqueDays = new Set(milestoneDays);
        if (uniqueDays.size !== milestoneDays.length) {
            errors.push("Duplicate milestone days found");
        }

        // Validate milestone timestamps
        const invalidTimestamps = streak.milestones.filter(
            (m) => !m.achievedAt || m.achievedAt.toMillis() > Date.now(),
        );
        if (invalidTimestamps.length > 0) {
            errors.push("Invalid milestone timestamps found");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate freeze usage
     */
    private validateFreezeUsage(streak: HabitStreak): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate freeze counts are non-negative
        if (streak.freezesAvailable < 0 || streak.freezesUsed < 0) {
            errors.push("Freeze counts cannot be negative");
        }

        // Validate freeze usage doesn't exceed theoretical maximum
        const totalFreezesEarned = Math.floor(streak.bestStreak / 30);
        if (streak.freezesUsed > totalFreezesEarned) {
            warnings.push("Freeze usage exceeds theoretical maximum");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Detect suspicious streak activity
     */
    private async detectSuspiciousStreakActivity(
        streak: HabitStreak,
        completions: HabitCompletion[],
    ): Promise<{ isSuspicious: boolean; flags: string[] }> {
        const flags: string[] = [];

        // Check for unrealistic streak growth
        if (streak.currentStreak > completions.length) {
            flags.push("Current streak exceeds total completions");
        }

        // Check for impossible milestone achievements
        const impossibleMilestones = streak.milestones.filter((m) => {
            const completionsAtTime = completions.filter(
                (c) => c.completedAt.toMillis() <= m.achievedAt.toMillis(),
            ).length;
            return m.days > completionsAtTime;
        });

        if (impossibleMilestones.length > 0) {
            flags.push("Milestones achieved without sufficient completions");
        }

        return {
            isSuspicious: flags.length > 0,
            flags,
        };
    }

    /**
     * Detect suspicious completion activity
     */
    private async detectSuspiciousCompletionActivity(
        completion: Omit<HabitCompletion, "id">,
        existingCompletions: HabitCompletion[],
    ): Promise<{ isSuspicious: boolean; flags: string[] }> {
        const flags: string[] = [];

        // Check completion frequency
        const now = Date.now();
        const recentCompletions = existingCompletions.filter(
            (c) => now - c.completedAt.toMillis() < 60 * 60 * 1000, // Last hour
        );

        if (
            recentCompletions.length >=
            StreakValidationService.MAX_COMPLETIONS_PER_HOUR
        ) {
            flags.push("Excessive completions in the last hour");
        }

        const todayCompletions = existingCompletions.filter(
            (c) => now - c.completedAt.toMillis() < 24 * 60 * 60 * 1000, // Last 24 hours
        );

        if (
            todayCompletions.length >= StreakValidationService.MAX_COMPLETIONS_PER_DAY
        ) {
            flags.push("Excessive completions in the last 24 hours");
        }

        // Check for identical timestamps
        const identicalTimestamps = existingCompletions.filter(
            (c) => c.completedAt.toMillis() === completion.completedAt.toMillis(),
        );

        if (identicalTimestamps.length > 0) {
            flags.push("Identical completion timestamps detected");
        }

        return {
            isSuspicious: flags.length > 0,
            flags,
        };
    }

    /**
     * Validate streak data for display to friends
     */
    private validateStreakForDisplay(streak: HabitStreak): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic data validation
        if (!streak.habitId || !streak.userId) {
            errors.push("Missing required streak fields");
        }

        if (streak.currentStreak < 0 || streak.bestStreak < 0) {
            errors.push("Invalid streak values");
        }

        if (streak.currentStreak > streak.bestStreak) {
            warnings.push("Current streak exceeds best streak");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Log friend access for audit purposes
     */
    private async logFriendAccess(
        userId: string,
        friendId: string,
        habitId: string,
    ): Promise<void> {
        try {
            await securityAuditService.createAuditEntry(
                userId,
                "friend_accessed_streak",
                "streak",
                habitId,
                {
                    action: "friend_access",
                    friendId,
                    metadata: {
                        habitId,
                        accessTime: Date.now(),
                    },
                },
            );
        } catch (error) {
            console.error("Failed to log friend access:", error);
        }
    }
}

// Export singleton instance
export const streakValidationService = new StreakValidationService();
