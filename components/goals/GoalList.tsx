import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/vstack";
import { GoalWithStreak } from "@/hooks/useGoals";
import React from "react";
import { FlatList, RefreshControl } from "react-native";
import { GoalItem } from "./GoalItem";

interface GoalListProps {
    goals: GoalWithStreak[];
    onComplete: (goalId: string) => Promise<void>;
    loading?: boolean;
    onRefresh?: () => void;
    showOwner?: boolean;
    getOwnerName?: (ownerId: string) => string;
    emptyMessage?: string;
}

/**
 * Skeleton loader for goal items
 * Requirement 8.1: Add loading states and skeleton screens
 */
function GoalItemSkeleton() {
    return (
        <VStack className="p-4 mb-3 bg-background-50 rounded-lg" space="sm">
            <Skeleton className="h-5 w-3/4" />
            <SkeletonText _lines={2} />
            <Skeleton className="h-4 w-1/2" />
        </VStack>
    );
}

/**
 * GoalList component displaying user's goals with real-time updates
 * Requirements: 2.3, 8.1, 8.5
 *
 * Optimized with:
 * - FlatList for performance (Requirement 8.5)
 * - Pull-to-refresh functionality (Requirement 8.5)
 * - Skeleton loading states (Requirement 8.1)
 */
export function GoalList({
    goals,
    onComplete,
    loading = false,
    onRefresh,
    showOwner = false,
    getOwnerName,
    emptyMessage = "No goals yet. Create your first goal!",
}: GoalListProps) {
    /**
     * Sort goals by status priority (Red > Yellow > Green) and then by deadline
     */
    const sortedGoals = React.useMemo(() => {
        const statusPriority = { Red: 0, Yellow: 1, Green: 2 };

        return [...goals].sort((a, b) => {
            // First sort by status priority
            const statusDiff =
                statusPriority[a.currentStatus] - statusPriority[b.currentStatus];
            if (statusDiff !== 0) return statusDiff;

            // Then sort by deadline (earlier deadlines first)
            return a.nextDeadline.getTime() - b.nextDeadline.getTime();
        });
    }, [goals]);

    /**
     * Render individual goal item
     * Requirement 8.5: Optimize list rendering performance with FlatList
     */
    const renderGoalItem = React.useCallback(
        ({ item }: { item: GoalWithStreak }) => (
            <GoalItem
                goal={item}
                onComplete={onComplete}
                showOwner={showOwner}
                ownerName={getOwnerName ? getOwnerName(item.ownerId) : undefined}
            />
        ),
        [onComplete, showOwner, getOwnerName],
    );

    /**
     * Render empty state
     */
    const renderEmptyState = () => {
        // Show skeleton loaders during initial load
        if (loading && goals.length === 0) {
            return (
                <VStack className="p-4" space="md">
                    <GoalItemSkeleton />
                    <GoalItemSkeleton />
                    <GoalItemSkeleton />
                </VStack>
            );
        }

        return (
            <VStack className="flex-1 justify-center items-center p-8">
                <Text className="text-center text-typography-500 text-base">
                    {emptyMessage}
                </Text>
            </VStack>
        );
    };

    /**
     * Item separator for better visual separation
     */
    const getItemLayout = React.useCallback(
        (_: any, index: number) => ({
            length: 120, // Approximate item height
            offset: 120 * index,
            index,
        }),
        [],
    );

    return (
        <FlatList
            data={sortedGoals}
            renderItem={renderGoalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
                <RefreshControl
                    refreshing={loading && goals.length > 0}
                    onRefresh={onRefresh}
                />
            }
            // Performance optimizations - Requirement 8.5
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={getItemLayout}
        />
    );
}
