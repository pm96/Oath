import { useState } from "react";
import { User } from "../services/firebase/collections";
import {
    addFriend as addFriendService,
    getFriends,
} from "../services/firebase/socialService";
import { useAuth } from "./useAuth";

/**
 * Custom hook for managing social features
 * Provides functions for adding friends and managing social interactions
 */
export function useSocial() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Add a friend to the current user's friends list
     */
    const addFriend = async (friendId: string): Promise<void> => {
        if (!user) {
            throw new Error("User must be authenticated to add friends");
        }

        try {
            setLoading(true);
            setError(null);
            await addFriendService(user.uid, friendId);
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to add friend");
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get list of current user's friends
     */
    const fetchFriends = async (): Promise<User[]> => {
        if (!user) {
            throw new Error("User must be authenticated to fetch friends");
        }

        try {
            setLoading(true);
            setError(null);
            const friends = await getFriends(user.uid);
            return friends;
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to fetch friends");
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        addFriend,
        fetchFriends,
        loading,
        error,
    };
}
