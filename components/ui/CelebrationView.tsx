/**
 * CelebrationView component for confetti animations
 * Requirements: 3.2, 7.4 - Celebration effects for goal completion
 */

import {
    getOptimizedConfettiConfig
} from "@/utils/celebrations";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, ViewStyle } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

export interface CelebrationViewProps {
    style?: ViewStyle;
    type?: "goalCompletion" | "streakMilestone" | "dailyComplete";
    milestoneLevel?: number; // For enhanced milestone celebrations
}

export interface CelebrationViewRef {
    celebrate: () => void;
    start: () => void;
    stop: () => void;
    celebrateMilestone: (days: number) => void;
}

/**
 * Enhanced CelebrationView component with milestone-specific confetti
 * Requirement 3.2: Celebratory effects using confetti
 * Requirement 3.1: Milestone celebration animations
 */
export const CelebrationView = forwardRef<
    CelebrationViewRef,
    CelebrationViewProps
>(({ style, type = "goalCompletion", milestoneLevel }, ref) => {
    const confettiRef = useRef<ConfettiCannon>(null);

    useImperativeHandle(ref, () => ({
        celebrate: () => {
            confettiRef.current?.start();
        },
        start: () => {
            confettiRef.current?.start();
        },
        stop: () => {
            confettiRef.current?.stop();
        },
        celebrateMilestone: (days: number) => {
            // Enhanced celebration for milestones
            confettiRef.current?.start();

            // Additional burst for major milestones
            if (days >= 100) {
                setTimeout(() => {
                    confettiRef.current?.start();
                }, 1000);
            }
        },
    }));

    // Get optimized config based on device performance
    const optimizedConfig = getOptimizedConfettiConfig(type);

    if (!optimizedConfig) {
        // Return empty view if confetti is disabled
        return <View style={style} pointerEvents="none" />;
    }

    // Enhanced config for milestone celebrations
    const getMilestoneConfig = (days?: number) => {
        if (!days) return optimizedConfig;

        const baseConfig = { ...optimizedConfig };

        if (days >= 365) {
            // Year milestone - rainbow celebration
            return {
                ...baseConfig,
                count: Math.min(baseConfig.count * 2, 200),
                colors: [
                    "#FFD700",
                    "#FFA500",
                    "#FF6347",
                    "#FF1493",
                    "#9370DB",
                    "#00CED1",
                ],
                explosionSpeed: baseConfig.explosionSpeed * 1.2,
            };
        } else if (days >= 100) {
            // Century milestone - gold theme
            return {
                ...baseConfig,
                count: Math.min(baseConfig.count * 1.5, 150),
                colors: ["#FFD700", "#FFA500", "#FF6347", "#8A2BE2", "#00CED1"],
                explosionSpeed: baseConfig.explosionSpeed * 1.1,
            };
        } else if (days >= 30) {
            // Month milestone - enhanced standard
            return {
                ...baseConfig,
                count: Math.min(baseConfig.count * 1.2, 120),
                explosionSpeed: baseConfig.explosionSpeed * 1.05,
            };
        }

        return baseConfig;
    };

    const config = getMilestoneConfig(milestoneLevel);

    return (
        <View
            style={[
                { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
                style,
            ]}
            pointerEvents="none"
        >
            <ConfettiCannon
                ref={confettiRef}
                count={config.count}
                origin={config.origin}
                explosionSpeed={config.explosionSpeed}
                fallSpeed={config.fallSpeed}
                fadeOut={config.fadeOut}
                colors={config.colors}
                autoStart={false}
            />
        </View>
    );
});

CelebrationView.displayName = "CelebrationView";
