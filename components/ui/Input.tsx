import { useThemeStyles } from "@/hooks/useTheme";
import React, { useState } from "react";
import {
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

export interface InputProps extends Omit<TextInputProps, "style"> {
    label?: string;
    error?: string;
    helperText?: string;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
}

export function Input({
    label,
    error,
    helperText,
    containerStyle,
    inputStyle,
    ...textInputProps
}: InputProps) {
    const { colors, spacing, borderRadius, typography } = useThemeStyles();
    const [isFocused, setIsFocused] = useState(false);

    const containerStyles: ViewStyle = {
        marginBottom: spacing.sm,
        ...containerStyle,
    };

    const labelStyles: TextStyle = {
        fontSize: typography.sizes.sm,
        fontWeight: "500",
        color: colors.foreground,
        marginBottom: spacing.xs,
    };

    const inputContainerStyles: ViewStyle = {
        borderWidth: 1,
        borderColor: error
            ? colors.destructive
            : isFocused
                ? colors.ring
                : colors.border,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.background,
    };

    const textInputStyles: TextStyle = {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.sizes.md,
        color: colors.foreground,
        minHeight: 40,
        ...inputStyle,
    };

    const helperTextStyles: TextStyle = {
        fontSize: typography.sizes.xs,
        color: error ? colors.destructive : colors.mutedForeground,
        marginTop: spacing.xs,
    };

    return (
        <View style={containerStyles}>
            {label && <Text style={labelStyles}>{label}</Text>}
            <View style={inputContainerStyles}>
                <TextInput
                    {...textInputProps}
                    style={textInputStyles}
                    placeholderTextColor={colors.mutedForeground}
                    onFocus={(e) => {
                        setIsFocused(true);
                        textInputProps.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        textInputProps.onBlur?.(e);
                    }}
                />
            </View>
            {(error || helperText) && (
                <Text style={helperTextStyles}>{error || helperText}</Text>
            )}
        </View>
    );
}
