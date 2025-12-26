import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { VStack } from "@/components/ui/Stack";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import {
    GoalWithOwnerAndStatus,
    useFriendsGoals,
} from "@/hooks/useFriendsGoals";
import { sendNudge } from "@/services/firebase/cloudFunctions";
import { User } from "@/services/firebase/collections";
import { subscribeToUserData } from "@/services/firebase/socialService";
import React from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { FriendGoalItem } from "./FriendGoalItem";
import { ShameScoreDisplay } from "./ShameScoreDisplay";

/**
 * Skeleton loader for friend goal items
 * Requirement 8.1: Add loading states and skeleton screens
 */
function FriendGoalSkeleton() {
    return (
        <VStack spacing="sm">
            <Skeleton />
            <SkeletonText _lines={3} />
            <Skeleton />
        </VStack>
    );
}

/**
 * FriendsDashboard component showing all friends' goals
 * Requirements: 3.1, 3.3, 5.1, 6.1, 6.2, 8.1, 8.5
 *
 * Main view for the social accountability features:
 * - Displays all friends' goals with real-time updates (Requirement 3.1)
 * - Shows goal description, owner name, and status (Requirement 3.3)
 * - Conditional "Nudge Now" button for Yellow/Red goals (Requirement 5.1)
 * - Displays shame scores for user and friends (Requirements 6.1, 6.2)
 * - Optimized with FlatList and pull-to-refresh (Requirements 8.1, 8.5)
 */
export function FriendsDashboard() {
    const { user } = useAuth();
    const { sortedGoals, loading, error, friendIds, refresh } = useFriendsGoals();
    const [currentUserData, setCurrentUserData] = React.useState<User | null>(
        null,
    );
    const [refreshing, setRefreshing] = React.useState(false);

    /**
     * Subscribe to current user's data for real-time shame score updates
     * Requirement 6.1: Display user's own shame score
     * Requirement 6.3: Real-time updates when shame score changes
     */
    React.useEffect(() => {
        if (!user) {
            setCurrentUserData(null);
            return;
        }

        const unsubscribe = subscribeToUserData(user.uid, (userData) => {
            setCurrentUserData(userData);
        });

        return () => {
            unsubscribe();
        };
    }, [user]);

    /**
     * Handle nudge action
     * Requirement 5.2: Invoke sendNudge Cloud Function
     */
    const handleNudge = React.useCallback(
        async (goalId: string, ownerId: string) => {
            try {
                const result = await sendNudge(ownerId, goalId);
                if (result.success) {
                    Alert.alert(
                        "Nudge Sent!",
                        "Your friend will receive a notification to complete their goal.",
                    );
                } else {
                    Alert.alert("Notice", result.message);
                }
            } catch (error: any) {
                Alert.alert("Error", error.message || "Failed to send nudge");
            }
        },
        [],
    );

    /**
     * Handle pull-to-refresh
     * Requirement 8.5: Add pull-to-refresh functionality
     */
    const handleRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            if (refresh) {
                await refresh();
            }
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    /**
     * Render individual friend goal item
     * Requirement 8.5: Optimize list rendering performance with FlatList
     */
    const renderGoalItem = React.useCallback(
        ({ item }: { item: GoalWithOwnerAndStatus }) => (
            <FriendGoalItem
                goal={item}
                currentUserId={user?.uid || ""}
                onNudge={handleNudge}
            />
        ),
        [handleNudge, user?.uid],
    );

    /**
     * Render list header with user's shame score
     */
    const renderListHeader = () => (
        <VStack spacing="lg">
            {/* User's own shame score - Requirement 6.1 */}
            {currentUserData && (
                <VStack spacing="sm">
                    <Heading size="md">Your Shame Score</Heading>
                    <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                </VStack>
            )}

            {/* Friends' goals section header */}
            {sortedGoals.length > 0 && (
                <VStack spacing="sm">
                    <Heading size="md">Friends&apos; Goals</Heading>
                    <Text>
                        {sortedGoals.length} goal{sortedGoals.length !== 1 ? "s" : ""} from{" "}
                        {friendIds.length} friend{friendIds.length !== 1 ? "s" : ""}
                    </Text>
                </VStack>
            )}
        </VStack>
    );

    /**
     * Render empty state
     */
    const renderEmptyState = () => {
        // Show skeleton loaders during initial load
        if (loading && sortedGoals.length === 0) {
            return (
                <VStack spacing="md">
                    {currentUserData && (
                        <VStack spacing="sm">
                            <Heading size="md">Your Shame Score</Heading>
                            <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                        </VStack>
                    )}
                    <FriendGoalSkeleton />
                    <FriendGoalSkeleton />
                    <FriendGoalSkeleton />
                </VStack>
            );
        }

        // No friends state
        if (friendIds.length === 0) {
            return (
                <VStack spacing="lg">
                    {currentUserData && (
                        <VStack spacing="sm">
                            <Heading size="md">Your Shame Score</Heading>
                            <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                        </VStack>
                    )}
                    <VStack spacing="sm">
                        <Text>No friends added yet</Text>
                        <Text>
                            Add friends to see their goals and hold each other accountable!
                        </Text>
                    </VStack>
                </VStack>
            );
        }

        // No goals from friends state
        return (
            <VStack spacing="lg">
                {currentUserData && (
                    <VStack spacing="sm">
                        <Heading size="md">Your Shame Score</Heading>
                        <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                    </VStack>
                )}
                <VStack spacing="sm">
                    <Text>Your friends haven&apos;t created any goals yet</Text>
                    <Text>Encourage them to set some goals!</Text>
                </VStack>
            </VStack>
        );
    };

    // Error state
    if (error) {
        return (
            <View>
                <Text>{error.message}</Text>
            </View>
        );
    }

    // Main dashboard with friends' goals using FlatList for performance
    // Requirements 8.1, 8.5: Optimized list rendering with pull-to-refresh
    return (
        <FlatList
            data={sortedGoals}
            renderItem={renderGoalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            // Performance optimizations - Requirement 8.5
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
        />
    );
}
