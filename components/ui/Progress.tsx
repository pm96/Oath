import { useThemeStyles } from "@/hooks/useTheme";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TextStyle, View, ViewStyle } from "react-native";

export interface ProgressProps {
    value: number;
    max?: number;
    variant?: "linear" | "circular";
    color?: string;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    style?: ViewStyle;
}

export function Progress({
    value,
    max = 100,
    variant = "linear",
    color,
    showLabel = false,
    size = "md",
    style,
}: ProgressProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const animatedValue = useRef(new Animated.Value(0)).current;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const progressColor = color || colors.primary;

    // Animate progress changes
    // Requirement 3.2: Subtle micro-interactions throughout the app
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [percentage, animatedValue]);

    if (variant === "circular") {
        return (
            <CircularProgress
                percentage={percentage}
                animatedValue={animatedValue}
                color={progressColor}
                size={size}
                showLabel={showLabel}
                style={style}
            />
        );
    }

    const getLinearHeight = () => {
        const heights = {
            sm: 4,
            md: 6,
            lg: 8,
        };
        return heights[size];
    };

    const linearHeight = getLinearHeight();

    const containerStyles: ViewStyle = {
        width: "100%",
        ...style,
    };

    const trackStyles: ViewStyle = {
        height: linearHeight,
        backgroundColor: colors.muted,
        borderRadius: borderRadius.full,
        overflow: "hidden",
    };

    const fillStyles: ViewStyle = {
        height: "100%",
        backgroundColor: progressColor,
        borderRadius: borderRadius.full,
    };

    const animatedFillStyles = {
        ...fillStyles,
        width: animatedValue.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
            extrapolate: "clamp",
        }),
    };

    const labelStyles: TextStyle = {
        fontSize: 12,
        color: colors.mutedForeground,
        textAlign: "center",
        marginTop: spacing.xs,
    };

    return (
        <View style={containerStyles}>
            <View style={trackStyles}>
                <Animated.View style={animatedFillStyles} />
            </View>
            {showLabel && <Text style={labelStyles}>{Math.round(percentage)}%</Text>}
        </View>
    );
}

interface CircularProgressProps {
    percentage: number;
    animatedValue: Animated.Value;
    color: string;
    size: "sm" | "md" | "lg";
    showLabel: boolean;
    style?: ViewStyle;
}

function CircularProgress({
    percentage,
    animatedValue,
    color,
    size,
    showLabel,
    style,
}: CircularProgressProps) {
    const { colors } = useThemeStyles();

    const getCircularSize = () => {
        const sizes = {
            sm: 32,
            md: 48,
            lg: 64,
        };
        return sizes[size];
    };

    const getStrokeWidth = () => {
        const widths = {
            sm: 3,
            md: 4,
            lg: 5,
        };
        return widths[size];
    };

    const circularSize = getCircularSize();
    const strokeWidth = getStrokeWidth();
    const containerStyles: ViewStyle = {
        width: circularSize,
        height: circularSize,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        ...style,
    };

    const labelStyles: TextStyle = {
        position: "absolute",
        fontSize: size === "sm" ? 10 : size === "md" ? 12 : 14,
        fontWeight: "600",
        color: colors.foreground,
    };

    // For now, we'll use a simple circular view as a placeholder
    // In a real implementation, you'd use react-native-svg for proper circular progress
    const circularStyles: ViewStyle = {
        width: circularSize,
        height: circularSize,
        borderRadius: circularSize / 2,
        borderWidth: strokeWidth,
        borderColor: colors.muted,
        borderTopColor: color,
        transform: [{ rotate: `${(percentage / 100) * 360}deg` }],
    };

    return (
        <View style={containerStyles}>
            <View style={circularStyles} />
            {showLabel && <Text style={labelStyles}>{Math.round(percentage)}%</Text>}
        </View>
    );
}
