import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { StreakMilestone } from "../../types/habit-streaks";
import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "../../utils/errorHandling";
import { getHabitStreaksCollection, getUserDoc, User } from "./collections";
import { transformFirestoreToStreak } from "./habitStreakSchemas";

/**
 * Streak Social Service
 *
 * Handles social sharing and friend integration for streak achievements
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

// Social Post Types
export interface StreakSocialPost {
    id: string;
    userId: string;
    userName: string;
    habitId: string;
    habitDescription: string;
    postType: "milestone" | "streak_share";
    milestoneData?: {
        days: number;
        achievedAt: Timestamp;
        badgeType: string;
        title: string;
    };
    streakData?: {
        currentStreak: number;
        bestStreak: number;
    };
    message: string;
    createdAt: Timestamp;
    reactions: StreakReaction[];
    visibility: "friends" | "public";
}

export interface StreakReaction {
    userId: string;
    userName: string;
    reactionType: "congratulations" | "fire" | "clap" | "heart";
    createdAt: Timestamp;
}

export interface SharedHabitStreak {
    habitId: string;
    habitDescription: string;
    userId: string;
    userName: string;
    currentStreak: number;
    bestStreak: number;
    lastCompletionDate: string;
    milestones: StreakMilestone[];
    isShared: boolean;
    sharedAt: Timestamp;
}

export interface StreakNotification {
    id: string;
    recipientId: string;
    senderId: string;
    senderName: string;
    type: "milestone_achievement" | "reaction" | "streak_share";
    postId?: string;
    milestoneData?: {
        days: number;
        habitDescription: string;
    };
    reactionData?: {
        reactionType: string;
        postType: string;
    };
    message: string;
    read: boolean;
    createdAt: Timestamp;
}

/**
 * Streak Social Service Class
 */
