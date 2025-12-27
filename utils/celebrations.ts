/**
 * Celebration and feedback utilities
 * Requirements: 3.2, 7.4 - Celebration effects and haptic feedback
 */

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Animated } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { AccessibilityManager } from "./accessibility";
import {
    getDevicePerformanceTier,
    getOptimizedAnimationConfig,
} from "./performance";

/**
 * Sound effects for celebrations
 */
class SoundManager {
    private sounds: { [key: string]: Audio.Sound } = {};
    private soundsLoaded = false;

    /**
     * Load celebration sound effects
     */
    async loadSounds() {
        if (this.soundsLoaded) return;

        try {
            // Note: In a real implementation, you would add actual sound files to assets
            // For now, we'll use system sounds or skip if files don't exist

            // Example sound loading (commented out as we don't have actual sound files)
            // const { sound: successSound } = await Audio.Sound.createAsync(
            //     require('../assets/sounds/success.mp3')
            // );
            // this.sounds.success = successSound;

            // const { sound: milestoneSound } = await Audio.Sound.createAsync(
            //     require('../assets/sounds/milestone.mp3')
            // );
            // this.sounds.milestone = milestoneSound;

            this.soundsLoaded = true;
        } catch (error) {
            console.warn("Failed to load celebration sounds:", error);
        }
    }

    /**
     * Play success sound for goal completion
     */
    async playSuccessSound() {
        try {
            if (this.sounds.success) {
                await this.sounds.success.replayAsync();
            }
        } catch (error) {
            console.warn("Failed to play success sound:", error);
        }
    }

    /**
     * Play milestone sound for major achievements
     */
    async playMilestoneSound() {
        try {
            if (this.sounds.milestone) {
                await this.sounds.milestone.replayAsync();
            }
        } catch (error) {
            console.warn("Failed to play milestone sound:", error);
        }
    }

    /**
     * Cleanup sounds
     */
    async cleanup() {
        try {
            for (const sound of Object.values(this.sounds)) {
                await sound.unloadAsync();
            }
            this.sounds = {};
            this.soundsLoaded = false;
        } catch (error) {
            console.warn("Failed to cleanup sounds:", error);
        }
    }
}

// Global sound manager instance
export const soundManager = new SoundManager();

/**
 * Haptic feedback types for different interactions
 */
export const HapticFeedback = {
    /**
     * Light haptic feedback for button presses
     * Requirement 3.2: Haptic feedback for button interactions
     */
    buttonPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    /**
     * Medium haptic feedback for selections and toggles
     */
    selection: () => {
        Haptics.selectionAsync();
    },

    /**
     * Success haptic feedback for goal completion
     * Requirement 7.4: Satisfying completion feedback
     */
    success: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    /**
     * Strong haptic feedback for major achievements
     */
    achievement: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    /**
     * Error haptic feedback
     */
    error: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    /**
     * Warning haptic feedback
     */
    warning: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
};

/**
 * Confetti celebration configuration
 * Requirement 3.2: Celebratory effects for goal completion
 */
export const ConfettiConfig = {
    /**
     * Standard celebration for goal completion
     */
    goalCompletion: {
        count: 50,
        origin: { x: -10, y: 0 },
        explosionSpeed: 350,
        fallSpeed: 2300,
        fadeOut: true,
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
    },

    /**
     * Big celebration for streak milestones
     */
    streakMilestone: {
        count: 100,
        origin: { x: -10, y: 0 },
        explosionSpeed: 400,
        fallSpeed: 2000,
        fadeOut: true,
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
    },

    /**
     * Subtle celebration for daily progress completion
     */
    dailyComplete: {
        count: 30,
        origin: { x: -10, y: 0 },
        explosionSpeed: 300,
        fallSpeed: 2500,
        fadeOut: true,
        colors: ["#22c55e", "#10b981"],
    },
};

/**
 * Get optimized confetti config based on device performance
 */
export function getOptimizedConfettiConfig(
    configType: keyof typeof ConfettiConfig,
) {
    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);
    const baseConfig = ConfettiConfig[configType];

    // Disable confetti if reduce motion is enabled or device performance is low
    if (
        AccessibilityManager.shouldReduceMotion() ||
        !animationConfig.enableConfetti
    ) {
        return null;
    }

    // Reduce particle count for lower performance devices
    const particleMultiplier =
        performanceTier === "low" ? 0.5 : performanceTier === "medium" ? 0.75 : 1;

    return {
        ...baseConfig,
        count: Math.floor(baseConfig.count * particleMultiplier),
    };
}

/**
 * Success animation for goal completion
 * Requirement 7.4: Success animations for habit completion
 */
