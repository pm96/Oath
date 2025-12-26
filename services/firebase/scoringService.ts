import { DIFFICULTY_MULTIPLIERS, HabitStreak } from "../../types/habit-streaks";
import { Goal } from "./collections";

/**
 * Scoring Service for Habit Difficulty and Achievement Calculations
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

export interface HabitScore {
    habitId: string;
    rawScore: number;
    adjustedScore: number;
    difficulty: "easy" | "medium" | "hard";
    multiplier: number;
    streakLength: number;
    totalCompletions: number;
}

export interface NormalizedScore {
    habitId: string;
    normalizedScore: number;
    percentile: number;
    rank: number;
    totalHabits: number;
}

export interface RecognitionLevel {
    level: "bronze" | "silver" | "gold" | "platinum" | "diamond";
    title: string;
    description: string;
    threshold: number;
    isHardHabitBonus: boolean;
}

/**
 * Calculate difficulty-weighted score for a habit
 * Requirements: 9.2 - Weight streaks by difficulty multiplier (1x, 1.5x, 2x)
 */
export function calculateHabitScore(
    streak: HabitStreak,
    goal: Goal,
    totalCompletions: number = 0,
): HabitScore {
    const difficulty = goal.difficulty;
    const multiplier = DIFFICULTY_MULTIPLIERS[difficulty];

    // Base score calculation: streak length + completion bonus
    const streakScore = streak.currentStreak * 10; // 10 points per day
    const completionBonus = totalCompletions * 2; // 2 points per completion
    const bestStreakBonus = streak.bestStreak * 5; // 5 points for best streak achievement

    const rawScore = streakScore + completionBonus + bestStreakBonus;
    const adjustedScore = Math.round(rawScore * multiplier);

    return {
        habitId: streak.habitId,
        rawScore,
        adjustedScore,
        difficulty,
        multiplier,
        streakLength: streak.currentStreak,
        totalCompletions,
    };
}

/**
 * Calculate scores for multiple habits
 * Requirements: 9.3 - Show both raw and adjusted scores
 */
export function calculateMultipleHabitScores(
    streaks: HabitStreak[],
    goals: Goal[],
    completionCounts: Record<string, number> = {},
): HabitScore[] {
    const goalMap = new Map(goals.map((goal) => [goal.id, goal]));

    return streaks
        .map((streak) => {
            const goal = goalMap.get(streak.habitId);
            if (!goal) return null;

            const completions = completionCounts[streak.habitId] || 0;
            return calculateHabitScore(streak, goal, completions);
        })
        .filter((score): score is HabitScore => score !== null);
}

/**
 * Normalize scores for habit comparison
 * Requirements: 9.4 - Normalize scores to account for different difficulty levels
 */
export function normalizeHabitScores(scores: HabitScore[]): NormalizedScore[] {
    if (scores.length === 0) return [];

    // Group scores by difficulty for fair comparison
    const scoresByDifficulty = {
        easy: scores.filter((s) => s.difficulty === "easy"),
        medium: scores.filter((s) => s.difficulty === "medium"),
        hard: scores.filter((s) => s.difficulty === "hard"),
    };

    const normalizedScores: NormalizedScore[] = [];

    // Normalize within each difficulty group
    Object.entries(scoresByDifficulty).forEach(
        ([difficulty, difficultyScores]) => {
            if (difficultyScores.length === 0) return;

            // Sort by raw score for fair comparison within difficulty
            const sortedScores = [...difficultyScores].sort(
                (a, b) => b.rawScore - a.rawScore,
            );

            sortedScores.forEach((score, index) => {
                const percentile =
                    difficultyScores.length === 1
                        ? 100
                        : Math.round(
                            ((difficultyScores.length - index - 1) /
                                (difficultyScores.length - 1)) *
                            100,
                        );

                normalizedScores.push({
                    habitId: score.habitId,
                    normalizedScore: score.adjustedScore,
                    percentile,
                    rank: index + 1,
                    totalHabits: difficultyScores.length,
                });
            });
        },
    );

    return normalizedScores;
}

/**
 * Get recognition level based on habit performance
 * Requirements: 9.5 - Additional recognition for hard habits
 */
