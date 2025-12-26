import { Timestamp } from "firebase/firestore";
import { StreakService } from "../services/firebase/streakService";
import { HabitCompletion, HabitStreak } from "../types/habit-streaks";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    runTransaction: jest.fn(),
    serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
    Timestamp: {
        now: jest.fn(() => ({
            seconds: Date.now() / 1000,
            toMillis: () => Date.now(),
            toDate: () => new Date(),
        })),
        fromDate: jest.fn((date: Date) => ({
            seconds: date.getTime() / 1000,
            toMillis: () => date.getTime(),
            toDate: () => date,
        })),
    },
    where: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({
    db: {},
}));

jest.mock("../services/firebase/collections", () => ({
    getHabitCompletionsCollection: jest.fn(() => ({})),
    getHabitStreaksCollection: jest.fn(() => ({})),
}));

jest.mock("../utils/errorHandling", () => ({
    getUserFriendlyErrorMessage: jest.fn(
        (error) => error.message || "Unknown error",
    ),
    retryWithBackoff: jest.fn((fn) => fn()),
}));

describe("StreakService", () => {
    let streakService: StreakService;

    beforeEach(() => {
        streakService = new StreakService();
        jest.clearAllMocks();
    });

    describe("calculateStreakFromCompletions", () => {
        it("should return empty streak for no completions", () => {
            const result = (streakService as any).calculateStreakFromCompletions(
                [],
                "habit1",
                "user1",
            );

            expect(result).toEqual({
                habitId: "habit1",
                userId: "user1",
                currentStreak: 0,
                bestStreak: 0,
                lastCompletionDate: "",
                streakStartDate: expect.any(String),
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            });
        });

        it("should calculate streak correctly for consecutive completions", () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const dayBefore = new Date(today);
            dayBefore.setDate(dayBefore.getDate() - 2);

            const completions: HabitCompletion[] = [
                {
                    id: "1",
                    habitId: "habit1",
                    userId: "user1",
                    completedAt: Timestamp.fromDate(dayBefore),
                    timezone: "UTC",
                    difficulty: "easy",
                },
                {
                    id: "2",
                    habitId: "habit1",
                    userId: "user1",
                    completedAt: Timestamp.fromDate(yesterday),
                    timezone: "UTC",
                    difficulty: "easy",
                },
                {
                    id: "3",
                    habitId: "habit1",
                    userId: "user1",
                    completedAt: Timestamp.fromDate(today),
                    timezone: "UTC",
                    difficulty: "easy",
                },
            ];

            const result = (streakService as any).calculateStreakFromCompletions(
                completions,
                "habit1",
                "user1",
            );

            expect(result.currentStreak).toBe(3);
            expect(result.bestStreak).toBe(3);
        });
    });

    describe("mergeStreakData", () => {
        it("should return calculated data when no existing data", () => {
            const calculated: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 5,
                bestStreak: 5,
                lastCompletionDate: "2024-01-01",
                streakStartDate: "2023-12-28",
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            };

            const result = (streakService as any).mergeStreakData(calculated, null);

            expect(result).toEqual(calculated);
        });

        it("should preserve freezes and milestones from existing data", () => {
            const calculated: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 5,
                bestStreak: 5,
                lastCompletionDate: "2024-01-01",
                streakStartDate: "2023-12-28",
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            };

            const existing: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 3,
                bestStreak: 10,
                lastCompletionDate: "2023-12-30",
                streakStartDate: "2023-12-28",
                freezesAvailable: 2,
                freezesUsed: 1,
                milestones: [
                    {
                        days: 7,
                        achievedAt: Timestamp.now(),
                        celebrated: true,
                    },
                ],
            };

            const result = (streakService as any).mergeStreakData(
                calculated,
                existing,
            );

            expect(result.freezesAvailable).toBe(2);
            expect(result.freezesUsed).toBe(1);
            expect(result.milestones).toEqual(existing.milestones);
            expect(result.bestStreak).toBe(10); // Should keep the higher best streak
        });
    });

    describe("isDateInCurrentStreak", () => {
        it("should return false for null streak", () => {
            const result = (streakService as any).isDateInCurrentStreak(
                "2024-01-01",
                null,
            );
            expect(result).toBe(false);
        });

        it("should return false for zero streak", () => {
            const streak: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 0,
                bestStreak: 0,
                lastCompletionDate: "",
                streakStartDate: "2024-01-01",
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            };

            const result = (streakService as any).isDateInCurrentStreak(
                "2024-01-01",
                streak,
            );
            expect(result).toBe(false);
        });

        it("should return true for date within streak period", () => {
            const streak: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 3,
                bestStreak: 3,
                lastCompletionDate: "2024-01-03",
                streakStartDate: "2024-01-01",
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            };

            expect(
                (streakService as any).isDateInCurrentStreak("2024-01-01", streak),
            ).toBe(true);
            expect(
                (streakService as any).isDateInCurrentStreak("2024-01-02", streak),
            ).toBe(true);
            expect(
                (streakService as any).isDateInCurrentStreak("2024-01-03", streak),
            ).toBe(true);
            expect(
                (streakService as any).isDateInCurrentStreak("2024-01-04", streak),
            ).toBe(false);
        });
    });

    describe("Input validation", () => {
        it("should throw error for missing habitId in calculateStreak", async () => {
            await expect(streakService.calculateStreak("", "user1")).rejects.toThrow(
                "Habit ID and User ID are required",
            );
        });

        it("should throw error for missing userId in calculateStreak", async () => {
            await expect(streakService.calculateStreak("habit1", "")).rejects.toThrow(
                "Habit ID and User ID are required",
            );
        });

        it("should throw error for missing habitId in getHabitStreak", async () => {
            await expect(streakService.getHabitStreak("", "user1")).rejects.toThrow(
                "Habit ID and User ID are required",
            );
        });
    });
});