export const createSuccessAnimation = (animatedValue: Animated.Value) => {
    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Skip animation if reduce motion is enabled
    if (AccessibilityManager.shouldReduceMotion()) {
        animatedValue.setValue(1);
        return Animated.timing(animatedValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
        });
    }

    return Animated.sequence([
        // Scale up
        Animated.timing(animatedValue, {
            toValue: 1.2,
            duration: animationConfig.duration.fast,
            useNativeDriver: true,
        }),
        // Scale back to normal
        Animated.timing(animatedValue, {
            toValue: 1,
            duration: animationConfig.duration.fast,
            useNativeDriver: true,
        }),
    ]);
};

/**
 * Button press animation with haptic feedback
 * Requirement 3.2: Micro-interactions for button presses
 */
export const createButtonPressAnimation = (
    animatedValue: Animated.Value,
    withHaptic: boolean = true,
) => {
    if (withHaptic) {
        HapticFeedback.buttonPress();
    }

    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Skip animation if reduce motion is enabled
    if (AccessibilityManager.shouldReduceMotion()) {
        return Animated.timing(animatedValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
        });
    }

    return Animated.sequence([
        // Scale down
        Animated.timing(animatedValue, {
            toValue: 0.95,
            duration: animationConfig.duration.fast,
            useNativeDriver: true,
        }),
        // Scale back to normal
        Animated.timing(animatedValue, {
            toValue: 1,
            duration: animationConfig.duration.fast,
            useNativeDriver: true,
        }),
    ]);
};

/**
 * Pulse animation for notifications and alerts
 */
export const createPulseAnimation = (animatedValue: Animated.Value) => {
    return Animated.loop(
        Animated.sequence([
            Animated.timing(animatedValue, {
                toValue: 1.1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]),
    );
};

/**
 * Enhanced milestone celebration animation
 * Requirements: 3.1, 3.2 - Milestone celebration animations
 */
export const createMilestoneCelebrationAnimation = (
    scaleValue: Animated.Value,
    fadeValue: Animated.Value,
    rotateValue: Animated.Value,
) => {
    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Skip animation if reduce motion is enabled
    if (AccessibilityManager.shouldReduceMotion()) {
        scaleValue.setValue(1);
        fadeValue.setValue(1);
        rotateValue.setValue(0);
        return Animated.timing(scaleValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
        });
    }

    return Animated.sequence([
        // Initial burst - scale up with rotation
        Animated.parallel([
            Animated.spring(scaleValue, {
                toValue: 1.3,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(fadeValue, {
                toValue: 1,
                duration: animationConfig.duration.normal,
                useNativeDriver: true,
            }),
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: animationConfig.duration.normal,
                useNativeDriver: true,
            }),
        ]),
        // Settle to normal size
        Animated.spring(scaleValue, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }),
        // Gentle pulse effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
            { iterations: 3 },
        ),
    ]);
};

/**
 * Streak completion celebration animation
 * Requirements: 3.2 - Haptic feedback for streak completions
 */
export const createStreakCompletionAnimation = (
    animatedValue: Animated.Value,
    withHaptic: boolean = true,
) => {
    if (withHaptic) {
        HapticFeedback.success();
    }

    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Skip animation if reduce motion is enabled
    if (AccessibilityManager.shouldReduceMotion()) {
        animatedValue.setValue(1);
        return Animated.timing(animatedValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
        });
    }

    return Animated.sequence([
        // Quick scale up
        Animated.timing(animatedValue, {
            toValue: 1.15,
            duration: animationConfig.duration.fast,
            useNativeDriver: true,
        }),
        // Bounce back
        Animated.spring(animatedValue, {
            toValue: 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
        }),
    ]);
};

/**
 * Shake animation for errors or invalid inputs
 */
export const createShakeAnimation = (animatedValue: Animated.Value) => {
    return Animated.sequence([
        Animated.timing(animatedValue, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
        }),
    ]);
};

/**
 * Floating animation for milestone badges
 */
export const createFloatingAnimation = (animatedValue: Animated.Value) => {
    return Animated.loop(
        Animated.sequence([
            Animated.timing(animatedValue, {
                toValue: -5,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
                toValue: 5,
                duration: 2000,
                useNativeDriver: true,
            }),
        ]),
    );
};

/**
 * Sparkle animation for special achievements
 */
export const createSparkleAnimation = (
    scaleValue: Animated.Value,
    opacityValue: Animated.Value,
) => {
    return Animated.loop(
        Animated.sequence([
            Animated.parallel([
                Animated.timing(scaleValue, {
                    toValue: 1.2,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(scaleValue, {
                    toValue: 0.8,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 0.3,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
        ]),
    );
};
