import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const APP_ID = "oath-app";

/**
 * Scheduled Cloud Function that runs every hour to check goal deadlines
 * and update statuses, shame scores, and send notifications.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export const checkGoalDeadlines = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting checkGoalDeadlines function");

        try {
            const now = admin.firestore.Timestamp.now();
            const nowDate = now.toDate();
            const twentyFourHoursAgo = new Date(
                nowDate.getTime() - 24 * 60 * 60 * 1000,
            );

            // Query all goals
            const goalsRef = db.collection(`artifacts/${APP_ID}/public/data/goals`);
            const goalsSnapshot = await goalsRef.get();

            console.log(`Processing ${goalsSnapshot.size} goals`);

            const batch = db.batch();
            const usersToNotify = new Map<
                string,
                { userName: string; goalDescription: string }[]
            >();

            for (const goalDoc of goalsSnapshot.docs) {
                const goalData = goalDoc.data();
                const goalId = goalDoc.id;
                const nextDeadline = goalData.nextDeadline.toDate();
                const currentStatus = goalData.currentStatus;
                const redSince = goalData.redSince?.toDate();
                const ownerId = goalData.ownerId;

                // Check if deadline has passed and status is not already Red
                if (nextDeadline < nowDate && currentStatus !== "Red") {
                    console.log(`Goal ${goalId} deadline expired, updating to Red`);

                    // Update goal status to Red and set redSince timestamp
                    batch.update(goalDoc.ref, {
                        currentStatus: "Red",
                        redSince: now,
                    });
                }

                // Check if goal has been Red for 24+ hours
                if (
                    currentStatus === "Red" &&
                    redSince &&
                    redSince < twentyFourHoursAgo
                ) {
                    console.log(
                        `Goal ${goalId} has been Red for 24+ hours, incrementing shame score`,
                    );

                    // Get the owner's user document
                    const userRef = db.doc(`artifacts/${APP_ID}/users/${ownerId}`);
                    const userDoc = await userRef.get();

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const displayName = userData?.displayName || "Unknown User";
                        const friends = userData?.friends || [];

                        // Increment shame score atomically
                        batch.update(userRef, {
                            shameScore: admin.firestore.FieldValue.increment(1),
                        });

                        // Reset redSince to prevent repeated increments
                        batch.update(goalDoc.ref, {
                            redSince: now,
                        });

                        // Collect friends to notify
                        for (const friendId of friends) {
                            if (!usersToNotify.has(friendId)) {
                                usersToNotify.set(friendId, []);
                            }
                            usersToNotify.get(friendId)!.push({
                                userName: displayName,
                                goalDescription: goalData.description,
                            });
                        }

                        console.log(
                            `Will notify ${friends.length} friends about ${displayName}'s shame`,
                        );
                    }
                }
            }

            // Commit all updates
            await batch.commit();
            console.log("Batch updates committed successfully");

            // Send FCM notifications to friends
            if (usersToNotify.size > 0) {
                await sendShameNotifications(usersToNotify);
            }

            console.log("checkGoalDeadlines function completed successfully");
        } catch (error) {
            console.error("Error in checkGoalDeadlines:", error);
            throw error;
        }
    },
);

/**
 * Helper function to send shame notifications to friends
 */
async function sendShameNotifications(
    usersToNotify: Map<string, { userName: string; goalDescription: string }[]>,
): Promise<void> {
    console.log(`Sending notifications to ${usersToNotify.size} users`);

    const notificationPromises: Promise<any>[] = [];

    for (const [friendId, shameEvents] of usersToNotify.entries()) {
        // Get friend's FCM token
        const friendRef = db.doc(`artifacts/${APP_ID}/users/${friendId}`);
        const friendDoc = await friendRef.get();

        if (friendDoc.exists) {
            const friendData = friendDoc.data();
            const fcmToken = friendData?.fcmToken;

            if (fcmToken) {
                // Create notification message
                const message = {
                    token: fcmToken,
                    notification: {
                        title: "Friend Failed Goal!",
                        body:
                            shameEvents.length === 1
                                ? `${shameEvents[0].userName} failed: ${shameEvents[0].goalDescription}`
                                : `${shameEvents.length} friends failed their goals`,
                    },
                    data: {
                        type: "shame_notification",
                        count: shameEvents.length.toString(),
                    },
                };

                notificationPromises.push(
                    admin
                        .messaging()
                        .send(message)
                        .then(() => {
                            console.log(`Notification sent to ${friendId}`);
                        })
                        .catch((error) => {
                            console.error(
                                `Failed to send notification to ${friendId}:`,
                                error,
                            );
                        }),
                );
            } else {
                console.log(`Friend ${friendId} has no FCM token`);
            }
        }
    }

    await Promise.all(notificationPromises);
    console.log("All notifications sent");
}

/**
 * Callable Cloud Function to send a nudge notification
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */
export const sendNudge = onCall(async (request) => {
    console.log("sendNudge function called");

    // Verify authentication
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to send nudges",
        );
    }

    const senderId = request.auth.uid;
    const { targetUserId, goalId } = request.data;

    if (!targetUserId || !goalId) {
        throw new HttpsError(
            "invalid-argument",
            "targetUserId and goalId are required",
        );
    }

    try {
        // Get sender's information
        const senderRef = db.doc(`artifacts/${APP_ID}/users/${senderId}`);
        const senderDoc = await senderRef.get();

        if (!senderDoc.exists) {
            throw new HttpsError("not-found", "Sender user not found");
        }

        const senderData = senderDoc.data();
        const senderName = senderData?.displayName || "A friend";

        // Get target user's information
        const targetRef = db.doc(`artifacts/${APP_ID}/users/${targetUserId}`);
        const targetDoc = await targetRef.get();

        if (!targetDoc.exists) {
            throw new HttpsError("not-found", "Target user not found");
        }

        const targetData = targetDoc.data();
        const targetFriends = targetData?.friends || [];
        const fcmToken = targetData?.fcmToken;

        // Verify sender is a friend of target
        if (!targetFriends.includes(senderId)) {
            throw new HttpsError(
                "permission-denied",
                "You can only nudge your friends",
            );
        }

        // Get goal information
        const goalRef = db.doc(`artifacts/${APP_ID}/public/data/goals/${goalId}`);
        const goalDoc = await goalRef.get();

        if (!goalDoc.exists) {
            throw new HttpsError("not-found", "Goal not found");
        }

        const goalData = goalDoc.data();
        const goalDescription = goalData?.description || "your goal";

        // Send FCM notification if token exists
        if (fcmToken) {
            const message = {
                token: fcmToken,
                notification: {
                    title: "Nudge from a Friend!",
                    body: `${senderName} is nudging you about: ${goalDescription}`,
                },
                data: {
                    type: "nudge_notification",
                    senderId: senderId,
                    senderName: senderName,
                    goalId: goalId,
                    goalDescription: goalDescription,
                },
            };

            await admin.messaging().send(message);
            console.log(`Nudge notification sent to ${targetUserId}`);

            return {
                success: true,
                message: "Nudge sent successfully",
            };
        } else {
            console.log(`Target user ${targetUserId} has no FCM token`);
            return {
                success: false,
                message: "User has no device registered for notifications",
            };
        }
    } catch (error) {
        console.error("Error in sendNudge:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to send nudge");
    }
});
