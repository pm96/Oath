import * as admin from "firebase-admin";
import {
    onDocumentCreated,
    onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const APP_ID = "oath-app";

type StoredMilestone = {
    days: number;
    achievedAt: Timestamp | admin.firestore.FieldValue;
    celebrated: boolean;
};

type CompletionDoc = DocumentData & {
    id: string;
    completedAt: Timestamp;
    habitId: string;
    userId: string;
};

/**
 * Server-side streak calculation and validation
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */

/**
 * Callable Cloud Function to record a habit completion and update streak
 * This ensures all streak calculations are done server-side
 * Requirements: 12.2, 12.3
 */
export const recordHabitCompletion = onCall(async (request) => {
    console.log("recordHabitCompletion function called");

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to record completions",
        );
    }

    const userId = request.auth.uid;
    const { habitId, completedAt, timezone, notes, difficulty } = request.data;

    if (!habitId || !completedAt || !difficulty) {
        throw new HttpsError(
            "invalid-argument",
            "habitId, completedAt, and difficulty are required",
        );
    }

    try {
        const completionTimestamp =
            admin.firestore.Timestamp.fromMillis(completedAt);
        const now = admin.firestore.Timestamp.now();

        if (completionTimestamp.toMillis() > now.toMillis()) {
            throw new HttpsError(
                "invalid-argument",
                "Cannot record completions for future dates",
            );
        }

        const timeDiff = now.toMillis() - completionTimestamp.toMillis();
        if (timeDiff > 24 * 60 * 60 * 1000) {
            throw new HttpsError(
                "invalid-argument",
                "Cannot record completions more than 24 hours old",
            );
        }

        const result = await db.runTransaction(async (transaction) => {
            // --- 1. ALL READS ---
            const goalRef = db.doc(
                `artifacts/${APP_ID}/public/data/goals/${habitId}`,
            );
            const streakRef = db.doc(
                `artifacts/${APP_ID}/streaks/${userId}_${habitId}`,
            );
            const completionsRef = db.collection(`artifacts/${APP_ID}/completions`);
            const existingQuery = completionsRef
                .where("habitId", "==", habitId)
                .where("userId", "==", userId);

            const goalDoc = await transaction.get(goalRef);
            const existingStreakDoc = await transaction.get(streakRef);
            const existingCompletionsSnapshot = await transaction.get(existingQuery);

            // --- 2. ALL VALIDATION AND LOGIC ---
            if (!goalDoc.exists) {
                throw new HttpsError("not-found", "Goal not found");
            }
            const goalData = goalDoc.data();
            if (goalData?.ownerId !== userId) {
                throw new HttpsError("permission-denied", "You do not own this goal");
            }

            const completionDateString = completionTimestamp
                .toDate()
                .toISOString()
                .split("T")[0];

            const alreadyCompleted = existingCompletionsSnapshot.docs.some((doc) => {
                const data = doc.data();
                const existingDateString = data.completedAt
                    .toDate()
                    .toISOString()
                    .split("T")[0];
                return (
                    data.isActive !== false && existingDateString === completionDateString
                );
            });

            if (alreadyCompleted) {
                throw new HttpsError(
                    "already-exists",
                    "Habit already completed for this date",
                );
            }

            const completionData = {
                habitId,
                userId,
                completedAt: completionTimestamp,
                timezone: timezone || "UTC",
                notes: notes || "",
                difficulty,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const allCompletions = existingCompletionsSnapshot.docs
                .filter((doc) => doc.data().isActive !== false)
                .map((doc) => ({ id: doc.id, ...doc.data() }));

            const newCompletionRef = completionsRef.doc();
            allCompletions.push({ id: newCompletionRef.id, ...completionData });

            const updatedStreak = calculateStreakFromCompletions(
                allCompletions,
                habitId,
                userId,
            );

            const existingMilestones = (
                existingStreakDoc.exists
                    ? existingStreakDoc.data()?.milestones || []
                    : []
            ) as StoredMilestone[];

            let freezesAvailable = updatedStreak.freezesAvailable;
            const newMilestones: StoredMilestone[] = [];
            const milestoneThresholds = [7, 30, 60, 100, 365];

            for (const threshold of milestoneThresholds) {
                if (updatedStreak.currentStreak >= threshold) {
                    const existingMilestone = existingMilestones.find(
                        (m) => m.days === threshold,
                    );
                    if (!existingMilestone) {
                        newMilestones.push({
                            days: threshold,
                            achievedAt: admin.firestore.FieldValue.serverTimestamp(),
                            celebrated: false,
                        });
                        if (threshold === 30) freezesAvailable += 1;
                    }
                }
            }

            const streakData = {
                habitId,
                userId,
                currentStreak: updatedStreak.currentStreak,
                bestStreak: Math.max(
                    updatedStreak.bestStreak,
                    existingStreakDoc.exists
                        ? existingStreakDoc.data()?.bestStreak || 0
                        : 0,
                ),
                lastCompletionDate: completionDateString,
                streakStartDate: updatedStreak.streakStartDate,
                freezesAvailable,
                freezesUsed: existingStreakDoc.exists
                    ? existingStreakDoc.data()?.freezesUsed || 0
                    : 0,
                milestones: [...existingMilestones, ...newMilestones],
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const auditData = {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId,
                action: "record_completion",
                entityType: "completion",
                entityId: newCompletionRef.id,
                newData: completionData,
                ipAddress: request.rawRequest?.ip,
                userAgent: request.rawRequest?.get("user-agent"),
            };

            // --- 3. ALL WRITES ---
            transaction.set(newCompletionRef, completionData);
            transaction.set(streakRef, streakData);
            transaction.set(
                db.collection(`artifacts/${APP_ID}/auditLogs`).doc(),
                auditData,
            );

            return {
                completionId: newCompletionRef.id,
                streak: streakData,
                newMilestones,
            };
        });

        console.log(`Completion recorded for user ${userId}, habit ${habitId}`);
        return { success: true, ...result };
    } catch (error) {
        console.error("Error in recordHabitCompletion:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to record completion");
    }
});

/**
 * Callable Cloud Function for undoing a goal completion
 */
export const undoHabitCompletion = onCall(async (request) => {
    console.log("undoHabitCompletion function called");

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be signed in to undo completions",
        );
    }

    const userId = request.auth.uid;
    const { habitId } = request.data;

    if (!habitId) {
        throw new HttpsError("invalid-argument", "habitId is required");
    }

    const goalRef = db.doc(`artifacts/${APP_ID}/public/data/goals/${habitId}`);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
        throw new HttpsError("not-found", "Goal not found");
    }

    const goalData = goalDoc.data();
    if (!goalData) {
        throw new HttpsError("internal", "Goal data missing");
    }
    if (goalData.ownerId !== userId) {
        throw new HttpsError("permission-denied", "You do not own this goal");
    }

    const lastCompletionId = goalData.lastCompletionId;

    // Early exit if there's no completion to undo
    if (!lastCompletionId && !goalData.latestCompletionDate) {
        console.log(
            "undoHabitCompletion: No completion found on goal doc. Assuming already undone.",
        );
        return { success: true };
    }

    console.log("undoHabitCompletion:", {
        userId,
        habitId,
        lastCompletionId,
        latestCompletionTimestamp: goalData.latestCompletionDate?.toMillis(),
    });

    const completionsRef = db.collection(`artifacts/${APP_ID}/completions`);
    let completionDoc: admin.firestore.DocumentSnapshot | undefined;

    if (lastCompletionId) {
        const completionRef = completionsRef.doc(lastCompletionId);
        completionDoc = await completionRef.get();
    } else {
        // Fallback for cases where lastCompletionId might not be on the goal doc
        const fallbackSnapshot = await completionsRef
            .where("habitId", "==", habitId)
            .where("userId", "==", userId)
            .orderBy("completedAt", "desc")
            .limit(1)
            .get();

        if (!fallbackSnapshot.empty) {
            completionDoc = fallbackSnapshot.docs[0];
        }
    }

    // If, after all checks, we still don't have a completion doc,
    // it means it was already deleted. We can return success.
    if (!completionDoc || !completionDoc.exists) {
        console.warn(
            `undoHabitCompletion: Completion document not found for habit ${habitId} (ID: ${lastCompletionId}). Assuming already undone.`,
        );
        return { success: true };
    }

    if (!completionDoc) {
        console.warn("Completion document is undefined, cannot proceed with undo.");
        return { success: false, error: "Completion document not found." };
    }

    await db.runTransaction(async (transaction) => {
        if (!completionDoc) {
            // This check is for type safety, though the above check should handle it.
            return;
        }
        transaction.delete(completionDoc.ref);

        const nextDeadline = calculateNextDeadline(
            goalData.frequency,
            goalData.targetDays,
        );
        transaction.update(goalRef, {
            latestCompletionDate: null,
            nextDeadline: admin.firestore.Timestamp.fromDate(nextDeadline),
            currentStatus: "Yellow",
            lastCompletionId: null,
        });
    });

    const remainingCompletionsSnapshot = await completionsRef
        .where("habitId", "==", habitId)
        .where("userId", "==", userId)
        .orderBy("completedAt", "desc")
        .get();

    const streakData = calculateStreakFromCompletions(
        remainingCompletionsSnapshot.docs.map((doc) => doc.data()),
        habitId,
        userId,
    );

    const streakId = `${userId}_${habitId}`;
    const streakRef = db.doc(`artifacts/${APP_ID}/streaks/${streakId}`);

    const existingStreakDoc = await streakRef.get();
    const existingStreakData = existingStreakDoc.exists
        ? existingStreakDoc.data()
        : {};

    await streakRef.set(
        {
            ...streakData,
            freezesAvailable: existingStreakData?.freezesAvailable || 0,
            freezesUsed: existingStreakData?.freezesUsed || 0,
            milestones: existingStreakData?.milestones || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
    );

    return { success: true };
});

