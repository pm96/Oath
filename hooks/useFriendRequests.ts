import { FriendRequest } from "@/services/firebase/collections";
import {
    acceptFriendRequest,
    rejectFriendRequest,
    subscribeToPendingRequests,
} from "@/services/firebase/friendService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook for managing friend requests
 * Requirements: 2.3, 6.4 - Friend request management with real-time updates
 *
 * Features:
 * - Real-time pending requests subscription
 * - Accept/reject functionality
 * - Loading and error states
 * - Automatic cleanup
 */
export function useFriendRequests(userId: string | undefined) {
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(
        null,
    );

    /**
     * Subscribe to pending friend requests with real-time updates
     * Requirement 6.4: Real-time updates when requests are accepted or rejected
     */
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToPendingRequests(
            userId,
            (requests) => {
                setPendingRequests(requests);
                setLoading(false);
            },
            (err) => {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to load friend requests";
                setError(errorMessage);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [userId]);

    /**
     * Accept a friend request
     * Requirement 2.4: Add each user's ID to the other's friends array
     */
    const acceptRequest = useCallback(
        async (requestId: string) => {
            if (!userId) {
                showErrorToast("You must be logged in to accept friend requests");
                return false;
            }

            setProcessingRequestId(requestId);

            try {
                await acceptFriendRequest(requestId, userId);
                showSuccessToast("Friend request accepted!");
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to accept friend request";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setProcessingRequestId(null);
            }
        },
        [userId],
    );

    /**
     * Reject a friend request
     * Requirement 2.5: Update request status to 'rejected'
     */
    const rejectRequest = useCallback(
        async (requestId: string) => {
            if (!userId) {
                showErrorToast("You must be logged in to reject friend requests");
                return false;
            }

            setProcessingRequestId(requestId);

            try {
                await rejectFriendRequest(requestId, userId);
                showSuccessToast("Friend request rejected");
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Failed to reject friend request";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setProcessingRequestId(null);
            }
        },
        [userId],
    );

    return {
        pendingRequests,
        loading,
        error,
        processingRequestId,
        acceptRequest,
        rejectRequest,
    };
}
