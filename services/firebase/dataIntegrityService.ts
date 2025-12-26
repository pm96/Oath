/**
 * Data Integrity Service
 *
 * Handles data validation, integrity checks, and corruption detection
 * Requirements: 12.4, 12.5
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { HabitCompletion, HabitStreak } from "../../types/habit-streaks";
import {
    getHabitCompletionsCollection,
    getHabitStreaksCollection,
} from "./collections";
import {
    generateStreakId,
    transformFirestoreToCompletion,
    transformFirestoreToStreak,
    validateStreakDocument,
    validateUserOwnership,
} from "./habitStreakSchemas";

/**
 * Integrity check result
 */
export interface IntegrityCheckResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    correctedData?: any;
}

/**
 * Data validation rules
 */
export interface ValidationRule<T> {
    name: string;
    validate: (data: T) => boolean;
    errorMessage: string;
}

/**
 * Data Integrity Service Implementation
 */
export class DataIntegrityService {
    private static readonly INTEGRITY_LOG_KEY = "@integrity_checks_log";
    private static readonly MAX_LOG_ENTRIES = 100;

    /**
     * Verify streak data integrity before display
     * Requirements: 12.4
     */
    async verifyStreakIntegrity(
        habitId: string,
        userId: string,
        streakData?: HabitStreak,
    ): Promise<IntegrityCheckResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        let correctedData: HabitStreak | undefined;