/**
 * Callable Cloud Function to use a streak freeze
 * Requirements: 12.2, 12.3
 */
export const useStreakFreeze = onCall(async (request) => {
    console.log("useStreakFreeze function called");

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to use streak freeze",
        );
    }

    const userId = request.auth.uid;
    const { habitId, missedDate } = request.data;

    if (!habitId || !missedDate) {
        throw new HttpsError(
            "invalid-argument",
            "habitId and missedDate are required",
        );
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const streakRef = db.doc(
                `artifacts/${APP_ID}/streaks/${userId}_${habitId}`,
            );
            const streakDoc = await transaction.get(streakRef);

            if (!streakDoc.exists) {
                throw new HttpsError("not-found", "Streak data not found");
            }

            const streakData = streakDoc.data();

            // Validate user ownership
            if (streakData?.userId !== userId) {
                throw new HttpsError(
                    "permission-denied",
                    "Unauthorized access to streak data",
                );
            }

            // Check if freeze is available
            if ((streakData?.freezesAvailable || 0) <= 0) {
                throw new HttpsError(
                    "failed-precondition",
                    "No streak freezes available",
                );
            }

            // Create a protected completion for the missed date
            const completionsRef = db.collection(`artifacts/${APP_ID}/completions`);
            const protectedCompletionRef = completionsRef.doc();

            const protectedCompletion = {
                habitId,
                userId,
                completedAt: admin.firestore.Timestamp.fromDate(new Date(missedDate)),
                timezone: "UTC",
                notes: "Protected by streak freeze",
                difficulty: "easy",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            transaction.set(protectedCompletionRef, protectedCompletion);

            // Update streak data
            const updatedStreakData = {
                ...streakData,
                freezesAvailable: (streakData?.freezesAvailable || 0) - 1,
                freezesUsed: (streakData?.freezesUsed || 0) + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            transaction.update(streakRef, updatedStreakData);

            // Create audit log
            const auditRef = db.collection(`artifacts/${APP_ID}/auditLogs`).doc();
            transaction.set(auditRef, {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId,
                action: "use_streak_freeze",
                entityType: "streak",
                entityId: `${userId}_${habitId}`,
                oldData: streakData,
                newData: updatedStreakData,
                ipAddress: request.rawRequest?.ip,
                userAgent: request.rawRequest?.get("user-agent"),
            });

            return {
                success: true,
                freezesRemaining: updatedStreakData.freezesAvailable,
            };
        });

        console.log(`Streak freeze used for user ${userId}, habit ${habitId}`);
        return result;
    } catch (error) {
        console.error("Error in useStreakFreeze:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to use streak freeze");
    }
});

/**
 * Cloud Function to detect and flag suspicious activity
 * Requirements: 12.5
 */
