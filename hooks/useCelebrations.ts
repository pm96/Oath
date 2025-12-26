/**
 * Hook for managing celebration preferences and effects
 * Requirements: 3.1, 3.2 - Celebration system integration
 */

import { celebrationManager, soundManager } from "@/utils/celebrations";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

interface CelebrationPreferences {
    soundEnabled: boolean;
    hapticEnabled: boolean;
    confettiEnabled: boolean;
    reducedMotion: boolean;
}

const DEFAULT_PREFERENCES: CelebrationPreferences = {
    soundEnabled: true,
    hapticEnabled: true,
    confettiEnabled: true,
    reducedMotion: false,
};

const STORAGE_KEY = "celebration_preferences";

/**
 * Hook for managing celebration preferences and triggering celebrations
 */
export function useCelebrations() {
    const [preferences, setPreferences] =
        useState<CelebrationPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    /**
     * Load preferences from storage
     */
    const loadPreferences = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
            }
        } catch (error) {
            console.warn("Failed to load celebration preferences:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Save preferences to storage
     */
    const savePreferences = useCallback(
        async (newPreferences: Partial<CelebrationPreferences>) => {
            try {
                const updated = { ...preferences, ...newPreferences };
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                setPreferences(updated);

                // Update celebration manager settings
                celebrationManager.setSoundEnabled(updated.soundEnabled);
            } catch (error) {
                console.warn("Failed to save celebration preferences:", error);
            }
        },
        [preferences],
    );

    /**
     * Initialize sound system
     */
    const initializeSounds = useCallback(async () => {
        if (preferences.soundEnabled) {
            await soundManager.loadSounds();
        }
    }, [preferences.soundEnabled]);

    /**
     * Trigger goal completion celebration
     */
    const celebrateGoalCompletion = useCallback(async () => {
        if (
            !preferences.hapticEnabled &&
            !preferences.confettiEnabled &&
            !preferences.soundEnabled
        ) {
            return;
        }

        await celebrationManager.celebrateGoalCompletion();
    }, [preferences]);

    /**
     * Trigger streak milestone celebration
     */
    const celebrateStreakMilestone = useCallback(
        async (days: number) => {
            if (
                !preferences.hapticEnabled &&
                !preferences.confettiEnabled &&
                !preferences.soundEnabled
            ) {
                return;
            }

            await celebrationManager.celebrateStreakMilestone(days);
        },
        [preferences],
    );

    /**
     * Trigger daily completion celebration
     */
    const celebrateDailyComplete = useCallback(async () => {
        if (
            !preferences.hapticEnabled &&
            !preferences.confettiEnabled &&
            !preferences.soundEnabled
        ) {
            return;
        }

        await celebrationManager.celebrateDailyComplete();
    }, [preferences]);

    /**
     * Update individual preference
     */
    const updatePreference = useCallback(
        <K extends keyof CelebrationPreferences>(
            key: K,
            value: CelebrationPreferences[K],
        ) => {
            savePreferences({ [key]: value });
        },
        [savePreferences],
    );

    /**
     * Reset preferences to defaults
     */
    const resetPreferences = useCallback(() => {
        savePreferences(DEFAULT_PREFERENCES);
    }, [savePreferences]);

    /**
     * Cleanup resources
     */
    const cleanup = useCallback(async () => {
        await celebrationManager.cleanup();
    }, []);

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    // Initialize sounds when preferences change
    useEffect(() => {
        initializeSounds();
    }, [initializeSounds]);

    // Update celebration manager when preferences change
    useEffect(() => {
        celebrationManager.setSoundEnabled(preferences.soundEnabled);
    }, [preferences.soundEnabled]);

    return {
        preferences,
        loading,
        updatePreference,
        resetPreferences,
        celebrateGoalCompletion,
        celebrateStreakMilestone,
        celebrateDailyComplete,
        cleanup,
    };
}

/**
 * Hook for celebration effects in components
 */
export function useCelebrationEffects() {
    const {
        celebrateGoalCompletion,
        celebrateStreakMilestone,
        celebrateDailyComplete,
    } = useCelebrations();

    return {
        celebrateGoalCompletion,
        celebrateStreakMilestone,
        celebrateDailyComplete,
    };
}
