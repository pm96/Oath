import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "@/utils/errorHandling";
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    getDoc,
    getDocs,
    onSnapshot,
    or,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
    FriendRequest,
    getFriendRequestDoc,
    getFriendRequestsCollection,
    getUserDoc,
    getUsersCollection,
    User,
    UserSearchResult,
} from "./collections";

/**
 * FriendService
 *
 * Handles friend-related operations including search, requests, and relationship management
 * Requirements: 1.1, 1.3, 2.1, 2.4, 2.5, 5.2, 5.4, 6.1, 6.4, 7.5
 */

/**
 * Search for users by email or display name
 * Requirement 1.1: Query Firestore for users matching email or displayName
 * Requirement 1.3: Indicate if users are already friends or have pending requests
 *
 * @param searchQuery - Search query string
 * @param currentUserId - ID of the user performing the search
 * @returns Array of user search results with relationship status
 */
export async function searchUsers(
    searchQuery: string,
    currentUserId: string,
): Promise<UserSearchResult[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
    }

    if (!currentUserId) {
        throw new Error("Current user ID is required");
    }

    try {
        return await retryWithBackoff(async () => {
            const normalizedQuery = searchQuery.trim().toLowerCase();
            const usersCollection = getUsersCollection();

            // Query users where searchableEmail or searchableName matches
            // Note: Firestore doesn't support OR queries across different fields efficiently
            // We'll query both and merge results client-side
            const emailQuery = query(
                usersCollection,
                where("searchableEmail", ">=", normalizedQuery),
                where("searchableEmail", "<=", normalizedQuery + "\uf8ff"),
            );

            const nameQuery = query(
                usersCollection,
                where("searchableName", ">=", normalizedQuery),
                where("searchableName", "<=", normalizedQuery + "\uf8ff"),
            );

            const [emailSnapshot, nameSnapshot] = await Promise.all([
                getDocs(emailQuery),
                getDocs(nameQuery),
            ]);

            // Merge results and deduplicate
            const userMap = new Map<
                string,
                {
                    userId: string;
                    displayName: string;
                    email: string;
                    shameScore: number;
                    friends: string[];
                }
            >();

            emailSnapshot.docs.forEach((doc) => {
                if (doc.id !== currentUserId) {
                    const data = doc.data() as User;
                    userMap.set(doc.id, {
                        userId: doc.id,
                        displayName: data.displayName,
                        email: data.email,
                        shameScore: data.shameScore,
                        friends: data.friends,
                    });
                }
            });

            nameSnapshot.docs.forEach((doc) => {
                if (doc.id !== currentUserId && !userMap.has(doc.id)) {
                    const data = doc.data() as User;
                    userMap.set(doc.id, {
                        userId: doc.id,
                        displayName: data.displayName,
                        email: data.email,
                        shameScore: data.shameScore,
                        friends: data.friends,
                    });
                }
            });

            // Get current user's friends list
            const currentUserDoc = await getDoc(getUserDoc(currentUserId));
            const currentUserData = currentUserDoc.data() as User;
            const friendIds = currentUserData?.friends || [];

            // Get pending friend requests
            const friendRequestsCollection = getFriendRequestsCollection();
            const sentRequestsQuery = query(
                friendRequestsCollection,
                where("senderId", "==", currentUserId),
                where("status", "==", "pending"),
            );
            const receivedRequestsQuery = query(
                friendRequestsCollection,
                where("receiverId", "==", currentUserId),
                where("status", "==", "pending"),
            );

            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                getDocs(sentRequestsQuery),
                getDocs(receivedRequestsQuery),
            ]);

            const sentRequestUserIds = new Set(
                sentSnapshot.docs.map((doc) => doc.data().receiverId),
            );
            const receivedRequestUserIds = new Set(
                receivedSnapshot.docs.map((doc) => doc.data().senderId),
            );

            // Build search results with relationship status
            const results: UserSearchResult[] = Array.from(userMap.values()).map(
                (user) => {
                    let relationshipStatus: UserSearchResult["relationshipStatus"] =
                        "none";

                    if (friendIds.includes(user.userId)) {
                        relationshipStatus = "friend";
                    } else if (sentRequestUserIds.has(user.userId)) {
                        relationshipStatus = "pending_sent";
                    } else if (receivedRequestUserIds.has(user.userId)) {
                        relationshipStatus = "pending_received";
                    }

                    return {
                        userId: user.userId,
                        displayName: user.displayName,
                        email: user.email,
                        relationshipStatus,
                        shameScore: user.shameScore,
                    };
                },
            );

            // Limit results to 20 for performance
            return results.slice(0, 20);
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Send a friend request to another user
 * Requirement 2.1: Create friend request document with senderId, receiverId, and status 'pending'
 *
 * @param senderId - ID of user sending the request
 * @param receiverId - ID of user receiving the request
 * @returns ID of the created friend request
 */
export async function sendFriendRequest(
    senderId: string,
    receiverId: string,
): Promise<string> {
    if (!senderId) {
        throw new Error("Sender ID is required");
    }

    if (!receiverId) {
        throw new Error("Receiver ID is required");
    }

    if (senderId === receiverId) {
        throw new Error("Cannot send friend request to yourself");
    }

    try {
        return await retryWithBackoff(async () => {
            // Check if receiver exists
            const receiverDoc = await getDoc(getUserDoc(receiverId));
            if (!receiverDoc.exists()) {
                throw new Error("User not found");
            }

            // Check if already friends
            const senderDoc = await getDoc(getUserDoc(senderId));
            const senderData = senderDoc.data() as User;
            if (senderData.friends?.includes(receiverId)) {
                throw new Error("Already friends with this user");
            }

            // Check if request already exists
            const friendRequestsCollection = getFriendRequestsCollection();
            const existingRequestQuery = query(
                friendRequestsCollection,
                or(
                    where("senderId", "==", senderId),
                    where("receiverId", "==", senderId),
                ),
            );
            const existingSnapshot = await getDocs(existingRequestQuery);

            const duplicateRequest = existingSnapshot.docs.find((doc) => {
                const data = doc.data();
                return (
                    ((data.senderId === senderId && data.receiverId === receiverId) ||
                        (data.senderId === receiverId && data.receiverId === senderId)) &&
                    data.status === "pending"
                );
            });

            if (duplicateRequest) {
                throw new Error("Friend request already exists");
            }

            // Create friend request
            const requestDoc = await addDoc(friendRequestsCollection, {
                senderId,
                senderName: senderData.displayName,
                senderEmail: senderData.email,
                receiverId,
                status: "pending",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return requestDoc.id;
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Accept a friend request
 * Requirement 2.4: Add each user's ID to the other's friends array and update request status to 'accepted'
 * Requirement 5.4: Use atomic batch writes to prevent inconsistency
 *
 * @param requestId - ID of the friend request
 * @param currentUserId - ID of the user accepting the request (must be receiver)
 */
export async function acceptFriendRequest(
    requestId: string,
    currentUserId: string,
): Promise<void> {
    if (!requestId) {
        throw new Error("Request ID is required");
    }

    if (!currentUserId) {
        throw new Error("Current user ID is required");
    }

    try {
        await retryWithBackoff(async () => {
            // Get the friend request
            const requestDoc = await getDoc(getFriendRequestDoc(requestId));
            if (!requestDoc.exists()) {
                throw new Error("Friend request not found");
            }

            const requestData = requestDoc.data() as Omit<FriendRequest, "id">;

            // Verify current user is the receiver
            if (requestData.receiverId !== currentUserId) {
                throw new Error("Not authorized to accept this request");
            }

            // Verify request is still pending
            if (requestData.status !== "pending") {
                throw new Error("Friend request is no longer pending");
            }

            // Use batch write for atomicity
            const batch = writeBatch(db);

            // Update friend request status
            batch.update(getFriendRequestDoc(requestId), {
                status: "accepted",
                updatedAt: serverTimestamp(),
            });

            // Add each user to the other's friends array
            batch.update(getUserDoc(requestData.senderId), {
                friends: arrayUnion(requestData.receiverId),
            });

            batch.update(getUserDoc(requestData.receiverId), {
                friends: arrayUnion(requestData.senderId),
            });

            await batch.commit();
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Reject a friend request
 * Requirement 2.5: Update request status to 'rejected' and remove from pending list
 *
 * @param requestId - ID of the friend request
 * @param currentUserId - ID of the user rejecting the request (must be receiver)
 */
export async function rejectFriendRequest(
    requestId: string,
    currentUserId: string,
): Promise<void> {
    if (!requestId) {
        throw new Error("Request ID is required");
    }

    if (!currentUserId) {
        throw new Error("Current user ID is required");
    }

    try {
        await retryWithBackoff(async () => {
            // Get the friend request
            const requestDoc = await getDoc(getFriendRequestDoc(requestId));
            if (!requestDoc.exists()) {
                throw new Error("Friend request not found");
            }

            const requestData = requestDoc.data() as Omit<FriendRequest, "id">;

            // Verify current user is the receiver
            if (requestData.receiverId !== currentUserId) {
                throw new Error("Not authorized to reject this request");
            }

            // Verify request is still pending
            if (requestData.status !== "pending") {
                throw new Error("Friend request is no longer pending");
            }

            // Update request status to rejected
            await updateDoc(getFriendRequestDoc(requestId), {
                status: "rejected",
                updatedAt: serverTimestamp(),
            });
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Remove a friend from the current user's friends list
 * Requirement 5.2: Remove each user's ID from the other's friends array
 * Requirement 5.4: Use atomic batch writes to prevent inconsistency
 *
 * @param currentUserId - ID of the user removing the friend
 * @param friendId - ID of the friend to remove
 */
export async function removeFriend(
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
        throw new Error("Cannot remove yourself");
    }

    try {
        await retryWithBackoff(async () => {
            // Verify friendship exists
            const currentUserDoc = await getDoc(getUserDoc(currentUserId));
            const currentUserData = currentUserDoc.data() as User;

            if (!currentUserData.friends?.includes(friendId)) {
                throw new Error("Not friends with this user");
            }

            // Use batch write for atomicity
            const batch = writeBatch(db);

            // Remove each user from the other's friends array
            batch.update(getUserDoc(currentUserId), {
                friends: arrayRemove(friendId),
            });

            batch.update(getUserDoc(friendId), {
                friends: arrayRemove(currentUserId),
            });

            await batch.commit();
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Subscribe to pending friend requests with real-time updates
 * Requirement 6.4: Real-time updates when requests are accepted or rejected
 *
 * @param userId - ID of the user to get pending requests for
 * @param callback - Function called with updated pending requests
 * @returns Unsubscribe function
 */
export function subscribeToPendingRequests(
    userId: string,
    callback: (requests: FriendRequest[]) => void,
    onError?: (error: Error) => void,
    onCountChange?: (count: number) => void,
): () => void {
    if (!userId) {
        const error = new Error("User ID is required");
        if (onError) onError(error);
        return () => { };
    }

    const friendRequestsCollection = getFriendRequestsCollection();
    const q = query(
        friendRequestsCollection,
        where("receiverId", "==", userId),
        where("status", "==", "pending"),
    );

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            try {
                const requests: FriendRequest[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        senderId: data.senderId,
                        senderName: data.senderName,
                        senderEmail: data.senderEmail,
                        receiverId: data.receiverId,
                        status: data.status,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                    };
                });

                callback(requests);
                onCountChange?.(requests.length);
            } catch (error) {
                console.error("Error processing pending requests snapshot:", error);
                if (onError) {
                    onError(
                        error instanceof Error
                            ? error
                            : new Error("Failed to process pending requests"),
                    );
                }
            }
        },
        (error) => {
            console.error("Error in pending requests snapshot listener:", error);
            if (onError) {
                const message = getUserFriendlyErrorMessage(error);
                onError(new Error(message));
            }
        },
    );

    return unsubscribe;
}
