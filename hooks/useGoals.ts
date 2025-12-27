import { syncService } from "@/services/firebase/syncService";
import { useEffect, useRef, useState } from "react";
import { Goal } from "../services/firebase/collections";
import {
    completeGoal as completeGoalService,
    createGoal as createGoalService,
    deleteGoal as deleteGoalService,
    fetchUserGoalsOnce,
    getGoalStreak,
    getUserGoals,
    GoalInput,
    undoGoalCompletion as undoGoalCompletionService,
    updateGoal as updateGoalService,
} from "../services/firebase/goalService";
import { HabitStreak } from "../types/habit-streaks";
import { useAuth } from "./useAuth";

/**
 * Extended Goal interface with streak information
 */
export interface GoalWithStreak extends Goal {
    streak?: HabitStreak | null;
    currentStreakCount?: number;
    bestStreakCount?: number;
}

/**
 * Custom hook for managing goals with real-time Firestore listeners
 * Now includes streak information integration
 */
export function useGoals() {
    const { user } = useAuth();
    const [goals, setGoals] = useState<GoalWithStreak[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [cachedStreakMap, setCachedStreakMap] = useState<
        Record<string, HabitStreak>
    >({});
    const cachedStreaksRef = useRef<Record<string, HabitStreak>>({});

    useEffect(() => {
        cachedStreaksRef.current = cachedStreakMap;
    }, [cachedStreakMap]);

    /**
     * Enhance goals with streak information
     */
    const enhanceGoalsWithStreaks = async (
        baseGoals: Goal[],
    ): Promise<GoalWithStreak[]> => {
        if (!user) return baseGoals;
        const localCache = cachedStreaksRef.current;

        const enhancedGoals = await Promise.all(
            baseGoals.map(async (goal) => {
                const cachedStreak = localCache[goal.id];
                if (cachedStreak) {
                    return {
                        ...goal,
                        streak: cachedStreak,
                        currentStreakCount: cachedStreak.currentStreak || 0,
                        bestStreakCount: cachedStreak.bestStreak || 0,
                    };
                }

                try {
                    const streak = await getGoalStreak(goal.id, user.uid);
                    return {
                        ...goal,
                        streak,
                        currentStreakCount: streak?.currentStreak || 0,
                        bestStreakCount: streak?.bestStreak || 0,
                    };
                } catch (error) {
                    console.warn(`Failed to get streak for goal ${goal.id}:`, error);
                    return {
                        ...goal,
                        streak: null,
                        currentStreakCount: 0,
                        bestStreakCount: 0,
                    };
                }
            }),
        );

        return enhancedGoals;
    };

    useEffect(() => {
        let isMounted = true;

        if (!user?.uid) {
            setCachedStreakMap({});
            return;
        }

        syncService
            .getCachedStreakMap()
            .then((map: Record<string, HabitStreak>) => {
                if (isMounted) {
                    setCachedStreakMap(map);
                }
            })
            .catch((err: unknown) =>
                console.error("Failed to load cached streaks:", err),
            );

        return () => {
            isMounted = false;
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!user) {
            setGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Subscribe to real-time updates with error handling
        const unsubscribe = getUserGoals(
            user.uid,
            async (updatedGoals) => {
                try {
                    const enhancedGoals = await enhanceGoalsWithStreaks(updatedGoals);
                    setGoals(enhancedGoals);
                    setLoading(false);
                    setError(null);
                } catch (err) {
                    console.error("Error enhancing goals with streaks:", err);
                    // Still show goals even if streak enhancement fails
                    setGoals(updatedGoals);
                    setLoading(false);
                    setError(null);
                }
            },
            (err) => {
                console.error("Error loading goals:", err);
                setError(err);
                setLoading(false);
            },
        );

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
        };
    }, [user]);

    /**
     * Create a new goal
     */
    const createGoal = async (goalInput: GoalInput): Promise<string> => {
        if (!user) {
            throw new Error("User must be authenticated to create a goal");
        }

        try {
            const goalId = await createGoalService(user.uid, goalInput);
            return goalId;
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to create goal");
            setError(error);
            throw error;
        }
    };

    /**
     * Delete a goal
     */
    const deleteGoal = async (goalId: string): Promise<void> => {
        try {
            await deleteGoalService(goalId);
            setGoals((prevGoals) => prevGoals.filter((g) => g.id !== goalId));
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to delete goal");
            setError(error);
            throw error;
        }
    };

    /**
     * Update an existing goal
     */
    const updateGoal = async (
        goalId: string,
        updates: Partial<Omit<Goal, "id">>,
    ): Promise<void> => {
        try {
            await updateGoalService(goalId, updates);
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to update goal");
            setError(error);
            throw error;
        }
    };

    /**
     * Mark a goal as complete
     */
    const completeGoal = async (goalId: string): Promise<void> => {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) {
            throw new Error("Goal not found");
        }

        try {
            await completeGoalService(goalId, goal);
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to complete goal");
            setError(error);
            throw error;
        }
    };

    /**
     * Undo today's completion for a goal
     */
    const undoGoalCompletion = async (goalId: string): Promise<void> => {
        try {
            await undoGoalCompletionService(goalId);
        } catch (err) {
            console.error(err);
            const error =
                err instanceof Error ? err : new Error("Failed to undo completion");
            setError(error);
            throw error;
        }
    };

    /**
     * Refresh goals data
     * Requirement 8.5: Add pull-to-refresh functionality
     */
    const refresh = async () => {
        if (!user?.uid) return;

        setLoading(true);
        try {
            const freshGoals = await fetchUserGoalsOnce(user.uid);
            const enhancedGoals = await enhanceGoalsWithStreaks(freshGoals);
            setGoals(enhancedGoals);
        } catch (error) {
            console.error("Error refreshing goals:", error);
            setError(
                error instanceof Error ? error : new Error("Failed to refresh goals"),
            );
        } finally {
            setLoading(false);
        }
    };

    return {
        goals,
        loading,
        error,
        createGoal,
        updateGoal,
        deleteGoal,
        completeGoal,
        undoGoalCompletion,
        refresh,
    };
}
