import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebaseConfig";

/**
 * Cloud Functions Service
 *
 * This module provides client-side wrappers for calling Cloud Functions
 */

const functions = getFunctions(app);

/**
 * Send a nudge notification to a friend about their goal
 *
 * @param targetUserId - The userId of the friend to nudge
 * @param goalId - The goalId to nudge about
 * @returns Promise with success status and message
 *
 * Requirements: 5.2, 5.3
 */
export async function sendNudge(
    targetUserId: string,
    goalId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const sendNudgeFunction = httpsCallable<
            { targetUserId: string; goalId: string },
            { success: boolean; message: string }
        >(functions, "sendNudge");

        const result = await sendNudgeFunction({ targetUserId, goalId });
        return result.data;
    } catch (error: any) {
        console.error("Error sending nudge:", error);

        // Handle specific error codes
        if (error.code === "unauthenticated") {
            throw new Error("You must be signed in to send nudges");
        } else if (error.code === "permission-denied") {
            throw new Error("You can only nudge your friends");
        } else if (error.code === "not-found") {
            throw new Error("User or goal not found");
        } else {
            throw new Error("Failed to send nudge. Please try again.");
        }
    }
}

/**
 * Register FCM token for push notifications
 * This should be called when the user logs in or when the FCM token is refreshed
 *
 * @param userId - The current user's ID
 * @param fcmToken - The FCM token from the device
 */
export async function registerFCMToken(
    userId: string,
    fcmToken: string,
): Promise<void> {
    // Import the storeFCMToken function from notificationService
    const { storeFCMToken } = await import("./notificationService");
    await storeFCMToken(userId, fcmToken);
}
