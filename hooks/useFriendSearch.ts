import { UserSearchResult } from "@/services/firebase/collections";
import {
    searchUsers,
    sendFriendRequest,
} from "@/services/firebase/friendService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook for friend search functionality
 * Requirements: 1.1 - User search and discovery
 *
 * Features:
 * - Debounced search with 300ms delay
 * - Loading and error states
 * - Send friend request functionality
 * - Automatic cleanup
 */
export function useFriendSearch(userId: string | undefined) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

    /**
     * Debounce search query by 300ms
     * Requirement 1.1: Reduce Firestore queries with debouncing
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    /**
     * Perform search when debounced query changes
     * Requirement 1.1: Query Firestore for users matching email or displayName
     */
    useEffect(() => {
        if (!userId) {
            return;
        }

        if (!debouncedQuery || debouncedQuery.trim().length === 0) {
            setSearchResults([]);
            setError(null);
            return;
        }

        const performSearch = async () => {
            setLoading(true);
            setError(null);

            try {
                const results = await searchUsers(debouncedQuery);
                setSearchResults(results);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to search users";
                setError(errorMessage);
                showErrorToast(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery, userId]);

    /**
     * Send friend request to a user
     * Requirement 2.1: Create friend request document
     */
    const sendRequest = useCallback(
        async (receiverId: string) => {
            if (!userId) {
                showErrorToast("You must be logged in to send friend requests");
                return false;
            }

            setSendingRequestTo(receiverId);

            try {
                await sendFriendRequest(userId, receiverId);
                showSuccessToast("Friend request sent!");

                // Update the search results to reflect the new status
                setSearchResults((prev) =>
                    prev.map((result) =>
                        result.userId === receiverId
                            ? { ...result, relationshipStatus: "pending_sent" }
                            : result,
                    ),
                );

                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to send friend request";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setSendingRequestTo(null);
            }
        },
        [userId],
    );

    /**
     * Clear search query and results
     */
    const clearSearch = useCallback(() => {
        setSearchQuery("");
        setSearchResults([]);
        setError(null);
    }, []);

    /**
     * Retry search after error
     */
    const retrySearch = useCallback(() => {
        setDebouncedQuery(searchQuery + " "); // Force re-trigger
        setTimeout(() => setDebouncedQuery(searchQuery), 0);
    }, [searchQuery]);

    return {
        searchQuery,
        setSearchQuery,
        searchResults,
        loading,
        error,
        sendingRequestTo,
        sendRequest,
        clearSearch,
        retrySearch,
    };
}