export const detectSuspiciousActivity = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting detectSuspiciousActivity function");

        try {
            const now = admin.firestore.Timestamp.now();
            const oneHourAgo = new Date(now.toMillis() - 60 * 60 * 1000);

            // Check for suspicious completion patterns
            const completionsRef = db.collection(`artifacts/${APP_ID}/completions`);
            const recentCompletionsQuery = completionsRef
                .where(
                    "createdAt",
                    ">=",
                    admin.firestore.Timestamp.fromDate(oneHourAgo),
                )
                .orderBy("createdAt", "desc");

            const recentCompletionsSnapshot = await recentCompletionsQuery.get();

            // Group by user to detect suspicious patterns
            const userCompletions = new Map<string, CompletionDoc[]>();

            recentCompletionsSnapshot.docs.forEach((docSnapshot) => {
                const data = docSnapshot.data() as DocumentData;
                const userId = data.userId as string;

                if (!userCompletions.has(userId)) {
                    userCompletions.set(userId, []);
                }
                const completion: CompletionDoc = {
                    ...(data as DocumentData),
                    id: docSnapshot.id,
                    userId,
                    habitId: data.habitId as string,
                    completedAt: data.completedAt as Timestamp,
                };
                userCompletions.get(userId)?.push(completion);
            });

            const suspiciousUsers: Array<{
                userId: string;
                flags: string[];
                completions: number;
                riskLevel: "high" | "medium" | "low";
            }> = [];

            // Analyze each user's activity
            for (const [userId, completions] of userCompletions.entries()) {
                const flags = [];

                // Flag 1: Too many completions in one hour
                if (completions.length > 10) {
                    flags.push("Excessive completions in one hour");
                }

                // Flag 2: Identical timestamps
                const timestamps = completions.map((completion) =>
                    completion.completedAt.toMillis(),
                );
                const uniqueTimestamps = new Set(timestamps);
                if (uniqueTimestamps.size < timestamps.length) {
                    flags.push("Duplicate completion timestamps");
                }

                // Flag 3: Multiple habits completed at exact same time
                const timestampGroups = new Map<number, CompletionDoc[]>();
                completions.forEach((completion) => {
                    const timestamp = completion.completedAt.toMillis();
                    if (!timestampGroups.has(timestamp)) {
                        timestampGroups.set(timestamp, []);
                    }
                    timestampGroups.get(timestamp)?.push(completion);
                });

                for (const group of timestampGroups.values()) {
                    if (group.length > 3) {
                        flags.push("Multiple habits completed at identical time");
                    }
                }

                if (flags.length > 0) {
                    suspiciousUsers.push({
                        userId,
                        flags,
                        completions: completions.length,
                        riskLevel:
                            flags.length >= 3 ? "high" : flags.length >= 2 ? "medium" : "low",
                    });
                }
            }

            // Log and flag suspicious users
            if (suspiciousUsers.length > 0) {
                console.log(
                    `Found ${suspiciousUsers.length} users with suspicious activity`,
                );

                const batch = db.batch();

                suspiciousUsers.forEach((user) => {
                    const flagRef = db
                        .collection(`artifacts/${APP_ID}/suspiciousActivity`)
                        .doc();
                    batch.set(flagRef, {
                        userId: user.userId,
                        flags: user.flags,
                        riskLevel: user.riskLevel,
                        completionsCount: user.completions,
                        detectedAt: admin.firestore.FieldValue.serverTimestamp(),
                        reviewed: false,
                    });

                    console.warn(
                        `Suspicious activity detected for user ${user.userId}:`,
                        user.flags,
                    );
                });

                await batch.commit();
            }

            console.log("detectSuspiciousActivity function completed successfully");
        } catch (error) {
            console.error("Error in detectSuspiciousActivity:", error);
            throw error;
        }
    },
);

/**
 * Callable Cloud Function to delete a habit and all associated data
 */
export const deleteHabit = onCall(async (request) => {
    console.log("deleteHabit function called");

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to delete habits.",
        );
    }

    const userId = request.auth.uid;
    const { habitId } = request.data;

    if (!habitId) {
        throw new HttpsError(
            "invalid-argument",
            "habitId is required for deletion.",
        );
    }

    // Define references to all documents that need to be deleted
    const goalRef = db.doc(`artifacts/${APP_ID}/public/data/goals/${habitId}`);
    const streakRef = db.doc(`artifacts/${APP_ID}/streaks/${userId}_${habitId}`);
    const analyticsRef = db.doc(
        `artifacts/${APP_ID}/analytics/${userId}_${habitId}`,
    );
    const completionsQuery = db
        .collection(`artifacts/${APP_ID}/completions`)
        .where("habitId", "==", habitId)
        .where("userId", "==", userId);

    try {
        // First, verify ownership before proceeding with any deletion.
        const goalDoc = await goalRef.get();
        if (!goalDoc.exists || goalDoc.data()?.ownerId !== userId) {
            throw new HttpsError(
                "permission-denied",
                "You do not have permission to delete this habit.",
            );
        }

        // Get all completion documents to delete them in a batch
        const completionsSnapshot = await completionsQuery.get();

        const batch = db.batch();

        // 1. Delete all completion documents
        completionsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Delete the goal document
        batch.delete(goalRef);

        // 3. Delete the streak document
        batch.delete(streakRef);

        // 4. Delete the analytics document
        batch.delete(analyticsRef);

        // Commit the batch
        await batch.commit();

        console.log(
            `Successfully deleted habit ${habitId} and all associated data for user ${userId}.`,
        );
        return { success: true, message: "Habit deleted successfully." };
    } catch (error) {
        console.error(`Error deleting habit ${habitId} for user ${userId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to delete habit.");
    }
});

/**
 * Callable Cloud Function to find a user by their invite code.
 */
export const findUserByInviteCode = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to search for friends.",
        );
    }

    const { inviteCode } = request.data;

    if (
        !inviteCode ||
        typeof inviteCode !== "string" ||
        inviteCode.length === 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid invite code is required.",
        );
    }

    const usersRef = db.collection(`artifacts/${APP_ID}/users`);
    const querySnapshot = await usersRef
        .where("inviteCode", "==", inviteCode.toUpperCase())
        .limit(1)
        .get();

    if (querySnapshot.empty) {
        throw new HttpsError(
            "not-found",
            `No user found with invite code "${inviteCode}".`,
        );
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Return only public-safe data
    return {
        uid: userDoc.id,
        displayName: userData.displayName,
        email: userData.email,
    };
});

/**
 * Callable Cloud Function to update a user's profile information.
 */
export const updateUserProfile = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to update their profile.",
        );
    }

    const { displayName } = request.data;

    if (
        !displayName ||
        typeof displayName !== "string" ||
        displayName.trim().length === 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid displayName is required.",
        );
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length > 50) {
        throw new HttpsError(
            "invalid-argument",
            "Display name cannot exceed 50 characters.",
        );
    }

    const userId = request.auth.uid;
    const userRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);

    try {
        await userRef.update({
            displayName: trimmedName,
            searchableName: trimmedName.toLowerCase(),
        });

        console.log(`User profile updated for ${userId}`);
        return { success: true, message: "Profile updated successfully." };
    } catch (error) {
        console.error(`Error updating profile for user ${userId}:`, error);
        throw new HttpsError("internal", "Failed to update user profile.");
    }
});

/**
 * Callable Cloud Function to delete a user's account and all associated data.
 */
export const deleteAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to delete their account.",
        );
    }

    const userId = request.auth.uid;
    console.log(`Starting account deletion for user ${userId}`);

    try {
        // --- 1. Gather all documents to be deleted ---
        const collectionsToDelete = ["completions", "streaks", "analytics"];
        const userDocRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);
        const goalsQuery = db
            .collection(`artifacts/${APP_ID}/public/data/goals`)
            .where("ownerId", "==", userId);

        const queries = collectionsToDelete.map((collectionName) =>
            db
                .collection(`artifacts/${APP_ID}/${collectionName}`)
                .where("userId", "==", userId)
                .get(),
        );
        queries.push(goalsQuery.get());

        // --- 2. Execute all queries ---
        const snapshots = await Promise.all(queries);

        // --- 3. Batch delete all documents ---
        const batch = db.batch();

        // Delete the main user document
        batch.delete(userDocRef);

        // Delete documents from each collection
        snapshots.forEach((snapshot) => {
            snapshot.docs.forEach((doc) => {
                console.log(`Queueing deletion for: ${doc.ref.path}`);
                batch.delete(doc.ref);
            });
        });

        // Commit the batch to delete all Firestore data
        await batch.commit();
        console.log(`All Firestore data deleted for user ${userId}.`);

        // --- 4. Delete user from Firebase Authentication ---
        await admin.auth().deleteUser(userId);
        console.log(
            `Successfully deleted user account from Firebase Auth for ${userId}.`,
        );

        return { success: true, message: "Account deleted successfully." };
    } catch (error) {
        console.error(`Error deleting account for user ${userId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to delete account.");
    }
});

