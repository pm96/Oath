import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "@/utils/errorHandling";
import {
    arrayUnion,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    getGoalsCollection,
    getUserDoc,
    GoalWithOwner,
    User,
} from "./collections";

/**
 * SocialService
 *
 * Handles social features including friends management and viewing friends' goals
 * Requirements: 3.1, 3.3, 6.1, 6.2
 */

/**
 * Get friends' goals with real-time updates
 * Requirement 3.1: Display all goals where ownerId matches any userId in user's friends array
 * Includes error handling for snapshot listener
 */
export function getFriendsGoals(
    friendIds: string[],
    callback: (goals: GoalWithOwner[]) => void,
    onError?: (error: Error) => void,
): () => void {
    // If no friends, return empty array
    if (friendIds.length === 0) {
        callback([]);
        return () => { };
    }

    const goalsCollection = getGoalsCollection();
    // Query goals where ownerId is in the friends array
    const q = query(goalsCollection, where("ownerId", "in", friendIds));

    const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
            try {
                // Fetch owner information for each goal
                const goalsWithOwners: GoalWithOwner[] = await Promise.all(
                    snapshot.docs.map(async (goalDoc) => {
                        const data = goalDoc.data();

                        // Fetch owner's user document to get displayName and shameScore
                        const ownerDocRef = getUserDoc(data.ownerId);
                        const ownerDoc = await getDoc(ownerDocRef);
                        const ownerData = ownerDoc.data() as User;

                        return {
                            id: goalDoc.id,
                            ownerId: data.ownerId,
                            description: data.description,
                            frequency: data.frequency,
                            targetDays: data.targetDays,
                            latestCompletionDate: data.latestCompletionDate?.toDate() || null,
                            currentStatus: data.currentStatus,
                            nextDeadline: data.nextDeadline.toDate(),
                            isShared: data.isShared,
                            createdAt: data.createdAt?.toDate() || new Date(),
                            redSince: data.redSince?.toDate() || null,
                            ownerName: ownerData?.displayName || "Unknown",
                            ownerShameScore: ownerData?.shameScore || 0,
                        };
                    }),
                );

                callback(goalsWithOwners);
            } catch (error) {
                console.error("Error processing friends goals snapshot:", error);
                if (onError) {
                    onError(
                        error instanceof Error
                            ? error
                            : new Error("Failed to process friends goals data"),
                    );
                }
            }
        },
        (error) => {
            console.error("Error in friends goals snapshot listener:", error);
            if (onError) {
                const message = getUserFriendlyErrorMessage(error);
                onError(new Error(message));
            }
        },
    );

    return unsubscribe;
}

/**
 * Add a friend to the current user's friends list
 * Adds the friend's userId to the friends array
 * Includes validation and error handling
 */
export async function addFriend(
    currentUserId: string,
    friendId: string,
): Promise<void> {
    if (!currentUserId) {
        throw new Error("Current user ID is required");
    }

    if (!friendId) {
        throw new Error("Friend ID is required");
    }

    if (currentUserId === friendId) {
        throw new Error("Cannot add yourself as a friend");
    }

    try {
        await retryWithBackoff(async () => {
            // Verify the friend user exists
            const friendDocRef = getUserDoc(friendId);
            const friendDoc = await getDoc(friendDocRef);

            if (!friendDoc.exists()) {
                throw new Error("Friend user not found");
            }

            // Add friend to current user's friends array
            const userDocRef = getUserDoc(currentUserId);
            await updateDoc(userDocRef, {
                friends: arrayUnion(friendId),
            });
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Get list of friends for a user
 * Returns array of User objects for all friends
 * Includes error handling and retry logic
 */
export async function getFriends(userId: string): Promise<User[]> {
    if (!userId) {
        throw new Error("User ID is required");
    }

    try {
        return await retryWithBackoff(async () => {
            const userDocRef = getUserDoc(userId);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                throw new Error("User not found");
            }

            const userData = userDoc.data() as User;
            const friendIds = userData.friends || [];

            if (friendIds.length === 0) {
                return [];
            }

            // Fetch all friend user documents
            const friendPromises = friendIds.map(async (friendId) => {
                try {
                    const friendDocRef = getUserDoc(friendId);
                    const friendDoc = await getDoc(friendDocRef);
                    return friendDoc.exists() ? (friendDoc.data() as User) : null;
                } catch (error) {
                    console.error(`Error fetching friend ${friendId}:`, error);
                    return null;
                }
            });

            const friends = await Promise.all(friendPromises);
            return friends.filter((friend) => friend !== null) as User[];
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Get current user's data including shame score and friends
 * Requirement 6.1, 6.2: Access to shame score for display
 * Includes error handling and retry logic
 */
export async function getUserData(userId: string): Promise<User | null> {
    if (!userId) {
        throw new Error("User ID is required");
    }

    try {
        return await retryWithBackoff(async () => {
            const userDocRef = getUserDoc(userId);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                return null;
            }

            return userDoc.data() as User;
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Subscribe to user data changes with real-time updates
 * Useful for displaying shame score that updates in real-time
 * Includes error handling for snapshot listener
 */
export function subscribeToUserData(
    userId: string,
    callback: (user: User | null) => void,
    onError?: (error: Error) => void,
): () => void {
    if (!userId) {
        const error = new Error("User ID is required");
        if (onError) onError(error);
        return () => { };
    }

    const userDocRef = getUserDoc(userId);

    const unsubscribe = onSnapshot(
        userDocRef,
        (doc) => {
            try {
                if (doc.exists()) {
                    callback(doc.data() as User);
                } else {
                    callback(null);
                }
            } catch (error) {
                console.error("Error processing user data snapshot:", error);
                if (onError) {
                    onError(
                        error instanceof Error
                            ? error
                            : new Error("Failed to process user data"),
                    );
                }
            }
        },
        (error) => {
            console.error("Error in user data snapshot listener:", error);
            if (onError) {
                const message = getUserFriendlyErrorMessage(error);
                onError(new Error(message));
            }
        },
    );

    return unsubscribe;
}
