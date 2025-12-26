import { Body, Button, Card, Heading, HStack, LoadingSkeleton } from "@/components/ui";
import { VStack } from "@/components/ui/Stack";
import { useStreakSocial } from "@/hooks/useStreakSocial";
import { useThemeStyles } from "@/hooks/useTheme";
import {
    SharedHabitStreak,
    StreakNotification,
    StreakSocialPost,
} from "@/services/firebase/streakSocialService";
import { HapticFeedback } from "@/utils/celebrations";
import { Bell, Eye, Share2, Users } from "lucide-react-native";
import React, { Suspense, useCallback, useState } from "react";
import type { FriendsStreaksListProps } from "./FriendsStreaksList";
import type { StreakNotificationsProps } from "./StreakNotifications";
import type { StreakSocialFeedProps } from "./StreakSocialFeed";

const LazyFriendsStreaksList = React.lazy<
    React.ComponentType<FriendsStreaksListProps>
>(() =>
    import("./FriendsStreaksList").then((module) => ({
        default: module.FriendsStreaksList,
    })),
);

const LazyStreakNotifications = React.lazy<
    React.ComponentType<StreakNotificationsProps>
>(() =>
    import("./StreakNotifications").then((module) => ({
        default: module.StreakNotifications,
    })),
);

const LazyStreakSocialFeed = React.lazy<
    React.ComponentType<StreakSocialFeedProps>
>(() =>
    import("./StreakSocialFeed").then((module) => ({
        default: module.StreakSocialFeed,
    })),
);

export interface StreakSocialDashboardProps {
    userId: string;
}

type TabType = "feed" | "streaks" | "notifications";

const SocialTabFallback = () => (
    <Card variant="outlined" padding="lg">
        <VStack spacing="sm">
            <LoadingSkeleton height={18} width="40%" />
            <LoadingSkeleton height={18} width="60%" />
            <LoadingSkeleton height={140} width="100%" />
        </VStack>
    </Card>
);

/**
 * Comprehensive social dashboard for streak sharing and friend integration
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function StreakSocialDashboard({ userId }: StreakSocialDashboardProps) {
    const { colors, spacing } = useThemeStyles();
    const { unreadNotificationCount } = useStreakSocial(userId);
    const [activeTab, setActiveTab] = useState<TabType>("feed");

    /**
     * Handle tab change
     */
    const handleTabChange = useCallback((tab: TabType) => {
        HapticFeedback.selection();
        setActiveTab(tab);
    }, []);

    /**
     * Handle post press
     */
    const handlePostPress = useCallback((post: StreakSocialPost) => {
        // Could navigate to post detail or user profile
        console.log("Post pressed:", post.id);
    }, []);

    /**
     * Handle streak press
     */
    const handleStreakPress = useCallback((streak: SharedHabitStreak) => {
        // Could navigate to streak detail or user profile
        console.log("Streak pressed:", streak.habitId);
    }, []);

    /**
     * Handle notification press
     */
    const handleNotificationPress = useCallback(
        (notification: StreakNotification) => {
            // Could navigate to related post or user profile
            console.log("Notification pressed:", notification.id);
        },
        [],
    );

    /**
     * Get tab info
     */
    const getTabInfo = useCallback(
        (tab: TabType) => {
            switch (tab) {
                case "feed":
                    return {
                        icon: Share2,
                        label: "Feed",
                        description: "Streak achievements",
                    };
                case "streaks":
                    return {
                        icon: Eye,
                        label: "Streaks",
                        description: "Friends' progress",
                    };
                case "notifications":
                    return {
                        icon: Bell,
                        label: "Notifications",
                        description: "Updates & reactions",
                        badge: unreadNotificationCount,
                    };
                default:
                    return {
                        icon: Share2,
                        label: "Feed",
                        description: "Streak achievements",
                    };
            }
        },
        [unreadNotificationCount],
    );

    /**
     * Render tab button
     */
    const renderTabButton = useCallback(
        (tab: TabType) => {
            const tabInfo = getTabInfo(tab);
            const IconComponent = tabInfo.icon;
            const isActive = activeTab === tab;

            return (
                <Button
                    key={tab}
                    variant={isActive ? "primary" : "ghost"}
                    size="sm"
                    onPress={() => handleTabChange(tab)}
                    style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        position: "relative",
                    }}
                >
                    <VStack align="center" spacing="xs">
                        <HStack align="center" spacing="xs">
                            <IconComponent
                                size={18}
                                color={isActive ? colors.background : colors.mutedForeground}
                            />
                            {tabInfo.badge && tabInfo.badge > 0 && (
                                <VStack
                                    style={{
                                        position: "absolute",
                                        top: -8,
                                        right: -8,
                                        backgroundColor: colors.destructive,
                                        borderRadius: 8,
                                        minWidth: 16,
                                        height: 16,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingHorizontal: 4,
                                    }}
                                >
                                    <Body
                                        size="xs"
                                        color="foreground"
                                        weight="bold"
                                        style={{ fontSize: 10 }}
                                    >
                                        {tabInfo.badge > 99 ? "99+" : tabInfo.badge}
                                    </Body>
                                </VStack>
                            )}
                        </HStack>
                        <Body
                            size="xs"
                            color={isActive ? "foreground" : "muted"}
                            weight={isActive ? "medium" : "normal"}
                        >
                            {tabInfo.label}
                        </Body>
                    </VStack>
                </Button>
            );
        },
        [activeTab, getTabInfo, handleTabChange, colors, spacing],
    );

    /**
     * Render active tab content
     */
    const renderTabContent = useCallback(() => {
        switch (activeTab) {
            case "feed":
                return (
                    <LazyStreakSocialFeed
                        userId={userId}
                        onPostPress={handlePostPress}
                    />
                );
            case "streaks":
                return (
                    <LazyFriendsStreaksList
                        userId={userId}
                        onStreakPress={handleStreakPress}
                    />
                );
            case "notifications":
                return (
                    <LazyStreakNotifications
                        userId={userId}
                        onNotificationPress={handleNotificationPress}
                    />
                );
            default:
                return null;
        }
    }, [
        activeTab,
        userId,
        handlePostPress,
        handleStreakPress,
        handleNotificationPress,
    ]);

    return (
        <VStack spacing="md" style={{ flex: 1 }}>
            {/* Header */}
            <VStack spacing="sm">
                <HStack align="center" spacing="sm">
                    <Users size={24} color={colors.primary} />
                    <Heading size="lg">Social</Heading>
                </HStack>
                <Body color="muted">
                    Share achievements and stay motivated with friends
                </Body>
            </VStack>

            {/* Tab Navigation */}
            <Card variant="outlined" padding="sm">
                <HStack spacing="xs">
                    {(["feed", "streaks", "notifications"] as TabType[]).map(
                        renderTabButton,
                    )}
                </HStack>
            </Card>

            {/* Tab Content */}
            <VStack style={{ flex: 1 }}>
                <Suspense fallback={<SocialTabFallback />}>
                    {renderTabContent()}
                </Suspense>
            </VStack>
        </VStack>
    );
}

