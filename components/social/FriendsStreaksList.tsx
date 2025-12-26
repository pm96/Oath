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
import { SharedHabitStreak } from "@/services/firebase/streakSocialService";
import { HapticFeedback } from "@/utils/celebrations";
import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import { Eye, Flame, Trophy, Users } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { FlatList, ListRenderItem, RefreshControl, View } from "react-native";

export interface FriendsStreaksListProps {
    userId: string;
    onStreakPress?: (streak: SharedHabitStreak) => void;
}

interface SharedStreakItemProps {
    streak: SharedHabitStreak;
    onPress: (streak: SharedHabitStreak) => void;
}

/**
 * Individual shared streak item component
 * Requirements: 8.4
 */
const SharedStreakItem = React.memo<SharedStreakItemProps>(
    ({ streak, onPress }) => {
        const { colors, spacing } = useThemeStyles();

        // Handle streak press
        const handlePress = useCallback(() => {
            HapticFeedback.selection();
            onPress(streak);
        }, [streak, onPress]);

        // Get streak status color
        const getStreakStatusColor = useCallback(() => {
            if (streak.currentStreak === 0) {
                return colors.mutedForeground;
            } else if (streak.currentStreak >= 30) {
                return "#FFD700"; // Gold for long streaks
            } else if (streak.currentStreak >= 7) {
                return "#FF6B35"; // Orange for good streaks
            } else {
                return colors.primary; // Primary for new streaks
            }
        }, [streak.currentStreak, colors]);

        // Format time since shared
        const timeSinceShared = useMemo(() => {
            const now = new Date();
            const sharedTime = streak.sharedAt.toDate();
            const diffMs = now.getTime() - sharedTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                return `Shared ${diffDays}d ago`;
            } else if (diffHours > 0) {
                return `Shared ${diffHours}h ago`;
            } else {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `Shared ${Math.max(1, diffMinutes)}m ago`;
            }
        }, [streak.sharedAt]);

        // Get latest milestone
        const latestMilestone = useMemo(() => {
            if (streak.milestones.length === 0) return null;
            return streak.milestones.reduce((latest, milestone) =>
                milestone.days > latest.days ? milestone : latest,
            );
        }, [streak.milestones]);

        const streakColor = getStreakStatusColor();

        return (
            <Card
                variant="outlined"
                padding="md"
                onPress={handlePress}
                style={{
                    marginBottom: spacing.sm,
                    borderLeftWidth: 4,
                    borderLeftColor: streakColor,
                }}
            >
                <VStack spacing="sm">
                    {/* Header */}
                    <HStack align="center" spacing="sm">
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: `${streakColor}20`,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Flame size={20} color={streakColor} />
                        </View>
                        <VStack style={{ flex: 1 }}>
                            <Body weight="semibold">{streak.userName}</Body>
                            <Caption color="muted">{timeSinceShared}</Caption>
                        </VStack>
                        <VStack align="flex-end">
                            <HStack align="center" spacing="xs">
                                <Body weight="bold" style={{ color: streakColor }}>
                                    {streak.currentStreak}
                                </Body>
                                <Caption color="muted">days</Caption>
                            </HStack>
                            {streak.bestStreak > streak.currentStreak && (
                                <Caption color="muted" size="xs">
                                    Best: {streak.bestStreak}
                                </Caption>
                            )}
                        </VStack>
                    </HStack>

                    {/* Habit Description */}
                    <Body numberOfLines={2}>
                        {`\u201C${streak.habitDescription}\u201D`}
                    </Body>

                    {/* Streak Status */}
                    <HStack align="center" justify="space-between">
                        <HStack align="center" spacing="sm">
                            {streak.currentStreak === 0 ? (
                                <Caption color="muted">Streak broken</Caption>
                            ) : (
                                <Caption color="muted">
                                    {streak.currentStreak === 1
                                        ? "Started today"
                                        : `${streak.currentStreak} day streak`}
                                </Caption>
                            )}
                        </HStack>

                        {/* Latest Milestone Badge */}
                        {latestMilestone && (
                            <HStack align="center" spacing="xs">
                                <Trophy size={14} color={colors.mutedForeground} />
                                <Caption color="muted" size="xs">
                                    {latestMilestone.days}d milestone
                                </Caption>
                            </HStack>
                        )}
                    </HStack>

                    {/* Milestones Preview */}
                    {streak.milestones.length > 0 && (
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {streak.milestones
                                .sort((a, b) => a.days - b.days)
                                .slice(0, 5) // Show max 5 milestones
                                .map((milestone) => (
                                    <View
                                        key={milestone.days}
                                        style={{
                                            backgroundColor: `${getMilestoneBadgeColor(milestone.days)}20`,
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 8,
                                            marginBottom: 4,
                                        }}
                                    >
                                        <Caption
                                            size="xs"
                                            style={{ color: getMilestoneBadgeColor(milestone.days) }}
                                        >
                                            {milestone.days}d
                                        </Caption>
                                    </View>
                                ))}
                            {streak.milestones.length > 5 && (
                                <Caption color="muted" size="xs">
                                    +{streak.milestones.length - 5} more
                                </Caption>
                            )}
                        </HStack>
                    )}
                </VStack>
            </Card>
        );
    },
);

