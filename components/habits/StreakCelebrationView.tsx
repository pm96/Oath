/**
 * StreakCelebrationView component for streak-specific celebrations
 * Requirements: 3.1, 3.2 - Milestone celebrations with confetti and haptic feedback
 */

import {
    CelebrationView,
    CelebrationViewRef,
} from "@/components/ui/CelebrationView";
import {
    celebrationManager,
    createStreakCompletionAnimation,
    HapticFeedback,
} from "@/utils/celebrations";
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from "react";
import { Animated, ViewStyle } from "react-native";

export interface StreakCelebrationViewProps {
    style?: ViewStyle;
    onCelebrationComplete?: () => void;
}

export interface StreakCelebrationViewRef {
    celebrateCompletion: () => void;
    celebrateMilestone: (days: number) => void;
    celebrateDaily: () => void;
}

/**
 * Enhanced celebration view specifically for streak achievements
 * Integrates confetti, haptic feedback, and animations
 */
export const StreakCelebrationView = forwardRef<
    StreakCelebrationViewRef,
    StreakCelebrationViewProps
>(({ style, onCelebrationComplete }, ref) => {
    const confettiRef = useRef<CelebrationViewRef>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Set up celebration manager with confetti ref
        if (confettiRef.current) {
            celebrationManager.setConfettiRef({
                current: confettiRef.current as any,
            });
        }
    }, []);

    useImperativeHandle(ref, () => ({
        /**
         * Celebrate streak completion with animation and haptic feedback
         * Requirements: 3.2 - Haptic feedback for streak completions
         */
        celebrateCompletion: () => {
            // Trigger haptic feedback
            HapticFeedback.success();

            // Start completion animation
            createStreakCompletionAnimation(scaleAnim, false).start(() => {
                if (onCelebrationComplete) {
                    onCelebrationComplete();
                }
            });

            // Trigger confetti
            confettiRef.current?.celebrate();
        },

        /**
         * Celebrate milestone achievement with enhanced effects
         * Requirements: 3.1, 3.2 - Milestone celebration animations
         */
        celebrateMilestone: async (days: number) => {
            // Enhanced haptic feedback for milestones
            HapticFeedback.achievement();

            // Use celebration manager for coordinated effects
            await celebrationManager.celebrateStreakMilestone(days);

            // Trigger milestone-specific confetti
            confettiRef.current?.celebrateMilestone(days);

            // Enhanced animation for milestones
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 1.2,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                if (onCelebrationComplete) {
                    onCelebrationComplete();
                }
            });
        },

        /**
         * Celebrate daily completion with subtle effects
         */
        celebrateDaily: async () => {
            // Light haptic feedback
            HapticFeedback.selection();

            // Use celebration manager
            await celebrationManager.celebrateDailyComplete();

            // Subtle animation
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        },
    }));

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <CelebrationView
                ref={confettiRef}
                type="streakMilestone"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
        </Animated.View>
    );
});

StreakCelebrationView.displayName = "StreakCelebrationView";
