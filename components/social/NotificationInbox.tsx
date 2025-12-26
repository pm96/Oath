import { Text } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { FriendRequestNotificationCard } from "./FriendRequestNotificationCard";
import { NudgeNotificationCard } from "./NudgeNotificationCard";

export interface NotificationItem {
    id: string;
    type: "friend_request" | "nudge" | "shame" | "general";
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    data?: any; // Additional data specific to notification type
}

export interface NotificationInboxProps {
    notifications: NotificationItem[];
    loading?: boolean;
    onRefresh?: () => Promise<void>;
    onNotificationPress?: (notification: NotificationItem) => void;
    onMarkAsRead?: (notificationId: string) => void;
    onDismiss?: (notificationId: string) => void;
    // Friend request specific handlers
    onAcceptFriendRequest?: (requestId: string) => Promise<void>;
    onRejectFriendRequest?: (requestId: string) => Promise<void>;
    // Nudge specific handlers
    onViewGoal?: (goalId: string) => void;
}

/**
 * NotificationInbox Component
 *
 * Displays a list of notifications with different card types based on notification type
 * Requirements: 6.2 - Redesign notification cards with new styling
 * Requirements: 6.2 - Add notification badges and indicators
 */
export function NotificationInbox({
    notifications,
    loading = false,
    onRefresh,
    onNotificationPress,
    onMarkAsRead,
    onDismiss,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onViewGoal,
}: NotificationInboxProps) {
    const { colors, spacing, typography, borderRadius } = useThemeStyles();
    const [refreshing, setRefreshing] = React.useState(false);

    const handleRefresh = React.useCallback(async () => {
        if (!onRefresh) return;

        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh]);

    const renderNotificationItem = React.useCallback(
        ({ item }: { item: NotificationItem }) => {
            const commonProps = {
                timestamp: item.timestamp,
                isRead: item.isRead,
                onMarkAsRead: onMarkAsRead ? () => onMarkAsRead(item.id) : undefined,
                onDismiss: onDismiss ? () => onDismiss(item.id) : undefined,
            };

            switch (item.type) {
                case "friend_request":
                    return (
                        <FriendRequestNotificationCard
                            {...commonProps}
                            senderName={item.data?.senderName || "Unknown"}
                            senderEmail={item.data?.senderEmail}
                            onAccept={
                                onAcceptFriendRequest && item.data?.requestId
                                    ? () => onAcceptFriendRequest(item.data.requestId)
                                    : undefined
                            }
                            onReject={
                                onRejectFriendRequest && item.data?.requestId
                                    ? () => onRejectFriendRequest(item.data.requestId)
                                    : undefined
                            }
                        />
                    );

                case "nudge":
                    return (
                        <NudgeNotificationCard
                            {...commonProps}
                            senderName={item.data?.senderName || "Unknown"}
                            goalDescription={item.data?.goalDescription || "Unknown goal"}
                            onViewGoal={
                                onViewGoal && item.data?.goalId
                                    ? () => onViewGoal(item.data.goalId)
                                    : undefined
                            }
                        />
                    );

                default:
                    // Generic notification card for other types
                    return (
                        <View
                            style={{
                                backgroundColor: item.isRead ? colors.card : colors.accent,
                                borderRadius: 12,
                                padding: spacing.md,
                                borderLeftWidth: 4,
                                borderLeftColor: colors.primary,
                                marginBottom: spacing.sm,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: typography.sizes.md,
                                    fontWeight: typography.weights.semibold as any,
                                    color: colors.foreground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                {item.title}
                            </Text>
                            <Text
                                style={{
                                    fontSize: typography.sizes.sm,
                                    color: colors.mutedForeground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                {item.message}
                            </Text>
                            <Text
                                style={{
                                    fontSize: typography.sizes.xs,
                                    color: colors.mutedForeground,
                                }}
                            >
                                {item.timestamp}
                            </Text>
                        </View>
                    );
            }
        },
        [
            colors,
            spacing,
            typography,
            onMarkAsRead,
            onDismiss,
            onAcceptFriendRequest,
            onRejectFriendRequest,
            onViewGoal,
        ],
    );

    const renderEmptyState = () => (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: spacing.xl,
            }}
        >
            <Text
                style={{
                    fontSize: typography.sizes.lg,
                    color: colors.mutedForeground,
                    textAlign: "center",
                    marginBottom: spacing.sm,
                }}
            >
                📬 No notifications
            </Text>
            <Text
                style={{
                    fontSize: typography.sizes.sm,
                    color: colors.mutedForeground,
                    textAlign: "center",
                }}
            >
                You&apos;re all caught up!
            </Text>
        </View>
    );

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <View style={{ flex: 1 }}>
            {/* Header with unread count */}
            {notifications.length > 0 && (
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                        }}
                    >
                        Notifications
                    </Text>
                    {unreadCount > 0 && (
                        <View
                            style={{
                                backgroundColor: colors.destructive,
                                borderRadius: borderRadius.full,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: spacing.xs,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: typography.sizes.xs,
                                    fontWeight: typography.weights.bold as any,
                                    color: colors.destructiveForeground,
                                }}
                            >
                                {unreadCount} new
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Notifications list */}
            <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    padding: spacing.md,
                    flexGrow: 1,
                }}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    ) : undefined
                }
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            />
        </View>
    );
}
