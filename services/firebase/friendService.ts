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
 * Searches for users by email or display name.
 * @param searchQuery The query string.
 * @param currentUserId The ID of the current user, to exclude them from results.
 * @returns A list of matching users with their relationship status to the current user.
 */
export async function searchUsers(searchQuery: string, currentUserId: string): Promise<UserSearchResult[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
    }

    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    const usersCollection = getUsersCollection();
    const results: UserSearchResult[] = [];

    // Simulate different search queries for email and name
    const emailQuery = query(
        usersCollection,
        where("searchableEmail", ">=", lowerCaseQuery),
        where("searchableEmail", "<=", lowerCaseQuery + "\uf8ff"),
        limit(5) // Limit results to avoid excessive reads
    );

    const nameQuery = query(
        usersCollection,
        where("searchableName", ">=", lowerCaseQuery),
        where("searchableName", "<=", lowerCaseQuery + "\uf8ff"),
        limit(5) // Limit results to avoid excessive reads
    );

    try {
        const [emailSnapshot, nameSnapshot] = await Promise.all([
            getDocs(emailQuery),
            getDocs(nameQuery)
        ]);

        const uniqueUserIds = new Set<string>();

        // Process email results
        emailSnapshot.forEach(doc => {
            if (doc.id !== currentUserId && !uniqueUserIds.has(doc.id)) {
                const data = doc.data();
                results.push({
                    userId: doc.id,
                    displayName: data.displayName,
                    email: data.email,
                    relationshipStatus: "none" // Default status
                });
                uniqueUserIds.add(doc.id);
            }
        });

        // Process name results
        nameSnapshot.forEach(doc => {
            if (doc.id !== currentUserId && !uniqueUserIds.has(doc.id)) {
                const data = doc.data();
                results.push({
                    userId: doc.id,
                    displayName: data.displayName,
                    email: data.email,
                    relationshipStatus: "none" // Default status
                });
                uniqueUserIds.add(doc.id);
            }
        });

        // Further optimization: fetch friend status from useFriendshipStatus hook
        // For simplicity, we'll return "none" here and let the client handle status update
        return results;
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

        const friendRequestsRef = collection(db, `artifacts/oath-app/friendRequests`);
        await addDoc(friendRequestsRef, {
            senderId,
            senderName,
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