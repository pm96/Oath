import { useThemeStyles } from "@/hooks/useTheme";
import { SpacingKey } from "@/utils/spacing";
import React from "react";
import { DimensionValue, View, ViewStyle } from "react-native";

export interface ContainerProps {
    maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
    padding?: SpacingKey;
    center?: boolean;
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Container({
    maxWidth = "full",
    padding = "md",
    center = false,
    children,
    style,
}: ContainerProps) {
    const { spacing } = useThemeStyles();

    const getMaxWidth = (): DimensionValue => {
        const maxWidths = {
            sm: 480,
            md: 768,
            lg: 1024,
            xl: 1280,
            full: "100%" as DimensionValue,
        };
        return maxWidths[maxWidth];
    };

    const containerStyles: ViewStyle = {
        width: "100%",
        maxWidth: getMaxWidth(),
        padding: spacing[padding as keyof typeof spacing] || spacing.md,
        ...(center && {
            alignSelf: "center",
        }),
        ...style,
    };

    return <View style={containerStyles}>{children}</View>;
}
