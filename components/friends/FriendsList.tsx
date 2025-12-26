import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import { OptimizedFlatList } from "@/components/ui/OptimizedFlatList";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { VStack } from "@/components/ui/Stack";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@/services/firebase/collections";
import { removeFriend } from "@/services/firebase/friendService";
import { subscribeToUserData } from "@/services/firebase/socialService";
import { AccessibilityLabels, AccessibilityRoles } from "@/utils/accessibility";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import * as Haptics from "expo-haptics";
import React from "react";
import { AccessibilityRole, Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { ShameScoreDisplay } from "../social/ShameScoreDisplay";

interface FriendsListProps {
    userId?: string;
    onFriendSelect?: (friendId: string) => void;
}

interface FriendWithData extends User {
    userId: string;
}

/**
 * Skeleton loader for friend list items
 */
function FriendItemSkeleton() {
    return (
        <VStack spacing="sm">
            <Skeleton />
            <SkeletonText _lines={1} />
            <Skeleton />
        </VStack>
    );
}

/**
 * FriendsList component for displaying and managing friends
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.5, 6.2, 6.3, 9.3, 9.5
 *
 * Features:
 * - Display friends with displayName, email, and shameScore - Requirements 3.1, 3.2
 * - Implement real-time shame score updates - Requirements 3.3, 6.3
 * - Add tap handler to navigate to friend's goals - Requirements 3.4, 3.5
 * - Implement long-press for remove friend - Requirement 5.1
 * - Show confirmation dialog for friend removal - Requirements 5.2, 5.5
 * - Handle empty state with encouragement message - Requirement 3.4
 * - Optimize with FlatList for performance - Requirement 9.5
 * - Proper touch targets (44x44 pixels minimum) - Requirement 9.3
 */
export function FriendsList({ userId, onFriendSelect }: FriendsListProps) {
    const { user } = useAuth();
    const currentUserId = userId || user?.uid;

    const [currentUser, setCurrentUser] = React.useState<User | null>(null);
    const [friendsData, setFriendsData] = React.useState<
        Map<string, FriendWithData>
    >(new Map());
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [removingFriendId, setRemovingFriendId] = React.useState<string | null>(
        null,
    );

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = React.useState<{
        visible: boolean;
        friend: FriendWithData | null;
    }>({
        visible: false,
        friend: null,
    });

    /**
     * Subscribe to current user's data to get friends list
     * Requirement 3.1: Display all users whose IDs are in the user's friends array
     */
    React.useEffect(() => {
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToUserData(
            currentUserId,
            (userData) => {
                setCurrentUser(userData);
                setLoading(false);
            },
            (err) => {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to load user data";
                setError(errorMessage);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [currentUserId]);

    /**
     * Subscribe to each friend's data for real-time updates
     * Requirements 3.3, 6.2, 6.3: Real-time updates for displayName and shameScore
     */
    React.useEffect(() => {
        if (
            !currentUser ||
            !currentUser.friends ||
            currentUser.friends.length === 0
        ) {
            setFriendsData(new Map());
            return;
        }

        const unsubscribers: (() => void)[] = [];

        // Subscribe to each friend's data
        currentUser.friends.forEach((friendId) => {
            const unsubscribe = subscribeToUserData(
                friendId,
                (friendData) => {
                    if (friendData) {
                        setFriendsData((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(friendId, {
                                ...friendData,
                                userId: friendId,
                            });
                            return newMap;
                        });
                    } else {
                        // Friend data not found, remove from map
                        setFriendsData((prev) => {
                            const newMap = new Map(prev);
                            newMap.delete(friendId);
                            return newMap;
                        });
                    }
                },
                (err) => {
                    console.error(`Error loading friend ${friendId}:`, err);
                },
            );

            unsubscribers.push(unsubscribe);
        });

        // Cleanup: unsubscribe from all friends when friends list changes
        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [currentUser]);

    /**
     * Show confirmation dialog for friend removal
     * Requirement 5.1: Display "Remove Friend" option
     * Requirement 9.4: Haptic feedback for important actions
     */
    const showRemoveConfirmation = async (friend: FriendWithData) => {
        // Haptic feedback on long press
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setConfirmDialog({
            visible: true,
            friend,
        });
    };

    /**
     * Hide confirmation dialog
     */
    const hideConfirmation = () => {
        setConfirmDialog({
            visible: false,
            friend: null,
        });
    };

    /**
     * Handle removing a friend
     * Requirements 5.2, 5.3, 5.4, 5.5: Remove friend with atomic updates and confirmation
     * Requirement 9.4: Haptic feedback for important actions
     */
    const handleRemoveFriend = async (friendId: string) => {
        if (!currentUserId) {
            showErrorToast("You must be logged in to remove friends");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setRemovingFriendId(friendId);
        hideConfirmation();

        try {
            await removeFriend(currentUserId, friendId);
            showSuccessToast("Friend removed");
            // Light haptic feedback for removal
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to remove friend";
            showErrorToast(errorMessage);
            // Error haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setRemovingFriendId(null);
        }
    };

    /**
     * Handle friend tap to navigate to their goals
     * Requirements 3.4, 3.5: Navigate to friend's goals view
     * Requirement 9.4: Haptic feedback for interactions
     */
    const handleFriendTap = async (friendId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onFriendSelect?.(friendId);
    };

    /**
     * Render individual friend item
     * Requirements 3.2, 3.3, 6.2, 6.3, 9.3: Display friend info with real-time updates and proper touch targets
     * Requirement 9.4: Smooth animations for list updates
     */
    const renderFriendItem = ({
        item,
        index,
    }: {
        item: FriendWithData;
        index: number;
    }) => {
        const isRemoving = removingFriendId === item.userId;

        // Generate accessibility label for the friend item
        const accessibilityLabel = AccessibilityLabels.listItemLabel(
            `${item.displayName}, ${item.email}`,
            index + 1,
            friendsList.length,
            `Shame score: ${item.shameScore || 0}`,
        );

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 50).springify()}
                exiting={FadeOutUp.springify()}
            >
                <Pressable
                    onPress={() => handleFriendTap(item.userId)}
                    onLongPress={() => showRemoveConfirmation(item)}
                    style={{ minHeight: 44 }} // Requirement 9.3: Minimum 44x44 touch target
                    disabled={isRemoving}
                    accessible={true}
                    accessibilityRole={AccessibilityRoles.button as AccessibilityRole}
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint="Tap to view friend's goals, long press to remove friend"
                    accessibilityState={{ disabled: isRemoving }}
                >
                    <VStack spacing="sm">
                        {/* Friend Info - Requirement 3.2 */}
                        <VStack spacing="xs">
                            <Text>{item.displayName}</Text>
                            <Text>{item.email}</Text>
                        </VStack>

                        {/* Shame Score Display - Requirements 3.2, 3.3, 6.3 */}
                        <ShameScoreDisplay score={item.shameScore} size="sm" />

                        {/* Loading indicator when removing */}
                        {isRemoving && <View></View>}
                    </VStack>
                </Pressable>
            </Animated.View>
        );
    };

    /**
     * Render empty state
     * Requirement 3.4: Handle empty state with encouragement message
     */
    const renderEmptyState = () => {
        // Show skeleton loaders during initial load
        if (loading) {
            return (
                <VStack spacing="sm">
                    <FriendItemSkeleton />
                    <FriendItemSkeleton />
                    <FriendItemSkeleton />
                </VStack>
            );
        }

        // Show error state
        if (error) {
            return (
                <VStack spacing="md">
                    <Text>{error}</Text>
                </VStack>
            );
        }

        // Show empty state message with encouragement
        if (friendsData.size === 0) {
            return (
                <VStack spacing="sm">
                    <Text>No friends yet</Text>
                    <Text>
                        Add friends to share your accountability journey and keep each other
                        on track!
                    </Text>
                </VStack>
            );
        }

        return null;
    };

    // Convert friendsData map to array for FlatList
    const friendsList = Array.from(friendsData.values());

    return (
        <VStack spacing="md">
            {/* Friends List - Requirement 9.5: Optimize with FlatList for performance */}
            <OptimizedFlatList
                data={friendsList}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.userId}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={{ flexGrow: 1 }}
                estimatedItemSize={80}
            />

            {/* Confirmation Dialog - Requirements 5.1, 5.2, 5.5 */}
            <AlertDialog isOpen={confirmDialog.visible} onClose={hideConfirmation}>
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <Heading size="lg">Remove Friend</Heading>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>
                            Are you sure you want to remove{" "}
                            {confirmDialog.friend?.displayName} from your friends list? You
                            will no longer see their goals and they won&apos;t see yours.
                        </Text>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button variant="outline" onPress={hideConfirmation}>
                            Cancel
                        </Button>
                        <Button
                            onPress={() =>
                                confirmDialog.friend &&
                                handleRemoveFriend(confirmDialog.friend.userId)
                            }
                        >
                            Remove
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </VStack>
    );
}
