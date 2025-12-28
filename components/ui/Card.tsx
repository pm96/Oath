import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from "react-native";

export interface CardProps extends TouchableOpacityProps {
    variant?: "default" | "elevated" | "outlined";
    padding?: "sm" | "md" | "lg";
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
}

export function Card({
    variant = "default",
    padding = "md",
    children,
    onPress,
    style,
    ...props
}: CardProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();

    const getCardStyles = (): ViewStyle => {
        const baseStyles: ViewStyle = {
            borderRadius: borderRadius.md,
            backgroundColor: colors.card,
        };

        // Padding styles
        const paddingStyles: Record<string, ViewStyle> = {
            sm: {
                padding: spacing.sm,
            },
            md: {
                padding: spacing.md,
            },
            lg: {
                padding: spacing.lg,
            },
        };

        // Variant styles
        const variantStyles: Record<string, ViewStyle> = {
            default: {
                backgroundColor: colors.card,
            },
            elevated: {
                backgroundColor: colors.card,
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
            },
            outlined: {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
            },
        };

        return {
            ...baseStyles,
            ...paddingStyles[padding],
            ...variantStyles[variant],
            ...style,
        };
    };

    if (onPress) {
        return (
            <TouchableOpacity
                style={getCardStyles()}
                onPress={onPress}
                activeOpacity={0.95}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                {...props}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={getCardStyles()} {...props}>{children}</View>;
}
