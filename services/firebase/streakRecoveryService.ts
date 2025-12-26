import { HabitStreak } from "../../types/habit-streaks";
import { streakService } from "./streakService";

/**
 * Streak Recovery and Motivation Service
 *
 * Handles motivational messaging, recovery guidance, and restart assistance
 * when users break their habit streaks.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

export interface StreakRecoveryMessage {
    type:
    | "broken_streak"
    | "restart_encouragement"
    | "achievement_preservation"
    | "multiple_breaks"
    | "restart_reminder";
    title: string;
    message: string;
    actionText?: string;
    targetStreak?: number;
    reminderOffered?: boolean;
}

export interface MultipleBreakGuidance {
    type:
    | "habit_stacking"
    | "easier_goals"
    | "schedule_adjustment"
    | "accountability_partner";
    title: string;
    description: string;
    actionSteps: string[];
}

export interface RestartReminderOptions {
    enabled: boolean;
    time: string; // HH:MM format
    timezone: string;
    message: string;
}

export class StreakRecoveryService {
    /**
     * Generate motivational message for a broken streak
     * Requirements: 7.1
     */
    generateBrokenStreakMessage(
        habitId: string,
        previousStreak: number,
        habitName: string,
    ): StreakRecoveryMessage {
        const messages = [
            {
                title: "Don't Give Up! 💪",
                message: `Your ${previousStreak}-day streak with ${habitName} was amazing! Every expert was once a beginner who refused to give up. Today is a fresh start.`,
            },
            {
                title: "Progress, Not Perfection ✨",
                message: `You built a ${previousStreak}-day streak with ${habitName} - that's real progress! One missed day doesn't erase your achievement. Let's get back on track.`,
            },
            {
                title: "Comeback Time! 🚀",
                message: `The best comeback stories start with a single step. Your ${previousStreak}-day streak proves you can do this. Ready to start your next chapter?`,
            },
            {
                title: "Resilience in Action 🌱",
                message: `Building habits is like growing a garden - sometimes you need to replant. Your ${previousStreak}-day streak shows your dedication. Time to grow again!`,
            },
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        return {
            type: "broken_streak",
            title: randomMessage.title,
            message: randomMessage.message,
            actionText: "Start Fresh Today",
            reminderOffered: true,
        };
    }

    /**
     * Generate restart encouragement with previous best streak targeting
     * Requirements: 7.2
     */
    generateRestartEncouragement(
        habitId: string,
        bestStreak: number,
        habitName: string,
    ): StreakRecoveryMessage {
        const targetStreak = bestStreak + 1; // Aim to beat previous best

        const encouragementMessages = [
            {
                title: "Beat Your Record! 🎯",
                message: `Your best streak with ${habitName} was ${bestStreak} days. You've done it before - now let's aim for ${targetStreak} days and set a new personal record!`,
            },
            {
                title: "Level Up Challenge 📈",
                message: `Time to level up! Your ${bestStreak}-day streak was impressive. Can you push it to ${targetStreak} days this time? You've got this!`,
            },
            {
                title: "New Personal Best Awaits 🏆",
                message: `You crushed ${bestStreak} days before with ${habitName}. Your next goal: ${targetStreak} days. Every champion has comeback stories!`,
            },
        ];

        const randomMessage =
            encouragementMessages[
            Math.floor(Math.random() * encouragementMessages.length)
            ];

        return {
            type: "restart_encouragement",
            title: randomMessage.title,
            message: randomMessage.message,
            actionText: `Aim for ${targetStreak} Days`,
            targetStreak: targetStreak,
        };
    }

    /**
     * Generate achievement preservation message
     * Requirements: 7.3
     */
    generateAchievementPreservationMessage(
        habitId: string,
        bestStreak: number,
        totalCompletions: number,
        habitName: string,
    ): StreakRecoveryMessage {
        return {
            type: "achievement_preservation",
            title: "Your Progress Still Counts! 🏅",
            message: `Remember: You've completed ${habitName} ${totalCompletions} times and achieved a ${bestStreak}-day streak. That's real progress that no one can take away. One missed day doesn't erase your dedication and growth.`,
            actionText: "View My Achievements",
        };
    }

    /**
     * Generate guidance for users with multiple broken streaks
     * Requirements: 7.4
     */
    generateMultipleBreakGuidance(
        brokenStreakCount: number,
    ): MultipleBreakGuidance[] {
        const guidance: MultipleBreakGuidance[] = [];

        if (brokenStreakCount >= 2) {
            guidance.push({
                type: "habit_stacking",
                title: "Try Habit Stacking",
                description:
                    "Link your new habit to an existing routine you already do consistently.",
                actionSteps: [
                    "Choose a habit you never miss (like brushing teeth)",
                    "Do your new habit immediately after the existing one",
                    "Start with just 2 minutes to build the connection",
                    "Gradually increase duration once the link is strong",
                ],
            });
        }

        if (brokenStreakCount >= 3) {
            guidance.push({
                type: "easier_goals",
                title: "Start Smaller",
                description:
                    "Sometimes we aim too high too fast. Let's build momentum with easier wins.",
                actionSteps: [
                    "Reduce your habit to the smallest possible version",
                    "Focus on consistency over intensity",
                    "Celebrate small wins to build confidence",
                    "Gradually increase difficulty after 2 weeks of consistency",
                ],
            });
        }

        if (brokenStreakCount >= 4) {
            guidance.push({
                type: "schedule_adjustment",
                title: "Optimize Your Timing",
                description:
                    "Your schedule might be working against you. Let's find your optimal time.",
                actionSteps: [
                    "Track when you have the most energy and motivation",
                    "Schedule habits during your peak performance times",
                    "Prepare everything the night before",
                    "Set up environmental cues to trigger the habit",
                ],
            });
        }

        if (brokenStreakCount >= 5) {
            guidance.push({
                type: "accountability_partner",
                title: "Get Support",
                description:
                    "Sometimes we need external accountability to stay on track.",
                actionSteps: [
                    "Share your goals with friends or family",
                    "Find an accountability partner with similar goals",
                    "Join online communities focused on your habit",
                    "Consider working with a coach or mentor",
                ],
            });
        }

        return guidance;
    }

    /**
     * Generate restart reminder offer
     * Requirements: 7.5
     */
    generateRestartReminderOffer(
        habitId: string,
        habitName: string,
        userTimezone: string,
    ): StreakRecoveryMessage {
        // Suggest optimal reminder times based on habit type
        const defaultTime = this.getOptimalReminderTime(habitName);

        return {
            type: "restart_reminder",
            title: "Set a Restart Reminder? ⏰",
            message: `Would you like me to remind you tomorrow to restart your ${habitName} habit? I can send you a gentle nudge at the perfect time.`,
            actionText: "Set Reminder",
            reminderOffered: true,
        };
    }

    /**
     * Get comprehensive recovery support for a broken streak
     * Combines all recovery elements into a complete support package
     */
    async getStreakRecoverySupport(
        habitId: string,
        userId: string,
        habitName: string,
    ): Promise<{
        motivationalMessage: StreakRecoveryMessage;
        restartEncouragement: StreakRecoveryMessage;
        achievementPreservation: StreakRecoveryMessage;
        multipleBreakGuidance?: MultipleBreakGuidance[];
        restartReminder: StreakRecoveryMessage;
    }> {
        // Get current streak data
        const streak = await streakService.getHabitStreak(habitId, userId);
        if (!streak) {
            throw new Error("Streak data not found");
        }

        // Get user's broken streak history (simplified - in real implementation,
        // this would track historical break patterns)
        const brokenStreakCount = this.estimateBrokenStreakCount(streak);

        // Generate all recovery components
        const motivationalMessage = this.generateBrokenStreakMessage(
            habitId,
            streak.bestStreak,
            habitName,
        );

        const restartEncouragement = this.generateRestartEncouragement(
            habitId,
            streak.bestStreak,
            habitName,
        );

        const achievementPreservation = this.generateAchievementPreservationMessage(
            habitId,
            streak.bestStreak,
            this.estimateTotalCompletions(streak),
            habitName,
        );

        const restartReminder = this.generateRestartReminderOffer(
            habitId,
            habitName,
            "UTC", // Would get from user preferences
        );

        const result: any = {
            motivationalMessage,
            restartEncouragement,
            achievementPreservation,
            restartReminder,
        };

        // Add multiple break guidance if needed
        if (brokenStreakCount >= 2) {
            result.multipleBreakGuidance =
                this.generateMultipleBreakGuidance(brokenStreakCount);
        }

        return result;
    }

    /**
     * Check if a streak is considered "broken" (no completion yesterday or today)
     */
    isStreakBroken(streak: HabitStreak, timezone: string = "UTC"): boolean {
        if (streak.currentStreak === 0) {
            return true;
        }

        // Check if last completion was recent enough to maintain streak
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        return (
            streak.lastCompletionDate !== today &&
            streak.lastCompletionDate !== yesterday
        );
    }

    /**
     * Get recovery message based on streak status
     */
    async getRecoveryMessageForStreak(
        habitId: string,
        userId: string,
        habitName: string,
    ): Promise<StreakRecoveryMessage | null> {
        const streak = await streakService.getHabitStreak(habitId, userId);
        if (!streak) {
            return null;
        }

        if (this.isStreakBroken(streak)) {
            return this.generateBrokenStreakMessage(
                habitId,
                streak.bestStreak,
                habitName,
            );
        }

        return null;
    }

    // Private helper methods

    private getOptimalReminderTime(habitName: string): string {
        // Simple heuristic for optimal reminder times based on habit type
        const morningHabits = ["exercise", "meditation", "reading", "journaling"];
        const eveningHabits = ["reflection", "planning", "stretching"];

        const habitLower = habitName.toLowerCase();

        if (morningHabits.some((h) => habitLower.includes(h))) {
            return "08:00";
        } else if (eveningHabits.some((h) => habitLower.includes(h))) {
            return "20:00";
        } else {
            return "10:00"; // Default morning time
        }
    }

    private estimateBrokenStreakCount(streak: HabitStreak): number {
        // Simplified estimation based on the ratio of best streak to current performance
        // In a real implementation, this would track historical break patterns
        if (streak.bestStreak === 0) return 0;

        const performanceRatio = streak.currentStreak / streak.bestStreak;

        if (performanceRatio < 0.1) return 5; // Very poor recent performance
        if (performanceRatio < 0.3) return 4;
        if (performanceRatio < 0.5) return 3;
        if (performanceRatio < 0.7) return 2;
        return 1;
    }

    private estimateTotalCompletions(streak: HabitStreak): number {
        // Simplified estimation - in real implementation, this would query completion history
        return streak.bestStreak + Math.floor(streak.bestStreak * 0.3);
    }
}

// Export singleton instance
export const streakRecoveryService = new StreakRecoveryService();
