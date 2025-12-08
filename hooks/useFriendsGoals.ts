import { useEffect, useState } from "react";
import { GoalWithOwner } from "../services/firebase/collections";
import {
    getFriendsGoals,
    getUserData,
} from "../services/firebase/socialService";
import { useAuth } from "./useAuth";

/**
 * Custom hook for managing friends' goals with real-time Firestore listeners
 * Requirements: 3.1, 3.3, 6.1, 6.2
 */
export function useFriendsGoals() {
    const { user } = useAuth();
    const [friendsGoals, setFriendsGoals] = useState<GoalWithOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [friendIds, setFriendIds] = useState<string[]>([]);

    // Fetch current user's friends list
    useEffect(() => {
        if (!user) {
            setFriendIds([]);
            setFriendsGoals([]);
            setLoading(false);
            return;
        }

        const fetchFriends = async () => {
            try {
                const userData = await getUserData(user.uid);
                if (userData) {
                    setFriendIds(userData.friends || []);
                }
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error("Failed to fetch friends");
                setError(error);
            }
        };

        fetchFriends();
    }, [user]);

    // Subscribe to friends' goals with real-time updates
    useEffect(() => {
        if (!user || friendIds.length === 0) {
            setFriendsGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Subscribe to real-time updates for friends' goals with error handling
        // Requirement 3.1: Display all goals where ownerId matches any userId in friends array
        const unsubscribe = getFriendsGoals(
            friendIds,
            (updatedGoals) => {
                setFriendsGoals(updatedGoals);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Error loading friends goals:", err);
                setError(err);
                setLoading(false);
            },
        );

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
        };
    }, [user, friendIds]);

    /**
     * Refresh friends' goals data
     * Requirement 8.5: Add pull-to-refresh functionality
     */
    const refresh = async () => {
        // The real-time listener will automatically update when data changes
        // This is a no-op since Firestore handles real-time updates
        // But we can force a re-render by toggling loading state briefly
        setLoading(true);
        setTimeout(() => setLoading(false), 100);
    };

    return {
        friendsGoals,
        loading,
        error,
        friendIds,
        refresh,
    };
}
