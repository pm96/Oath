import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { Text } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { View } from "react-native";

export interface NudgeNotificationCardProps {
    senderName: string;
    goalDescription: string;
    timestamp: string;
    isRead?: boolean;
    onMarkAsRead?: () => void;
    onViewGoal?: () => void;
    onDismiss?: () => void;
}

/**
 * NudgeNotificationCard Component
 *
 * Specialized notification card for nudge notifications with proper visual hierarchy
 * Requirements: 6.2 - Update nudge notifications with proper visual hierarchy
 */
export function NudgeNotificationCard({
    senderName,
    goalDescription,
    timestamp,
    isRead = false,
    onMarkAsRead,
    onViewGoal,
    onDismiss,
}: NudgeNotificationCardProps) {
    const { colors, spacing, typography } = useThemeStyles();

    const handleViewGoal = () => {
        if (onMarkAsRead && !isRead) {
            onMarkAsRead();
        }
        if (onViewGoal) {
            onViewGoal();
        }
    };

    return (
        <Card
            variant="outlined"
            padding="md"
            style={{
                borderLeftWidth: 4,
                borderLeftColor: colors.warning,
                backgroundColor: isRead ? colors.card : colors.accent,
                opacity: isRead ? 0.8 : 1,
                position: "relative",
            }}
        >
            {/* Nudge Badge */}
            {!isRead && (
                <View style={{ position: "absolute", top: -8, right: -8 }}>
                    <NotificationBadge count={1} variant="warning" size="sm" />
                </View>
            )}

            <View style={{ gap: spacing.sm }}>
                {/* Header with sender and nudge type */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                    }}
                >
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            fontWeight: typography.weights.medium as any,
                            color: colors.warning,
                        }}
                    >
                        🔔 NUDGE
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.sizes.xs,
                            color: colors.mutedForeground,
                        }}
                    >
                        {timestamp}
                    </Text>
                </View>

                {/* Main message */}
                <View style={{ gap: spacing.xs }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.md,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                        }}
                    >
                        {senderName} sent you a nudge!
                    </Text>

                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            lineHeight: typography.sizes.sm * 1.4,
                        }}
                    >
                        Time to work on: &quot;{goalDescription}&quot;
                    </Text>
                </View>

                {/* Action buttons */}
                <View
                    style={{
                        flexDirection: "row",
                        gap: spacing.sm,
                        marginTop: spacing.xs,
                    }}
                >
                    <Button
                        variant="primary"
                        size="sm"
                        onPress={handleViewGoal}
                        style={{ flex: 1 }}
                    >
                        View Goal
                    </Button>
                    {onDismiss && (
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={onDismiss}
                            style={{ flex: 1 }}
                        >
                            Dismiss
                        </Button>
                    )}
                </View>

                {/* Unread indicator */}
                {!isRead && (
                    <View
                        style={{
                            position: "absolute",
                            right: spacing.sm,
                            top: spacing.sm,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.warning,
                        }}
                    />
                )}
            </View>
        </Card>
    );
}
