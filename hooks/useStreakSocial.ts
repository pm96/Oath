import {
    SharedHabitStreak,
    StreakNotification,
    StreakReaction,
    StreakSocialPost,
    streakSocialService,
} from "@/services/firebase/streakSocialService";
import { StreakMilestone } from "@/types/habit-streaks";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook for managing streak social features
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * Features:
 * - Create milestone and streak sharing posts
 * - React to friends' posts
 * - View friends' shared streaks
 * - Manage streak notifications
 * - Real-time updates for social feed
 */
export function useStreakSocial(userId: string | undefined) {
    const [socialPosts, setSocialPosts] = useState<StreakSocialPost[]>([]);
    const [sharedStreaks, setSharedStreaks] = useState<SharedHabitStreak[]>([]);
    const [notifications, setNotifications] = useState<StreakNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creatingPost, setCreatingPost] = useState(false);
    const [reactingToPost, setReactingToPost] = useState<string | null>(null);

    /**
     * Subscribe to friends' social posts
     * Requirements: 8.2, 8.3
     */
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = streakSocialService.subscribeToFriendsSocialPosts(
            userId,
            (posts) => {
                setSocialPosts(posts);
                setLoading(false);
            },
            (err) => {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to load social posts";
                setError(errorMessage);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [userId]);

    /**
     * Subscribe to streak notifications
     * Requirements: 8.5
     */
    useEffect(() => {
        if (!userId) {
            return;
        }

        const unsubscribe = streakSocialService.subscribeToStreakNotifications(
            userId,
            (notifs) => {
                setNotifications(notifs);
            },
            (err) => {
                console.error("Error loading streak notifications:", err);
            },
        );

        return () => unsubscribe();
    }, [userId]);

    /**
     * Load friends' shared streaks
     * Requirements: 8.4
     */
    const loadSharedStreaks = useCallback(async () => {
        if (!userId) return;

        try {
            const streaks = await streakSocialService.getFriendsSharedStreaks(userId);
            setSharedStreaks(streaks);
        } catch (err) {
            console.error("Error loading shared streaks:", err);
        }
    }, [userId]);

    useEffect(() => {
        loadSharedStreaks();
    }, [loadSharedStreaks]);

    /**
     * Create a milestone achievement post
     * Requirements: 8.1, 8.2
     */
    const createMilestonePost = useCallback(
        async (
            habitId: string,
            habitDescription: string,
            milestone: StreakMilestone,
            customMessage?: string,
        ): Promise<boolean> => {
            if (!userId) {
                showErrorToast("You must be logged in to share milestones");
                return false;
            }

            setCreatingPost(true);

            try {
                await streakSocialService.createMilestonePost(
                    userId,
                    habitId,
                    habitDescription,
                    milestone,
                    customMessage,
                );

                showSuccessToast(
                    `🎉 Milestone shared with friends! ${milestone.days} days is amazing!`,
                );
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to share milestone";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setCreatingPost(false);
            }
        },
        [userId],
    );

    /**
     * Share current streak with friends
     * Requirements: 8.1, 8.2
     */
    const shareStreak = useCallback(
        async (
            habitId: string,
            habitDescription: string,
            customMessage?: string,
        ): Promise<boolean> => {
            if (!userId) {
                showErrorToast("You must be logged in to share streaks");
                return false;
            }

            setCreatingPost(true);

            try {
                await streakSocialService.shareStreak(
                    userId,
                    habitId,
                    habitDescription,
                    customMessage,
                );

                showSuccessToast("💪 Streak shared with friends!");
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to share streak";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setCreatingPost(false);
            }
        },
        [userId],
    );

    /**
     * Add reaction to a friend's post
     * Requirements: 8.3, 8.5
     */
    const addReaction = useCallback(
        async (
            postId: string,
            reactionType: StreakReaction["reactionType"],
        ): Promise<boolean> => {
            if (!userId) {
                showErrorToast("You must be logged in to react to posts");
                return false;
            }

            setReactingToPost(postId);

            try {
                await streakSocialService.addReactionToPost(
                    postId,
                    userId,
                    reactionType,
                );

                const reactionEmojis = {
                    congratulations: "🎉",
                    fire: "🔥",
                    clap: "👏",
                    heart: "❤️",
                };

                showSuccessToast(`Reaction sent! ${reactionEmojis[reactionType]}`);
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to add reaction";
                showErrorToast(errorMessage);
                return false;
            } finally {
                setReactingToPost(null);
            }
        },
        [userId],
    );

    /**
     * Share a habit streak with friends (make it visible)
     * Requirements: 8.4
     */
    const shareHabitStreak = useCallback(
        async (habitId: string, habitDescription: string): Promise<boolean> => {
            if (!userId) {
                showErrorToast("You must be logged in to share habit streaks");
                return false;
            }

            try {
                await streakSocialService.shareHabitStreak(
                    userId,
                    habitId,
                    habitDescription,
                );
                await loadSharedStreaks(); // Refresh shared streaks
                showSuccessToast("Habit streak is now visible to friends!");
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to share habit streak";
                showErrorToast(errorMessage);
                return false;
            }
        },
        [userId, loadSharedStreaks],
    );

    /**
     * Mark notification as read
     * Requirements: 8.5
     */
    const markNotificationAsRead = useCallback(
        async (notificationId: string): Promise<boolean> => {
            try {
                await streakSocialService.markNotificationAsRead(notificationId);
                return true;
            } catch (err) {
                console.error("Error marking notification as read:", err);
                return false;
            }
        },
        [],
    );

    /**
     * Get unread notification count
     * Requirements: 8.5
     */
    const unreadNotificationCount = notifications.filter((n) => !n.read).length;

    /**
     * Get user's own reaction to a post
     */
    const getUserReaction = useCallback(
        (post: StreakSocialPost): StreakReaction | null => {
            if (!userId) return null;
            return post.reactions.find((r) => r.userId === userId) || null;
        },
        [userId],
    );

    /**
     * Check if user has reacted to a post
     */
    const hasUserReacted = useCallback(
        (post: StreakSocialPost): boolean => {
            return getUserReaction(post) !== null;
        },
        [getUserReaction],
    );

    /**
     * Get reaction counts for a post
     */
    const getReactionCounts = useCallback((post: StreakSocialPost) => {
        const counts: Record<StreakReaction["reactionType"], number> = {
            congratulations: 0,
            fire: 0,
            clap: 0,
            heart: 0,
        };

        post.reactions.forEach((reaction) => {
            counts[reaction.reactionType]++;
        });

        return counts;
    }, []);

    /**
     * Refresh social data
     */
    const refresh = useCallback(async () => {
        await loadSharedStreaks();
    }, [loadSharedStreaks]);

    return {
        // Data
        socialPosts,
        sharedStreaks,
        notifications,
        unreadNotificationCount,

        // State
        loading,
        error,
        creatingPost,
        reactingToPost,

        // Actions
        createMilestonePost,
        shareStreak,
        addReaction,
        shareHabitStreak,
        markNotificationAsRead,
        refresh,

        // Helpers
        getUserReaction,
        hasUserReacted,
        getReactionCounts,
    };
}

/**
 * Hook for managing milestone sharing offers
 * Requirements: 8.1
 */
export function useMilestoneSharing() {
    const [showSharingOffer, setShowSharingOffer] = useState(false);
    const [milestoneToShare, setMilestoneToShare] = useState<{
        habitId: string;
        habitDescription: string;
        milestone: StreakMilestone;
    } | null>(null);

    /**
     * Offer to share a milestone achievement
     * Requirements: 8.1
     */
    const offerMilestoneSharing = useCallback(
        (habitId: string, habitDescription: string, milestone: StreakMilestone) => {
            setMilestoneToShare({ habitId, habitDescription, milestone });
            setShowSharingOffer(true);
        },
        [],
    );

    /**
     * Dismiss the sharing offer
     */
    const dismissSharingOffer = useCallback(() => {
        setShowSharingOffer(false);
        setMilestoneToShare(null);
    }, []);

    return {
        showSharingOffer,
        milestoneToShare,
        offerMilestoneSharing,
        dismissSharingOffer,
    };
}
