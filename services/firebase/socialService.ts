import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "@/utils/errorHandling";
import {
    arrayUnion,
    getDoc,
    getDocs,
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
    if (friendIds.length === 0) {
        callback([]);
        return () => { };
    }

    const goalsCollection = getGoalsCollection();
    const friendChunks = chunkArray(friendIds, 10);
    const chunkResults = new Map<number, GoalWithOwner[]>();
    const ownerCache = getOwnerCache();
    const ownerFetchPromises = new Map<string, Promise<User | null>>();

    const getOwnerData = (ownerId: string): Promise<User | null> => {
        const cached = ownerCache.get(ownerId);
        const isFresh =
            cached && Date.now() - cached.updatedAt < OWNER_CACHE_TTL_MS;

        if (isFresh) {
            return Promise.resolve(cached.data ?? null);
        }

        if (cached) {
            ownerCache.delete(ownerId);
        }

        let fetchPromise = ownerFetchPromises.get(ownerId);
        if (!fetchPromise) {
            fetchPromise = fetchAndCacheOwner(ownerId, ownerCache).finally(() => {
                ownerFetchPromises.delete(ownerId);
            });
            ownerFetchPromises.set(ownerId, fetchPromise);
        }

        return fetchPromise;
    };

    const emitCombinedResults = () => {
        const combined = friendChunks.flatMap((_, index) => {
            return chunkResults.get(index) ?? [];
        });
        callback(combined);
    };

    const listeners = friendChunks.map((chunk, index) => {
        const q = query(goalsCollection, where("ownerId", "in", chunk));

        return onSnapshot(
            q,
            (snapshot) => {
                Promise.all(
                    snapshot.docs.map(async (goalDoc) => {
                        const data = goalDoc.data();
                        const ownerData = await getOwnerData(data.ownerId);

                        return {
                            id: goalDoc.id,
                            ownerId: data.ownerId,
                            description: data.description,
                            frequency: data.frequency,
                            targetDays: data.targetDays,
                            latestCompletionDate: data.latestCompletionDate?.toDate() || null,
                            currentStatus: data.currentStatus,
                            nextDeadline: data.nextDeadline.toDate(),
                            isShared: data.isShared ?? true,
                            type: (data.type as "time" | "flexible") || "flexible",
                            targetTime: data.targetTime ?? null,
                            createdAt: data.createdAt?.toDate() || new Date(),
                            redSince: data.redSince?.toDate() || null,
                            difficulty: data.difficulty || "medium",
                            ownerName: ownerData?.displayName || "Unknown",
                            ownerShameScore: ownerData?.shameScore || 0,
                        };
                    }),
                )
                    .then((goalsWithOwners) => {
                        chunkResults.set(index, goalsWithOwners);
                        emitCombinedResults();
                    })
                    .catch((error) => {
                        console.error("Error processing friends goals snapshot:", error);
                        if (onError) {
                            onError(
                                error instanceof Error
                                    ? error
                                    : new Error("Failed to process friends goals data"),
                            );
                        }
                    });
            },
            (error) => {
                console.error("Error in friends goals snapshot listener:", error);
                if (onError) {
                    const message = getUserFriendlyErrorMessage(error);
                    onError(new Error(message));
                }
            },
        );
    });

    return () => {
        listeners.forEach((unsubscribe) => unsubscribe());
    };
}

/**
 * Fetch friends' goals once without creating listeners
 */
export async function fetchFriendsGoalsOnce(
    friendIds: string[],
): Promise<GoalWithOwner[]> {
    if (friendIds.length === 0) {
        return [];
    }

    try {
        const goalsCollection = getGoalsCollection();
        const friendChunks = chunkArray(friendIds, 10);
        const ownerCache = getOwnerCache();
        const ownerFetchPromises = new Map<string, Promise<User | null>>();

        const getOwnerData = (ownerId: string) => {
            const cached = ownerCache.get(ownerId);
            const isFresh =
                cached && Date.now() - cached.updatedAt < OWNER_CACHE_TTL_MS;

            if (isFresh) {
                return Promise.resolve(cached.data ?? null);
            }

            if (cached) {
                ownerCache.delete(ownerId);
            }

            let fetchPromise = ownerFetchPromises.get(ownerId);
            if (!fetchPromise) {
                fetchPromise = fetchAndCacheOwner(ownerId, ownerCache).finally(() => {
                    ownerFetchPromises.delete(ownerId);
                });
                ownerFetchPromises.set(ownerId, fetchPromise);
            }

            return fetchPromise;
        };

        const results: GoalWithOwner[] = [];

        for (const chunk of friendChunks) {
            const q = query(goalsCollection, where("ownerId", "in", chunk));
            const snapshot = await getDocs(q);

            for (const goalDoc of snapshot.docs) {
                const data = goalDoc.data();
                const ownerData = await getOwnerData(data.ownerId);

                results.push({
                    id: goalDoc.id,
                    ownerId: data.ownerId,
                    description: data.description,
                    frequency: data.frequency,
                    targetDays: data.targetDays,
                    latestCompletionDate: data.latestCompletionDate?.toDate() || null,
                    currentStatus: data.currentStatus,
                    nextDeadline: data.nextDeadline.toDate(),
                    isShared: data.isShared ?? true,
                    type: (data.type as "time" | "flexible") || "flexible",
                    targetTime: data.targetTime ?? null,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    redSince: data.redSince?.toDate() || null,
                    difficulty: data.difficulty || "medium",
                    ownerName: ownerData?.displayName || "Unknown",
                    ownerShameScore: ownerData?.shameScore || 0,
                });
            }
        }

        return results;
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
}

const ownerCacheMap = new Map<string, { data: User | null; updatedAt: number }>();
const OWNER_CACHE_TTL_MS = 5 * 60 * 1000;
const OWNER_CACHE_MAX_ENTRIES = 200;

function getOwnerCache() {
    return ownerCacheMap;
}

async function fetchAndCacheOwner(
    ownerId: string,
    cache: Map<string, { data: User | null; updatedAt: number }>,
): Promise<User | null> {
    try {
        const docRef = getUserDoc(ownerId);
        const doc = await getDoc(docRef);
        const data = doc.exists() ? (doc.data() as User) : null;
        if (!cache.has(ownerId) && cache.size >= OWNER_CACHE_MAX_ENTRIES) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey) {
                cache.delete(oldestKey);
            }
        }
        cache.set(ownerId, { data, updatedAt: Date.now() });
        return data;
    } catch (error) {
        console.error(`Failed to load owner ${ownerId}:`, error);
        if (!cache.has(ownerId) && cache.size >= OWNER_CACHE_MAX_ENTRIES) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey) {
                cache.delete(oldestKey);
            }
        }
        cache.set(ownerId, { data: null, updatedAt: Date.now() });
        return null;
    }
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
