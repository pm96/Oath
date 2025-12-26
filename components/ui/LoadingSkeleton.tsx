import { useThemeStyles } from "@/hooks/useTheme";
import { AccessibilityManager } from "@/utils/accessibility";
import {
    getDevicePerformanceTier,
    getOptimizedAnimationConfig,
} from "@/utils/performance";
import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, View, ViewStyle } from "react-native";

export interface LoadingSkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function LoadingSkeleton({
    width = "100%",
    height = 20,
    borderRadius,
    style,
}: LoadingSkeletonProps) {
    const { colors, borderRadius: themeBorderRadius } = useThemeStyles();
    const shimmerValue = useRef(new Animated.Value(0)).current;

    // Get device performance tier and optimize animations accordingly
    const performanceTier = getDevicePerformanceTier();
    const animationConfig = getOptimizedAnimationConfig(performanceTier);

    // Check if user prefers reduced motion
    const shouldReduceMotion = AccessibilityManager.shouldReduceMotion();

    useEffect(() => {
        if (shouldReduceMotion) {
            // No shimmer animation if reduce motion is enabled
            shimmerValue.setValue(0.5);
            return;
        }

        // Enhanced shimmer animation with better timing
        const shimmerAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerValue, {
                    toValue: 1,
                    duration: animationConfig.duration.slow,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerValue, {
                    toValue: 0,
                    duration: animationConfig.duration.slow,
                    useNativeDriver: true,
                }),
            ]),
        );

        shimmerAnimation.start();

        return () => shimmerAnimation.stop();
    }, [shimmerValue, animationConfig, shouldReduceMotion]);

    const skeletonStyles: ViewStyle = {
        width,
        height,
        backgroundColor: colors.muted,
        borderRadius: borderRadius ?? themeBorderRadius.sm,
        overflow: "hidden",
        ...style,
    };

    const shimmerOpacity = shouldReduceMotion
        ? 0.5 // Static opacity if reduce motion is enabled
        : shimmerValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
        });

    const shimmerStyles: Animated.AnimatedProps<ViewStyle> = {
        width: skeletonStyles.width,
        height: skeletonStyles.height,
        backgroundColor: skeletonStyles.backgroundColor,
        borderRadius: skeletonStyles.borderRadius,
        opacity: shimmerOpacity,
    };

    return (
        <View
            style={skeletonStyles}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading content"
            accessibilityState={{ busy: true }}
        >
            <Animated.View style={shimmerStyles} />
        </View>
    );
}

// Convenience components for common skeleton patterns
export function TextSkeleton({
    lines = 1,
    ...props
}: LoadingSkeletonProps & { lines?: number }) {
    return (
        <View>
            {Array.from({ length: lines }, (_, index) => (
                <LoadingSkeleton
                    key={index}
                    height={16}
                    width={index === lines - 1 ? "70%" : "100%"}
                    style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
                    {...props}
                />
            ))}
        </View>
    );
}

export function CardSkeleton({ ...props }: LoadingSkeletonProps) {
    const { spacing } = useThemeStyles();

    return (
        <View style={{ padding: spacing.md }}>
            <LoadingSkeleton height={120} {...props} />
            <View style={{ marginTop: spacing.sm }}>
                <TextSkeleton lines={2} />
            </View>
        </View>
    );
}

export function AvatarSkeleton({
    size = 40,
    ...props
}: LoadingSkeletonProps & { size?: number }) {
    return (
        <LoadingSkeleton
            width={size}
            height={size}
            borderRadius={size / 2}
            {...props}
        />
    );
}
