import { getFunctions, httpsCallable } from "firebase/functions";
import {
    addDoc,
    collection,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    doc,
    getDocs,
    orderBy,
    limit,
    startAt,
    endAt,
    runTransaction,
    arrayUnion,
    updateDoc,
    arrayRemove,
    Transaction,
} from "firebase/firestore";
import { app, db } from "../../firebaseConfig";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandling";
import { getUserDoc, getUsersCollection } from "./collections";
import { UserSearchResult } from "@/services/firebase/collections";


const functions = getFunctions(app);

export interface PublicUserProfile {
    uid: string;
    displayName: string;
    email: string;
}

/**
 * Finds a user by their invite code.
 * @param inviteCode The 6-character invite code.
 * @returns The public profile of the found user, or null if not found.
 */
export async function findUserByInviteCode(inviteCode: string): Promise<PublicUserProfile | null> {
    if (!inviteCode || inviteCode.trim().length === 0) {
        throw new Error("Invite code cannot be empty.");
    }

    try {
        const findUser = httpsCallable<
            { inviteCode: string },
            PublicUserProfile
        >(functions, "findUserByInviteCode");

        const result = await findUser({ inviteCode: inviteCode.trim() });
        return result.data;
    } catch (error: any) {
        if (error.code === 'not-found') {
            return null;
        }
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Searches for users by email or display name by calling a Cloud Function.
 * @param searchQuery The query string.
 * @returns A list of matching users with their relationship status to the current user.
 */
export async function searchUsers(searchQuery: string): Promise<UserSearchResult[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
    }

    try {
        const search = httpsCallable<
            { searchQuery: string },
            UserSearchResult[]
        >(functions, "searchUsers");

        const result = await search({ searchQuery });
        return result.data;
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to search users: ${message}`);
    }
}

/**
 * Sends a friend request from a sender to a receiver.
 * @param senderId The UID of the user sending the request.
 * @param receiverId The UID of the user receiving the request.
 */
export async function sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (senderId === receiverId) {
        throw new Error("You cannot send a friend request to yourself.");
    }

    try {
        // Fetch sender's name to store on the request
        const senderDoc = await getDoc(getUserDoc(senderId));
        const senderName = senderDoc.data()?.displayName || "A User";
        const senderEmail = senderDoc.data()?.email || "";


        const friendRequestsRef = collection(db, `artifacts/oath-app/friendRequests`);
        await addDoc(friendRequestsRef, {
            senderId,
            senderName,
            senderEmail,
            receiverId,
            status: "pending",
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to send friend request: ${message}`);
    }
}

/**
 * Subscribes to pending friend requests for a user.
 * @param userId The UID of the user.
 * @param onUpdate A callback that receives the list of pending requests.
 * @param onError A callback for any errors.
 * @param onCountUpdate A callback that receives the count of pending requests.
 * @returns An unsubscribe function for the listener.
 */
export function subscribeToPendingRequests(
    userId: string,
    onUpdate: (requests: any[]) => void,
    onError: (error: Error) => void,
    onCountUpdate?: (count: number) => void,
): () => void {
    const friendRequestsRef = collection(db, `artifacts/oath-app/friendRequests`);
    const q = query(
        friendRequestsRef,
        where("receiverId", "==", userId),
        where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            onUpdate(requests);
            if (onCountUpdate) {
                onCountUpdate(snapshot.size);
            }
        },
        (error) => {
            console.error("Error in pending requests subscription:", error);
            onError(new Error("Failed to listen for friend requests."));
        }
    );

    return unsubscribe;
}

/**
 * Accepts a friend request.
 * @param requestId The ID of the friend request to accept.
 * @param userId The ID of the user accepting the request.
 */
export async function acceptFriendRequest(requestId: string, userId: string): Promise<void> {
    const friendRequestRef = doc(db, `artifacts/oath-app/friendRequests`, requestId);

    try {
        const requestDoc = await getDoc(friendRequestRef);
        if (!requestDoc.exists()) {
            throw new Error("Friend request not found.");
        }

        const requestData = requestDoc.data();
        if (requestData?.receiverId !== userId) {
            throw new Error("You are not authorized to accept this request.");
        }
        if (requestData?.status !== "pending") {
            throw new Error("Friend request is not pending.");
        }

        const senderId = requestData.senderId;
        const senderUserRef = doc(db, `artifacts/oath-app/users`, senderId);
        const receiverUserRef = doc(db, `artifacts/oath-app/users`, userId);

        // Use a transaction to ensure atomicity
        await runTransaction(db, async (transaction: Transaction) => {
            transaction.update(friendRequestRef, { status: "accepted", updatedAt: serverTimestamp() });
            transaction.update(senderUserRef, { friends: arrayUnion(userId) });
            transaction.update(receiverUserRef, { friends: arrayUnion(senderId) });
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to accept friend request: ${message}`);
    }
}

/**
 * Rejects a friend request.
 * @param requestId The ID of the friend request to reject.
 * @param userId The ID of the user rejecting the request.
 */
export async function rejectFriendRequest(requestId: string, userId: string): Promise<void> {
    const friendRequestRef = doc(db, `artifacts/oath-app/friendRequests`, requestId);

    try {
        const requestDoc = await getDoc(friendRequestRef);
        if (!requestDoc.exists()) {
            throw new Error("Friend request not found.");
        }

        const requestData = requestDoc.data();
        if (requestData?.receiverId !== userId) {
            throw new Error("You are not authorized to reject this request.");
        }
        if (requestData?.status !== "pending") {
            throw new Error("Friend request is not pending.");
        }

        await updateDoc(friendRequestRef, { status: "rejected", updatedAt: serverTimestamp() });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to reject friend request: ${message}`);
    }
}

/**
 * Blocks a user. Adds them to blockedUsers array and removes from friends list.
 * @param currentUserId The ID of the current user.
 * @param targetUserId The ID of the user to block.
 */
export async function blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    const currentUserRef = doc(db, `artifacts/oath-app/users`, currentUserId);
    const targetUserRef = doc(db, `artifacts/oath-app/users`, targetUserId);

    try {
        await runTransaction(db, async (transaction: Transaction) => {
            // Add targetUserId to current user's blockedUsers array
            transaction.update(currentUserRef, { 
                blockedUsers: arrayUnion(targetUserId),
                friends: arrayRemove(targetUserId)
            });
            // Remove currentUserId from target's friends array (the rules will handle the rest)
            transaction.update(targetUserRef, { 
                friends: arrayRemove(currentUserId) 
            });
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to block user: ${message}`);
    }
}

/**
 * Removes a friend from both users' friends lists.
 * @param currentUserId The ID of the current user.
 * @param friendId The ID of the friend to remove.
 */
export async function removeFriend(currentUserId: string, friendId: string): Promise<void> {
    const currentUserRef = doc(db, `artifacts/oath-app/users`, currentUserId);
    const friendUserRef = doc(db, `artifacts/oath-app/users`, friendId);

    try {
        await runTransaction(db, async (transaction: Transaction) => {
            // Remove friendId from current user's friends array
            transaction.update(currentUserRef, { friends: arrayRemove(friendId) });
            // Remove currentUserId from friend's friends array
            transaction.update(friendUserRef, { friends: arrayRemove(currentUserId) });
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(`Failed to remove friend: ${message}`);
    }
}