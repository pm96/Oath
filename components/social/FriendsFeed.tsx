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
import {
    GoalWithOwnerAndStatus,
    useFriendsGoals,
} from "@/hooks/useFriendsGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { HapticFeedback } from "@/utils/celebrations";
import { getStatusColor } from "@/utils/goalStatusCalculator";
import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Users } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ListRenderItem, RefreshControl, View } from "react-native";
import { FriendGoalDetail } from "./FriendGoalDetail";

export interface FriendsFeedProps {
    userId: string;
    onGoalSelect?: (goalId: string, friendId: string) => void;
}

interface FriendGoalItemProps {
    goal: GoalWithOwnerAndStatus;
    currentUserId: string;
    onNudge: (goalId: string, friendId: string) => void;
    onGoalPress: (goal: GoalWithOwnerAndStatus) => void;
    nudgeLoading: string[];
}

/**
 * Individual friend goal item component with status indicators and nudge functionality
 * Requirements: 1.2, 3.1, 3.2, 4.4, 9.1, 9.4, 12.4
 * Optimized with React.memo and memoized calculations for performance
 */
const FriendGoalItem = React.memo<FriendGoalItemProps>(
    ({ goal, currentUserId, onNudge, onGoalPress, nudgeLoading }) => {
        const { spacing } = useThemeStyles();

        const isNudging = nudgeLoading.includes(goal.id);
        const isOwnGoal = goal.ownerId === currentUserId;

        // Memoized event handlers to prevent re-renders
        const handleNudge = useCallback(() => {
            if (isOwnGoal || !goal.canNudge || isNudging) return;

            // Haptic feedback for nudge action
            HapticFeedback.selection();
            onNudge(goal.id, goal.ownerId);
        }, [goal.id, goal.ownerId, goal.canNudge, isOwnGoal, isNudging, onNudge]);

        // Handle goal press for navigation to detail view
        // Requirement 9.1: Navigate to goal detail view when tapped
        const handleGoalPress = useCallback(() => {
            HapticFeedback.selection();
            onGoalPress(goal);
        }, [goal, onGoalPress]);

        // Memoized expensive calculations
        const statusColor = useMemo(
            () => getStatusColor(goal.status),
            [goal.status],
        );

        // Format frequency display with memoization
        const frequencyText = useMemo(() => {
            switch (goal.frequency) {
                case "daily":
                    return "Daily";
                case "weekly":
                    return `Weekly (${goal.targetDays.join(", ")})`;
                case "3x_a_week":
                    return `3x a week (${goal.targetDays.join(", ")})`;
                default:
                    return goal.frequency;
            }
        }, [goal.frequency, goal.targetDays]);

        // Memoized nudge button visibility
        const shouldShowNudgeButton = useMemo(
            () => !isOwnGoal && goal.status.showNudge,
            [isOwnGoal, goal.status.showNudge],
        );

        return (
            <Card
                variant="outlined"
                padding="md"
                onPress={handleGoalPress}
                style={{
                    marginBottom: spacing.sm,
                    minHeight: 44, // Accessibility requirement
                }}
            >
                <HStack align="flex-start" spacing="md">
                    {/* Status indicator */}
                    <View
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: statusColor,
                            marginTop: 2,
                        }}
                    />

                    <VStack style={{ flex: 1 }} spacing="xs">
                        {/* Goal description */}
                        <Body weight="semibold" numberOfLines={2}>
                            {goal.description}
                        </Body>

                        {/* Owner name and shame score */}
                        <HStack align="center" spacing="xs">
                            <Caption color="muted">{goal.ownerName}</Caption>
                            {goal.ownerShameScore > 0 && (
                                <>
                                    <Caption color="muted">•</Caption>
                                    <Caption color="destructive" weight="medium">
                                        {goal.ownerShameScore} shame{" "}
                                        {goal.ownerShameScore === 1 ? "point" : "points"}
                                    </Caption>
                                </>
                            )}
                        </HStack>

                        {/* Frequency */}
                        <Caption color="muted">{frequencyText}</Caption>

                        {/* Deadline with status text */}
                        <Caption
                            color={goal.status.color === "red" ? "destructive" : "muted"}
                            weight={goal.status.color === "red" ? "medium" : "normal"}
                        >
                            {goal.status.text}
                        </Caption>

                        {/* Last completion date */}
                        {goal.latestCompletionDate && (
                            <Caption color="muted" size="xs">
                                Last completed: {goal.latestCompletionDate.toLocaleDateString()}
                            </Caption>
                        )}
                    </VStack>

                    {/* Nudge button - Requirements: 3.1, 3.2, 12.1, 12.2, 12.3, 12.5 */}
                    {shouldShowNudgeButton && (
                        <VStack align="center" spacing="xs">
                            <Button
                                variant={goal.status.color === "red" ? "primary" : "secondary"}
                                size="sm"
                                onPress={handleNudge}
                                loading={isNudging}
                                disabled={!goal.canNudge || isNudging}
                                style={{ minWidth: 44, minHeight: 44 }}
                            >
                                {goal.canNudge ? "NUDGE" : "WAIT"}
                            </Button>

                            {/* Cooldown timer - Requirement: 4.4 */}
                            {!goal.canNudge && goal.cooldownRemaining && (
                                <Caption color="muted" size="xs" align="center">
                                    {goal.cooldownRemaining}m left
                                </Caption>
                            )}
                        </VStack>
                    )}
                </HStack>
            </Card>
        );
    },
);

