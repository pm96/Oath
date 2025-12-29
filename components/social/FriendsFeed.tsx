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
import { FlatList, ListRenderItem, RefreshControl, View, TouchableOpacity, Text } from "react-native";
import { FriendGoalDetail } from "./FriendGoalDetail";

export interface FriendsFeedProps {
    userId: string;
    onGoalSelect?: (goalId: string, friendId: string) => void;
}

interface FriendGoalItemProps {
    goal: GoalWithOwnerAndStatus;
    currentUserId: string;
    onNudge: (goalId: string, friendId: string) => void;
    onHighFive: (goalId: string) => void;
    onGoalPress: (goal: GoalWithOwnerAndStatus) => void;
    nudgeLoading: string[];
}

const FriendGoalItem = React.memo<FriendGoalItemProps>(
    ({ goal, currentUserId, onNudge, onHighFive, onGoalPress, nudgeLoading }) => {
        const { spacing, colors } = useThemeStyles();

        const isNudging = nudgeLoading.includes(goal.id);
        const isOwnGoal = goal.ownerId === currentUserId;
        const isHighFived = (goal.highFives || []).includes(currentUserId);
        const highFiveCount = (goal.highFives || []).length;

        const handleNudge = useCallback(() => {
            if (isOwnGoal || !goal.canNudge || isNudging) return;
            HapticFeedback.selection();
            onNudge(goal.id, goal.ownerId);
        }, [goal.id, goal.ownerId, goal.canNudge, isOwnGoal, isNudging, onNudge]);

        const handleHighFive = useCallback(() => {
            HapticFeedback.selection();
            onHighFive(goal.id);
        }, [goal.id, onHighFive]);

        const handleGoalPress = useCallback(() => {
            HapticFeedback.selection();
            onGoalPress(goal);
        }, [goal, onGoalPress]);

        const statusColor = useMemo(() => getStatusColor(goal.status), [goal.status]);

        const frequencyText = useMemo(() => {
            switch (goal.frequency) {
                case "daily": return "Daily";
                case "weekly": return `Weekly (${goal.targetDays.join(", ")})`;
                case "3x_a_week": return `3x a week (${goal.targetDays.join(", ")})`;
                default: return goal.frequency;
            }
        }, [goal.frequency, goal.targetDays]);

        const shouldShowNudgeButton = useMemo(() => !isOwnGoal && goal.status.showNudge, [isOwnGoal, goal.status.showNudge]);

        return (
            <Card variant="outlined" padding="md" onPress={handleGoalPress} style={{ marginBottom: spacing.sm, minHeight: 44 }}>
                <HStack align="flex-start" spacing="md">
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: statusColor, marginTop: 2 }} />
                    <VStack style={{ flex: 1 }} spacing="xs">
                        <Body weight="semibold" numberOfLines={2}>{goal.description}</Body>
                        <HStack align="center" spacing="xs">
                            <Caption color="muted">{goal.ownerName}</Caption>
                            {goal.ownerShameScore > 0 && (
                                <Caption color="destructive" weight="medium">• {goal.ownerShameScore} shame {goal.ownerShameScore === 1 ? "point" : "points"}</Caption>
                            )}
                        </HStack>
                        <Caption color="muted">{frequencyText} • {goal.status.text}</Caption>
                        
                        <HStack spacing="sm" align="center" style={{ marginTop: spacing.xs }}>
                            <TouchableOpacity 
                                onPress={handleHighFive}
                                style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    backgroundColor: isHighFived ? colors.primary + '15' : 'transparent',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: isHighFived ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{ fontSize: 14 }}>✋</Text>
                                {highFiveCount > 0 && (
                                    <Caption weight="semibold" style={{ marginLeft: 4, color: isHighFived ? colors.primary : colors.mutedForeground }}>{highFiveCount}</Caption>
                                )}
                            </TouchableOpacity>
                        </HStack>
                    </VStack>

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
                            {!goal.canNudge && goal.cooldownRemaining && (
                                <Caption color="muted" size="xs" align="center">{goal.cooldownRemaining}m left</Caption>
                            )}
                        </VStack>
                    )}
                </HStack>
            </Card>
        );
    }
);

FriendGoalItem.displayName = "FriendGoalItem";

export function FriendsFeed({ userId, onGoalSelect }: FriendsFeedProps) {
    const { colors, spacing } = useThemeStyles();
    const {
        sortedGoals,
        loading,
        error,
        refresh,
        sendNudge,
        toggleHighFive,
        nudgeLoading,
        isOnline,
        hasOfflineData,
        lastUpdateTime,
    } = useFriendsGoals();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<GoalWithOwnerAndStatus | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const handleGoalPress = useCallback((goal: GoalWithOwnerAndStatus) => {
        setSelectedGoal(goal);
        setModalVisible(true);
        onGoalSelect?.(goal.id, goal.ownerId);
    }, [onGoalSelect]);

    const handleModalClose = useCallback(() => {
        setModalVisible(false);
        setTimeout(() => setSelectedGoal(null), 300);
    }, []);

    const handleNudge = useCallback(async (goalId: string, friendId: string) => {
        try {
            await sendNudge(goalId, friendId);
            const goal = sortedGoals.find((g) => g.id === goalId);
            showSuccessToast(`Nudge sent to ${goal?.ownerName || "friend"}! 👊`);
        } catch (error: any) {
            showErrorToast(error.message || "Failed to send nudge");
        }
    }, [sendNudge, sortedGoals]);

    const handleHighFive = useCallback(async (goalId: string) => {
        try { await toggleHighFive(goalId); } catch (error) { console.error("Error high-fiving:", error); }
    }, [toggleHighFive]);

    const renderItem = useCallback(({ item, index }: { item: GoalWithOwnerAndStatus; index: number }) => (
        <FriendGoalItem
            goal={item}
            currentUserId={userId}
            onNudge={handleNudge}
            onHighFive={handleHighFive}
            onGoalPress={handleGoalPress}
            nudgeLoading={nudgeLoading}
        />
    ), [userId, handleNudge, handleHighFive, handleGoalPress, nudgeLoading]);

    if (loading) return <VStack spacing="md"><Heading size="md">Loading...</Heading></VStack>;
    if (error) return <VStack spacing="md"><Heading size="md">Error loading feed</Heading></VStack>;

    return (
        <>
            <VStack spacing="md" style={{ flex: 1 }}>
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm">
                        <Heading size="md">Friends&apos; Goals</Heading>
                        {!isOnline && <Caption color="muted" style={{ backgroundColor: colors.mutedForeground, color: colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10 }}>OFFLINE</Caption>}
                    </HStack>
                    {sortedGoals.length > 0 && <Caption color="muted">{sortedGoals.length} goals</Caption>}
                </HStack>

                {sortedGoals.length === 0 ? (
                    <Card variant="outlined" padding="lg"><Body color="muted" align="center">No friends&apos; goals yet</Body></Card>
                ) : (
                    <VStack spacing="md">
                        {sortedGoals.map((item, index) => renderItem({ item, index }))}
                    </VStack>
                )}
            </VStack>

            <FriendGoalDetail
                goal={selectedGoal}
                visible={modalVisible}
                currentUserId={userId}
                onNudge={handleNudge}
                onHighFive={handleHighFive}
                onClose={handleModalClose}
                nudgeLoading={nudgeLoading.includes(selectedGoal?.id || "")}
            />
        </>
    );
}