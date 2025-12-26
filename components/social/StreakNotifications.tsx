import {
    Body,
    Button,
    Caption,
    Card,
    Heading,
    HStack,
    LoadingSkeleton,
} from "@/components/ui";
import { VStack } from "@/components/ui/Stack";
import { useStreakSocial } from "@/hooks/useStreakSocial";
import { useThemeStyles } from "@/hooks/useTheme";
import { StreakNotification } from "@/services/firebase/streakSocialService";
import { HapticFeedback } from "@/utils/celebrations";
import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import {
    Bell,
    BellOff,
    Check,
    Heart,
    MessageCircle,
    Trophy,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { FlatList, ListRenderItem, RefreshControl, View } from "react-native";

export interface StreakNotificationsProps {
    userId: string;
    onNotificationPress?: (notification: StreakNotification) => void;
}

interface NotificationItemProps {
    notification: StreakNotification;
    onPress: (notification: StreakNotification) => void;
    onMarkAsRead: (notificationId: string) => void;
}

/**
 * Individual notification item component
 * Requirements: 8.5
 */
const NotificationItem = React.memo<NotificationItemProps>(
    ({ notification, onPress, onMarkAsRead }) => {
        const { colors, spacing } = useThemeStyles();

        // Handle notification press
        const handlePress = useCallback(() => {
            HapticFeedback.selection();
            if (!notification.read) {
                onMarkAsRead(notification.id);
            }
            onPress(notification);
        }, [notification, onPress, onMarkAsRead]);

        // Get notification icon and color
        const getNotificationInfo = useCallback(() => {
            switch (notification.type) {
                case "milestone_achievement":
                    return {
                        icon: Trophy,
                        color: "#FFD700",
                        backgroundColor: "#FFD70020",
                    };
                case "reaction":
                    return {
                        icon: Heart,
                        color: "#FF6B6B",
                        backgroundColor: "#FF6B6B20",
                    };
                case "streak_share":
                    return {
                        icon: MessageCircle,
                        color: colors.primary,
                        backgroundColor: `${colors.primary}20`,
                    };
                default:
                    return {
                        icon: Bell,
                        color: colors.mutedForeground,
                        backgroundColor: `${colors.mutedForeground}20`,
                    };
            }
        }, [notification.type, colors]);

        // Format time ago
        const timeAgo = useMemo(() => {
            const now = new Date();
            const notificationTime = notification.createdAt.toDate();
            const diffMs = now.getTime() - notificationTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                return `${diffDays}d ago`;
            } else if (diffHours > 0) {
                return `${diffHours}h ago`;
            } else {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `${Math.max(1, diffMinutes)}m ago`;
            }
        }, [notification.createdAt]);

        const notificationInfo = getNotificationInfo();
        const IconComponent = notificationInfo.icon;

        return (
            <Card
                variant="outlined"
                padding="md"
                onPress={handlePress}
                style={{
                    marginBottom: spacing.sm,
                    backgroundColor: notification.read
                        ? colors.background
                        : `${colors.primary}05`,
                    borderLeftWidth: notification.read ? 1 : 4,
                    borderLeftColor: notification.read
                        ? colors.border
                        : notificationInfo.color,
                }}
            >
                <HStack align="flex-start" spacing="sm">
                    {/* Icon */}
                    <View
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: notificationInfo.backgroundColor,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <IconComponent size={20} color={notificationInfo.color} />
                    </View>

                    {/* Content */}
                    <VStack style={{ flex: 1 }} spacing="xs">
                        {/* Sender and time */}
                        <HStack align="center" justify="space-between">
                            <Body weight="semibold" numberOfLines={1}>
                                {notification.senderName}
                            </Body>
                            <Caption color="muted">{timeAgo}</Caption>
                        </HStack>

                        {/* Message */}
                        <Body numberOfLines={2}>{notification.message}</Body>

                        {/* Additional info based on type */}
                        {notification.type === "milestone_achievement" &&
                            notification.milestoneData && (
                                <Caption color="muted">
                                    {notification.milestoneData.days} day milestone on{" "}
                                    {`\u201C${notification.milestoneData.habitDescription}\u201D`}
                                </Caption>
                            )}

                        {notification.type === "reaction" && notification.reactionData && (
                            <Caption color="muted">
                                Reacted{" "}
                                {getReactionEmoji(notification.reactionData.reactionType)} to
                                your {notification.reactionData.postType}
                            </Caption>
                        )}
                    </VStack>

                    {/* Mark as read button */}
                    {!notification.read && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                                HapticFeedback.selection();
                                onMarkAsRead(notification.id);
                            }}
                            style={{
                                padding: spacing.xs,
                                minWidth: 32,
                                minHeight: 32,
                            }}
                        >
                            <Check size={16} color={colors.mutedForeground} />
                        </Button>
                    )}
                </HStack>
            </Card>
        );
    },
);

NotificationItem.displayName = "NotificationItem";

/**
 * Loading skeleton for notifications
 */
const NotificationSkeleton = React.memo(() => {
    const { spacing } = useThemeStyles();

    return (
        <Card variant="outlined" padding="md" style={{ marginBottom: spacing.sm }}>
            <HStack align="flex-start" spacing="sm">
                <LoadingSkeleton width={40} height={40} borderRadius={20} />
                <VStack style={{ flex: 1 }} spacing="xs">
                    <HStack align="center" justify="space-between">
                        <LoadingSkeleton height={16} width="50%" />
                        <LoadingSkeleton height={12} width="20%" />
                    </HStack>
                    <LoadingSkeleton height={16} width="80%" />
                    <LoadingSkeleton height={12} width="60%" />
                </VStack>
            </HStack>
        </Card>
    );
});

