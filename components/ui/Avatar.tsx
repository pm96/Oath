import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import {
    Image,
    ImageStyle,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

export interface AvatarProps {
    src?: string;
    fallback: string;
    size?: "sm" | "md" | "lg";
    status?: "online" | "offline" | "away";
    style?: ViewStyle;
}

export function Avatar({
    src,
    fallback,
    size = "md",
    status,
    style,
}: AvatarProps) {
    const { colors, borderRadius } = useThemeStyles();

    const getAvatarSize = () => {
        const sizes = {
            sm: 32,
            md: 40,
            lg: 56,
        };
        return sizes[size];
    };

    const getFallbackTextSize = () => {
        const sizes = {
            sm: 12,
            md: 16,
            lg: 20,
        };
        return sizes[size];
    };

    const getStatusIndicatorSize = () => {
        const sizes = {
            sm: 8,
            md: 10,
            lg: 12,
        };
        return sizes[size];
    };

    const getStatusColor = () => {
        const statusColors = {
            online: colors.success,
            offline: colors.mutedForeground,
            away: colors.warning,
        };
        return status ? statusColors[status] : undefined;
    };

    const avatarSize = getAvatarSize();
    const fallbackTextSize = getFallbackTextSize();
    const statusIndicatorSize = getStatusIndicatorSize();
    const statusColor = getStatusColor();

    const avatarStyles: ViewStyle = {
        width: avatarSize,
        height: avatarSize,
        borderRadius: borderRadius.full,
        backgroundColor: colors.muted,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        ...style,
    };

    const fallbackTextStyles: TextStyle = {
        fontSize: fallbackTextSize,
        fontWeight: "600",
        color: colors.mutedForeground,
        textTransform: "uppercase",
    };

    const imageStyles: ImageStyle = {
        width: avatarSize,
        height: avatarSize,
        borderRadius: borderRadius.full,
    };

    const statusIndicatorStyles: ViewStyle = {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: statusIndicatorSize,
        height: statusIndicatorSize,
        borderRadius: borderRadius.full,
        backgroundColor: statusColor,
        borderWidth: 2,
        borderColor: colors.background,
    };

    return (
        <View style={avatarStyles}>
            {src ? (
                <Image source={{ uri: src }} style={imageStyles} />
            ) : (
                <Text style={fallbackTextStyles}>{fallback.slice(0, 2)}</Text>
            )}
            {status && <View style={statusIndicatorStyles} />}
        </View>
    );
}