        try {
            // Get streak data if not provided
            let streak = streakData;
            if (!streak) {
                const streakId = generateStreakId(userId, habitId);
                const streaksCollection = getHabitStreaksCollection();
                const streakDoc = await getDoc(doc(streaksCollection, streakId));

                if (!streakDoc.exists()) {
                    errors.push("Streak document not found");
                    return { isValid: false, errors, warnings };
                }

                streak = transformFirestoreToStreak(streakDoc.data());
            }

            // Validate user ownership
            if (!validateUserOwnership(userId, streak.userId)) {
                errors.push("User ownership validation failed");
            }

            // Validate streak document structure
            if (!validateStreakDocument(streak)) {
                errors.push("Streak document structure is invalid");
            }

            // Validate streak logic
            const streakValidation = this.validateStreakLogic(streak);
            if (!streakValidation.isValid) {
                errors.push(...streakValidation.errors);
                warnings.push(...streakValidation.warnings);
                correctedData = streakValidation.correctedData;
            }

            // Validate milestone consistency
            const milestoneValidation = this.validateMilestones(streak);
            if (!milestoneValidation.isValid) {
                errors.push(...milestoneValidation.errors);
                warnings.push(...milestoneValidation.warnings);
            }

            // Log integrity check
            await this.logIntegrityCheck(
                "streak",
                habitId,
                userId,
                errors.length === 0,
            );

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                correctedData,
            };
        } catch (error) {
            errors.push(`Integrity check failed: ${error}`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Verify completion data integrity
     * Requirements: 12.4
     */
    async verifyCompletionIntegrity(
        completionId: string,
        userId: string,
        completionData?: HabitCompletion,
    ): Promise<IntegrityCheckResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Get completion data if not provided
            let completion = completionData;
            if (!completion) {
                const completionsCollection = getHabitCompletionsCollection();
                const completionDoc = await getDoc(
                    doc(completionsCollection, completionId),
                );

                if (!completionDoc.exists()) {
                    errors.push("Completion document not found");
                    return { isValid: false, errors, warnings };
                }

                completion = transformFirestoreToCompletion(
                    completionId,
                    completionDoc.data(),
                );
            }

            // Validate user ownership
            if (!validateUserOwnership(userId, completion.userId)) {
                errors.push("User ownership validation failed");
            }

            // Validate completion data
            const completionValidation = this.validateCompletionData(completion);
            if (!completionValidation.isValid) {
                errors.push(...completionValidation.errors);
                warnings.push(...completionValidation.warnings);
            }

            // Log integrity check
            await this.logIntegrityCheck(
                "completion",
                completionId,
                userId,
                errors.length === 0,
            );

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            errors.push(`Integrity check failed: ${error}`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Validate streak logic and consistency
     */
    private validateStreakLogic(streak: HabitStreak): IntegrityCheckResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        let correctedData: HabitStreak | undefined;

        // Rule 1: Current streak should not exceed best streak
        if (streak.currentStreak > streak.bestStreak) {
            warnings.push(
                "Current streak exceeds best streak - correcting best streak",
            );
            correctedData = {
                ...streak,
                bestStreak: streak.currentStreak,
            };
        }

        // Rule 2: Streak values should be non-negative
        if (streak.currentStreak < 0 || streak.bestStreak < 0) {
            errors.push("Streak values cannot be negative");
        }

        // Rule 3: Freeze counts should be non-negative
        if (streak.freezesAvailable < 0 || streak.freezesUsed < 0) {
            errors.push("Freeze counts cannot be negative");
        }

        // Rule 4: Used freezes should not exceed available + used total
        const totalFreezesEarned = Math.floor(streak.bestStreak / 30); // Assuming 1 freeze per 30 days
        if (streak.freezesUsed > totalFreezesEarned) {
            warnings.push(
                "Freeze usage exceeds theoretical maximum based on milestones",
            );
        }

        // Rule 5: Validate date formats
        if (
            streak.lastCompletionDate &&
            !this.isValidDateString(streak.lastCompletionDate)
        ) {
            errors.push("Invalid last completion date format");
        }

        if (
            streak.streakStartDate &&
            !this.isValidDateString(streak.streakStartDate)
        ) {
            errors.push("Invalid streak start date format");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            correctedData,
        };
    } /**

     * Validate milestone consistency
     */
    private validateMilestones(streak: HabitStreak): IntegrityCheckResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Rule 1: Milestones should be in ascending order
        const sortedMilestones = [...streak.milestones].sort(
            (a, b) => a.days - b.days,
        );
        const isOrdered = streak.milestones.every(
            (milestone, index) => milestone.days === sortedMilestones[index].days,
        );

        if (!isOrdered) {
            warnings.push("Milestones are not in ascending order");
        }

        // Rule 2: No duplicate milestone days
        const uniqueDays = new Set(streak.milestones.map((m) => m.days));
        if (uniqueDays.size !== streak.milestones.length) {
            errors.push("Duplicate milestone days found");
        }

        // Rule 3: Milestone days should not exceed best streak
        const invalidMilestones = streak.milestones.filter(
            (m) => m.days > streak.bestStreak,
        );
        if (invalidMilestones.length > 0) {
            warnings.push(
                `${invalidMilestones.length} milestones exceed best streak`,
            );
        }

        // Rule 4: Validate milestone timestamps
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
     * Validate completion data
     */
    private validateCompletionData(
        completion: HabitCompletion,
    ): IntegrityCheckResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Rule 1: Required fields should be present
        if (!completion.id || !completion.habitId || !completion.userId) {
            errors.push("Missing required completion fields");
        }

        // Rule 2: Completion timestamp should not be in the future
        if (completion.completedAt.toMillis() > Date.now()) {
            errors.push("Completion timestamp is in the future");
        }

        // Rule 3: Validate difficulty level
        const validDifficulties = ["easy", "medium", "hard"];
        if (!validDifficulties.includes(completion.difficulty)) {
            errors.push("Invalid difficulty level");
        }

        // Rule 4: Validate timezone format
        if (completion.timezone && !this.isValidTimezone(completion.timezone)) {
            warnings.push("Invalid timezone format");
        }

        // Rule 5: Notes should not be excessively long
        if (completion.notes && completion.notes.length > 500) {
            warnings.push("Completion notes are unusually long");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Detect and flag suspicious activity
     * Requirements: 12.5
     */
    async detectSuspiciousActivity(
        userId: string,
        recentCompletions: HabitCompletion[],
    ): Promise<{
        isSuspicious: boolean;
        flags: string[];
        riskLevel: "low" | "medium" | "high";
    }> {
        const flags: string[] = [];
        let riskLevel: "low" | "medium" | "high" = "low";

        try {
            // Flag 1: Too many completions in a short time
            const now = Date.now();
            const recentCount = recentCompletions.filter(
                (c) => now - c.completedAt.toMillis() < 60 * 60 * 1000, // Last hour
            ).length;

            if (recentCount > 10) {
                flags.push("Excessive completions in short timeframe");
                riskLevel = "high";
            } else if (recentCount > 5) {
                flags.push("High completion frequency");
                riskLevel = "medium";
            }

            // Flag 2: Completions with identical timestamps
            const timestamps = recentCompletions.map((c) => c.completedAt.toMillis());
            const uniqueTimestamps = new Set(timestamps);
            if (uniqueTimestamps.size < timestamps.length) {
                flags.push("Duplicate completion timestamps");
                riskLevel = "high";
            }

            // Flag 3: Completions from multiple timezones rapidly
            const timezones = new Set(recentCompletions.map((c) => c.timezone));
            if (timezones.size > 3) {
                flags.push("Completions from multiple timezones");
                riskLevel = "medium";
            }

            // Flag 4: Retroactive completions pattern
            const sortedByCreation = [...recentCompletions].sort(
                (a, b) => a.completedAt.toMillis() - b.completedAt.toMillis(),
            );
            const sortedByCompletion = [...recentCompletions].sort(
                (a, b) => a.completedAt.toMillis() - b.completedAt.toMillis(),
            );

            const isRetroactive = sortedByCreation.some(
                (completion, index) => completion.id !== sortedByCompletion[index]?.id,
            );

            if (isRetroactive) {
                flags.push("Pattern of retroactive completions");
                if (riskLevel === "low") riskLevel = "medium";
            }

            // Log suspicious activity
            if (flags.length > 0) {
                await this.logSuspiciousActivity(userId, flags, riskLevel);
            }

            return {
                isSuspicious: flags.length > 0,
                flags,
                riskLevel,
            };
        } catch (error) {
            console.error("Error detecting suspicious activity:", error);
            return {
                isSuspicious: false,
                flags: [],
                riskLevel: "low",
            };
        }
    }

    /**
     * Validate date string format (YYYY-MM-DD)
     */
    private isValidDateString(dateString: string): boolean {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Validate timezone format
     */
    private isValidTimezone(timezone: string): boolean {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Log integrity check result
     */
    private async logIntegrityCheck(
        type: string,
        entityId: string,
        userId: string,
        passed: boolean,
    ): Promise<void> {
        try {
            const logEntry = {
                timestamp: Date.now(),
                type,
                entityId,
                userId,
                passed,
            };

            // Get existing log
            const existingLog = await AsyncStorage.getItem(
                DataIntegrityService.INTEGRITY_LOG_KEY,
            );
            const log = existingLog ? JSON.parse(existingLog) : [];

            // Add new entry
            log.push(logEntry);

            // Keep only recent entries
            if (log.length > DataIntegrityService.MAX_LOG_ENTRIES) {
                log.splice(0, log.length - DataIntegrityService.MAX_LOG_ENTRIES);
            }

            // Save updated log
            await AsyncStorage.setItem(
                DataIntegrityService.INTEGRITY_LOG_KEY,
                JSON.stringify(log),
            );
        } catch (error) {
            console.error("Failed to log integrity check:", error);
        }
    }

    /**
     * Log suspicious activity
     */
    private async logSuspiciousActivity(
        userId: string,
        flags: string[],
        riskLevel: string,
    ): Promise<void> {
        try {
            const logEntry = {
                timestamp: Date.now(),
                userId,
                flags,
                riskLevel,
                type: "suspicious_activity",
            };

            console.warn("Suspicious activity detected:", logEntry);

            // In a production app, this would also send to a monitoring service
            // For now, we'll just log locally
            const existingLog = await AsyncStorage.getItem(
                DataIntegrityService.INTEGRITY_LOG_KEY,
            );
            const log = existingLog ? JSON.parse(existingLog) : [];
            log.push(logEntry);

            if (log.length > DataIntegrityService.MAX_LOG_ENTRIES) {
                log.splice(0, log.length - DataIntegrityService.MAX_LOG_ENTRIES);
            }

            await AsyncStorage.setItem(
                DataIntegrityService.INTEGRITY_LOG_KEY,
                JSON.stringify(log),
            );
        } catch (error) {
            console.error("Failed to log suspicious activity:", error);
        }
    }

    /**
     * Get integrity check history
     */
    async getIntegrityLog(): Promise<any[]> {
        try {
            const logData = await AsyncStorage.getItem(
                DataIntegrityService.INTEGRITY_LOG_KEY,
            );
            return logData ? JSON.parse(logData) : [];
        } catch (error) {
            console.error("Failed to get integrity log:", error);
            return [];
        }
    }

    /**
     * Clear integrity log
     */
    async clearIntegrityLog(): Promise<void> {
        try {
            await AsyncStorage.removeItem(DataIntegrityService.INTEGRITY_LOG_KEY);
        } catch (error) {
            console.error("Failed to clear integrity log:", error);
        }
    }
}

// Export singleton instance
export const dataIntegrityService = new DataIntegrityService();
