import { Heading } from "@/components/ui/heading";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/hooks/useAuth";
import { useFriendsGoals } from "@/hooks/useFriendsGoals";
import { sendNudge } from "@/services/firebase/cloudFunctions";
import { GoalWithOwner, User } from "@/services/firebase/collections";
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
        <VStack className="p-4 mb-3 bg-background-50 rounded-lg" space="sm">
            <Skeleton className="h-5 w-3/4" />
            <SkeletonText _lines={3} />
            <Skeleton className="h-4 w-1/2" />
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
    const { friendsGoals, loading, error, friendIds, refresh } =
        useFriendsGoals();
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
        ({ item }: { item: GoalWithOwner }) => (
            <FriendGoalItem goal={item} onNudge={handleNudge} />
        ),
        [handleNudge],
    );

    /**
     * Render list header with user's shame score
     */
    const renderListHeader = () => (
        <VStack className="mb-4" space="lg">
            {/* User's own shame score - Requirement 6.1 */}
            {currentUserData && (
                <VStack space="sm">
                    <Heading size="md">Your Shame Score</Heading>
                    <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                </VStack>
            )}

            {/* Friends' goals section header */}
            {friendsGoals.length > 0 && (
                <VStack space="sm">
                    <Heading size="md">Friends&apos; Goals</Heading>
                    <Text className="text-typography-500">
                        {friendsGoals.length} goal{friendsGoals.length !== 1 ? "s" : ""}{" "}
                        from {friendIds.length} friend{friendIds.length !== 1 ? "s" : ""}
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
        if (loading && friendsGoals.length === 0) {
            return (
                <VStack className="p-4" space="md">
                    {currentUserData && (
                        <VStack space="sm">
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
                <VStack className="p-4" space="lg">
                    {currentUserData && (
                        <VStack space="sm">
                            <Heading size="md">Your Shame Score</Heading>
                            <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                        </VStack>
                    )}
                    <VStack space="sm" className="items-center py-8">
                        <Text className="text-typography-600 text-center text-lg">
                            No friends added yet
                        </Text>
                        <Text className="text-typography-500 text-center">
                            Add friends to see their goals and hold each other accountable!
                        </Text>
                    </VStack>
                </VStack>
            );
        }

        // No goals from friends state
        return (
            <VStack className="p-4" space="lg">
                {currentUserData && (
                    <VStack space="sm">
                        <Heading size="md">Your Shame Score</Heading>
                        <ShameScoreDisplay score={currentUserData.shameScore} size="lg" />
                    </VStack>
                )}
                <VStack space="sm" className="items-center py-8">
                    <Text className="text-typography-600 text-center text-lg">
                        Your friends haven&apos;t created any goals yet
                    </Text>
                    <Text className="text-typography-500 text-center">
                        Encourage them to set some goals!
                    </Text>
                </VStack>
            </VStack>
        );
    };

    // Error state
    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-background-0 p-4">
                <Text className="text-error-600 text-center">{error.message}</Text>
            </View>
        );
    }

    // Main dashboard with friends' goals using FlatList for performance
    // Requirements 8.1, 8.5: Optimized list rendering with pull-to-refresh
    return (
        <FlatList
            data={friendsGoals}
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
