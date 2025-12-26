/**
 * Streak Notification Service
 *
 * Handles all streak-related notifications including:
 * - Streak risk reminders
 * - Milestone celebration notifications
 * - Recovery notifications
 * - Weekly progress notifications
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { HabitStreak, StreakMilestone } from "../../types/habit-streaks";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";

export interface NotificationPreferences {
    streakReminders: boolean;
    milestoneNotifications: boolean;
    recoveryNotifications: boolean;
    weeklyProgress: boolean;
    reminderTime: number; // Hours before day end (default: 2)
}

export interface StreakNotificationData {
    type: "streak_risk" | "milestone" | "recovery" | "weekly_progress";
    userId: string;
    habitId: string;
    habitName: string;
    streakData?: HabitStreak;
    milestoneData?: StreakMilestone;
    weeklyData?: {
        currentStreak: number;
        completionsThisWeek: number;
    };
    message: string;
}

export class StreakNotificationService {
    private static instance: StreakNotificationService;
    private preferenceCache = new Map<string, NotificationPreferences>();

    private constructor() { }

    public static getInstance(): StreakNotificationService {
        if (!StreakNotificationService.instance) {
            StreakNotificationService.instance = new StreakNotificationService();
        }
        return StreakNotificationService.instance;
    }

    /**
     * Send immediate milestone celebration notification
     * Requirements: 11.2 - Immediate milestone notifications
     */
    async sendMilestoneNotification(
        userId: string,
        habitId: string,
        milestone: StreakMilestone,
        habitName?: string,
    ): Promise<void> {
        try {
            const resolvedHabitName = habitName || "Your habit";
            const message = this.createMilestoneMessage(resolvedHabitName, milestone);

            const notificationData: StreakNotificationData = {
                type: "milestone",
                userId,
                habitId,
                habitName: resolvedHabitName,
                milestoneData: milestone,
                message,
            };

            console.log("Milestone notification:", notificationData);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to send milestone notification: ${message}`);
        }
    }

    /**
     * Send streak risk reminder notification
     * Requirements: 11.1 - Streak risk reminders
     */
    async sendStreakRiskReminder(
        userId: string,
        habitId: string,
        currentStreak: number,
        habitName?: string,
    ): Promise<void> {
        try {
            const resolvedHabitName = habitName || "Your habit";
            const message = this.createStreakRiskMessage(
                resolvedHabitName,
                currentStreak,
            );

            const notificationData: StreakNotificationData = {
                type: "streak_risk",
                userId,
                habitId,
                habitName: resolvedHabitName,
                message,
            };

            console.log("Streak risk notification:", notificationData);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to send streak risk reminder: ${message}`);
        }
    }

    /**
     * Send recovery notification for broken streaks
     * Requirements: 11.3 - Recovery notifications
     */
    async sendRecoveryNotification(
        userId: string,
        habitId: string,
        previousBestStreak: number,
        habitName?: string,
    ): Promise<void> {
        try {
            const resolvedHabitName = habitName || "Your habit";
            const message = this.createRecoveryMessage(
                resolvedHabitName,
                previousBestStreak,
            );

            const notificationData: StreakNotificationData = {
                type: "recovery",
                userId,
                habitId,
                habitName: resolvedHabitName,
                message,
            };

            console.log("Recovery notification:", notificationData);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to send recovery notification: ${message}`);
        }
    }

    /**
     * Send weekly progress summary notification
     * Requirements: 11.4 - Weekly progress recaps
     */
    async sendWeeklyProgressNotification(
        userId: string,
        habitId: string,
        habitName: string,
        currentStreak: number,
        weeklyCompletions: number,
    ): Promise<void> {
        try {
            const message = `Weekly progress for "${habitName}": ${weeklyCompletions} completions and a current streak of ${currentStreak} days. Keep the momentum going!`;
            const notificationData: StreakNotificationData = {
                type: "weekly_progress",
                userId,
                habitId,
                habitName,
                message,
                weeklyData: {
                    currentStreak,
                    completionsThisWeek: weeklyCompletions,
                },
            };

            console.log("Weekly progress notification:", notificationData);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to send weekly progress notification: ${message}`);
        }
    }

    /**
     * User notification preferences management
     */
    async getUserNotificationPreferences(
        userId: string,
    ): Promise<NotificationPreferences> {
        const cached = this.preferenceCache.get(userId);
        if (cached) {
            return cached;
        }

        const defaults = this.getDefaultPreferences();
        this.preferenceCache.set(userId, defaults);
        return defaults;
    }

    async updateNotificationPreferences(
        userId: string,
        updates: Partial<NotificationPreferences>,
    ): Promise<NotificationPreferences> {
        const current = await this.getUserNotificationPreferences(userId);
        const next = {
            ...current,
            ...updates,
        };

        this.preferenceCache.set(userId, next);
        return next;
    }

    // Private helper methods

    private getDefaultPreferences(): NotificationPreferences {
        return {
            streakReminders: true,
            milestoneNotifications: true,
            recoveryNotifications: true,
            weeklyProgress: true,
            reminderTime: 2,
        };
    }

    private createMilestoneMessage(
        habitName: string,
        milestone: StreakMilestone,
    ): string {
        const { days } = milestone;

        if (days === 7) {
            return `🎉 Amazing! You've completed a 7-day streak for "${habitName}"! Keep it up!`;
        } else if (days === 30) {
            return `🏆 Incredible! You've reached a 30-day streak for "${habitName}"! You're building a strong habit!`;
        } else if (days === 100) {
            return `💎 Outstanding! 100 days of "${habitName}"! You're a habit master!`;
        } else {
            return `🌟 Congratulations! You've achieved a ${days}-day streak for "${habitName}"!`;
        }
    }

    private createStreakRiskMessage(
        habitName: string,
        currentStreak: number,
    ): string {
        if (currentStreak === 1) {
            return `Don't forget to complete "${habitName}" today to keep your streak going!`;
        } else if (currentStreak < 7) {
            return `You're ${currentStreak} days into your "${habitName}" streak. Don't break it now!`;
        } else {
            return `Your ${currentStreak}-day "${habitName}" streak is at risk! Complete it today to keep going.`;
        }
    }

    private createRecoveryMessage(
        habitName: string,
        previousBestStreak: number,
    ): string {
        return `Ready to bounce back? Your best "${habitName}" streak was ${previousBestStreak} days. Let's start a new one today!`;
    }
}

// Export singleton instance
export const streakNotificationService =
    StreakNotificationService.getInstance();
