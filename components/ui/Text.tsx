import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import {
    Text as RNText,
    TextProps as RNTextProps,
    TextStyle,
} from "react-native";

export interface TextProps extends Omit<RNTextProps, "style"> {
    variant?: "heading" | "subheading" | "body" | "caption" | "label";
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
    weight?: "normal" | "medium" | "semibold" | "bold";
    color?:
    | "primary"
    | "secondary"
    | "muted"
    | "foreground"
    | "success"
    | "warning"
    | "destructive";
    align?: "left" | "center" | "right";
    style?: TextStyle;
    children: React.ReactNode;
}

export function Text({
    variant = "body",
    size,
    weight,
    color = "foreground",
    align = "left",
    style,
    children,
    ...props
}: TextProps) {
    const { colors, typography } = useThemeStyles();

    const getTextStyles = (): TextStyle => {
        // Base styles
        const baseStyles: TextStyle = {
            color: getTextColor(),
            textAlign: align,
        };

        // Variant styles (semantic sizing and weights)
        const variantStyles: Record<string, TextStyle> = {
            heading: {
                fontSize: size ? typography.sizes[size] : typography.sizes.xxl,
                fontWeight: weight || "700",
                lineHeight:
                    (size ? typography.sizes[size] : typography.sizes.xxl) * 1.2,
            },
            subheading: {
                fontSize: size ? typography.sizes[size] : typography.sizes.xl,
                fontWeight: weight || "600",
                lineHeight: (size ? typography.sizes[size] : typography.sizes.xl) * 1.3,
            },
            body: {
                fontSize: size ? typography.sizes[size] : typography.sizes.md,
                fontWeight: weight || "400",
                lineHeight: (size ? typography.sizes[size] : typography.sizes.md) * 1.5,
            },
            caption: {
                fontSize: size ? typography.sizes[size] : typography.sizes.sm,
                fontWeight: weight || "400",
                lineHeight: (size ? typography.sizes[size] : typography.sizes.sm) * 1.4,
            },
            label: {
                fontSize: size ? typography.sizes[size] : typography.sizes.sm,
                fontWeight: weight || "500",
                lineHeight: (size ? typography.sizes[size] : typography.sizes.sm) * 1.3,
            },
        };

        return {
            ...baseStyles,
            ...variantStyles[variant],
            ...style,
        };
    };

    const getTextColor = (): string => {
        const colorMap: Record<string, string> = {
            primary: colors.primary,
            secondary: colors.secondaryForeground,
            muted: colors.mutedForeground,
            foreground: colors.foreground,
            success: colors.success,
            warning: colors.warning,
            destructive: colors.destructive,
        };

        return colorMap[color] || colors.foreground;
    };

    return (
        <RNText style={getTextStyles()} {...props}>
            {children}
        </RNText>
    );
}

// Convenience components for common text patterns
export function Heading({ children, ...props }: Omit<TextProps, "variant">) {
    return (
        <Text variant="heading" {...props}>
            {children}
        </Text>
    );
}

export function Subheading({ children, ...props }: Omit<TextProps, "variant">) {
    return (
        <Text variant="subheading" {...props}>
            {children}
        </Text>
    );
}

export function Body({ children, ...props }: Omit<TextProps, "variant">) {
    return (
        <Text variant="body" {...props}>
            {children}
        </Text>
    );
}

export function Caption({ children, ...props }: Omit<TextProps, "variant">) {
    return (
        <Text variant="caption" {...props}>
            {children}
        </Text>
    );
}

export function Label({ children, ...props }: Omit<TextProps, "variant">) {
    return (
        <Text variant="label" {...props}>
            {children}
        </Text>
    );
}