export class StreakSocialService {
    /**
     * Create a social post for milestone achievement
     * Requirements: 8.1, 8.2
     */
    async createMilestonePost(
        userId: string,
        habitId: string,
        habitDescription: string,
        milestone: StreakMilestone,
        customMessage?: string,
    ): Promise<StreakSocialPost> {
        if (!userId || !habitId || !habitDescription || !milestone) {
            throw new Error(
                "All parameters are required for milestone post creation",
            );
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Get user data for post
                    const userDoc = await transaction.get(getUserDoc(userId));
                    if (!userDoc.exists()) {
                        throw new Error("User not found");
                    }
                    const userData = userDoc.data() as User;

                    // Create milestone post data
                    const badgeType = this.getBadgeType(milestone.days);
                    const milestoneTitle = this.getMilestoneTitle(milestone.days);

                    const defaultMessage = `🔥 Just hit a ${milestone.days}-day streak on "${habitDescription}"! ${this.getMilestoneEmoji(milestone.days)}`;
                    const message = customMessage || defaultMessage;

                    const postData = {
                        userId,
                        userName: userData.displayName,
                        habitId,
                        habitDescription,
                        postType: "milestone" as const,
                        milestoneData: {
                            days: milestone.days,
                            achievedAt: milestone.achievedAt,
                            badgeType,
                            title: milestoneTitle,
                        },
                        message,
                        createdAt: serverTimestamp(),
                        reactions: [],
                        visibility: "friends" as const,
                    };

                    // Add post to social posts collection
                    const postsCollection = this.getSocialPostsCollection();
                    const postRef = doc(postsCollection);
                    transaction.set(postRef, postData);

                    // Send notifications to friends
                    const friendIds = userData.friends || [];
                    for (const friendId of friendIds) {
                        const notificationData = {
                            recipientId: friendId,
                            senderId: userId,
                            senderName: userData.displayName,
                            type: "milestone_achievement" as const,
                            postId: postRef.id,
                            milestoneData: {
                                days: milestone.days,
                                habitDescription,
                            },
                            message: `${userData.displayName} achieved a ${milestone.days}-day streak!`,
                            read: false,
                            createdAt: serverTimestamp(),
                        };

                        const notificationsCollection =
                            this.getStreakNotificationsCollection();
                        const notificationRef = doc(notificationsCollection);
                        transaction.set(notificationRef, notificationData);
                    }

                    return {
                        id: postRef.id,
                        ...postData,
                        createdAt: Timestamp.now(),
                    } as StreakSocialPost;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to create milestone post: ${message}`);
        }
    }

    /**
     * Share current streak with friends
     * Requirements: 8.1, 8.2
     */
    async shareStreak(
        userId: string,
        habitId: string,
        habitDescription: string,
        customMessage?: string,
    ): Promise<StreakSocialPost> {
        if (!userId || !habitId || !habitDescription) {
            throw new Error("User ID, habit ID, and description are required");
        }

        try {
            return await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Get user data
                    const userDoc = await transaction.get(getUserDoc(userId));
                    if (!userDoc.exists()) {
                        throw new Error("User not found");
                    }
                    const userData = userDoc.data() as User;

                    // Get streak data
                    const streaksCollection = getHabitStreaksCollection();
                    const streakId = `${userId}_${habitId}`;
                    const streakDoc = await transaction.get(
                        doc(streaksCollection, streakId),
                    );

                    if (!streakDoc.exists()) {
                        throw new Error("Streak data not found");
                    }

                    const streak = transformFirestoreToStreak(streakDoc.data());

                    const defaultMessage = `💪 Currently on a ${streak.currentStreak}-day streak with "${habitDescription}"! Best streak: ${streak.bestStreak} days`;
                    const message = customMessage || defaultMessage;

                    const postData = {
                        userId,
                        userName: userData.displayName,
                        habitId,
                        habitDescription,
                        postType: "streak_share" as const,
                        streakData: {
                            currentStreak: streak.currentStreak,
                            bestStreak: streak.bestStreak,
                        },
                        message,
                        createdAt: serverTimestamp(),
                        reactions: [],
                        visibility: "friends" as const,
                    };

                    // Add post to social posts collection
                    const postsCollection = this.getSocialPostsCollection();
                    const postRef = doc(postsCollection);
                    transaction.set(postRef, postData);

                    return {
                        id: postRef.id,
                        ...postData,
                        createdAt: Timestamp.now(),
                    } as StreakSocialPost;
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to share streak: ${message}`);
        }
    }

    /**
     * Add reaction to a streak post
     * Requirements: 8.3, 8.5
     */
    async addReactionToPost(
        postId: string,
        userId: string,
        reactionType: StreakReaction["reactionType"],
    ): Promise<void> {
        if (!postId || !userId || !reactionType) {
            throw new Error("Post ID, user ID, and reaction type are required");
        }

        try {
            await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Get user data
                    const userDoc = await transaction.get(getUserDoc(userId));
                    if (!userDoc.exists()) {
                        throw new Error("User not found");
                    }
                    const userData = userDoc.data() as User;

                    // Get post data
                    const postsCollection = this.getSocialPostsCollection();
                    const postDoc = await transaction.get(doc(postsCollection, postId));

                    if (!postDoc.exists()) {
                        throw new Error("Post not found");
                    }

                    const postData = postDoc.data() as Omit<StreakSocialPost, "id">;

                    // Check if user already reacted
                    const existingReactionIndex = postData.reactions.findIndex(
                        (reaction) => reaction.userId === userId,
                    );

                    const newReaction: StreakReaction = {
                        userId,
                        userName: userData.displayName,
                        reactionType,
                        createdAt: Timestamp.now(),
                    };

                    let updatedReactions: StreakReaction[];
                    if (existingReactionIndex >= 0) {
                        // Update existing reaction
                        updatedReactions = [...postData.reactions];
                        updatedReactions[existingReactionIndex] = newReaction;
                    } else {
                        // Add new reaction
                        updatedReactions = [...postData.reactions, newReaction];
                    }

                    // Update post with new reaction
                    transaction.update(doc(postsCollection, postId), {
                        reactions: updatedReactions,
                    });

                    // Send notification to post owner (if not reacting to own post)
                    if (postData.userId !== userId) {
                        const notificationData = {
                            recipientId: postData.userId,
                            senderId: userId,
                            senderName: userData.displayName,
                            type: "reaction" as const,
                            postId,
                            reactionData: {
                                reactionType,
                                postType: postData.postType,
                            },
                            message: `${userData.displayName} reacted ${this.getReactionEmoji(reactionType)} to your ${postData.postType === "milestone" ? "milestone" : "streak"} post`,
                            read: false,
                            createdAt: serverTimestamp(),
                        };

                        const notificationsCollection =
                            this.getStreakNotificationsCollection();
                        const notificationRef = doc(notificationsCollection);
                        transaction.set(notificationRef, notificationData);
                    }
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to add reaction: ${message}`);
        }
    }

    /**
     * Get shared streaks from friends
     * Requirements: 8.4
     */
    async getFriendsSharedStreaks(userId: string): Promise<SharedHabitStreak[]> {
        if (!userId) {
            throw new Error("User ID is required");
        }

        try {
            return await retryWithBackoff(async () => {
                // Get user's friends list
                const userDoc = await getDoc(getUserDoc(userId));
                if (!userDoc.exists()) {
                    throw new Error("User not found");
                }
                const userData = userDoc.data() as User;
                const friendIds = userData.friends || [];

                if (friendIds.length === 0) {
                    return [];
                }

                // Get shared streaks from friends
                const sharedStreaksCollection = this.getSharedStreaksCollection();
                const sharedStreaksQuery = query(
                    sharedStreaksCollection,
                    where("userId", "in", friendIds),
                    where("isShared", "==", true),
                );

                const sharedStreaksSnapshot = await getDocs(sharedStreaksQuery);
                const sharedStreaks: SharedHabitStreak[] = [];

                for (const doc of sharedStreaksSnapshot.docs) {
                    const data = doc.data();
                    sharedStreaks.push({
                        habitId: data.habitId,
                        habitDescription: data.habitDescription,
                        userId: data.userId,
                        userName: data.userName,
                        currentStreak: data.currentStreak,
                        bestStreak: data.bestStreak,
                        lastCompletionDate: data.lastCompletionDate,
                        milestones: data.milestones || [],
                        isShared: data.isShared,
                        sharedAt: data.sharedAt,
                    });
                }

                return sharedStreaks.sort(
                    (a, b) => b.sharedAt.toMillis() - a.sharedAt.toMillis(),
                );
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get friends' shared streaks: ${message}`);
        }
    }

    /**
     * Share a habit streak with friends
     * Requirements: 8.4
     */
    async shareHabitStreak(
        userId: string,
        habitId: string,
        habitDescription: string,
    ): Promise<void> {
        if (!userId || !habitId || !habitDescription) {
            throw new Error("User ID, habit ID, and description are required");
        }

        try {
            await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    // Get user data
                    const userDoc = await transaction.get(getUserDoc(userId));
                    if (!userDoc.exists()) {
                        throw new Error("User not found");
                    }
                    const userData = userDoc.data() as User;

                    // Get streak data
                    const streaksCollection = getHabitStreaksCollection();
                    const streakId = `${userId}_${habitId}`;
                    const streakDoc = await transaction.get(
                        doc(streaksCollection, streakId),
                    );

                    if (!streakDoc.exists()) {
                        throw new Error("Streak data not found");
                    }

                    const streak = transformFirestoreToStreak(streakDoc.data());

                    // Create or update shared streak record
                    const sharedStreakData = {
                        habitId,
                        habitDescription,
                        userId,
                        userName: userData.displayName,
                        currentStreak: streak.currentStreak,
                        bestStreak: streak.bestStreak,
                        lastCompletionDate: streak.lastCompletionDate,
                        milestones: streak.milestones,
                        isShared: true,
                        sharedAt: serverTimestamp(),
                    };

                    const sharedStreaksCollection = this.getSharedStreaksCollection();
                    const sharedStreakId = `${userId}_${habitId}`;
                    const sharedStreakRef = doc(sharedStreaksCollection, sharedStreakId);
                    transaction.set(sharedStreakRef, sharedStreakData);
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to share habit streak: ${message}`);
        }
    }

    /**
     * Subscribe to social posts from friends
     * Requirements: 8.2, 8.3
     */
    subscribeToFriendsSocialPosts(
        userId: string,
        callback: (posts: StreakSocialPost[]) => void,
        onError?: (error: Error) => void,
    ): () => void {
        if (!userId) {
            const error = new Error("User ID is required");
            if (onError) onError(error);
            return () => { };
        }

        // First get user's friends list
        const userDocRef = getUserDoc(userId);

        return onSnapshot(
            userDocRef,
            async (userDoc) => {
                try {
                    if (!userDoc.exists()) {
                        callback([]);
                        return;
                    }

                    const userData = userDoc.data() as User;
                    const friendIds = userData.friends || [];

                    if (friendIds.length === 0) {
                        callback([]);
                        return;
                    }

                    // Subscribe to posts from friends
                    const postsCollection = this.getSocialPostsCollection();
                    const postsQuery = query(
                        postsCollection,
                        where("userId", "in", friendIds),
                        where("visibility", "==", "friends"),
                    );

                    const unsubscribePosts = onSnapshot(
                        postsQuery,
                        (postsSnapshot) => {
                            try {
                                const posts: StreakSocialPost[] = postsSnapshot.docs.map(
                                    (doc) =>
                                        ({
                                            id: doc.id,
                                            ...doc.data(),
                                        }) as StreakSocialPost,
                                );

                                // Sort by creation date (newest first)
                                posts.sort(
                                    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
                                );

                                callback(posts);
                            } catch (error) {
                                console.error("Error processing social posts:", error);
                                if (onError) {
                                    onError(
                                        error instanceof Error
                                            ? error
                                            : new Error("Failed to process social posts"),
                                    );
                                }
                            }
                        },
                        (error) => {
                            console.error("Error in social posts listener:", error);
                            if (onError) {
                                const message = getUserFriendlyErrorMessage(error);
                                onError(new Error(message));
                            }
                        },
                    );

                    return unsubscribePosts;
                } catch (error) {
                    console.error("Error setting up social posts subscription:", error);
                    if (onError) {
                        onError(
                            error instanceof Error
                                ? error
                                : new Error("Failed to setup social posts subscription"),
                        );
                    }
                }
            },
            (error) => {
                console.error("Error in user data listener:", error);
                if (onError) {
                    const message = getUserFriendlyErrorMessage(error);
                    onError(new Error(message));
                }
            },
        );
    }

    /**
     * Subscribe to streak notifications
     * Requirements: 8.5
     */
    subscribeToStreakNotifications(
        userId: string,
        callback: (notifications: StreakNotification[]) => void,
        onError?: (error: Error) => void,
    ): () => void {
        if (!userId) {
            const error = new Error("User ID is required");
            if (onError) onError(error);
            return () => { };
        }

        const notificationsCollection = this.getStreakNotificationsCollection();
        const notificationsQuery = query(
            notificationsCollection,
            where("recipientId", "==", userId),
        );

        return onSnapshot(
            notificationsQuery,
            (snapshot) => {
                try {
                    const notifications: StreakNotification[] = snapshot.docs.map(
                        (doc) =>
                            ({
                                id: doc.id,
                                ...doc.data(),
                            }) as StreakNotification,
                    );

                    // Sort by creation date (newest first)
                    notifications.sort(
                        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
                    );

                    callback(notifications);
                } catch (error) {
                    console.error("Error processing streak notifications:", error);
                    if (onError) {
                        onError(
                            error instanceof Error
                                ? error
                                : new Error("Failed to process streak notifications"),
                        );
                    }
                }
            },
            (error) => {
                console.error("Error in streak notifications listener:", error);
                if (onError) {
                    const message = getUserFriendlyErrorMessage(error);
                    onError(new Error(message));
                }
            },
        );
    }

    /**
     * Mark notification as read
     * Requirements: 8.5
     */
    async markNotificationAsRead(notificationId: string): Promise<void> {
        if (!notificationId) {
            throw new Error("Notification ID is required");
        }

        try {
            const notificationsCollection = this.getStreakNotificationsCollection();
            await updateDoc(doc(notificationsCollection, notificationId), {
                read: true,
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to mark notification as read: ${message}`);
        }
    }

    // Private helper methods

    private getSocialPostsCollection() {
        return collection(db, "artifacts", "habit-tracker", "socialPosts");
    }

    private getSharedStreaksCollection() {
        return collection(db, "artifacts", "habit-tracker", "sharedStreaks");
    }

    private getStreakNotificationsCollection() {
        return collection(db, "artifacts", "habit-tracker", "streakNotifications");
    }

    private getBadgeType(days: number): string {
        switch (days) {
            case 7:
                return "bronze";
            case 30:
                return "silver";
            case 60:
                return "gold";
            case 100:
                return "platinum";
            case 365:
                return "diamond";
            default:
                return "bronze";
        }
    }

    private getMilestoneTitle(days: number): string {
        switch (days) {
            case 7:
                return "Week Warrior";
            case 30:
                return "Month Master";
            case 60:
                return "Consistency Champion";
            case 100:
                return "Century Achiever";
            case 365:
                return "Year Legend";
            default:
                return `${days} Day Streak`;
        }
    }

    private getMilestoneEmoji(days: number): string {
        switch (days) {
            case 7:
                return "🥉";
            case 30:
                return "🥈";
            case 60:
                return "🥇";
            case 100:
                return "💎";
            case 365:
                return "👑";
            default:
                return "🏆";
        }
    }

    private getReactionEmoji(
        reactionType: StreakReaction["reactionType"],
    ): string {
        switch (reactionType) {
            case "congratulations":
                return "🎉";
            case "fire":
                return "🔥";
            case "clap":
                return "👏";
            case "heart":
                return "❤️";
            default:
                return "👍";
        }
    }
}

// Export singleton instance
export const streakSocialService = new StreakSocialService();
