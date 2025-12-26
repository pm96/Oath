import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { Text, View, ViewStyle } from "react-native";

export interface NotificationBadgeProps {
    count: number;
    maxCount?: number;
    size?: "sm" | "md" | "lg";
    variant?: "primary" | "destructive" | "warning" | "success";
    style?: ViewStyle;
}

/**
 * NotificationBadge Component
 *
 * Small badge component for displaying notification counts
 * Requirements: 6.2 - Add notification badges and indicators
 */
export function NotificationBadge({
    count,
    maxCount = 99,
    size = "md",
    variant = "destructive",
    style,
}: NotificationBadgeProps) {
    const { colors, typography, borderRadius } = useThemeStyles();

    if (count <= 0) {
        return null;
    }

    const getSizeStyles = () => {
        switch (size) {
            case "sm":
                return {
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    fontSize: typography.sizes.xs - 2,
                };
            case "md":
                return {
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 6,
                    fontSize: typography.sizes.xs,
                };
            case "lg":
                return {
                    minWidth: 24,
                    height: 24,
                    paddingHorizontal: 8,
                    fontSize: typography.sizes.sm,
                };
        }
    };

    const getVariantStyles = () => {
        switch (variant) {
            case "primary":
                return {
                    backgroundColor: colors.primary,
                    color: colors.primaryForeground,
                };
            case "destructive":
                return {
                    backgroundColor: colors.destructive,
                    color: colors.destructiveForeground,
                };
            case "warning":
                return {
                    backgroundColor: colors.warning,
                    color: colors.warningForeground,
                };
            case "success":
                return {
                    backgroundColor: colors.success,
                    color: colors.successForeground,
                };
        }
    };

    const sizeStyles = getSizeStyles();
    const variantStyles = getVariantStyles();

    const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

    return (
        <View
            style={[
                {
                    minWidth: sizeStyles.minWidth,
                    height: sizeStyles.height,
                    paddingHorizontal: sizeStyles.paddingHorizontal,
                    backgroundColor: variantStyles.backgroundColor,
                    borderRadius: borderRadius.full,
                    alignItems: "center",
                    justifyContent: "center",
                    position: "absolute",
                    top: -8,
                    right: -8,
                },
                style,
            ]}
        >
            <Text
                style={{
                    color: variantStyles.color,
                    fontSize: sizeStyles.fontSize,
                    fontWeight: typography.weights.bold as any,
                    textAlign: "center",
                }}
            >
                {displayCount}
            </Text>
        </View>
    );
}
