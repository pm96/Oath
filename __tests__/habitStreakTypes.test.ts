import { Timestamp } from "firebase/firestore";
import {
    generateAnalyticsId,
    generateCompletionId,
    generateStreakId,
    validateAnalyticsDocument,
    validateCompletionDocument,
    validateStreakDocument,
} from "../services/firebase/habitStreakSchemas";
import {
    DIFFICULTY_MULTIPLIERS,
    HabitCompletion,
    isValidDifficulty,
    isValidHabitCompletion,
    MILESTONE_DAYS
} from "../types/habit-streaks";
import {
    areConsecutiveDays,
    formatDateToString,
    getCurrentDateString,
    getDaysDifference,
    getUserTimezone,
    isValidDateString,
    parseDateString,
} from "../utils/dateUtils";

describe("Habit Streak Types and Validation", () => {
    describe("Type Validation", () => {
        test("should validate difficulty levels correctly", () => {
            expect(isValidDifficulty("easy")).toBe(true);
            expect(isValidDifficulty("medium")).toBe(true);
            expect(isValidDifficulty("hard")).toBe(true);
            expect(isValidDifficulty("invalid")).toBe(false);
            expect(isValidDifficulty(null)).toBe(false);
        });

        test("should validate habit completion objects", () => {
            const validCompletion: HabitCompletion = {
                id: "test-id",
                habitId: "habit-1",
                userId: "user-1",
                completedAt: Timestamp.now(),
                timezone: "America/New_York",
                difficulty: "medium",
                notes: "Test completion",
            };

            expect(isValidHabitCompletion(validCompletion)).toBe(true);
            expect(
                isValidHabitCompletion({ ...validCompletion, difficulty: "invalid" }),
            ).toBe(false);
            expect(isValidHabitCompletion({ ...validCompletion, habitId: "" })).toBe(
                false,
            );
        });

        test("should validate milestone constants", () => {
            expect(MILESTONE_DAYS).toEqual([7, 30, 60, 100, 365]);
            expect(DIFFICULTY_MULTIPLIERS.easy).toBe(1);
            expect(DIFFICULTY_MULTIPLIERS.medium).toBe(1.5);
            expect(DIFFICULTY_MULTIPLIERS.hard).toBe(2);
        });
    });

    describe("Date Utilities", () => {
        test("should format dates correctly", () => {
            const date = new Date("2024-01-15T10:30:00Z");
            const dateString = formatDateToString(date, "UTC");
            expect(dateString).toBe("2024-01-15");
        });

        test("should parse date strings correctly", () => {
            const dateString = "2024-01-15";
            const date = parseDateString(dateString);
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(0); // January is 0
            expect(date.getDate()).toBe(15);
        });

        test("should detect consecutive days", () => {
            expect(areConsecutiveDays("2024-01-15", "2024-01-16")).toBe(true);
            expect(areConsecutiveDays("2024-01-15", "2024-01-17")).toBe(false);
            expect(areConsecutiveDays("2024-01-31", "2024-02-01")).toBe(true);
        });

        test("should calculate days difference", () => {
            expect(getDaysDifference("2024-01-15", "2024-01-20")).toBe(5);
            expect(getDaysDifference("2024-01-15", "2024-01-15")).toBe(0);
            expect(getDaysDifference("2024-01-20", "2024-01-15")).toBe(-5);
        });

        test("should validate date strings", () => {
            expect(isValidDateString("2024-01-15")).toBe(true);
            expect(isValidDateString("2024-13-01")).toBe(false);
            expect(isValidDateString("invalid-date")).toBe(false);
            expect(isValidDateString("24-01-15")).toBe(false);
        });

        test("should get current date string", () => {
            const dateString = getCurrentDateString("UTC");
            expect(isValidDateString(dateString)).toBe(true);
        });

        test("should get user timezone", () => {
            const timezone = getUserTimezone();
            expect(typeof timezone).toBe("string");
            expect(timezone.length).toBeGreaterThan(0);
        });
    });

    describe("Firestore Schema Validation", () => {
        test("should generate correct document IDs", () => {
            const userId = "user-123";
            const habitId = "habit-456";
            const timestamp = Timestamp.now();

            const completionId = generateCompletionId(userId, habitId, timestamp);
            expect(completionId).toBe(`${userId}_${habitId}_${timestamp.seconds}`);

            const streakId = generateStreakId(userId, habitId);
            expect(streakId).toBe(`${userId}_${habitId}`);

            const analyticsId = generateAnalyticsId(userId, habitId);
            expect(analyticsId).toBe(`${userId}_${habitId}`);
        });

        test("should validate Firestore completion documents", () => {
            const validDoc = {
                habitId: "habit-1",
                userId: "user-1",
                completedAt: Timestamp.now(),
                timezone: "America/New_York",
                difficulty: "medium",
                createdAt: Timestamp.now(),
            };

            expect(validateCompletionDocument(validDoc)).toBe(true);
            expect(validateCompletionDocument({ ...validDoc, habitId: "" })).toBe(
                false,
            );
            expect(
                validateCompletionDocument({ ...validDoc, difficulty: "invalid" }),
            ).toBe(false);
        });

        test("should validate Firestore streak documents", () => {
            const validDoc = {
                habitId: "habit-1",
                userId: "user-1",
                currentStreak: 5,
                bestStreak: 10,
                lastCompletionDate: "2024-01-15",
                streakStartDate: "2024-01-11",
                freezesAvailable: 2,
                freezesUsed: 0,
                milestones: [],
                updatedAt: Timestamp.now(),
            };

            expect(validateStreakDocument(validDoc)).toBe(true);
            expect(validateStreakDocument({ ...validDoc, currentStreak: -1 })).toBe(
                false,
            );
            expect(
                validateStreakDocument({
                    ...validDoc,
                    lastCompletionDate: "invalid-date",
                }),
            ).toBe(false);
        });

        test("should validate Firestore analytics documents", () => {
            const validDoc = {
                habitId: "habit-1",
                userId: "user-1",
                totalCompletions: 50,
                completionRate30Days: 85.5,
                averageStreakLength: 7.2,
                bestDayOfWeek: "Monday",
                consistencyScore: 78.5,
                lastUpdated: Timestamp.now(),
            };

            expect(validateAnalyticsDocument(validDoc)).toBe(true);
            expect(
                validateAnalyticsDocument({ ...validDoc, completionRate30Days: 150 }),
            ).toBe(false);
            expect(
                validateAnalyticsDocument({ ...validDoc, totalCompletions: -1 }),
            ).toBe(false);
        });
    });
});
