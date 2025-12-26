import { AccessibilityManager } from "@/utils/accessibility";
import {
    AnimationDuration,
    animationPresets,
    getAnimationDuration,
} from "@/utils/animations";
import {
    getDevicePerformanceTier,
    getOptimizedAnimationConfig,
} from "@/utils/performance";
import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

export interface AnimatedViewProps {
    animation?: keyof typeof animationPresets;
    duration?: AnimationDuration;
    delay?: number;
    children: React.ReactNode;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export function AnimatedView({
    animation = "fadeIn",
    duration = "normal",
    delay = 0,
    children,
    style,
    onAnimationComplete,
}: AnimatedViewProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Get device performance tier and optimize animations accordingly
    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Check if user prefers reduced motion
    const shouldReduceMotion = AccessibilityManager.shouldReduceMotion();

    // Use optimized duration based on device performance
    const optimizedDuration = shouldReduceMotion
        ? 0 // No animation if reduce motion is enabled
        : animationConfig.duration[duration] || getAnimationDuration(duration);

    useEffect(() => {
        const timer = setTimeout(
            () => {
                if (shouldReduceMotion) {
                    // Skip animation, just set final state
                    animatedValue.setValue(1);
                    if (onAnimationComplete) {
                        onAnimationComplete();
                    }
                } else {
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: optimizedDuration,
                        useNativeDriver: true,
                    }).start(({ finished }) => {
                        if (finished && onAnimationComplete) {
                            onAnimationComplete();
                        }
                    });
                }
            },
            shouldReduceMotion ? 0 : delay,
        );

        return () => clearTimeout(timer);
    }, [
        animatedValue,
        optimizedDuration,
        delay,
        onAnimationComplete,
        shouldReduceMotion,
    ]);

    const getAnimatedStyle = (): ViewStyle => {
        if (animation === "fadeIn" || animation === "fadeOut") {
            return {
                opacity: animatedValue,
            };
        }

        if (animation === "scaleIn" || animation === "scaleOut") {
            return {
                opacity: animatedValue,
                transform: [
                    {
                        scale: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: animation === "scaleIn" ? [0.8, 1] : [1, 0.8],
                        }),
                    },
                ],
            };
        }

        if (animation === "slideInFromRight") {
            return {
                opacity: animatedValue,
                transform: [
                    {
                        translateX: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0],
                        }),
                    },
                ],
            };
        }

        if (animation === "slideInFromLeft") {
            return {
                opacity: animatedValue,
                transform: [
                    {
                        translateX: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-100, 0],
                        }),
                    },
                ],
            };
        }

        if (animation === "slideInFromBottom") {
            return {
                opacity: animatedValue,
                transform: [
                    {
                        translateY: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0],
                        }),
                    },
                ],
            };
        }

        // Default to fade in
        return {
            opacity: animatedValue,
        };
    };

    return (
        <Animated.View style={[getAnimatedStyle(), style]}>
            {children}
        </Animated.View>
    );
}
