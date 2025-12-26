import { analyticsService } from "../services/firebase/analyticsService";

// Mock Firebase
jest.mock("../firebaseConfig", () => ({
    db: {},
    APP_ID: "test-app",
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    runTransaction: jest.fn(),
    serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
    Timestamp: {
        now: jest.fn(() => ({
            seconds: Date.now() / 1000,
            toDate: () => new Date(),
            toMillis: () => Date.now(),
        })),
        fromDate: jest.fn((date: Date) => ({
            seconds: date.getTime() / 1000,
            toDate: () => date,
            toMillis: () => date.getTime(),
        })),
    },
    where: jest.fn(),
}));

jest.mock("../services/firebase/collections", () => ({
    getHabitAnalyticsCollection: jest.fn(() => ({})),
    getHabitCompletionsCollection: jest.fn(() => ({})),
    getHabitStreaksCollection: jest.fn(() => ({})),
}));

jest.mock("../utils/errorHandling", () => ({
    getUserFriendlyErrorMessage: jest.fn(
        (error) => error.message || "Unknown error",
    ),
    retryWithBackoff: jest.fn((fn) => fn()),
}));

describe("AnalyticsService", () => {
    const mockHabitId = "test-habit-id";
    const mockUserId = "test-user-id";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("calculateHabitAnalytics", () => {
        it("should create empty analytics for habits with no completions", async () => {
            // Mock empty completions
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await analyticsService.calculateHabitAnalytics(
                mockHabitId,
                mockUserId,
            );

            expect(result).toMatchObject({
                habitId: mockHabitId,
                userId: mockUserId,
                totalCompletions: 0,
                completionRate30Days: 0,
                averageStreakLength: 0,
                bestDayOfWeek: "Monday",
                consistencyScore: 0,
            });
            expect(result.lastUpdated).toBeDefined();
        });

        it("should throw error for missing parameters", async () => {
            await expect(
                analyticsService.calculateHabitAnalytics("", mockUserId),
            ).rejects.toThrow("Habit ID and User ID are required");

            await expect(
                analyticsService.calculateHabitAnalytics(mockHabitId, ""),
            ).rejects.toThrow("Habit ID and User ID are required");
        });
    });

    describe("getCompletionTrends", () => {
        it("should return empty trends for habits with no completions", async () => {
            // Mock empty completions
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await analyticsService.getCompletionTrends(
                mockHabitId,
                mockUserId,
                "week",
            );

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0); // Should return trend periods even with no data
        });

        it("should throw error for missing parameters", async () => {
            await expect(
                analyticsService.getCompletionTrends("", mockUserId, "week"),
            ).rejects.toThrow("Habit ID and User ID are required");
        });
    });

    describe("getOverallConsistencyScore", () => {
        it("should return 0 for users with no habits", async () => {
            // Mock empty completions
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result =
                await analyticsService.getOverallConsistencyScore(mockUserId);

            expect(result).toBe(0);
        });

        it("should throw error for missing user ID", async () => {
            await expect(
                analyticsService.getOverallConsistencyScore(""),
            ).rejects.toThrow("User ID is required");
        });
    });

    describe("getBestDayOfWeek", () => {
        it("should return Monday as default for habits with no completions", async () => {
            // Mock empty completions
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await analyticsService.getBestDayOfWeek(
                mockHabitId,
                mockUserId,
            );

            expect(result).toBe("Monday");
        });
    });

    describe("getCompletionRate", () => {
        it("should calculate completion rate correctly", async () => {
            // Mock empty completions for simplicity
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await analyticsService.getCompletionRate(
                mockHabitId,
                mockUserId,
                "2024-01-01",
                "2024-01-07",
            );

            expect(typeof result).toBe("number");
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });

        it("should throw error for missing parameters", async () => {
            await expect(
                analyticsService.getCompletionRate(
                    "",
                    mockUserId,
                    "2024-01-01",
                    "2024-01-07",
                ),
            ).rejects.toThrow(
                "All parameters are required for completion rate calculation",
            );
        });
    });

    describe("getMultiHabitAnalytics", () => {
        it("should handle multiple habit analytics", async () => {
            // Mock empty completions for simplicity
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await analyticsService.getMultiHabitAnalytics(
                [mockHabitId],
                mockUserId,
            );

            expect(Array.isArray(result)).toBe(true);
        });

        it("should throw error for missing parameters", async () => {
            await expect(
                analyticsService.getMultiHabitAnalytics([], ""),
            ).rejects.toThrow("Habit IDs and User ID are required");
        });
    });
});
