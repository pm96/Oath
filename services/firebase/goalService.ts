import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
    validateGoalInput,
} from "@/utils/errorHandling";
import {
    addDoc,
    onSnapshot,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { getGoalDoc, getGoalsCollection, Goal } from "./collections";

/**
 * Input type for creating a new goal
 */
export interface GoalInput {
    description: string;
    frequency: "daily" | "weekly" | "3x_a_week";
    targetDays: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
}

/**
 * Calculate the next deadline based on frequency and target days
 */
export function calculateNextDeadline(
    frequency: "daily" | "weekly" | "3x_a_week",
    targetDays: string[],
    lastCompletion?: Date,
): Date {
    const now = lastCompletion || new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Map day names to numbers
    const dayMap: { [key: string]: number } = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
    };

    // Convert target days to numbers
    const targetDayNumbers = targetDays
        .map((day) => dayMap[day])
        .sort((a, b) => a - b);

    if (frequency === "daily") {
        // Next deadline is end of today (23:59:59) or tomorrow if already completed today
        const deadline = new Date(now);
        deadline.setHours(23, 59, 59, 999);

        // If we just completed it, set deadline to tomorrow
        if (lastCompletion) {
            deadline.setDate(deadline.getDate() + 1);
        }

        return deadline;
    }

    if (frequency === "weekly" || frequency === "3x_a_week") {
        // Find the next occurrence of any target day
        let daysToAdd = 0;
        let found = false;

        // Look for the next target day in the next 7 days
        for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (targetDayNumbers.includes(checkDay)) {
                daysToAdd = i;
                found = true;
                break;
            }
        }

        // If no target day found in next 7 days, use the first target day next week
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

    // Fallback: 24 hours from now
    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 24);
    return fallback;
}

/**
 * Create a new goal
 * Requirement 2.1: Validate goal inputs and handle errors
 */
export async function createGoal(
    userId: string,
    goalInput: GoalInput,
): Promise<string> {
    // Validate input
    const validationError = validateGoalInput(goalInput);
    if (validationError) {
        throw new Error(validationError);
    }

    try {
        return await retryWithBackoff(async () => {
            const goalsCollection = getGoalsCollection();

            const nextDeadline = calculateNextDeadline(
                goalInput.frequency,
                goalInput.targetDays,
            );

            const goalData = {
                ownerId: userId,
                description: goalInput.description.trim(),
                frequency: goalInput.frequency,
                targetDays: goalInput.targetDays,
                latestCompletionDate: null,
                currentStatus: "Green" as const,
                nextDeadline: Timestamp.fromDate(nextDeadline),
                isShared: true,
                createdAt: serverTimestamp(),
                redSince: null,
            };

            const docRef = await addDoc(goalsCollection, goalData);
            return docRef.id;
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Update a goal
 * Includes retry logic for network errors
 */
export async function updateGoal(
    goalId: string,
    updates: Partial<Omit<Goal, "id">>,
): Promise<void> {
    if (!goalId) {
        throw new Error("Goal ID is required");
    }

    try {
        await retryWithBackoff(async () => {
            const goalDoc = getGoalDoc(goalId);

            // Convert Date objects to Timestamps
            const firestoreUpdates: any = { ...updates };
            if (updates.latestCompletionDate) {
                firestoreUpdates.latestCompletionDate = Timestamp.fromDate(
                    updates.latestCompletionDate,
                );
            }
            if (updates.nextDeadline) {
                firestoreUpdates.nextDeadline = Timestamp.fromDate(
                    updates.nextDeadline,
                );
            }
            if (updates.createdAt) {
                firestoreUpdates.createdAt = Timestamp.fromDate(updates.createdAt);
            }
            if (updates.redSince) {
                firestoreUpdates.redSince = Timestamp.fromDate(updates.redSince);
            }

            await updateDoc(goalDoc, firestoreUpdates);
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Complete a goal - updates completion date, recalculates deadline, sets status to Green
 * Includes validation and error handling
 */
export async function completeGoal(goalId: string, goal: Goal): Promise<void> {
    if (!goalId) {
        throw new Error("Goal ID is required");
    }

    if (!goal) {
        throw new Error("Goal data is required");
    }

    try {
        const now = new Date();
        const nextDeadline = calculateNextDeadline(
            goal.frequency,
            goal.targetDays,
            now,
        );

        await updateGoal(goalId, {
            latestCompletionDate: now,
            nextDeadline: nextDeadline,
            currentStatus: "Green",
            redSince: null,
        });
    } catch (error) {
        const message = getUserFriendlyErrorMessage(error);
        throw new Error(message);
    }
}

/**
 * Subscribe to user's goals with real-time updates
 * Includes error handling for snapshot listener
 */
export function getUserGoals(
    userId: string,
    callback: (goals: Goal[]) => void,
    onError?: (error: Error) => void,
): () => void {
    if (!userId) {
        const error = new Error("User ID is required");
        if (onError) onError(error);
        return () => { };
    }

    const goalsCollection = getGoalsCollection();
    const q = query(goalsCollection, where("ownerId", "==", userId));

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            try {
                const goals: Goal[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
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
                    };
                });
                callback(goals);
            } catch (error) {
                console.error("Error processing goals snapshot:", error);
                if (onError) {
                    onError(
                        error instanceof Error
                            ? error
                            : new Error("Failed to process goals data"),
                    );
                }
            }
        },
        (error) => {
            console.error("Error in goals snapshot listener:", error);
            if (onError) {
                const message = getUserFriendlyErrorMessage(error);
                onError(new Error(message));
            }
        },
    );

    return unsubscribe;
}
