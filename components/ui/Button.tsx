import { useThemeStyles } from "@/hooks/useTheme";
import {
    AccessibilityLabels,
    AccessibilityRoles,
    ColorContrast,
    TouchTargetValidator,
} from "@/utils/accessibility";
import { createButtonPressAnimation } from "@/utils/celebrations";
import React, { useRef } from "react";
import {
    AccessibilityRole,
    ActivityIndicator,
    Animated,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

export interface ButtonProps {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "success" | "destructive";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    onPress: () => void;
    children: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
}

export function Button({
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    onPress,
    children,
    style,
    textStyle,
    accessibilityLabel,
    accessibilityHint,
    testID,
}: ButtonProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const getButtonStyles = (): ViewStyle => {
        const baseStyles: ViewStyle = {
            borderRadius: borderRadius.sm,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
        };

        // Size styles with proper minimum touch targets (44px minimum)
        const sizeStyles: Record<string, ViewStyle> = {
            sm: {
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                minHeight: 44, // WCAG minimum touch target
            },
            md: {
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minHeight: 48,
            },
            lg: {
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                minHeight: 52,
            },
        };

        // Variant styles with better contrast
        const variantStyles: Record<string, ViewStyle> = {
            primary: {
                backgroundColor: disabled ? colors.muted : colors.primary,
            },
            secondary: {
                backgroundColor: disabled ? colors.muted : colors.card,
                borderWidth: 1,
                borderColor: disabled ? colors.muted : colors.border,
            },
            outline: {
                backgroundColor: disabled ? colors.muted : colors.background,
                borderWidth: 1,
                borderColor: disabled ? colors.muted : colors.primary,
            },
            ghost: {
                backgroundColor: disabled ? colors.muted : colors.background,
            },
            destructive: {
                backgroundColor: disabled ? colors.muted : colors.destructive,
            },
        };

        return {
            ...baseStyles,
            ...sizeStyles[size],
            ...variantStyles[variant],
            opacity: disabled ? 0.6 : 1,
            ...style,
        };
    };

    const getTextStyles = (): TextStyle => {
        const baseTextStyles: TextStyle = {
            fontWeight: "600",
            textAlign: "center",
        };

        // Size text styles
        const sizeTextStyles: Record<string, TextStyle> = {
            sm: {
                fontSize: 14,
            },
            md: {
                fontSize: 16,
            },
            lg: {
                fontSize: 18,
            },
        };

        // Variant text styles with better contrast
        const variantTextStyles: Record<string, TextStyle> = {
        primary: {
            color: disabled ? colors.foreground : colors.primaryForeground,
        },
        secondary: {
            color: disabled ? colors.foreground : colors.foreground,
        },
        outline: {
            color: disabled ? colors.foreground : colors.primary,
        },
        ghost: {
            color: disabled ? colors.foreground : colors.primary,
        },
        destructive: {
            color: disabled ? colors.foreground : colors.destructiveForeground,
        },
        };

        return {
            ...baseTextStyles,
            ...sizeTextStyles[size],
            ...variantTextStyles[variant],
            ...textStyle,
        };
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            // Create button press animation with haptic feedback
            // Requirement 3.2: Haptic feedback for button interactions
            createButtonPressAnimation(scaleAnim, true).start();

            // Call the original onPress after a short delay to allow animation
            setTimeout(() => {
                onPress();
            }, 50);
        }
    };

    // Generate accessibility label
    const buttonText = typeof children === "string" ? children : "Button";
    const generatedAccessibilityLabel =
        accessibilityLabel ||
        AccessibilityLabels.buttonLabel(
            buttonText,
            loading ? "loading" : disabled ? "disabled" : undefined,
        );

    // Validate touch target size
    const buttonStyles = getButtonStyles();
    const minHeight =
        typeof buttonStyles.minHeight === "number" ? buttonStyles.minHeight : 44;
    const isValidTouchTarget = TouchTargetValidator.isValidTouchTarget(
        100,
        minHeight,
    );

    if (!isValidTouchTarget) {
        console.warn(`Button touch target may be too small: ${minHeight}px height`);
    }

    // Validate color contrast for accessibility
    const textColor = getTextStyles().color;
    const backgroundColor = buttonStyles.backgroundColor;

    if (
        textColor &&
        backgroundColor &&
        typeof textColor === "string" &&
        typeof backgroundColor === "string"
    ) {
        const contrastRatio = ColorContrast.getContrastRatio(
            textColor,
            backgroundColor,
        );
        if (!ColorContrast.meetsWCAGAA(textColor, backgroundColor)) {
            console.warn(
                `Button color contrast may not meet WCAG AA standards: ${contrastRatio.toFixed(2)}:1`,
            );
        }
    }

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={getButtonStyles()}
                onPress={handlePress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole={AccessibilityRoles.button as AccessibilityRole}
                accessibilityLabel={generatedAccessibilityLabel}
                accessibilityHint={accessibilityHint}
                accessibilityState={{
                    disabled: disabled || loading,
                    busy: loading,
                }}
                testID={testID}
            >
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color={
                            variant === "primary"
                                ? colors.primaryForeground
                                : colors.foreground
                        }
                        style={{ marginRight: spacing.xs }}
                    />
                )}
                <Text style={getTextStyles()}>{children}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}
