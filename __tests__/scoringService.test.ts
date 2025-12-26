import { Goal } from "@/services/firebase/collections";
import {
    calculateHabitScore,
    calculateMultipleHabitScores,
    calculateOverallUserScore,
    getDifficultyEncouragement,
    getRecognitionLevel,
    normalizeHabitScores,
} from "@/services/firebase/scoringService";
import { HabitStreak } from "@/types/habit-streaks";

describe("Scoring Service", () => {
    const mockStreak: HabitStreak = {
        habitId: "habit1",
        userId: "user1",
        currentStreak: 10,
        bestStreak: 15,
        lastCompletionDate: "2024-01-15",
        streakStartDate: "2024-01-05",
        freezesAvailable: 2,
        freezesUsed: 0,
        milestones: [],
    };

    const mockGoal: Goal = {
        id: "habit1",
        ownerId: "user1",
        description: "Test habit",
        frequency: "daily",
        targetDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        latestCompletionDate: new Date(),
        currentStatus: "Green",
        nextDeadline: new Date(),
        isShared: true,
        type: "flexible",
        targetTime: null,
        createdAt: new Date(),
        redSince: null,
        difficulty: "medium",
    };

    describe("calculateHabitScore", () => {
        it("should calculate correct scores for different difficulties", () => {
            const easyGoal = { ...mockGoal, difficulty: "easy" as const };
            const mediumGoal = { ...mockGoal, difficulty: "medium" as const };
            const hardGoal = { ...mockGoal, difficulty: "hard" as const };

            const easyScore = calculateHabitScore(mockStreak, easyGoal, 20);
            const mediumScore = calculateHabitScore(mockStreak, mediumGoal, 20);
            const hardScore = calculateHabitScore(mockStreak, hardGoal, 20);

            // Base calculation: (10 * 10) + (20 * 2) + (15 * 5) = 100 + 40 + 75 = 215
            expect(easyScore.rawScore).toBe(215);
            expect(mediumScore.rawScore).toBe(215);
            expect(hardScore.rawScore).toBe(215);

            // Adjusted scores with multipliers
            expect(easyScore.adjustedScore).toBe(215); // 215 * 1
            expect(mediumScore.adjustedScore).toBe(323); // 215 * 1.5, rounded
            expect(hardScore.adjustedScore).toBe(430); // 215 * 2

            expect(easyScore.multiplier).toBe(1);
            expect(mediumScore.multiplier).toBe(1.5);
            expect(hardScore.multiplier).toBe(2);
        });

        it("should include all required fields in score", () => {
            const score = calculateHabitScore(mockStreak, mockGoal, 20);

            expect(score).toHaveProperty("habitId", "habit1");
            expect(score).toHaveProperty("rawScore");
            expect(score).toHaveProperty("adjustedScore");
            expect(score).toHaveProperty("difficulty", "medium");
            expect(score).toHaveProperty("multiplier", 1.5);
            expect(score).toHaveProperty("streakLength", 10);
            expect(score).toHaveProperty("totalCompletions", 20);
        });
    });

    describe("calculateMultipleHabitScores", () => {
        it("should calculate scores for multiple habits", () => {
            const streaks = [
                mockStreak,
                { ...mockStreak, habitId: "habit2", currentStreak: 5, bestStreak: 8 },
            ];

            const goals = [
                mockGoal,
                { ...mockGoal, id: "habit2", difficulty: "hard" as const },
            ];

            const completionCounts = { habit1: 20, habit2: 10 };

            const scores = calculateMultipleHabitScores(
                streaks,
                goals,
                completionCounts,
            );

            expect(scores).toHaveLength(2);
            expect(scores[0].habitId).toBe("habit1");
            expect(scores[1].habitId).toBe("habit2");
            expect(scores[0].difficulty).toBe("medium");
            expect(scores[1].difficulty).toBe("hard");
        });

        it("should handle missing goals gracefully", () => {
            const streaks = [mockStreak];
            const goals: Goal[] = []; // No matching goals

            const scores = calculateMultipleHabitScores(streaks, goals);

            expect(scores).toHaveLength(0);
        });
    });

    describe("normalizeHabitScores", () => {
        it("should normalize scores within difficulty groups", () => {
            const scores = [
                {
                    habitId: "habit1",
                    rawScore: 100,
                    adjustedScore: 100,
                    difficulty: "easy" as const,
                    multiplier: 1,
                    streakLength: 10,
                    totalCompletions: 20,
                },
                {
                    habitId: "habit2",
                    rawScore: 200,
                    adjustedScore: 200,
                    difficulty: "easy" as const,
                    multiplier: 1,
                    streakLength: 20,
                    totalCompletions: 40,
                },
                {
                    habitId: "habit3",
                    rawScore: 150,
                    adjustedScore: 300,
                    difficulty: "hard" as const,
                    multiplier: 2,
                    streakLength: 15,
                    totalCompletions: 30,
                },
            ];

            const normalized = normalizeHabitScores(scores);

            expect(normalized).toHaveLength(3);

            // Check that each habit has normalized data
            normalized.forEach((norm) => {
                expect(norm).toHaveProperty("habitId");
                expect(norm).toHaveProperty("normalizedScore");
                expect(norm).toHaveProperty("percentile");
                expect(norm).toHaveProperty("rank");
                expect(norm).toHaveProperty("totalHabits");
            });
        });

        it("should handle empty scores array", () => {
            const normalized = normalizeHabitScores([]);
            expect(normalized).toHaveLength(0);
        });
    });

    describe("calculateOverallUserScore", () => {
        it("should calculate overall user statistics", () => {
            const scores = [
                {
                    habitId: "habit1",
                    rawScore: 100,
                    adjustedScore: 100,
                    difficulty: "easy" as const,
                    multiplier: 1,
                    streakLength: 10,
                    totalCompletions: 20,
                },
                {
                    habitId: "habit2",
                    rawScore: 200,
                    adjustedScore: 400,
                    difficulty: "hard" as const,
                    multiplier: 2,
                    streakLength: 20,
                    totalCompletions: 40,
                },
            ];

            const overall = calculateOverallUserScore(scores);

            expect(overall.totalRawScore).toBe(300);
            expect(overall.totalAdjustedScore).toBe(500);
            expect(overall.averageMultiplier).toBe(1.5);
            expect(overall.hardHabitCount).toBe(1);
            expect(overall.totalHabits).toBe(2);
            expect(overall.overallLevel).toHaveProperty("level");
            expect(overall.overallLevel).toHaveProperty("title");
        });

        it("should handle empty scores array", () => {
            const overall = calculateOverallUserScore([]);

            expect(overall.totalRawScore).toBe(0);
            expect(overall.totalAdjustedScore).toBe(0);
            expect(overall.averageMultiplier).toBe(1);
            expect(overall.hardHabitCount).toBe(0);
            expect(overall.totalHabits).toBe(0);
            expect(overall.overallLevel.level).toBe("bronze");
        });
    });

    describe("getRecognitionLevel", () => {
        it("should return appropriate recognition levels", () => {
            const score = {
                habitId: "habit1",
                rawScore: 1000,
                adjustedScore: 1000,
                difficulty: "medium" as const,
                multiplier: 1.5,
                streakLength: 50,
                totalCompletions: 100,
            };

            const normalizedScore = {
                habitId: "habit1",
                normalizedScore: 1000,
                percentile: 90,
                rank: 1,
                totalHabits: 10,
            };

            const recognition = getRecognitionLevel(score, normalizedScore);

            expect(recognition).toHaveProperty("level");
            expect(recognition).toHaveProperty("title");
            expect(recognition).toHaveProperty("description");
            expect(recognition).toHaveProperty("threshold");
            expect(recognition).toHaveProperty("isHardHabitBonus");
        });

        it("should give bonus recognition for hard habits", () => {
            const easyScore = {
                habitId: "habit1",
                rawScore: 500,
                adjustedScore: 500,
                difficulty: "easy" as const,
                multiplier: 1,
                streakLength: 25,
                totalCompletions: 50,
            };

            const hardScore = {
                habitId: "habit2",
                rawScore: 500,
                adjustedScore: 1000,
                difficulty: "hard" as const,
                multiplier: 2,
                streakLength: 25,
                totalCompletions: 50,
            };

            const normalizedScore = {
                habitId: "habit1",
                normalizedScore: 500,
                percentile: 75,
                rank: 1,
                totalHabits: 5,
            };

            const easyRecognition = getRecognitionLevel(easyScore, normalizedScore);
            const hardRecognition = getRecognitionLevel(hardScore, {
                ...normalizedScore,
                habitId: "habit2",
                normalizedScore: 1000,
            });

            expect(easyRecognition.isHardHabitBonus).toBe(false);
            expect(hardRecognition.isHardHabitBonus).toBe(true);
            expect(hardRecognition.title).toContain("Warrior");
        });
    });

    describe("getDifficultyEncouragement", () => {
        it("should return appropriate messages for each difficulty", () => {
            const easyMessages = getDifficultyEncouragement("easy");
            const mediumMessages = getDifficultyEncouragement("medium");
            const hardMessages = getDifficultyEncouragement("hard");

            expect(easyMessages).toHaveProperty("completionMessage");
            expect(easyMessages).toHaveProperty("streakMessage");
            expect(easyMessages).toHaveProperty("milestoneMessage");

            expect(mediumMessages).toHaveProperty("completionMessage");
            expect(mediumMessages).toHaveProperty("streakMessage");
            expect(mediumMessages).toHaveProperty("milestoneMessage");

            expect(hardMessages).toHaveProperty("completionMessage");
            expect(hardMessages).toHaveProperty("streakMessage");
            expect(hardMessages).toHaveProperty("milestoneMessage");

            // Hard habits should have more encouraging messages
            expect(hardMessages.completionMessage).toContain("Incredible");
            expect(hardMessages.streakMessage).toContain("determination");
            expect(hardMessages.milestoneMessage).toContain("Amazing");
        });
    });
});