SharedStreakItem.displayName = "SharedStreakItem";

/**
 * Loading skeleton for shared streaks
 */
const SharedStreakSkeleton = React.memo(() => {
    const { spacing } = useThemeStyles();

    return (
        <Card variant="outlined" padding="md" style={{ marginBottom: spacing.sm }}>
            <VStack spacing="sm">
                <HStack align="center" spacing="sm">
                    <LoadingSkeleton width={36} height={36} borderRadius={18} />
                    <VStack style={{ flex: 1 }} spacing="xs">
                        <LoadingSkeleton height={16} width="60%" />
                        <LoadingSkeleton height={12} width="40%" />
                    </VStack>
                    <LoadingSkeleton height={20} width={40} />
                </HStack>
                <LoadingSkeleton height={16} width="80%" />
                <LoadingSkeleton height={12} width="60%" />
                <HStack spacing="xs">
                    <LoadingSkeleton height={16} width={30} borderRadius={8} />
                    <LoadingSkeleton height={16} width={30} borderRadius={8} />
                    <LoadingSkeleton height={16} width={30} borderRadius={8} />
                </HStack>
            </VStack>
        </Card>
    );
});

SharedStreakSkeleton.displayName = "SharedStreakSkeleton";

/**
 * Empty state component
 */
const EmptyState = React.memo(() => {
    const { colors } = useThemeStyles();

    return (
        <Card variant="outlined" padding="lg">
            <VStack align="center" spacing="md">
                <Users size={48} color={colors.mutedForeground} />
                <Heading size="md" color="muted" align="center">
                    No shared streaks yet
                </Heading>
                <Body color="muted" align="center">
                    {"When your friends share their habit streaks, you\u2019ll be able to see their progress here!"}
                </Body>
            </VStack>
        </Card>
    );
});

EmptyState.displayName = "EmptyState";

/**
 * Friends Streaks List Component
 *
 * Displays friends' shared habit streaks for accountability and motivation
 * Requirements: 8.4
 */
export function FriendsStreaksList({
    userId,
    onStreakPress,
}: FriendsStreaksListProps) {
    const { colors, spacing } = useThemeStyles();
    const { sharedStreaks, loading, error, refresh } = useStreakSocial(userId);

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

    // Handle streak press
    const handleStreakPress = useCallback(
        (streak: SharedHabitStreak) => {
            onStreakPress?.(streak);
        },
        [onStreakPress],
    );

    // Render item function
    const renderItem: ListRenderItem<SharedHabitStreak> = useCallback(
        ({ item }) => (
            <SharedStreakItem streak={item} onPress={handleStreakPress} />
        ),
        [handleStreakPress],
    );

    // Key extractor
    const keyExtractor = useCallback(
        (item: SharedHabitStreak) => `${item.userId}_${item.habitId}`,
        [],
    );

    // Get active streaks count
    const activeStreaksCount = useMemo(
        () => sharedStreaks.filter((streak) => streak.currentStreak > 0).length,
        [sharedStreaks],
    );

    // Loading state
    if (loading) {
        return (
            <VStack spacing="md">
                <Heading size="md">{"Friends\u2019 Streaks"}</Heading>
                {[1, 2, 3].map((i) => (
                    <SharedStreakSkeleton key={i} />
                ))}
            </VStack>
        );
    }

    // Error state
    if (error) {
        return (
            <VStack spacing="md">
                <HStack align="center" justify="space-between">
                    <Heading size="md">{"Friends\u2019 Streaks"}</Heading>
                    <Button variant="ghost" size="sm" onPress={handleRefresh}>
                        Retry
                    </Button>
                </HStack>
                <Card variant="outlined" padding="lg">
                    <VStack align="center" spacing="md">
                        <Body color="destructive" align="center">
                            {"Failed to load friends\u2019 streaks"}
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
                    <Heading size="md">{"Friends\u2019 Streaks"}</Heading>
                    <Eye size={20} color={colors.mutedForeground} />
                </HStack>
                {sharedStreaks.length > 0 && (
                    <VStack align="flex-end">
                        <Caption color="muted">
                            {sharedStreaks.length}{" "}
                            {sharedStreaks.length === 1 ? "streak" : "streaks"}
                        </Caption>
                        {activeStreaksCount > 0 && (
                            <Caption color="primary" size="xs">
                                {activeStreaksCount} active
                            </Caption>
                        )}
                    </VStack>
                )}
            </HStack>

            {/* Streaks list or empty state */}
            {sharedStreaks.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={sharedStreaks}
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

function getMilestoneBadgeColor(days: number): string {
    switch (days) {
        case 7:
            return "#CD7F32"; // Bronze
        case 30:
            return "#C0C0C0"; // Silver
        case 60:
            return "#FFD700"; // Gold
        case 100:
            return "#B9F2FF"; // Diamond
        case 365:
            return "#FFD700"; // Gold (Crown)
        default:
            return "#FFD700"; // Default gold
    }
}