FriendGoalItem.displayName = "FriendGoalItem";

/**
 * Loading skeleton for friend goal items
 */
const FriendGoalItemSkeleton = React.memo(() => {
    return (
        <Card variant="outlined" padding="md" style={{ marginBottom: 12 }}>
            <HStack align="flex-start" spacing="md">
                <LoadingSkeleton width={16} height={16} borderRadius={8} />
                <VStack style={{ flex: 1 }} spacing="xs">
                    <LoadingSkeleton height={20} width="80%" />
                    <LoadingSkeleton height={14} width="60%" />
                    <LoadingSkeleton height={14} width="40%" />
                    <LoadingSkeleton height={14} width="50%" />
                </VStack>
                <LoadingSkeleton width={60} height={32} />
            </HStack>
        </Card>
    );
});

FriendGoalItemSkeleton.displayName = "FriendGoalItemSkeleton";

/**
 * Empty state component when no friends or goals exist
 */
const EmptyState = React.memo(() => {
    const { colors } = useThemeStyles();

    return (
        <Card variant="outlined" padding="lg">
            <VStack align="center" spacing="md">
                <Users size={48} color={colors.mutedForeground} />
                <Heading size="md" color="muted" align="center">
                    No friends&apos; goals yet
                </Heading>
                <Body color="muted" align="center">
                    Add friends to see their goals and provide accountability support!
                </Body>
            </VStack>
        </Card>
    );
});

EmptyState.displayName = "EmptyState";

/**
 * Friends Feed Component
 *
 * Displays all friends' goals with real-time status indicators, nudge functionality,
 * and performance optimizations for large lists.
 *
 * Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.3, 11.4
 */