export function getRecognitionLevel(
    score: HabitScore,
    normalizedScore: NormalizedScore,
): RecognitionLevel {
    const isHardHabit = score.difficulty === "hard";
    const adjustedThreshold = isHardHabit ? 0.8 : 1.0; // Lower thresholds for hard habits

    // Base thresholds (adjusted for hard habits)
    const thresholds = {
        diamond: 1000 * adjustedThreshold,
        platinum: 500 * adjustedThreshold,
        gold: 250 * adjustedThreshold,
        silver: 100 * adjustedThreshold,
        bronze: 50 * adjustedThreshold,
    };

    // Also consider percentile for recognition
    const percentileBonus =
        normalizedScore.percentile >= 90
            ? 1.2
            : normalizedScore.percentile >= 75
                ? 1.1
                : 1.0;

    const effectiveScore = score.adjustedScore * percentileBonus;

    if (effectiveScore >= thresholds.diamond) {
        return {
            level: "diamond",
            title: isHardHabit ? "Diamond Warrior" : "Diamond Achiever",
            description: isHardHabit
                ? "Mastered the most challenging habits with exceptional consistency"
                : "Achieved exceptional consistency and dedication",
            threshold: thresholds.diamond,
            isHardHabitBonus: isHardHabit,
        };
    } else if (effectiveScore >= thresholds.platinum) {
        return {
            level: "platinum",
            title: isHardHabit ? "Platinum Champion" : "Platinum Performer",
            description: isHardHabit
                ? "Conquered difficult habits with remarkable persistence"
                : "Demonstrated remarkable consistency and growth",
            threshold: thresholds.platinum,
            isHardHabitBonus: isHardHabit,
        };
    } else if (effectiveScore >= thresholds.gold) {
        return {
            level: "gold",
            title: isHardHabit ? "Gold Conqueror" : "Gold Standard",
            description: isHardHabit
                ? "Overcame challenging habits with strong determination"
                : "Maintained excellent habit consistency",
            threshold: thresholds.gold,
            isHardHabitBonus: isHardHabit,
        };
    } else if (effectiveScore >= thresholds.silver) {
        return {
            level: "silver",
            title: isHardHabit ? "Silver Challenger" : "Silver Streak",
            description: isHardHabit
                ? "Tackled difficult habits with growing confidence"
                : "Built solid habit foundations",
            threshold: thresholds.silver,
            isHardHabitBonus: isHardHabit,
        };
    } else {
        return {
            level: "bronze",
            title: isHardHabit ? "Bronze Brave" : "Bronze Builder",
            description: isHardHabit
                ? "Courageously started challenging habits"
                : "Beginning the journey of habit formation",
            threshold: thresholds.bronze,
            isHardHabitBonus: isHardHabit,
        };
    }
}

/**
 * Calculate overall user score across all habits
 * Requirements: 9.2, 9.4 - Aggregate difficulty-weighted scores
 */
