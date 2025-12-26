import { User } from "@/services/firebase/collections";
import { removeFriend } from "@/services/firebase/friendService";
import { subscribeToUserData } from "@/services/firebase/socialService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { useCallback, useEffect, useState } from "react";

/**
 * Friend data with userId
 */
export interface FriendWithData extends User {
    userId: string;
}

/**
 * Custom hook for managing friends list
 * Requirements: 3.1, 6.1, 6.2, 6.3 - Friends list with real-time updates
 *
 * Features:
 * - Real-time friends list subscription
 * - Real-time shame score updates
 * - Remove friend functionality
 * - Loading and error states
 * - Automatic cleanup
 */
export function useFriends(userId: string | undefined) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [friendsData, setFriendsData] = useState<Map<string, FriendWithData>>(
        new Map(),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

    /**
     * Subscribe to current user's data to get friends list
     * Requirement 3.1: Display all users whose IDs are in the user's friends array
     */
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToUserData(
            userId,
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
    }, [userId]);

    /**
     * Subscribe to each friend's data for real-time updates
     * Requirements 6.2, 6.3: Real-time updates for displayName and shameScore
     */
    useEffect(() => {
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
     * Remove a friend from the friends list
     * Requirements 5.2, 5.4: Remove friend with atomic updates
     */
    const removeFriendById = useCallback(
        async (friendId: string) => {
            if (!userId) {
                showErrorToast("You must be logged in to remove friends");
                return false;
            }

            setRemovingFriendId(friendId);

            try {
                await removeFriend(userId, friendId);
                showSuccessToast("Friend removed");
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to remove friend";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setRemovingFriendId(null);
            }
        },
        [userId],
    );

    // Convert friendsData map to array for easier consumption
    const friendsList = Array.from(friendsData.values());

    return {
        currentUser,
        friendsList,
        friendsData,
        loading,
        error,
        removingFriendId,
        removeFriendById,
    };
}
