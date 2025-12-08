import { useEffect, useState } from "react";
import { Goal } from "../services/firebase/collections";
import {
    completeGoal as completeGoalService,
    createGoal as createGoalService,
    getUserGoals,
    GoalInput,
    updateGoal as updateGoalService,
} from "../services/firebase/goalService";
import { useAuth } from "./useAuth";

/**
 * Custom hook for managing goals with real-time Firestore listeners
 */
export function useGoals() {
    const { user } = useAuth();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

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
            (updatedGoals) => {
                setGoals(updatedGoals);
                setLoading(false);
                setError(null);
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
     * Refresh goals data
     * Requirement 8.5: Add pull-to-refresh functionality
     */
    const refresh = () => {
        // The real-time listener will automatically update when data changes
        // This is a no-op since Firestore handles real-time updates
        // But we can force a re-render by toggling loading state briefly
        setLoading(true);
        setTimeout(() => setLoading(false), 100);
    };

    return {
        goals,
        loading,
        error,
        createGoal,
        updateGoal,
        completeGoal,
        refresh,
    };
}