/**
 * Callable Cloud Function to search for users by name or email, respecting privacy settings.
 */
export const searchUsers = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to search for users.",
        );
    }
    const currentUserId = request.auth.uid;
    const { searchQuery } = request.data;

    if (
        !searchQuery ||
        typeof searchQuery !== "string" ||
        searchQuery.trim().length === 0
    ) {
        return [];
    }

    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    const usersCollection = db.collection(`artifacts/${APP_ID}/users`);
    const results: any[] = [];
    const uniqueUserIds = new Set<string>();

    const emailQuery = usersCollection
        .where("privacySettings.isSearchable", "==", true)
        .where("searchableEmail", ">=", lowerCaseQuery)
        .where("searchableEmail", "<=", lowerCaseQuery + "\uf8ff")
        .limit(5);

    const nameQuery = usersCollection
        .where("privacySettings.isSearchable", "==", true)
        .where("searchableName", ">=", lowerCaseQuery)
        .where("searchableName", "<=", lowerCaseQuery + "\uf8ff")
        .limit(5);

    try {
        const [emailSnapshot, nameSnapshot] = await Promise.all([
            emailQuery.get(),
            nameQuery.get(),
        ]);

        const processSnapshot = (snapshot: admin.firestore.QuerySnapshot) => {
            snapshot.forEach((doc) => {
                if (doc.id !== currentUserId && !uniqueUserIds.has(doc.id)) {
                    const data = doc.data();
                    results.push({
                        userId: doc.id,
                        displayName: data.displayName,
                        email: data.email,
                        relationshipStatus: "none", // Client will determine the real status
                    });
                    uniqueUserIds.add(doc.id);
                }
            });
        };

        processSnapshot(emailSnapshot);
        processSnapshot(nameSnapshot);

        return results;
    } catch (error) {
        console.error(
            `Error searching users with query "${lowerCaseQuery}":`,
            error,
        );
        throw new HttpsError("internal", "Failed to search for users.");
    }
});

/**
 * Helper function to calculate streak from completions
 */
function calculateStreakFromCompletions(
    completions: any[],
    habitId: string,
    userId: string,
) {
    // Filter out completions that are missing a valid timestamp
    const validCompletions = completions.filter(
        (c) => c && c.completedAt && typeof c.completedAt.toDate === "function",
    );

    if (validCompletions.length === 0) {
        return {
            habitId,
            userId,
            currentStreak: 0,
            bestStreak: 0,
            lastCompletionDate: "",
            streakStartDate: new Date().toISOString().split("T")[0],
            freezesAvailable: 0,
            freezesUsed: 0,
            milestones: [],
        };
    }

    // Get unique completion dates from valid completions and sort them
    const completionDates = validCompletions
        .map((comp) => comp.completedAt.toDate().toISOString().split("T")[0])
        .filter((date, index, arr) => arr.indexOf(date) === index)
        .sort();

    // Calculate current streak
    let currentStreak = 0;
    let streakStartDate = "";
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const lastCompletionDate = completionDates[completionDates.length - 1];
    if (lastCompletionDate === today || lastCompletionDate === yesterday) {
        currentStreak = 1;
        streakStartDate = lastCompletionDate;

        // Count backwards for consecutive days
        for (let i = completionDates.length - 2; i >= 0; i--) {
            const currentDate = new Date(completionDates[i + 1]);
            const previousDate = new Date(completionDates[i]);
            const dayDiff =
                (currentDate.getTime() - previousDate.getTime()) /
                (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
                currentStreak++;
                streakStartDate = completionDates[i];
            } else {
                break;
            }
        }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < completionDates.length; i++) {
        const currentDate = new Date(completionDates[i]);
        const previousDate = new Date(completionDates[i - 1]);
        const dayDiff =
            (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
            tempStreak++;
        } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

    return {
        habitId,
        userId,
        currentStreak,
        bestStreak,
        lastCompletionDate,
        streakStartDate,
        freezesAvailable: 0,
        freezesUsed: 0,
        milestones: [],
    };
}

function calculateNextDeadline(
    frequency: "daily" | "weekly" | "3x_a_week",
    targetDays: string[],
    reference?: Date,
): Date {
    const now = reference || new Date();
    const currentDay = now.getDay();

    const dayMap: Record<string, number> = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
    };

    const targetDayNumbers = targetDays
        .map((day) => dayMap[day] ?? -1)
        .filter((day) => day >= 0)
        .sort((a, b) => a - b);

    if (frequency === "daily" || targetDayNumbers.length === 0) {
        const deadline = new Date(now);
        deadline.setHours(23, 59, 59, 999);
        return deadline;
    }

    if (frequency === "weekly" || frequency === "3x_a_week") {
        let daysToAdd = 0;
        let found = false;

        for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (targetDayNumbers.includes(checkDay)) {
                daysToAdd = i;
                found = true;
                break;
            }
        }

        if (!found) {
            const firstTargetDay = targetDayNumbers[0];
            daysToAdd = (firstTargetDay - currentDay + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7;
        }

        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + daysToAdd);
        deadline.setHours(23, 59, 59, 999);
        return deadline;
    }

    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 24);
    return fallback;
}

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
        if (targetData?.notificationSettings?.enabled === false) {
            console.log(`Target user ${targetUserId} has disabled notifications.`);
            return {
                success: false,
                message: "User has disabled notifications.",
            };
        }
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

