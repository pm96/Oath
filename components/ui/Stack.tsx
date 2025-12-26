import { spacing, SpacingKey } from "@/utils/spacing";
import React from "react";
import { View, ViewStyle } from "react-native";

export interface StackProps {
    direction?: "row" | "column";
    spacing?: SpacingKey | number;
    align?: "flex-start" | "flex-end" | "center" | "stretch";
    justify?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
    wrap?: boolean;
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Stack({
    direction = "column",
    spacing: spacingProp = "md",
    align = "stretch",
    justify = "flex-start",
    wrap = false,
    children,
    style,
}: StackProps) {
    const spacingValue =
        typeof spacingProp === "string" ? spacing[spacingProp] : spacingProp;

    const stackStyles: ViewStyle = {
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : "nowrap",
        gap: spacingValue,
        ...style,
    };

    return <View style={stackStyles}>{children}</View>;
}

// Convenience components
export function HStack(props: Omit<StackProps, "direction">) {
    return <Stack direction="row" {...props} />;
}

export function VStack(props: Omit<StackProps, "direction">) {
    return <Stack direction="column" {...props} />;
}
