import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { View, ViewStyle } from "react-native";
import { Badge, BadgeText } from "./badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";

export interface NotificationCardProps {
    title: string;
    message: string;
    timestamp?: string;
    type?: "friend_request" | "nudge" | "shame" | "general";
    isRead?: boolean;
    onPress?: () => void;
    onAction?: () => void;
    actionLabel?: string;
    onDismiss?: () => void;
    showBadge?: boolean;
    style?: ViewStyle;
}

/**
 * NotificationCard Component
 *
 * Modern notification card with consistent styling, visual hierarchy, and action buttons
 * Requirements: 6.2 - Redesign notification cards with new styling
 */
export function NotificationCard({
    title,
    message,
    timestamp,
    type = "general",
    isRead = false,
    onPress,
    onAction,
    actionLabel,
    onDismiss,
    showBadge = false,
    style,
}: NotificationCardProps) {
    const { colors, spacing, typography } = useThemeStyles();

    const getNotificationTypeStyles = () => {
        switch (type) {
            case "friend_request":
                return {
                    borderLeftColor: colors.info,
                    badgeAction: "info" as const,
                    iconName: "person-add",
                };
            case "nudge":
                return {
                    borderLeftColor: colors.warning,
                    badgeAction: "warning" as const,
                    iconName: "notifications",
                };
            case "shame":
                return {
                    borderLeftColor: colors.destructive,
                    badgeAction: "error" as const,
                    iconName: "warning",
                };
            default:
                return {
                    borderLeftColor: colors.primary,
                    badgeAction: "muted" as const,
                    iconName: "info",
                };
        }
    };

    const typeStyles = getNotificationTypeStyles();

    const cardStyles: ViewStyle = {
        borderLeftWidth: 4,
        borderLeftColor: typeStyles.borderLeftColor,
        backgroundColor: isRead ? colors.card : colors.accent,
        opacity: isRead ? 0.8 : 1,
        ...style,
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        }
    };

    return (
        <Card
            variant="outlined"
            padding="md"
            style={cardStyles}
            onPress={handlePress}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing.sm,
                }}
            >
                {/* Notification Badge */}
                {showBadge && (
                    <Badge action={typeStyles.badgeAction} size="sm">
                        <BadgeText>{type.replace("_", " ").toUpperCase()}</BadgeText>
                    </Badge>
                )}

                {/* Content */}
                <View style={{ flex: 1, gap: spacing.xs }}>
                    {/* Title */}
                    <Text
                        style={{
                            fontSize: typography.sizes.md,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                        }}
                    >
                        {title}
                    </Text>

                    {/* Message */}
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            lineHeight: typography.sizes.sm * 1.4,
                        }}
                    >
                        {message}
                    </Text>

                    {/* Timestamp */}
                    {timestamp && (
                        <Text
                            style={{
                                fontSize: typography.sizes.xs,
                                color: colors.mutedForeground,
                                marginTop: spacing.xs,
                            }}
                        >
                            {timestamp}
                        </Text>
                    )}

                    {/* Action Buttons */}
                    {(onAction || onDismiss) && (
                        <View
                            style={{
                                flexDirection: "row",
                                gap: spacing.sm,
                                marginTop: spacing.sm,
                            }}
                        >
                            {onAction && actionLabel && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onPress={onAction}
                                    style={{ flex: 1 }}
                                >
                                    {actionLabel}
                                </Button>
                            )}
                            {onDismiss && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={onDismiss}
                                    style={{ flex: onAction ? 1 : undefined }}
                                >
                                    Dismiss
                                </Button>
                            )}
                        </View>
                    )}
                </View>

                {/* Unread indicator */}
                {!isRead && (
                    <View
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                            marginTop: spacing.xs,
                        }}
                    />
                )}
            </View>
        </Card>
    );
}
