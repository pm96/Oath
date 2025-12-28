import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { VStack } from "@/components/ui/Stack";
import { Heading, Text } from "@/components/ui/Text";
import { useThemeStyles } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { FriendRequest } from "@/services/firebase/collections";
import {
    acceptFriendRequest,
    rejectFriendRequest,
    subscribeToPendingRequests,
} from "@/services/firebase/friendService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import * as Haptics from "expo-haptics";
import React from "react";
import { FlatList, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

interface FriendRequestsProps {
    userId?: string;
    onRequestHandled?: () => void;
}

/**
 * Skeleton loader for friend request items
 */
function FriendRequestSkeleton() {
    return (
        <VStack spacing="sm">
            <Skeleton />
            <SkeletonText _lines={1} />
            <View>
                <Skeleton />
                <Skeleton />
            </View>
        </VStack>
    );
}

/**
 * FriendRequests component for managing incoming friend requests
 * Requirements: 2.3, 2.4, 2.5, 6.4, 9.3, 9.4
 *
 * Features:
 * - Display pending incoming requests - Requirement 2.3
 * - Accept button with confirmation - Requirement 2.4
 * - Reject button with confirmation - Requirement 2.5
 * - Real-time updates when requests change - Requirement 6.4
 * - Handle empty state (no pending requests) - Requirement 2.3
 * - Loading states for accept/reject actions - Requirement 9.4
 * - Proper touch targets (44x44 pixels minimum) - Requirement 9.3
 */
export function FriendRequests({
    userId,
    onRequestHandled,
}: FriendRequestsProps) {
    const { user } = useAuth();
    const { colors } = useThemeStyles();
    const currentUserId = userId || user?.uid;

    const [pendingRequests, setPendingRequests] = React.useState<FriendRequest[]>(
        [],
    );
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [processingRequestId, setProcessingRequestId] = React.useState<
        string | null
    >(null);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = React.useState<{
        visible: boolean;
        type: "accept" | "reject" | null;
        request: FriendRequest | null;
    }>({
        visible: false,
        type: null,
        request: null,
    });

    /**
     * Subscribe to pending friend requests with real-time updates
     * Requirement 6.4: Real-time updates when requests are accepted or rejected
     */
    React.useEffect(() => {
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToPendingRequests(
            currentUserId,
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
    }, [currentUserId]);

    /**
     * Show confirmation dialog for accept/reject actions
     * Requirement 9.4: Haptic feedback for important actions
     */
    const showConfirmation = async (
        type: "accept" | "reject",
        request: FriendRequest,
    ) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setConfirmDialog({
            visible: true,
            type,
            request,
        });
    };

    /**
     * Hide confirmation dialog
     */
    const hideConfirmation = () => {
        setConfirmDialog({
            visible: false,
            type: null,
            request: null,
        });
    };

    /**
     * Handle pull-to-refresh
     */
    const handleRefresh = React.useCallback(async () => {
        if (!currentUserId) return;

        setRefreshing(true);
        // The subscription will automatically update the data
        // Just wait a moment for any pending updates
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, [currentUserId]);

    /**
     * Handle accepting a friend request
     * Requirement 2.4: Add each user's ID to the other's friends array
     * Requirement 9.4: Provide immediate visual feedback with haptics
     */
    const handleAcceptRequest = async (requestId: string) => {
        if (!currentUserId) {
            showErrorToast("You must be logged in to accept friend requests");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setProcessingRequestId(requestId);
        hideConfirmation();

        try {
            await acceptFriendRequest(requestId, currentUserId);
            showSuccessToast("Friend request accepted!");
            // Success haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onRequestHandled?.();
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to accept friend request";
            showErrorToast(errorMessage);
            // Error haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setProcessingRequestId(null);
        }
    };

    /**
     * Handle rejecting a friend request
     * Requirement 2.5: Update request status to 'rejected'
     * Requirement 9.4: Provide immediate visual feedback with haptics
     */
    const handleRejectRequest = async (requestId: string) => {
        if (!currentUserId) {
            showErrorToast("You must be logged in to reject friend requests");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setProcessingRequestId(requestId);
        hideConfirmation();

        try {
            await rejectFriendRequest(requestId, currentUserId);
            showSuccessToast("Friend request rejected");
            // Light haptic feedback for rejection
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRequestHandled?.();
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to reject friend request";
            showErrorToast(errorMessage);
            // Error haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setProcessingRequestId(null);
        }
    };

    /**
     * Handle confirmation dialog action
     */
    const handleConfirmAction = () => {
        if (!confirmDialog.request) return;

        if (confirmDialog.type === "accept") {
            handleAcceptRequest(confirmDialog.request.id);
        } else if (confirmDialog.type === "reject") {
            handleRejectRequest(confirmDialog.request.id);
        }
    };

    /**
     * Render individual friend request item
     * Requirements 2.3, 9.3, 9.4: Display request with proper touch targets and visual feedback
     * Requirement 9.4: Smooth animations for list updates
     */
    const renderFriendRequest = ({
        item,
        index,
    }: {
        item: FriendRequest;
        index: number;
    }) => {
        const isProcessing = processingRequestId === item.id;

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 50).springify()}
                exiting={FadeOutUp.springify()}
            >
                <VStack
                    spacing="sm"
                    style={{ minHeight: 44 }} // Requirement 9.3: Minimum 44x44 touch target
                >
                    <VStack spacing="xs">
                        <Text>{item.senderName}</Text>
                        <Text>{item.senderEmail}</Text>
                    </VStack>

                    {/* Action Buttons - Requirements 2.4, 2.5, 9.3 */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button
                            size="sm"
                            variant="primary"
                            onPress={() => showConfirmation("accept", item)}
                            disabled={isProcessing}
                            style={{ minHeight: 44, minWidth: 44 }} // Requirement 9.3
                        >
                            {isProcessing ? "Processing..." : "Accept"}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onPress={() => showConfirmation("reject", item)}
                            disabled={isProcessing}
                            style={{ minHeight: 44, minWidth: 44 }} // Requirement 9.3
                        >
                            {isProcessing ? "Processing..." : "Reject"}
                        </Button>
                    </View>
                </VStack>
            </Animated.View>
        );
    };

    /**
     * Render empty state
     * Requirement 2.3: Handle empty state (no pending requests)
     */
    const renderEmptyState = () => {
        // Show skeleton loaders during initial load
        if (loading) {
            return (
                <VStack spacing="sm">
                    <FriendRequestSkeleton />
                    <FriendRequestSkeleton />
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

        // Show empty state message
        if (pendingRequests.length === 0) {
            return (
                <VStack spacing="sm">
                    <Text>No pending requests</Text>
                    <Text>Friend requests will appear here</Text>
                </VStack>
            );
        }

        return null;
    };

    return (
        <VStack spacing="md">
            {/* Friend Requests List - Requirement 6.4: Real-time updates */}
            {pendingRequests.length === 0 ? renderEmptyState() : (
                <VStack spacing="md">
                    {pendingRequests.map((item, index) => {
                        const isProcessing = processingRequestId === item.id;
                        return (
                            <Animated.View
                                key={item.id}
                                entering={FadeInDown.delay(index * 50).springify()}
                                exiting={FadeOutUp.springify()}
                            >
                                <VStack
                                    spacing="sm"
                                    style={{ minHeight: 44 }} // Requirement 9.3: Minimum 44x44 touch target
                                >
                                    <VStack spacing="xs">
                                        <Text>{item.senderName}</Text>
                                        <Text>{item.senderEmail}</Text>
                                    </VStack>

                                    {/* Action Buttons - Requirements 2.4, 2.5, 9.3 */}
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onPress={() => showConfirmation("accept", item)}
                                            disabled={isProcessing}
                                            style={{ minHeight: 44, minWidth: 44 }} // Requirement 9.3
                                        >
                                            {isProcessing ? "Processing..." : "Accept"}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onPress={() => showConfirmation("reject", item)}
                                            disabled={isProcessing}
                                            style={{ minHeight: 44, minWidth: 44 }} // Requirement 9.3
                                        >
                                            {isProcessing ? "Processing..." : "Reject"}
                                        </Button>
                                    </View>
                                </VStack>
                            </Animated.View>
                        );
                    })}
                </VStack>
            )}

            {/* Confirmation Dialog - Requirements 2.4, 2.5 */}
            <AlertDialog isOpen={confirmDialog.visible} onClose={hideConfirmation}>
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <Heading size="lg">
                            {confirmDialog.type === "accept"
                                ? "Accept Friend Request"
                                : "Reject Friend Request"}
                        </Heading>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>
                            {confirmDialog.type === "accept"
                                ? `Are you sure you want to accept the friend request from ${confirmDialog.request?.senderName}?`
                                : `Are you sure you want to reject the friend request from ${confirmDialog.request?.senderName}?`}
                        </Text>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button variant="outline" onPress={hideConfirmation}>
                            Cancel
                        </Button>
                        <Button
                            variant={confirmDialog.type === "accept" ? "primary" : "outline"}
                            onPress={handleConfirmAction}
                        >
                            {confirmDialog.type === "accept" ? "Accept" : "Reject"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </VStack>
    );
}
