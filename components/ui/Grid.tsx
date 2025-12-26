import { spacing, SpacingKey } from "@/utils/spacing";
import React from "react";
import { View, ViewStyle } from "react-native";

export interface GridProps {
    columns?: number;
    spacing?: SpacingKey | number;
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Grid({
    columns = 2,
    spacing: spacingProp = "md",
    children,
    style,
}: GridProps) {
    const spacingValue =
        typeof spacingProp === "string" ? spacing[spacingProp] : spacingProp;

    const gridStyles: ViewStyle = {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -spacingValue / 2,
        ...style,
    };

    const itemStyles: ViewStyle = {
        width: `${100 / columns}%`,
        paddingHorizontal: spacingValue / 2,
        marginBottom: spacingValue,
    };

    const childrenArray = React.Children.toArray(children);

    return (
        <View style={gridStyles}>
            {childrenArray.map((child, index) => (
                <View key={index} style={itemStyles}>
                    {child}
                </View>
            ))}
        </View>
    );
}

// Convenience components for common grid layouts
export function Grid2(props: Omit<GridProps, "columns">) {
    return <Grid columns={2} {...props} />;
}

export function Grid3(props: Omit<GridProps, "columns">) {
    return <Grid columns={3} {...props} />;
}

export function Grid4(props: Omit<GridProps, "columns">) {
    return <Grid columns={4} {...props} />;
}
