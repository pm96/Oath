import {
    NotificationPreferences,
    streakNotificationService,
} from "@/services/firebase/streakNotificationService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandling";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * useStreakNotifications Hook
 *
 * Custom hook for managing streak notification preferences and sending notifications
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function useStreakNotifications() {
    const { user } = useAuth();
    const [preferences, setPreferences] =
        useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Load user notification preferences
     */
    const loadPreferences = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const userPreferences =
                await streakNotificationService.getUserNotificationPreferences(
                    user.uid,
                );
            setPreferences(userPreferences);
        } catch (err) {
            const message = getUserFriendlyErrorMessage(err);
            setError(message);
            console.error("Error loading notification preferences:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Update notification preferences
     */
    const updatePreferences = useCallback(
        async (newPreferences: Partial<NotificationPreferences>) => {
            if (!user) {
                throw new Error("User must be authenticated");
            }

            try {
                setLoading(true);
                setError(null);

                await streakNotificationService.updateNotificationPreferences(
                    user.uid,
                    newPreferences,
                );

                // Update local state
                setPreferences((prev) =>
                    prev ? { ...prev, ...newPreferences } : null,
                );

                return true;
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Error updating notification preferences:", err);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [user],
    );

    /**
     * Send milestone notification
     * Requirements: 11.2
     */
    const sendMilestoneNotification = useCallback(
        async (
            habitId: string,
            habitName: string,
            milestone: { days: number; achievedAt: any; celebrated: boolean },
        ) => {
            if (!user) {
                throw new Error("User must be authenticated");
            }

            try {
                await streakNotificationService.sendMilestoneNotification(
                    user.uid,
                    habitId,
                    milestone,
                    habitName,
                );
                return true;
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Error sending milestone notification:", err);
                return false;
            }
        },
        [user],
    );

    /**
     * Send streak risk reminder
     * Requirements: 11.1
     */
    const sendStreakRiskReminder = useCallback(
        async (habitId: string, habitName: string, currentStreak: number) => {
            if (!user) {
                throw new Error("User must be authenticated");
            }

            try {
                await streakNotificationService.sendStreakRiskReminder(
                    user.uid,
                    habitId,
                    currentStreak,
                    habitName,
                );
                return true;
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Error sending streak risk reminder:", err);
                return false;
            }
        },
        [user],
    );

    /**
     * Send recovery notification
     * Requirements: 11.3
     */
    const sendRecoveryNotification = useCallback(
        async (habitId: string, habitName: string, previousBestStreak: number) => {
            if (!user) {
                throw new Error("User must be authenticated");
            }

            try {
                await streakNotificationService.sendRecoveryNotification(
                    user.uid,
                    habitId,
                    previousBestStreak,
                    habitName,
                );
                return true;
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Error sending recovery notification:", err);
                return false;
            }
        },
        [user],
    );

    /**
     * Send weekly progress notification
     * Requirements: 11.4
     */
    const sendWeeklyProgressNotification = useCallback(
        async (
            habitId: string,
            habitName: string,
            currentStreak: number,
            weeklyCompletions: number,
        ) => {
            if (!user) {
                throw new Error("User must be authenticated");
            }

            try {
                await streakNotificationService.sendWeeklyProgressNotification(
                    user.uid,
                    habitId,
                    habitName,
                    currentStreak,
                    weeklyCompletions,
                );
                return true;
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Error sending weekly progress notification:", err);
                return false;
            }
        },
        [user],
    );

    /**
     * Toggle specific notification type
     */
    const toggleNotificationType = useCallback(
        async (type: keyof NotificationPreferences, enabled: boolean) => {
            return await updatePreferences({ [type]: enabled });
        },
        [updatePreferences],
    );

    /**
     * Update reminder time (hours before day end)
     */
    const updateReminderTime = useCallback(
        async (hours: number) => {
            if (hours < 1 || hours > 12) {
                throw new Error("Reminder time must be between 1 and 12 hours");
            }

            return await updatePreferences({ reminderTime: hours });
        },
        [updatePreferences],
    );

    // Load preferences when user changes
    useEffect(() => {
        if (user) {
            loadPreferences();
        } else {
            setPreferences(null);
            setError(null);
        }
    }, [user, loadPreferences]);

    return {
        preferences,
        loading,
        error,
        loadPreferences,
        updatePreferences,
        sendMilestoneNotification,
        sendStreakRiskReminder,
        sendRecoveryNotification,
        sendWeeklyProgressNotification,
        toggleNotificationType,
        updateReminderTime,
    };
}