/**
 * Cloud Function triggered when a friend request is created
 * Sends FCM notification to the receiver
 * Requirements: 7.1, 7.2
 */
export const sendFriendRequestNotification = onDocumentCreated(
    `artifacts/${APP_ID}/friendRequests/{requestId}`,
    async (event) => {
        console.log("sendFriendRequestNotification triggered");

        try {
            const requestData = event.data?.data();
            if (!requestData) {
                console.log("No request data found");
                return;
            }

            const { senderId, senderName, receiverId, status } = requestData;

            // Only send notification for pending requests
            if (status !== "pending") {
                console.log(`Request status is ${status}, not sending notification`);
                return;
            }

            // Get receiver's FCM token
            const receiverRef = db.doc(`artifacts/${APP_ID}/users/${receiverId}`);
            const receiverDoc = await receiverRef.get();

            if (!receiverDoc.exists) {
                console.log(`Receiver ${receiverId} not found`);
                return;
            }

            const receiverData = receiverDoc.data();
            if (receiverData?.notificationSettings?.enabled === false) {
                console.log(`User ${receiverId} has disabled notifications.`);
                return;
            }

            const fcmToken = receiverData?.fcmToken;

            if (!fcmToken) {
                console.log(`Receiver ${receiverId} has no FCM token`);
                return;
            }

            // Send FCM notification
            const message = {
                token: fcmToken,
                notification: {
                    title: "New Friend Request",
                    body: `${senderName} wants to be your accountability partner`,
                },
                data: {
                    type: "friend_request",
                    senderId: senderId,
                    senderName: senderName,
                    requestId: event.params.requestId,
                },
            };

            await admin.messaging().send(message);
            console.log(
                `Friend request notification sent to ${receiverId} from ${senderName}`,
            );
        } catch (error) {
            // Log error but don't throw - we don't want to block the friend request creation
            console.error("Error sending friend request notification:", error);
        }
    },
);

/**
 * Cloud Function triggered when a friend request is updated
 * Sends FCM notification to the sender when request is accepted
 * Requirements: 7.4
 */
export const sendFriendRequestAcceptedNotification = onDocumentUpdated(
    `artifacts/${APP_ID}/friendRequests/{requestId}`,
    async (event) => {
        console.log("sendFriendRequestAcceptedNotification triggered");

        try {
            const beforeData = event.data?.before.data();
            const afterData = event.data?.after.data();

            if (!beforeData || !afterData) {
                console.log("No before/after data found");
                return;
            }

            // Check if status changed from pending to accepted
            if (beforeData.status !== "pending" || afterData.status !== "accepted") {
                console.log(
                    `Status change from ${beforeData.status} to ${afterData.status}, not sending notification`,
                );
                return;
            }

            const { senderId, receiverId } = afterData;

            // Get sender's FCM token
            const senderRef = db.doc(`artifacts/${APP_ID}/users/${senderId}`);
            const senderDoc = await senderRef.get();

            if (!senderDoc.exists) {
                console.log(`Sender ${senderId} not found`);
                return;
            }

            const senderData = senderDoc.data();
            if (senderData?.notificationSettings?.enabled === false) {
                console.log(`User ${senderId} has disabled notifications.`);
                return;
            }

            const fcmToken = senderData?.fcmToken;

            if (!fcmToken) {
                console.log(`Sender ${senderId} has no FCM token`);
                return;
            }

            // Get receiver's name for the notification
            const receiverRef = db.doc(`artifacts/${APP_ID}/users/${receiverId}`);
            const receiverDoc = await receiverRef.get();

            if (!receiverDoc.exists) {
                console.log(`Receiver ${receiverId} not found`);
                return;
            }

            const receiverData = receiverDoc.data();
            const receiverName = receiverData?.displayName || "Someone";

            // Send FCM notification
            const message = {
                token: fcmToken,
                notification: {
                    title: "Friend Request Accepted!",
                    body: `${receiverName} accepted your friend request`,
                },
                data: {
                    type: "friend_request_accepted",
                    receiverId: receiverId,
                    receiverName: receiverName,
                    requestId: event.params.requestId,
                },
            };

            await admin.messaging().send(message);
            console.log(
                `Friend request accepted notification sent to ${senderId} about ${receiverName}`,
            );
        } catch (error) {
            // Log error but don't throw - we don't want to block the friend request acceptance
            console.error(
                "Error sending friend request accepted notification:",
                error,
            );
        }
    },
);

/**
 * Cloud Function triggered when a nudge is created
 * Sends FCM notification to the receiver
 * Requirements: 3.4, 5.1, 5.2
 */
export const sendNudgeNotification = onDocumentCreated(
    `artifacts/${APP_ID}/nudges/{nudgeId}`,
    async (event) => {
        console.log("sendNudgeNotification triggered");

        try {
            const nudgeData = event.data?.data();
            if (!nudgeData) {
                console.log("No nudge data found");
                return;
            }

            const { senderId, senderName, receiverId, goalId, goalDescription } =
                nudgeData;

            // Get receiver's FCM token
            const receiverRef = db.doc(`artifacts/${APP_ID}/users/${receiverId}`);
            const receiverDoc = await receiverRef.get();

            if (!receiverDoc.exists) {
                console.log(`Receiver ${receiverId} not found`);
                return;
            }

            const receiverData = receiverDoc.data();
            const fcmToken = receiverData?.fcmToken;

            if (!fcmToken) {
                console.log(`Receiver ${receiverId} has no FCM token`);
                return;
            }

            // Send FCM notification with proper format
            const message = {
                token: fcmToken,
                notification: {
                    title: `👊 ${senderName} nudged you!`,
                    body: `Don't forget: ${goalDescription}`,
                },
                data: {
                    type: "nudge",
                    goalId: goalId,
                    senderId: senderId,
                    senderName: senderName,
                    nudgeId: event.params.nudgeId,
                },
                android: {
                    priority: "high" as const,
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: "default",
                        },
                    },
                },
            };

            await admin.messaging().send(message);
            console.log(
                `Nudge notification sent to ${receiverId} from ${senderName} about goal: ${goalDescription}`,
            );
        } catch (error) {
            // Log error but don't throw - we don't want to block the nudge creation
            console.error("Error sending nudge notification:", error);
        }
    },
);

