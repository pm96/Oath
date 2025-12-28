import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { UserSearchResult } from "@/services/firebase/collections";
import {
    blockUser,
    searchUsers,
    sendFriendRequest,
} from "@/services/firebase/friendService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

interface UserSearchProps {
    currentUserId?: string;
    onUserSelect?: (user: UserSearchResult) => void;
}

/**
 * Skeleton loader for search result items
 */
function SearchResultSkeleton() {
    return (
        <View style={{ gap: 8 }}>
            <Skeleton />
            <SkeletonText _lines={1} />
        </View>
    );
}

/**
 * UserSearch component for finding and adding friends
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4
 *
 * Features:
 * - Debounced search input (300ms delay) - Requirement 1.1
 * - Display search results with displayName and email - Requirement 1.2
 * - Show relationship status indicators - Requirement 1.3
 * - Handle empty query and no results states - Requirements 1.4, 1.5
 * - Mobile-optimized UI with proper touch targets - Requirements 9.1, 9.2, 9.3, 9.4
 */
export function UserSearch({ currentUserId, onUserSelect }: UserSearchProps) {
    const { user } = useAuth();
    const userId = currentUserId || user?.uid;

    const [searchQuery, setSearchQuery] = React.useState("");
    const [debouncedQuery, setDebouncedQuery] = React.useState("");
    const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>(
        [],
    );
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [sendingRequestTo, setSendingRequestTo] = React.useState<string | null>(
        null,
    );

    /**
     * Debounce search query by 300ms
     * Requirement 1.1: Reduce Firestore queries with debouncing
     */
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    /**
     * Perform search when debounced query changes
     * Requirement 1.1: Query Firestore for users matching email or displayName
     */
    React.useEffect(() => {
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
     * Handle sending friend request
     * Requirement 2.1: Create friend request document
     * Requirement 9.4: Provide immediate visual feedback with haptics
     */
    const handleSendFriendRequest = async (receiverId: string) => {
        if (!userId) {
            showErrorToast("You must be logged in to send friend requests");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Haptic feedback on button press
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSendingRequestTo(receiverId);

        try {
            await sendFriendRequest(userId, receiverId);
            showSuccessToast("Friend request sent!");
            // Success haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Update the search results to reflect the new status
            setSearchResults((prev) =>
                prev.map((result) =>
                    result.userId === receiverId
                        ? { ...result, relationshipStatus: "pending_sent" }
                        : result,
                ),
            );
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to send friend request";
            showErrorToast(errorMessage);
            // Error haptic feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSendingRequestTo(null);
        }
    };

    /**
     * Retry search after error
     */
    const handleRetry = () => {
        setDebouncedQuery(searchQuery + " "); // Force re-trigger
        setTimeout(() => setDebouncedQuery(searchQuery), 0);
    };

    const handleBlock = async (targetId: string, name: string) => {
        if (!userId) return;
        
        Alert.alert(
            "Block User",
            `Are you sure you want to block ${name}? They will no longer be able to find you or interact with you.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await blockUser(userId, targetId);
                            showSuccessToast("User blocked.");
                            setSearchResults(prev => prev.filter(r => r.userId !== targetId));
                        } catch (error: any) {
                            showErrorToast(error.message);
                        }
                    }
                }
            ]
        );
    };

    /**
     * Get button text and action based on relationship status
     * Requirement 1.3: Indicate relationship status
     */
    const getActionButton = (result: UserSearchResult) => {
        const isLoading = sendingRequestTo === result.userId;

        return (
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {result.relationshipStatus === "none" && (
                    <Button
                        size="sm"
                        variant="primary"
                        onPress={() => handleSendFriendRequest(result.userId)}
                        disabled={isLoading}
                    >
                        {isLoading ? "..." : "Add"}
                    </Button>
                )}
                {result.relationshipStatus !== "none" && (
                    <Button size="sm" variant="outline" disabled onPress={() => { }}>
                        {result.relationshipStatus === "friend" ? "Friends" : "Pending"}
                    </Button>
                )}
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onPress={() => handleBlock(result.userId, result.displayName)}
                >
                    <Text style={{ color: '#ef4444', fontSize: 12 }}>Block</Text>
                </Button>
            </View>
        );
    };

    /**
     * Render individual search result item
     * Requirements 1.2, 1.3, 9.3: Display user info with relationship status and proper touch targets
     * Requirement 9.4: Smooth animations for list updates
     */
    const renderSearchResult = ({
        item,
        index,
    }: {
        item: UserSearchResult;
        index: number;
    }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            exiting={FadeOutUp.springify()}
        >
            <Pressable
                onPress={() => onUserSelect?.(item)}
                style={{ minHeight: 44 }} // Requirement 9.3: Minimum 44x44 touch target
            >
                <View style={{ gap: 4 }}>
                    <Text>{item.displayName}</Text>
                    <Text>{item.email}</Text>
                </View>
                {getActionButton(item)}
            </Pressable>
        </Animated.View>
    );

    /**
     * Render empty state based on current state
     * Requirements 1.4, 1.5: Handle empty query and no results states
     */
    const renderEmptyState = () => {
        // Show skeleton loaders during search
        if (loading) {
            return (
                <View style={{ gap: 8 }}>
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                </View>
            );
        }

        // Show error state with retry option
        if (error) {
            return (
                <View style={{ gap: 16 }}>
                    <Text>{error}</Text>
                    <Button size="sm" onPress={handleRetry}>
                        Retry
                    </Button>
                </View>
            );
        }

        // Show "no results" message if query exists but no results
        if (debouncedQuery && searchResults.length === 0) {
            return (
                <View style={{ gap: 8 }}>
                    <Text>No users found</Text>
                    <Text>Try searching by email or name</Text>
                </View>
            );
        }

        // Show prompt to enter search query
        if (!searchQuery || searchQuery.trim().length === 0) {
            return (
                <View style={{ gap: 8 }}>
                    <Text>Search for friends</Text>
                    <Text>Enter an email or name to find friends</Text>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={{ gap: 16 }}>
            {/* Search Input - Requirement 9.1, 9.2: Mobile-optimized responsive design */}
            <Input
                placeholder="Search by email or name"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />

            {/* Search Results - Requirement 9.2: Scrollable list with clear visual separation */}
            {searchResults.length > 0 ? (
                <View>
                    {searchResults.map((item, index) => renderSearchResult({ item, index }))}
                </View>
            ) : (
                renderEmptyState()
            )}
        </View>
    );
}
