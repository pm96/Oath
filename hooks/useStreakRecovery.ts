import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import {
    MultipleBreakGuidance,
    RestartReminderOptions,
    StreakRecoveryMessage,
    streakRecoveryService,
} from "../services/firebase/streakRecoveryService";
import { streakService } from "../services/firebase/streakService";
import { HabitStreak } from "../types/habit-streaks";

interface StreakRecoveryState {
    isLoading: boolean;
    error: string | null;
    recoveryData: {
        motivationalMessage: StreakRecoveryMessage;
        restartEncouragement: StreakRecoveryMessage;
        achievementPreservation: StreakRecoveryMessage;
        multipleBreakGuidance?: MultipleBreakGuidance[];
        restartReminder: StreakRecoveryMessage;
    } | null;
    showRecoveryModal: boolean;
    activeRecoveryMessage: StreakRecoveryMessage | null;
}

/**
 * Hook for managing streak recovery functionality
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const useStreakRecovery = (
    habitId: string,
    userId: string,
    habitName: string,
) => {
    const [state, setState] = useState<StreakRecoveryState>({
        isLoading: false,
        error: null,
        recoveryData: null,
        showRecoveryModal: false,
        activeRecoveryMessage: null,
    });

    /**
     * Check if streak needs recovery support
     * Requirements: 7.1
     */
    const checkStreakStatus = useCallback(async () => {
        if (!habitId || !userId) return;

        try {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            const streak = await streakService.getHabitStreak(habitId, userId);
            if (!streak) return;

            const isStreakBroken = streakRecoveryService.isStreakBroken(streak);

            if (isStreakBroken && streak.bestStreak > 0) {
                // Get recovery message for broken streak
                const recoveryMessage =
                    await streakRecoveryService.getRecoveryMessageForStreak(
                        habitId,
                        userId,
                        habitName,
                    );

                if (recoveryMessage) {
                    setState((prev) => ({
                        ...prev,
                        activeRecoveryMessage: recoveryMessage,
                        isLoading: false,
                    }));
                }
            } else {
                setState((prev) => ({
                    ...prev,
                    activeRecoveryMessage: null,
                    isLoading: false,
                }));
            }
        } catch (err) {
            setState((prev) => ({
                ...prev,
                error:
                    err instanceof Error ? err.message : "Failed to check streak status",
                isLoading: false,
            }));
        }
    }, [habitId, userId, habitName]);

    /**
     * Load comprehensive recovery support data
     * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
     */
    const loadRecoverySupport = useCallback(async () => {
        if (!habitId || !userId) return;

        try {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            const recoveryData = await streakRecoveryService.getStreakRecoverySupport(
                habitId,
                userId,
                habitName,
            );

            setState((prev) => ({
                ...prev,
                recoveryData,
                isLoading: false,
            }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to load recovery support",
                isLoading: false,
            }));
        }
    }, [habitId, userId, habitName]);

    /**
     * Show the full recovery modal
     * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
     */
    const showRecoveryModal = useCallback(async () => {
        await loadRecoverySupport();
        setState((prev) => ({ ...prev, showRecoveryModal: true }));
    }, [loadRecoverySupport]);

    /**
     * Hide the recovery modal
     */
    const hideRecoveryModal = useCallback(() => {
        setState((prev) => ({ ...prev, showRecoveryModal: false }));
    }, []);

    /**
     * Handle setting a restart reminder
     * Requirements: 7.5
     */
    const setRestartReminder = useCallback(
        async (options: RestartReminderOptions) => {
            try {
                // In a real implementation, this would integrate with a notification service
                // For now, we'll just show a confirmation
                Alert.alert(
                    "Reminder Set!",
                    `I'll remind you tomorrow at ${options.time} to restart your ${habitName} habit.`,
                    [{ text: "OK" }],
                );

                // Store reminder preferences (would integrate with notification service)
                console.log("Restart reminder set:", {
                    habitId,
                    userId,
                    habitName,
                    ...options,
                });
            } catch {
                Alert.alert("Error", "Failed to set reminder. Please try again.", [
                    { text: "OK" },
                ]);
            }
        },
        [habitId, userId, habitName],
    );

    /**
     * Handle starting fresh after a broken streak
     * Requirements: 7.1, 7.2
     */
    const startFresh = useCallback(async () => {
        try {
            // This would typically trigger a new completion or reset UI state
            Alert.alert(
                "Fresh Start!",
                `Ready to begin a new streak with ${habitName}. You've got this! 💪`,
                [{ text: "Let's Go!" }],
            );

            // Clear active recovery message
            setState((prev) => ({ ...prev, activeRecoveryMessage: null }));
        } catch {
            Alert.alert("Error", "Something went wrong. Please try again.", [
                { text: "OK" },
            ]);
        }
    }, [habitName]);

    /**
     * Handle viewing achievements
     * Requirements: 7.3
     */
    const viewAchievements = useCallback(() => {
        // This would navigate to achievements screen
        Alert.alert(
            "Achievements",
            "This would show your habit achievements and milestone history.",
            [{ text: "OK" }],
        );
    }, []);

    /**
     * Dismiss active recovery message
     */
    const dismissRecoveryMessage = useCallback(() => {
        setState((prev) => ({ ...prev, activeRecoveryMessage: null }));
    }, []);

    /**
     * Get recovery message for current streak status
     */
    const getRecoveryMessage =
        useCallback(async (): Promise<StreakRecoveryMessage | null> => {
            return await streakRecoveryService.getRecoveryMessageForStreak(
                habitId,
                userId,
                habitName,
            );
        }, [habitId, userId, habitName]);

    // Check streak status on mount and when dependencies change
    useEffect(() => {
        checkStreakStatus();
    }, [checkStreakStatus]);

    return {
        // State
        isLoading: state.isLoading,
        error: state.error,
        recoveryData: state.recoveryData,
        showModal: state.showRecoveryModal,
        activeRecoveryMessage: state.activeRecoveryMessage,

        // Actions
        checkStreakStatus,
        loadRecoverySupport,
        showRecoveryModal,
        hideRecoveryModal,
        setRestartReminder,
        startFresh,
        viewAchievements,
        dismissRecoveryMessage,
        getRecoveryMessage,

        // Utilities
        isStreakBroken: (streak: HabitStreak) =>
            streakRecoveryService.isStreakBroken(streak),
    };
};