/**
 * Scheduled Cloud Function to cleanup old nudges (older than 7 days)
 * Runs daily to reduce storage costs and maintain performance
 * Requirements: 8.5
 */
export const cleanupOldNudges = onSchedule(
    {
        schedule: "every 24 hours",
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting cleanupOldNudges function");

        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);

            // Query old nudges
            const nudgesRef = db.collection(`artifacts/${APP_ID}/nudges`);
            const oldNudgesQuery = nudgesRef
                .where("createdAt", "<", cutoffTimestamp)
                .limit(500); // Process in batches to avoid timeout

            const snapshot = await oldNudgesQuery.get();

            if (snapshot.empty) {
                console.log("No old nudges to cleanup");
                return;
            }

            console.log(`Found ${snapshot.size} old nudges to delete`);

            // Delete in batches
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`Successfully deleted ${snapshot.size} old nudges`);

            // If we hit the limit, there might be more to delete
            if (snapshot.size === 500) {
                console.log(
                    "Batch limit reached, more nudges may need cleanup in next run",
                );
            }
        } catch (error) {
            console.error("Error in cleanupOldNudges:", error);
            throw error;
        }
    },
);

/**
 * Scheduled Cloud Function to send streak risk reminders
 * Runs every hour to check for users who haven't completed their habits
 * and are at risk of breaking their streaks
 * Requirements: 11.1
 */
export const sendStreakRiskReminders = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting sendStreakRiskReminders function");

        try {
            const now = new Date();

            // Get all active streaks
            const streaksRef = db.collection(`artifacts/${APP_ID}/streaks`);
            const streaksSnapshot = await streaksRef.get();

            console.log(`Processing ${streaksSnapshot.size} streak records`);

            const remindersToSend: {
                userId: string;
                habitId: string;
                habitName: string;
                currentStreak: number;
                fcmToken: string;
            }[] = [];

            for (const streakDoc of streaksSnapshot.docs) {
                const streakData = streakDoc.data();

                // Only consider active streaks
                if (streakData.currentStreak > 0) {
                    const userId = streakData.userId;

                    // Get user's notification preferences and timezone
                    const userRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);
                    const userDoc = await userRef.get();

                    if (!userDoc.exists) continue;

                    const userData = userDoc.data();
                    if (userData?.notificationSettings?.enabled === false) {
                        continue;
                    }
                    const fcmToken = userData?.fcmToken;

                    if (!fcmToken) continue;

                    // Check if user has completed habit today
                    const today = now.toISOString().split("T")[0];
                    const completionsRef = db.collection(
                        `artifacts/${APP_ID}/completions`,
                    );
                    const todayCompletionsQuery = completionsRef
                        .where("habitId", "==", streakData.habitId)
                        .where("userId", "==", userId);

                    const completionsSnapshot = await todayCompletionsQuery.get();

                    let hasCompletedToday = false;
                    for (const completionDoc of completionsSnapshot.docs) {
                        const completionData = completionDoc.data();
                        const completionDate = completionData.completedAt
                            .toDate()
                            .toISOString()
                            .split("T")[0];
                        if (completionDate === today) {
                            hasCompletedToday = true;
                            break;
                        }
                    }

                    if (!hasCompletedToday) {
                        // Get habit name
                        const goalRef = db.doc(
                            `artifacts/${APP_ID}/public/data/goals/${streakData.habitId}`,
                        );
                        const goalDoc = await goalRef.get();
                        const habitName = goalDoc.exists
                            ? goalDoc.data()?.description || "Your habit"
                            : "Your habit";

                        remindersToSend.push({
                            userId,
                            habitId: streakData.habitId,
                            habitName,
                            currentStreak: streakData.currentStreak,
                            fcmToken,
                        });
                    }
                }
            }

            console.log(`Sending ${remindersToSend.length} streak risk reminders`);

            // Send notifications
            const notificationPromises = remindersToSend.map(async (reminder) => {
                const message = createStreakRiskMessage(
                    reminder.habitName,
                    reminder.currentStreak,
                );

                const fcmMessage = {
                    token: reminder.fcmToken,
                    notification: {
                        title: "⚠️ Don't Break Your Streak!",
                        body: message,
                    },
                    data: {
                        type: "streak_reminder",
                        habitId: reminder.habitId,
                        habitName: reminder.habitName,
                        currentStreak: reminder.currentStreak.toString(),
                    },
                    android: {
                        priority: "high" as const,
                    },
                    apns: {
                        payload: {
                            aps: {
                                badge: 1,
                                sound: "default",
                            },
                        },
                    },
                };
                []
                try {
                    await admin.messaging().send(fcmMessage);
                    console.log(
                        `Streak reminder sent to ${reminder.userId} for ${reminder.habitName}`,
                    );
                } catch (error) {
                    console.error(
                        `Failed to send streak reminder to ${reminder.userId}:`,
                        error,
                    );
                }
            });

            await Promise.all(notificationPromises);
            console.log("sendStreakRiskReminders function completed successfully");
        } catch (error) {
            console.error("Error in sendStreakRiskReminders:", error);
            throw error;
        }
    },
);

/**
 * Scheduled Cloud Function to send weekly progress notifications
 * Runs every Sunday at 9 AM UTC to send weekly progress updates
 * Requirements: 11.4
 */
