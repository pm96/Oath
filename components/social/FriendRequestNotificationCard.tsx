import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { Text } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import React, { useState } from "react";
import { View } from "react-native";

export interface FriendRequestNotificationCardProps {
    senderName: string;
    senderEmail?: string;
    timestamp: string;
    isRead?: boolean;
    onAccept?: () => Promise<void>;
    onReject?: () => Promise<void>;
    onMarkAsRead?: () => void;
    onDismiss?: () => void;
}

/**
 * FriendRequestNotificationCard Component
 *
 * Specialized notification card for friend request notifications with action buttons
 * Requirements: 6.2 - Update nudge notifications with proper visual hierarchy
 * Requirements: 6.2 - Implement action buttons with consistent styling
 */
export function FriendRequestNotificationCard({
    senderName,
    senderEmail,
    timestamp,
    isRead = false,
    onAccept,
    onReject,
    onMarkAsRead,
    onDismiss,
}: FriendRequestNotificationCardProps) {
    const { colors, spacing, typography } = useThemeStyles();
    const [processing, setProcessing] = useState<"accept" | "reject" | null>(
        null,
    );

    const handleAccept = async () => {
        if (!onAccept) return;

        setProcessing("accept");
        try {
            await onAccept();
            if (onMarkAsRead && !isRead) {
                onMarkAsRead();
            }
        } catch (error) {
            console.error("Failed to accept friend request:", error);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!onReject) return;

        setProcessing("reject");
        try {
            await onReject();
            if (onMarkAsRead && !isRead) {
                onMarkAsRead();
            }
        } catch (error) {
            console.error("Failed to reject friend request:", error);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <Card
            variant="outlined"
            padding="md"
            style={{
                borderLeftWidth: 4,
                borderLeftColor: colors.info,
                backgroundColor: isRead ? colors.card : colors.accent,
                opacity: isRead ? 0.8 : 1,
                position: "relative",
            }}
        >
            {/* Friend Request Badge */}
            {!isRead && (
                <View style={{ position: "absolute", top: -8, right: -8 }}>
                    <NotificationBadge count={1} variant="primary" size="sm" />
                </View>
            )}

            <View style={{ gap: spacing.sm }}>
                {/* Header with request type */}
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
                            color: colors.info,
                        }}
                    >
                        👥 FRIEND REQUEST
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
                        {senderName} wants to be your friend
                    </Text>

                    {senderEmail && (
                        <Text
                            style={{
                                fontSize: typography.sizes.sm,
                                color: colors.mutedForeground,
                            }}
                        >
                            {senderEmail}
                        </Text>
                    )}

                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            lineHeight: typography.sizes.sm * 1.4,
                        }}
                    >
                        Accept to start sharing goals and holding each other accountable!
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
                    {onAccept && (
                        <Button
                            variant="primary"
                            size="sm"
                            onPress={handleAccept}
                            loading={processing === "accept"}
                            disabled={processing !== null}
                            style={{ flex: 1 }}
                        >
                            Accept
                        </Button>
                    )}
                    {onReject && (
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={handleReject}
                            loading={processing === "reject"}
                            disabled={processing !== null}
                            style={{ flex: 1 }}
                        >
                            Decline
                        </Button>
                    )}
                    {onDismiss && !onAccept && !onReject && (
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
                            backgroundColor: colors.info,
                        }}
                    />
                )}
            </View>
        </Card>
    );
}