NotificationSkeleton.displayName = "NotificationSkeleton";

/**
 * Empty state component
 */
const EmptyState = React.memo(() => {
    const { colors } = useThemeStyles();

    return (
        <Card variant="outlined" padding="lg">
            <VStack align="center" spacing="md">
                <BellOff size={48} color={colors.mutedForeground} />
                <Heading size="md" color="muted" align="center">
                    No notifications yet
                </Heading>
                <Body color="muted" align="center">
                    {"You\u2019ll receive notifications when friends achieve milestones or react to your posts!"}
                </Body>
            </VStack>
        </Card>
    );
});

EmptyState.displayName = "EmptyState";

/**
 * Streak Notifications Component
 *
 * Displays notifications for streak achievements, reactions, and social interactions
 * Requirements: 8.5
 */
export function StreakNotifications({
    userId,
    onNotificationPress,
}: StreakNotificationsProps) {
    const { colors, spacing } = useThemeStyles();
    const {
        notifications,
        unreadNotificationCount,
        loading,
        error,
        markNotificationAsRead,
        refresh,
    } = useStreakSocial(userId);

    const [refreshing, setRefreshing] = React.useState(false);

    // Get device performance tier for optimizations
    const performanceTier = useMemo(() => getDevicePerformanceTier(), []);
    const flatListProps = useMemo(
        () => getOptimizedFlatListProps(performanceTier),
        [performanceTier],
    );

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    // Handle notification press
    const handleNotificationPress = useCallback(
        (notification: StreakNotification) => {
            onNotificationPress?.(notification);
        },
        [onNotificationPress],
    );

    // Handle mark as read
    const handleMarkAsRead = useCallback(
        async (notificationId: string) => {
            await markNotificationAsRead(notificationId);
        },
        [markNotificationAsRead],
    );

    // Mark all as read
    const handleMarkAllAsRead = useCallback(async () => {
        const unreadNotifications = notifications.filter((n) => !n.read);
        for (const notification of unreadNotifications) {
            await markNotificationAsRead(notification.id);
        }
    }, [notifications, markNotificationAsRead]);

    // Render item function
    const renderItem: ListRenderItem<StreakNotification> = useCallback(
        ({ item }) => (
            <NotificationItem
                notification={item}
                onPress={handleNotificationPress}
                onMarkAsRead={handleMarkAsRead}
            />
        ),
        [handleNotificationPress, handleMarkAsRead],
    );

    // Key extractor
    const keyExtractor = useCallback((item: StreakNotification) => item.id, []);

    // Loading state
    if (loading) {
        return (
            <VStack spacing="md">
                <Heading size="md">Notifications</Heading>
                {[1, 2, 3].map((i) => (
                    <NotificationSkeleton key={i} />
                ))}
            </VStack>
        );
    }

    // Error state
    if (error) {
        return (
            <VStack spacing="md">
                <HStack align="center" justify="space-between">
                    <Heading size="md">Notifications</Heading>
                    <Button variant="ghost" size="sm" onPress={handleRefresh}>
                        Retry
                    </Button>
                </HStack>
                <Card variant="outlined" padding="lg">
                    <VStack align="center" spacing="md">
                        <Body color="destructive" align="center">
                            Failed to load notifications
                        </Body>
                        <Caption color="muted" align="center">
                            {error}
                        </Caption>
                        <Button variant="outline" size="sm" onPress={handleRefresh}>
                            Try Again
                        </Button>
                    </VStack>
                </Card>
            </VStack>
        );
    }

    return (
        <VStack spacing="md" style={{ flex: 1 }}>
            {/* Header */}
            <HStack align="center" justify="space-between">
                <HStack align="center" spacing="sm">
                    <Heading size="md">Notifications</Heading>
                    {unreadNotificationCount > 0 && (
                        <View
                            style={{
                                backgroundColor: colors.destructive,
                                borderRadius: 10,
                                minWidth: 20,
                                height: 20,
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 6,
                            }}
                        >
                            <Caption color="foreground" size="xs" weight="bold">
                                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                            </Caption>
                        </View>
                    )}
                </HStack>
                {notifications.length > 0 && (
                    <VStack align="flex-end">
                        <Caption color="muted">
                            {notifications.length}{" "}
                            {notifications.length === 1 ? "notification" : "notifications"}
                        </Caption>
                        {unreadNotificationCount > 0 && (
                            <Button variant="ghost" size="sm" onPress={handleMarkAllAsRead}>
                                <Caption color="primary">Mark all read</Caption>
                            </Button>
                        )}
                    </VStack>
                )}
            </HStack>

            {/* Notifications list or empty state */}
            {notifications.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={{
                        paddingBottom: spacing.lg,
                    }}
                    {...flatListProps}
                />
            )}
        </VStack>
    );
}

// Helper functions

function getReactionEmoji(reactionType: string): string {
    switch (reactionType) {
        case "congratulations":
            return "🎉";
        case "fire":
            return "🔥";
        case "clap":
            return "👏";
        case "heart":
            return "❤️";
        default:
            return "👍";
    }
}