export const sendWeeklyProgressNotifications = onSchedule(
    {
        schedule: "0 9 * * 0", // Every Sunday at 9 AM UTC
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting sendWeeklyProgressNotifications function");

        try {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Get all active streaks (longer than 14 days)
            const streaksRef = db.collection(`artifacts/${APP_ID}/streaks`);
            const streaksSnapshot = await streaksRef.get();

            console.log(
                `Processing ${streaksSnapshot.size} streak records for weekly progress`,
            );

            const progressNotifications: Array<{
                userId: string;
                habitId: string;
                habitName: string;
                currentStreak: number;
                weeklyCompletions: number;
                fcmToken: string;
            }> = [];

            for (const streakDoc of streaksSnapshot.docs) {
                const streakData = streakDoc.data();

                // Only consider long streaks (14+ days)
                if (streakData.currentStreak >= 14) {
                    const userId = streakData.userId;

                    // Get user's notification preferences
                    const userRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);
                    const userDoc = await userRef.get();

                    if (!userDoc.exists) continue;

                    const userData = userDoc.data();
                    if (userData?.notificationSettings?.enabled === false) {
                        continue;
                    }
                    const fcmToken = userData?.fcmToken;

                    if (!fcmToken) continue;

                    // Count completions in the last week
                    const completionsRef = db.collection(
                        `artifacts/${APP_ID}/completions`,
                    );
                    const weeklyCompletionsQuery = completionsRef
                        .where("habitId", "==", streakData.habitId)
                        .where("userId", "==", userId)
                        .where(
                            "completedAt",
                            ">=",
                            admin.firestore.Timestamp.fromDate(oneWeekAgo),
                        );

                    const weeklyCompletionsSnapshot = await weeklyCompletionsQuery.get();
                    const weeklyCompletions = weeklyCompletionsSnapshot.size;

                    // Get habit name
                    const goalRef = db.doc(
                        `artifacts/${APP_ID}/public/data/goals/${streakData.habitId}`,
                    );
                    const goalDoc = await goalRef.get();
                    const habitName = goalDoc.exists
                        ? goalDoc.data()?.description || "Your habit"
                        : "Your habit";

                    progressNotifications.push({
                        userId,
                        habitId: streakData.habitId,
                        habitName,
                        currentStreak: streakData.currentStreak,
                        weeklyCompletions,
                        fcmToken,
                    });
                }
            }

            console.log(
                `Sending ${progressNotifications.length} weekly progress notifications`,
            );

            // Send notifications
            const notificationPromises = progressNotifications.map(
                async (progress) => {
                    const message = createWeeklyProgressMessage(
                        progress.habitName,
                        progress.currentStreak,
                        progress.weeklyCompletions,
                    );

                    const fcmMessage = {
                        token: progress.fcmToken,
                        notification: {
                            title: "📈 Weekly Progress Update",
                            body: message,
                        },
                        data: {
                            type: "weekly_progress",
                            habitId: progress.habitId,
                            habitName: progress.habitName,
                            currentStreak: progress.currentStreak.toString(),
                            weeklyCompletions: progress.weeklyCompletions.toString(),
                        },
                        android: {
                            priority: "normal" as const,
                        },
                        apns: {
                            payload: {
                                aps: {
                                    badge: 1,
                                    sound: "default",
                                },
                            },
                        },
                    };

                    try {
                        await admin.messaging().send(fcmMessage);
                        console.log(
                            `Weekly progress notification sent to ${progress.userId} for ${progress.habitName}`,
                        );
                    } catch (error) {
                        console.error(
                            `Failed to send weekly progress notification to ${progress.userId}:`,
                            error,
                        );
                    }
                },
            );

            await Promise.all(notificationPromises);
            console.log(
                "sendWeeklyProgressNotifications function completed successfully",
            );
        } catch (error) {
            console.error("Error in sendWeeklyProgressNotifications:", error);
            throw error;
        }
    },
);

/**
 * Cloud Function triggered when a streak milestone is achieved
 * Sends immediate celebration notification
 * Requirements: 11.2
 */
export const sendMilestoneNotification = onDocumentCreated(
    `artifacts/${APP_ID}/streaks/{streakId}`,
    async (event) => {
        console.log("sendMilestoneNotification triggered");

        try {
            const streakData = event.data?.data();
            if (!streakData) {
                console.log("No streak data found");
                return;
            }

            const { userId, habitId, currentStreak, milestones } = streakData;

            // Check if there are any uncelebrated milestones
            const uncelebratedMilestones =
                milestones?.filter((m: any) => !m.celebrated) || [];

            if (uncelebratedMilestones.length === 0) {
                console.log("No uncelebrated milestones found");
                return;
            }

            // Get user's FCM token and preferences
            const userRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                console.log(`User ${userId} not found`);
                return;
            }

            const userData = userDoc.data();
            if (userData?.notificationSettings?.enabled === false) {
                console.log(`User ${userId} has disabled notifications.`);
                return;
            }
            const fcmToken = userData?.fcmToken;

            if (!fcmToken) {
                console.log(`User ${userId} has no FCM token`);
                return;
            }

            // Get habit name
            const goalRef = db.doc(
                `artifacts/${APP_ID}/public/data/goals/${habitId}`,
            );
            const goalDoc = await goalRef.get();
            const habitName = goalDoc.exists
                ? goalDoc.data()?.description || "Your habit"
                : "Your habit";

            // Send notification for the latest milestone
            const latestMilestone =
                uncelebratedMilestones[uncelebratedMilestones.length - 1];
            const message = createMilestoneMessage(habitName, latestMilestone);

            const fcmMessage = {
                token: fcmToken,
                notification: {
                    title: "🎉 Milestone Achieved!",
                    body: message,
                },
                data: {
                    type: "streak_milestone",
                    habitId,
                    habitName,
                    milestoneDays: latestMilestone.days.toString(),
                    currentStreak: currentStreak.toString(),
                },
                android: {
                    priority: "high" as const,
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: "default",
                        },
                    },
                },
            };

            await admin.messaging().send(fcmMessage);
            console.log(
                `Milestone notification sent to ${userId} for ${latestMilestone.days} day milestone`,
            );

            // Mark milestone as celebrated
            const streakRef = db.doc(
                `artifacts/${APP_ID}/streaks/${event.params.streakId}`,
            );
            const updatedMilestones = milestones.map((m: any) =>
                m.days === latestMilestone.days ? { ...m, celebrated: true } : m,
            );

            await streakRef.update({ milestones: updatedMilestones });
            console.log(
                `Milestone marked as celebrated for ${latestMilestone.days} days`,
            );
        } catch (error) {
            console.error("Error sending milestone notification:", error);
        }
    },
);

/**
 * Cloud Function triggered when a streak is broken (currentStreak becomes 0)
 * Sends recovery notification the next day
 * Requirements: 11.3
 */