export function FriendsFeed({ userId, onGoalSelect }: FriendsFeedProps) {
    const { colors, spacing } = useThemeStyles();
    const {
        sortedGoals,
        loading,
        error,
        refresh,
        sendNudge,
        nudgeLoading,
        isOnline,
        hasOfflineData,
        lastUpdateTime,
    } = useFriendsGoals();

    const [refreshing, setRefreshing] = React.useState(false);
    const [selectedGoal, setSelectedGoal] =
        useState<GoalWithOwnerAndStatus | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Get device performance tier for optimizations
    const performanceTier = useMemo(() => getDevicePerformanceTier(), []);
    const flatListProps = useMemo(
        () => getOptimizedFlatListProps(performanceTier),
        [performanceTier],
    );

    // Handle pull-to-refresh - Requirement: 11.2
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    // Handle goal selection for detail view - Requirement: 9.1
    const handleGoalPress = useCallback(
        (goal: GoalWithOwnerAndStatus) => {
            setSelectedGoal(goal);
            setModalVisible(true);
            onGoalSelect?.(goal.id, goal.ownerId);
        },
        [onGoalSelect],
    );

    // Handle modal close with navigation state preservation - Requirement: 9.5
    const handleModalClose = useCallback(() => {
        setModalVisible(false);
        // Keep selectedGoal for a moment to allow smooth transition
        setTimeout(() => setSelectedGoal(null), 300);
    }, []);

    // Handle nudge sending with error handling - Requirement: 3.5
    const handleNudge = useCallback(
        async (goalId: string, friendId: string) => {
            try {
                await sendNudge(goalId, friendId);

                // Find the friend's name for the success message
                const goal = sortedGoals.find((g) => g.id === goalId);
                const friendName = goal?.ownerName || "friend";

                showSuccessToast(`Nudge sent to ${friendName}! 👊`);
            } catch (error) {
                console.error("Failed to send nudge:", error);

                // Show error toast with retry option
                const retryNudge = () => handleNudge(goalId, friendId);
                showErrorToast(
                    error instanceof Error ? error.message : "Failed to send nudge",
                    "Nudge Failed",
                    retryNudge,
                );
            }
        },
        [sendNudge, sortedGoals],
    );

    // Optimized render item function - Requirement: 11.4
    const renderItem: ListRenderItem<GoalWithOwnerAndStatus> = useCallback(
        ({ item }) => (
            <FriendGoalItem
                goal={item}
                currentUserId={userId}
                onNudge={handleNudge}
                onGoalPress={handleGoalPress}
                nudgeLoading={nudgeLoading}
            />
        ),
        [userId, handleNudge, handleGoalPress, nudgeLoading],
    );

    // Key extractor for FlatList optimization
    const keyExtractor = useCallback(
        (item: GoalWithOwnerAndStatus) => item.id,
        [],
    );

    // Loading state - Requirement: 11.3
    if (loading) {
        return (
            <VStack spacing="md">
                <HStack align="center" justify="space-between">
                    <Heading size="md">Friends&apos; Goals</Heading>
                    <LoadingSkeleton width={60} height={20} />
                </HStack>
                {[1, 2, 3, 4].map((i) => (
                    <FriendGoalItemSkeleton key={i} />
                ))}
            </VStack>
        );
    }

    // Error state
    if (error) {
        return (
            <VStack spacing="md">
                <HStack align="center" justify="space-between">
                    <Heading size="md">Friends&apos; Goals</Heading>
                    <Button variant="ghost" size="sm" onPress={handleRefresh}>
                        Retry
                    </Button>
                </HStack>
                <Card variant="outlined" padding="lg">
                    <VStack align="center" spacing="md">
                        <Body color="destructive" align="center">
                            Failed to load friends&apos; goals
                        </Body>
                        <Caption color="muted" align="center">
                            {error.message}
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
        <>
            <VStack spacing="md" style={{ flex: 1 }}>
                {/* Header with offline indicator */}
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm">
                        <Heading size="md">Friends&apos; Goals</Heading>
                        {/* Offline indicator - Requirement 6.5 */}
                        {!isOnline && (
                            <Caption
                                color="muted"
                                style={{
                                    backgroundColor: colors.mutedForeground,
                                    color: colors.background,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    fontSize: 10,
                                }}
                            >
                                OFFLINE
                            </Caption>
                        )}
                    </HStack>
                    {sortedGoals.length > 0 && (
                        <VStack align="flex-end">
                            <Caption color="muted">
                                {sortedGoals.length} goal{sortedGoals.length !== 1 ? "s" : ""}
                            </Caption>
                            {/* Show last update time when offline */}
                            {!isOnline && hasOfflineData && (
                                <Caption color="muted" size="xs">
                                    Updated {lastUpdateTime.toLocaleTimeString()}
                                </Caption>
                            )}
                        </VStack>
                    )}
                </HStack>

                {/* Goals list or empty state */}
                {sortedGoals.length === 0 ? (
                    <EmptyState />
                ) : (
                    <FlatList
                        data={sortedGoals}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.primary}
                                // Show different title when offline
                                title={!isOnline ? "Offline - showing cached data" : undefined}
                            />
                        }
                        contentContainerStyle={{
                            paddingBottom: spacing.lg,
                        }}
                        // Performance optimizations - Requirement: 11.4
                        {...flatListProps}
                    />
                )}
            </VStack>

            {/* Goal Detail Modal - Requirements: 9.1, 9.2, 9.3, 9.4, 9.5 */}
            <FriendGoalDetail
                goal={selectedGoal}
                visible={modalVisible}
                currentUserId={userId}
                onNudge={handleNudge}
                onClose={handleModalClose}
                nudgeLoading={nudgeLoading.includes(selectedGoal?.id || "")}
            />
        </>
    );
}