export function calculateOverallUserScore(scores: HabitScore[]): {
    totalRawScore: number;
    totalAdjustedScore: number;
    averageMultiplier: number;
    hardHabitCount: number;
    totalHabits: number;
    overallLevel: RecognitionLevel;
} {
    if (scores.length === 0) {
        return {
            totalRawScore: 0,
            totalAdjustedScore: 0,
            averageMultiplier: 1,
            hardHabitCount: 0,
            totalHabits: 0,
            overallLevel: {
                level: "bronze",
                title: "Getting Started",
                description: "Ready to begin your habit journey",
                threshold: 0,
                isHardHabitBonus: false,
            },
        };
    }

    const totalRawScore = scores.reduce((sum, score) => sum + score.rawScore, 0);
    const totalAdjustedScore = scores.reduce(
        (sum, score) => sum + score.adjustedScore,
        0,
    );
    const totalMultiplier = scores.reduce(
        (sum, score) => sum + score.multiplier,
        0,
    );
    const averageMultiplier = totalMultiplier / scores.length;
    const hardHabitCount = scores.filter(
        (score) => score.difficulty === "hard",
    ).length;

    // Calculate overall level based on total adjusted score and hard habit bonus
    const hardHabitBonus = hardHabitCount > 0 ? 1 + hardHabitCount * 0.1 : 1;
    const effectiveScore = totalAdjustedScore * hardHabitBonus;

    let overallLevel: RecognitionLevel;
    if (effectiveScore >= 2000) {
        overallLevel = {
            level: "diamond",
            title: "Habit Master",
            description: "Achieved mastery across multiple challenging habits",
            threshold: 2000,
            isHardHabitBonus: hardHabitCount > 0,
        };
    } else if (effectiveScore >= 1000) {
        overallLevel = {
            level: "platinum",
            title: "Habit Expert",
            description: "Demonstrated expertise in habit formation and maintenance",
            threshold: 1000,
            isHardHabitBonus: hardHabitCount > 0,
        };
    } else if (effectiveScore >= 500) {
        overallLevel = {
            level: "gold",
            title: "Habit Enthusiast",
            description: "Built strong foundations across multiple habits",
            threshold: 500,
            isHardHabitBonus: hardHabitCount > 0,
        };
    } else if (effectiveScore >= 200) {
        overallLevel = {
            level: "silver",
            title: "Habit Builder",
            description: "Making steady progress in habit development",
            threshold: 200,
            isHardHabitBonus: hardHabitCount > 0,
        };
    } else {
        overallLevel = {
            level: "bronze",
            title: "Habit Starter",
            description: "Beginning the journey of positive change",
            threshold: 50,
            isHardHabitBonus: hardHabitCount > 0,
        };
    }

    return {
        totalRawScore,
        totalAdjustedScore,
        averageMultiplier,
        hardHabitCount,
        totalHabits: scores.length,
        overallLevel,
    };
}

/**
 * Get difficulty-specific encouragement messages
 * Requirements: 9.5 - Additional recognition for hard habits
 */
export function getDifficultyEncouragement(
    difficulty: "easy" | "medium" | "hard",
): {
    completionMessage: string;
    streakMessage: string;
    milestoneMessage: string;
} {
    switch (difficulty) {
        case "hard":
            return {
                completionMessage:
                    "Incredible! You conquered a challenging habit today! 💪",
                streakMessage:
                    "Your determination with this difficult habit is inspiring! 🔥",
                milestoneMessage:
                    "Amazing milestone! Hard habits like this build real character! 🏆",
            };
        case "medium":
            return {
                completionMessage: "Great job! You're building solid habits! 👏",
                streakMessage: "Your consistency is paying off! Keep it up! ⭐",
                milestoneMessage: "Fantastic milestone! Your dedication is showing! 🎯",
            };
        case "easy":
            return {
                completionMessage: "Nice work! Every step counts! ✨",
                streakMessage: "Building momentum with consistent action! 📈",
                milestoneMessage:
                    "Excellent milestone! Small steps lead to big changes! 🌟",
            };
    }
}

/**
 * Calculate score progression over time
 */
export function calculateScoreProgression(
    currentScore: HabitScore,
    previousScore?: HabitScore,
): {
    rawScoreChange: number;
    adjustedScoreChange: number;
    progressPercentage: number;
    trend: "improving" | "stable" | "declining";
} {
    if (!previousScore) {
        return {
            rawScoreChange: currentScore.rawScore,
            adjustedScoreChange: currentScore.adjustedScore,
            progressPercentage: 100,
            trend: "improving",
        };
    }

    const rawScoreChange = currentScore.rawScore - previousScore.rawScore;
    const adjustedScoreChange =
        currentScore.adjustedScore - previousScore.adjustedScore;

    const progressPercentage =
        previousScore.adjustedScore > 0
            ? Math.round((adjustedScoreChange / previousScore.adjustedScore) * 100)
            : 100;

    let trend: "improving" | "stable" | "declining";
    if (adjustedScoreChange > 0) {
        trend = "improving";
    } else if (adjustedScoreChange === 0) {
        trend = "stable";
    } else {
        trend = "declining";
    }

    return {
        rawScoreChange,
        adjustedScoreChange,
        progressPercentage,
        trend,
    };
}