export const scheduleRecoveryNotification = onDocumentUpdated(
    `artifacts/${APP_ID}/streaks/{streakId}`,
    async (event) => {
        console.log("scheduleRecoveryNotification triggered");

        try {
            const beforeData = event.data?.before.data();
            const afterData = event.data?.after.data();

            if (!beforeData || !afterData) {
                console.log("No before/after data found");
                return;
            }

            // Check if streak was broken (went from > 0 to 0)
            if (beforeData.currentStreak > 0 && afterData.currentStreak === 0) {
                const { userId, habitId, bestStreak } = afterData;

                console.log(
                    `Streak broken for user ${userId}, habit ${habitId}. Previous best: ${bestStreak}`,
                );

                // Schedule recovery notification for tomorrow
                // Note: In a real implementation, you might want to use Cloud Tasks for precise scheduling
                // For now, we'll create a document that the daily cleanup function can process
                const recoveryRef = db
                    .collection(`artifacts/${APP_ID}/recoveryNotifications`)
                    .doc();
                await recoveryRef.set({
                    userId,
                    habitId,
                    bestStreak,
                    scheduledFor: admin.firestore.Timestamp.fromDate(
                        new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                    ),
                    sent: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`Recovery notification scheduled for user ${userId}`);
            }
        } catch (error) {
            console.error("Error scheduling recovery notification:", error);
        }
    },
);

/**
 * Scheduled Cloud Function to send pending recovery notifications
 * Runs every hour to check for scheduled recovery notifications
 * Requirements: 11.3
 */
export const sendPendingRecoveryNotifications = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "UTC",
    },
    async (event) => {
        console.log("Starting sendPendingRecoveryNotifications function");

        try {
            const now = admin.firestore.Timestamp.now();

            // Get pending recovery notifications that are due
            const recoveryRef = db.collection(
                `artifacts/${APP_ID}/recoveryNotifications`,
            );
            const pendingQuery = recoveryRef
                .where("sent", "==", false)
                .where("scheduledFor", "<=", now)
                .limit(100);

            const snapshot = await pendingQuery.get();

            if (snapshot.empty) {
                console.log("No pending recovery notifications");
                return;
            }

            console.log(`Processing ${snapshot.size} pending recovery notifications`);

            const batch = db.batch();

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const { userId, habitId, bestStreak } = data;

                try {
                    // Get user's FCM token and preferences
                    const userRef = db.doc(`artifacts/${APP_ID}/users/${userId}`);
                    const userDoc = await userRef.get();

                    if (!userDoc.exists) {
                        console.log(
                            `User ${userId} not found, marking notification as sent`,
                        );
                        batch.update(doc.ref, { sent: true });
                        continue;
                    }

                    const userData = userDoc.data();
                    if (userData?.notificationSettings?.enabled === false) {
                        console.log(
                            `User ${userId} has recovery notifications disabled, marking as sent`,
                        );
                        batch.update(doc.ref, { sent: true });
                        continue;
                    }
                    const fcmToken = userData?.fcmToken;

                    if (!fcmToken) {
                        console.log(
                            `User ${userId} has no FCM token, marking notification as sent`,
                        );
                        batch.update(doc.ref, { sent: true });
                        continue;
                    }

                    // Get habit name
                    const goalRef = db.doc(
                        `artifacts/${APP_ID}/public/data/goals/${habitId}`,
                    );
                    const goalDoc = await goalRef.get();
                    const habitName = goalDoc.exists
                        ? goalDoc.data()?.description || "Your habit"
                        : "Your habit";

                    // Send recovery notification
                    const message = createRecoveryMessage(habitName, bestStreak);

                    const fcmMessage = {
                        token: fcmToken,
                        notification: {
                            title: "💪 Ready for a Comeback?",
                            body: message,
                        },
                        data: {
                            type: "streak_recovery",
                            habitId,
                            habitName,
                            previousBestStreak: bestStreak.toString(),
                        },
                        android: {
                            priority: "normal" as const,
                        },
                        apns: {
                            payload: {
                                aps: {
                                    badge: 1,
                                    sound: "default",
                                },
                            },
                        },
                    };

                    await admin.messaging().send(fcmMessage);
                    console.log(
                        `Recovery notification sent to ${userId} for ${habitName}`,
                    );

                    // Mark as sent
                    batch.update(doc.ref, { sent: true, sentAt: now });
                } catch (error) {
                    console.error(
                        `Error sending recovery notification to ${userId}:`,
                        error,
                    );
                    // Mark as sent to avoid retrying
                    const errorMessage =
                        error instanceof Error ? error.message : "Unknown error";
                    batch.update(doc.ref, { sent: true, error: errorMessage });
                }
            }

            await batch.commit();
            console.log(
                "sendPendingRecoveryNotifications function completed successfully",
            );
        } catch (error) {
            console.error("Error in sendPendingRecoveryNotifications:", error);
            throw error;
        }
    },
);

// Helper functions for creating notification messages

function createStreakRiskMessage(
    habitName: string,
    currentStreak: number,
): string {
    if (currentStreak === 1) {
        return `Don't let your "${habitName}" streak end at just 1 day! Complete it now to keep going! 💪`;
    } else if (currentStreak < 7) {
        return `You're ${currentStreak} days into your "${habitName}" streak! Don't break it now - complete it today! 🔥`;
    } else if (currentStreak < 30) {
        return `Your ${currentStreak}-day "${habitName}" streak is at risk! You've come so far - don't give up now! ⚡`;
    } else {
        return `Your amazing ${currentStreak}-day "${habitName}" streak is in danger! Protect your incredible progress! 🛡️`;
    }
}

function createMilestoneMessage(habitName: string, milestone: any): string {
    const { days } = milestone;

    if (days === 7) {
        return `Amazing! You've completed "${habitName}" for 7 days straight! 🔥`;
    } else if (days === 30) {
        return `Incredible! You've hit a 30-day streak with "${habitName}"! You've earned a streak freeze! 🛡️`;
    } else if (days === 60) {
        return `Outstanding! 60 days of "${habitName}" - you're building a life-changing habit! 💪`;
    } else if (days === 100) {
        return `Legendary! 100 days of "${habitName}" - you're in the top 1% of habit builders! 🏆`;
    } else if (days === 365) {
        return `INCREDIBLE! A full year of "${habitName}" - you've achieved something truly extraordinary! 🌟`;
    } else {
        return `Congratulations! You've completed "${habitName}" for ${days} days in a row! 🎉`;
    }
}

function createRecoveryMessage(
    habitName: string,
    previousBestStreak: number,
): string {
    if (previousBestStreak === 0) {
        return `Ready to start fresh with "${habitName}"? Every expert was once a beginner! 🌱`;
    } else if (previousBestStreak < 7) {
        return `You had a ${previousBestStreak}-day streak with "${habitName}" before. Ready to beat that record? 🎯`;
    } else if (previousBestStreak < 30) {
        return `You achieved ${previousBestStreak} days with "${habitName}" before - you can do it again and go even further! 🚀`;
    } else {
        return `You had an incredible ${previousBestStreak}-day streak with "${habitName}"! That shows you have what it takes. Ready for round 2? 💪`;
    }
}

function createWeeklyProgressMessage(
    habitName: string,
    currentStreak: number,
    weeklyCompletions: number,
): string {
    const completionRate = Math.round((weeklyCompletions / 7) * 100);

    if (completionRate === 100) {
        return `Perfect week! You're ${currentStreak} days strong with "${habitName}" and completed it every day this week! 🔥`;
    } else if (completionRate >= 85) {
        return `Great week! Your "${habitName}" streak is at ${currentStreak} days with ${weeklyCompletions}/7 completions this week! 📈`;
    } else {
        return `Your "${habitName}" streak is at ${currentStreak} days. This week: ${weeklyCompletions}/7 completions. Keep pushing! 💪`;
    }
}
