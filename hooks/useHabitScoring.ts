import { Goal } from "@/services/firebase/collections";
import {
    calculateHabitScore,
    calculateMultipleHabitScores,
    calculateOverallUserScore,
    calculateScoreProgression,
    getDifficultyEncouragement,
    getRecognitionLevel,
    HabitScore,
    NormalizedScore,
    normalizeHabitScores,
    RecognitionLevel,
} from "@/services/firebase/scoringService";
import { HabitStreak } from "@/types/habit-streaks";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Hook for managing habit scoring and recognition
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export function useHabitScoring(
    streaks: HabitStreak[],
    goals: Goal[],
    completionCounts: Record<string, number> = {},
) {
    const [previousScores, setPreviousScores] = useState<HabitScore[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Calculate current scores
    const currentScores = useMemo(() => {
        return calculateMultipleHabitScores(streaks, goals, completionCounts);
    }, [streaks, goals, completionCounts]);

    // Calculate normalized scores for comparison
    const normalizedScores = useMemo(() => {
        return normalizeHabitScores(currentScores);
    }, [currentScores]);

    // Calculate overall user score
    const overallScore = useMemo(() => {
        return calculateOverallUserScore(currentScores);
    }, [currentScores]);

    // Get recognition levels for each habit
    const recognitionLevels = useMemo(() => {
        const normalizedMap = new Map(
            normalizedScores.map((ns) => [ns.habitId, ns]),
        );

        return currentScores.map((score) => {
            const normalized = normalizedMap.get(score.habitId);
            return {
                habitId: score.habitId,
                recognition: normalized ? getRecognitionLevel(score, normalized) : null,
            };
        });
    }, [currentScores, normalizedScores]);

    // Calculate score progressions
    const scoreProgressions = useMemo(() => {
        const previousMap = new Map(previousScores.map((ps) => [ps.habitId, ps]));

        return currentScores.map((score) => {
            const previous = previousMap.get(score.habitId);
            return {
                habitId: score.habitId,
                progression: calculateScoreProgression(score, previous),
            };
        });
    }, [currentScores, previousScores]);

    // Get top performing habits
    const topHabits = useMemo(() => {
        return [...currentScores]
            .sort((a, b) => b.adjustedScore - a.adjustedScore)
            .slice(0, 5);
    }, [currentScores]);

    // Get hard habit achievements
    const hardHabitAchievements = useMemo(() => {
        return currentScores.filter((score) => score.difficulty === "hard");
    }, [currentScores]);

    // Get habit score by ID
    const getHabitScore = useCallback(
        (habitId: string): HabitScore | null => {
            return currentScores.find((score) => score.habitId === habitId) || null;
        },
        [currentScores],
    );

    // Get normalized score by ID
    const getNormalizedScore = useCallback(
        (habitId: string): NormalizedScore | null => {
            return normalizedScores.find((ns) => ns.habitId === habitId) || null;
        },
        [normalizedScores],
    );

    // Get recognition level by ID
    const getRecognitionLevelForHabit = useCallback(
        (habitId: string): RecognitionLevel | null => {
            const recognition = recognitionLevels.find(
                (rl) => rl.habitId === habitId,
            );
            return recognition?.recognition || null;
        },
        [recognitionLevels],
    );

    // Get encouragement message for a habit
    const getEncouragementMessage = useCallback(
        (
            habitId: string,
            type: "completion" | "streak" | "milestone" = "completion",
        ): string => {
            const score = getHabitScore(habitId);
            if (!score) return "Great job!";

            const messages = getDifficultyEncouragement(score.difficulty);

            switch (type) {
                case "completion":
                    return messages.completionMessage;
                case "streak":
                    return messages.streakMessage;
                case "milestone":
                    return messages.milestoneMessage;
                default:
                    return messages.completionMessage;
            }
        },
        [getHabitScore],
    );

    // Update previous scores for progression tracking
    const updatePreviousScores = useCallback(() => {
        setPreviousScores([...currentScores]);
    }, [currentScores]);

    // Get score statistics
    const getScoreStatistics = useCallback(() => {
        if (currentScores.length === 0) {
            return {
                averageScore: 0,
                medianScore: 0,
                highestScore: 0,
                lowestScore: 0,
                totalScore: 0,
                scoreRange: 0,
            };
        }

        const adjustedScores = currentScores
            .map((s) => s.adjustedScore)
            .sort((a, b) => a - b);
        const totalScore = adjustedScores.reduce((sum, score) => sum + score, 0);
        const averageScore = totalScore / adjustedScores.length;

        const medianIndex = Math.floor(adjustedScores.length / 2);
        const medianScore =
            adjustedScores.length % 2 === 0
                ? (adjustedScores[medianIndex - 1] + adjustedScores[medianIndex]) / 2
                : adjustedScores[medianIndex];

        return {
            averageScore: Math.round(averageScore),
            medianScore: Math.round(medianScore),
            highestScore: adjustedScores[adjustedScores.length - 1],
            lowestScore: adjustedScores[0],
            totalScore,
            scoreRange: adjustedScores[adjustedScores.length - 1] - adjustedScores[0],
        };
    }, [currentScores]);

    // Get difficulty distribution
    const getDifficultyDistribution = useCallback(() => {
        const distribution = {
            easy: 0,
            medium: 0,
            hard: 0,
        };

        currentScores.forEach((score) => {
            distribution[score.difficulty]++;
        });

        const total = currentScores.length;

        return {
            counts: distribution,
            percentages: {
                easy: total > 0 ? Math.round((distribution.easy / total) * 100) : 0,
                medium: total > 0 ? Math.round((distribution.medium / total) * 100) : 0,
                hard: total > 0 ? Math.round((distribution.hard / total) * 100) : 0,
            },
        };
    }, [currentScores]);

    // Check for score milestones
    const checkScoreMilestones = useCallback(
        (habitId: string) => {
            const current = getHabitScore(habitId);
            const previous = previousScores.find((ps) => ps.habitId === habitId);

            if (!current || !previous) return [];

            const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
            const achievedMilestones: number[] = [];

            milestones.forEach((milestone) => {
                if (
                    current.adjustedScore >= milestone &&
                    previous.adjustedScore < milestone
                ) {
                    achievedMilestones.push(milestone);
                }
            });

            return achievedMilestones;
        },
        [getHabitScore, previousScores],
    );

    // Effect to track score changes
    useEffect(() => {
        if (currentScores.length > 0 && previousScores.length === 0) {
            // Initialize previous scores on first load
            setPreviousScores([...currentScores]);
        }
    }, [currentScores, previousScores.length]);

    return {
        // Current data
        currentScores,
        normalizedScores,
        overallScore,
        recognitionLevels,
        scoreProgressions,
        topHabits,
        hardHabitAchievements,

        // Getters
        getHabitScore,
        getNormalizedScore,
        getRecognitionLevelForHabit,
        getEncouragementMessage,
        getScoreStatistics,
        getDifficultyDistribution,

        // Actions
        updatePreviousScores,
        checkScoreMilestones,

        // State
        isLoading,
        setIsLoading,
    };
}

/**
 * Hook for individual habit scoring
 */
export function useIndividualHabitScore(
    habitId: string,
    streak: HabitStreak | null,
    goal: Goal | null,
    totalCompletions: number = 0,
) {
    const score = useMemo(() => {
        if (!streak || !goal) return null;
        return calculateHabitScore(streak, goal, totalCompletions);
    }, [streak, goal, totalCompletions]);

    const encouragementMessages = useMemo(() => {
        if (!score) return null;
        return getDifficultyEncouragement(score.difficulty);
    }, [score]);

    return {
        score,
        encouragementMessages,
        isHardHabit: score?.difficulty === "hard",
        multiplier: score?.multiplier || 1,
        rawScore: score?.rawScore || 0,
        adjustedScore: score?.adjustedScore || 0,
    };
}
