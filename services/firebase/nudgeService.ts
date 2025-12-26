import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "@/utils/errorHandling";
import {
    addDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    where,
} from "firebase/firestore";
import {
    getNudgesCollection,
    Nudge
} from "./collections";

/**
 * Nudge Service Module
 *
 * Handles all nudge-related operations including creation, rate limiting,
 * cooldown management, and nudge history tracking.
 *
 * Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 8.4
 */

/**
 * Input interface for sending a nudge
 */
export interface SendNudgeInput {
    senderId: string;
    senderName: string;
    receiverId: string;
    goalId: string;
    goalDescription: string;
}

/**
 * Interface for nudge cooldown tracking
 */
export interface NudgeCooldown {
    goalId: string;
    cooldownUntil: Date;
    lastNudgeTimestamp: Date;
}

/**
 * Send a nudge to a friend about their goal
 *
 * Requirements:
 * - 3.3: Create nudge document with all required fields
 * - 4.1: Implement 1-hour cooldown period
 * - 4.3: Prevent rapid nudging with validation
 *
 * @param input - Nudge creation parameters
 * @throws Error if validation fails or cooldown is active
 */
export async function sendNudge(input: SendNudgeInput): Promise<void> {
    // Validate input
    if (!input.senderId || !input.receiverId || !input.goalId) {
        throw new Error("Sender ID, receiver ID, and goal ID are required");
    }

    if (!input.senderName || !input.goalDescription) {
        throw new Error("Sender name and goal description are required");
    }

    if (input.senderId === input.receiverId) {
        throw new Error("Cannot nudge yourself");
    }

    try {
        await retryWithBackoff(async () => {
            // Check for existing cooldown
            const cooldowns = await getNudgeCooldowns(input.senderId);
            const existingCooldown = cooldowns.get(input.goalId);

            if (existingCooldown && new Date() < existingCooldown) {
                const remainingMinutes = Math.ceil(
                    (existingCooldown.getTime() - new Date().getTime()) / (1000 * 60),
                );
                throw new Error(`Already nudged - wait ${remainingMinutes}m`);
            }

            const nudgesCollection = getNudgesCollection();
            const now = new Date();
            const cooldownUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

            const nudgeData = {
                senderId: input.senderId,
                senderName: input.senderName,
                receiverId: input.receiverId,
                goalId: input.goalId,
                goalDescription: input.goalDescription,
                timestamp: Timestamp.fromDate(now),
                cooldownUntil: Timestamp.fromDate(cooldownUntil),
                createdAt: serverTimestamp(),
            };

            await addDoc(nudgesCollection, nudgeData);
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Get current nudge cooldowns for a user
 *
 * Requirements:
 * - 4.1: Track 1-hour cooldown periods
 * - 4.2: Enable nudge button when cooldown expires
 *
 * @param userId - User ID to get cooldowns for
 * @returns Map of goalId to cooldown end time
 */
export async function getNudgeCooldowns(
    userId: string,
): Promise<Map<string, Date>> {
    if (!userId) {
        throw new Error("User ID is required");
    }

    try {
        return await retryWithBackoff(async () => {
            const nudgesCollection = getNudgesCollection();
            const now = new Date();

            // Query nudges sent by this user that are still in cooldown
            const q = query(
                nudgesCollection,
                where("senderId", "==", userId),
                where("cooldownUntil", ">", Timestamp.fromDate(now)),
                orderBy("cooldownUntil", "desc"),
            );

            const snapshot = await getDocs(q);
            const cooldowns = new Map<string, Date>();

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const goalId = data.goalId;
                const cooldownUntil = data.cooldownUntil.toDate();

                // Keep only the latest cooldown for each goal
                if (!cooldowns.has(goalId) || cooldownUntil > cooldowns.get(goalId)!) {
                    cooldowns.set(goalId, cooldownUntil);
                }
            });

            return cooldowns;
        });
    } catch (error) {
        console.error("Error fetching nudge cooldowns:", error);
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Subscribe to real-time nudge cooldown updates
 *
 * Requirements:
 * - 4.4: Display remaining cooldown time in real-time
 * - 6.1: Real-time updates across devices
 *
 * @param userId - User ID to track cooldowns for
 * @param callback - Function called when cooldowns change
 * @returns Unsubscribe function
 */
export function subscribeToNudgeCooldowns(
    userId: string,
    callback: (cooldowns: Map<string, Date>) => void,
    onError?: (error: Error) => void,
): () => void {
    if (!userId) {
        const error = new Error("User ID is required");
        if (onError) onError(error);
        return () => { };
    }

    const nudgesCollection = getNudgesCollection();
    const now = new Date();

    // Query nudges sent by this user that are still in cooldown
    const q = query(
        nudgesCollection,
        where("senderId", "==", userId),
        where("cooldownUntil", ">", Timestamp.fromDate(now)),
        orderBy("cooldownUntil", "desc"),
    );

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            try {
                const cooldowns = new Map<string, Date>();
                const currentTime = new Date();

                snapshot.docs.forEach((doc) => {
                    const data = doc.data();
                    const goalId = data.goalId;
                    const cooldownUntil = data.cooldownUntil.toDate();

                    // Only include cooldowns that haven't expired
                    if (cooldownUntil > currentTime) {
                        // Keep only the latest cooldown for each goal
                        if (
                            !cooldowns.has(goalId) ||
                            cooldownUntil > cooldowns.get(goalId)!
                        ) {
                            cooldowns.set(goalId, cooldownUntil);
                        }
                    }
                });

                callback(cooldowns);
            } catch (error) {
                console.error("Error processing nudge cooldowns snapshot:", error);
                if (onError) {
                    onError(
                        error instanceof Error
                            ? error
                            : new Error("Failed to process nudge cooldowns data"),
                    );
                }
            }
        },
        (error) => {
            console.error("Error in nudge cooldowns snapshot listener:", error);
            if (onError) {
                const message = getUserFriendlyErrorMessage(error);
                onError(new Error(message));
            }
        },
    );

    return unsubscribe;
}

/**
 * Get nudge history for a user (sent or received)
 *
 * Requirements:
 * - 8.2: Display "Last nudged Xm ago" information
 * - 8.3: Show sent nudges in past 7 days
 * - 8.4: Show received nudges in past 7 days
 *
 * @param userId - User ID to get history for
 * @param type - Whether to get sent or received nudges
 * @param days - Number of days to look back (default: 7)
 * @returns Array of nudges
 */
export async function getNudgeHistory(
    userId: string,
    type: "sent" | "received",
    days: number = 7,
): Promise<Nudge[]> {
    if (!userId) {
        throw new Error("User ID is required");
    }

    if (days <= 0) {
        throw new Error("Days must be a positive number");
    }

    try {
        return await retryWithBackoff(async () => {
            const nudgesCollection = getNudgesCollection();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const fieldName = type === "sent" ? "senderId" : "receiverId";

            const q = query(
                nudgesCollection,
                where(fieldName, "==", userId),
                where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
                orderBy("timestamp", "desc"),
                limit(100), // Reasonable limit to prevent excessive data
            );

            const snapshot = await getDocs(q);
            const nudges: Nudge[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    receiverId: data.receiverId,
                    goalId: data.goalId,
                    goalDescription: data.goalDescription,
                    timestamp: data.timestamp.toDate(),
                    cooldownUntil: data.cooldownUntil.toDate(),
                    createdAt: data.createdAt?.toDate() || new Date(),
                };
            });

            return nudges;
        });
    } catch (error) {
        console.error(`Error fetching ${type} nudge history:`, error);
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Check if a user can send a nudge for a specific goal
 *
 * Requirements:
 * - 4.1: Enforce 1-hour cooldown period
 * - 4.3: Prevent rapid nudging
 *
 * @param userId - User ID attempting to send nudge
 * @param goalId - Goal ID to check cooldown for
 * @returns True if nudge can be sent, false if in cooldown
 */
export async function canSendNudge(
    userId: string,
    goalId: string,
): Promise<boolean> {
    if (!userId || !goalId) {
        return false;
    }

    try {
        const cooldowns = await getNudgeCooldowns(userId);
        const cooldownEnd = cooldowns.get(goalId);

        if (!cooldownEnd) {
            return true; // No cooldown exists
        }

        return new Date() > cooldownEnd;
    } catch (error) {
        console.error("Error checking nudge cooldown:", error);
        return false; // Err on the side of caution
    }
}

/**
 * Get the remaining cooldown time in minutes for a specific goal
 *
 * Requirements:
 * - 4.4: Display remaining cooldown time
 *
 * @param userId - User ID to check cooldown for
 * @param goalId - Goal ID to check cooldown for
 * @returns Remaining minutes in cooldown, or 0 if no cooldown
 */
export async function getRemainingCooldownMinutes(
    userId: string,
    goalId: string,
): Promise<number> {
    if (!userId || !goalId) {
        return 0;
    }

    try {
        const cooldowns = await getNudgeCooldowns(userId);
        const cooldownEnd = cooldowns.get(goalId);

        if (!cooldownEnd) {
            return 0; // No cooldown exists
        }

        const now = new Date();
        if (now >= cooldownEnd) {
            return 0; // Cooldown has expired
        }

        return Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60));
    } catch (error) {
        console.error("Error getting remaining cooldown time:", error);
        return 0;
    }
}