/**
 * Compact version for use in other screens
 */
export function StreakSocialSummary({ userId }: StreakSocialDashboardProps) {
    const { colors } = useThemeStyles();
    const { socialPosts, sharedStreaks, unreadNotificationCount } =
        useStreakSocial(userId);

    return (
        <Card variant="outlined" padding="md">
            <VStack spacing="md">
                {/* Header */}
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm">
                        <Users size={20} color={colors.primary} />
                        <Heading size="md">Social Activity</Heading>
                    </HStack>
                    {unreadNotificationCount > 0 && (
                        <VStack
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
                            <Body size="xs" color="foreground" weight="bold">
                                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                            </Body>
                        </VStack>
                    )}
                </HStack>

                {/* Summary Stats */}
                <HStack spacing="md">
                    <VStack align="center" style={{ flex: 1 }}>
                        <Body weight="bold" size="lg">
                            {socialPosts.length}
                        </Body>
                        <Body size="sm" color="muted" align="center">
                            Recent Posts
                        </Body>
                    </VStack>
                    <VStack align="center" style={{ flex: 1 }}>
                        <Body weight="bold" size="lg">
                            {sharedStreaks.filter((s) => s.currentStreak > 0).length}
                        </Body>
                        <Body size="sm" color="muted" align="center">
                            Active Streaks
                        </Body>
                    </VStack>
                    <VStack align="center" style={{ flex: 1 }}>
                        <Body weight="bold" size="lg">
                            {unreadNotificationCount}
                        </Body>
                        <Body size="sm" color="muted" align="center">
                            Notifications
                        </Body>
                    </VStack>
                </HStack>

                {/* Recent Activity Preview */}
                {socialPosts.length > 0 && (
                    <VStack spacing="xs">
                        <Body weight="semibold" size="sm">
                            Latest Achievement
                        </Body>
                        <Body size="sm" color="muted" numberOfLines={2}>
                            {socialPosts[0].userName}: {socialPosts[0].message}
                        </Body>
                    </VStack>
                )}
            </VStack>
        </Card>
    );
}
