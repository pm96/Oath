import { Timestamp } from "firebase/firestore";
import {
    CompletionService,
    completionService,
} from "../services/firebase/completionService";
import { getUserTimezone } from "../utils/dateUtils";

// Mock Firebase
jest.mock("../firebaseConfig", () => ({
    db: {},
    APP_ID: "test-app",
}));

jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
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
}));

jest.mock("../services/firebase/collections", () => ({
    getHabitCompletionsCollection: jest.fn(() => ({ path: "completions" })),
}));

jest.mock("../utils/errorHandling", () => ({
    getUserFriendlyErrorMessage: jest.fn((error) => error.message),
    retryWithBackoff: jest.fn((fn) => fn()),
}));

describe("CompletionService", () => {
    let service: CompletionService;
    const mockUserId = "user123";
    const mockHabitId = "habit456";
    const mockTimezone = getUserTimezone();

    beforeEach(() => {
        service = new CompletionService();
        jest.clearAllMocks();
    });

    describe("recordCompletion", () => {
        it("should throw error for missing habitId", async () => {
            const completion = {
                habitId: "",
                userId: mockUserId,
                completedAt: Timestamp.now(),
                timezone: mockTimezone,
                difficulty: "easy" as const,
            };

            await expect(service.recordCompletion(completion)).rejects.toThrow(
                "Habit ID and User ID are required",
            );
        });

        it("should throw error for missing userId", async () => {
            const completion = {
                habitId: mockHabitId,
                userId: "",
                completedAt: Timestamp.now(),
                timezone: mockTimezone,
                difficulty: "easy" as const,
            };

            await expect(service.recordCompletion(completion)).rejects.toThrow(
                "Habit ID and User ID are required",
            );
        });

        it("should throw error for future completion dates", async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const completion = {
                habitId: mockHabitId,
                userId: mockUserId,
                completedAt: Timestamp.fromDate(futureDate),
                timezone: mockTimezone,
                difficulty: "easy" as const,
            };

            await expect(service.recordCompletion(completion)).rejects.toThrow(
                "Cannot record completions for future dates",
            );
        });
    });

    describe("calculateCompletionRate", () => {
        it("should throw error for missing parameters", async () => {
            await expect(
                service.calculateCompletionRate(
                    "",
                    mockUserId,
                    "2024-01-01",
                    "2024-01-07",
                ),
            ).rejects.toThrow(
                "All parameters are required for completion rate calculation",
            );

            await expect(
                service.calculateCompletionRate(
                    mockHabitId,
                    "",
                    "2024-01-01",
                    "2024-01-07",
                ),
            ).rejects.toThrow(
                "All parameters are required for completion rate calculation",
            );

            await expect(
                service.calculateCompletionRate(
                    mockHabitId,
                    mockUserId,
                    "",
                    "2024-01-07",
                ),
            ).rejects.toThrow(
                "All parameters are required for completion rate calculation",
            );

            await expect(
                service.calculateCompletionRate(
                    mockHabitId,
                    mockUserId,
                    "2024-01-01",
                    "",
                ),
            ).rejects.toThrow(
                "All parameters are required for completion rate calculation",
            );
        });

        it("should calculate 0% rate for no completions", async () => {
            // Mock empty results
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await service.calculateCompletionRate(
                mockHabitId,
                mockUserId,
                "2024-01-01",
                "2024-01-07",
            );

            expect(result.rate).toBe(0);
            expect(result.totalDays).toBe(7);
            expect(result.completedDays).toBe(0);
        });
    });

    describe("getCompletionHistory", () => {
        it("should throw error for missing habitId", async () => {
            await expect(
                service.getCompletionHistory("", mockUserId),
            ).rejects.toThrow("Habit ID and User ID are required");
        });

        it("should throw error for missing userId", async () => {
            await expect(
                service.getCompletionHistory(mockHabitId, ""),
            ).rejects.toThrow("Habit ID and User ID are required");
        });

        it("should return empty history for no completions", async () => {
            // Mock empty results
            const { getDocs } = require("firebase/firestore");
            getDocs.mockResolvedValue({
                docs: [],
            });

            const result = await service.getCompletionHistory(
                mockHabitId,
                mockUserId,
            );

            expect(result.completions).toEqual([]);
            expect(result.totalCount).toBe(0);
            expect(result.period).toBe("No completions");
        });
    });

    describe("getCompletionDetail", () => {
        it("should throw error for missing completionId", async () => {
            await expect(service.getCompletionDetail("", mockUserId)).rejects.toThrow(
                "Completion ID and User ID are required",
            );
        });

        it("should throw error for missing userId", async () => {
            await expect(
                service.getCompletionDetail("completion123", ""),
            ).rejects.toThrow("Completion ID and User ID are required");
        });
    });

    describe("getGroupedCompletions", () => {
        it("should throw error for missing habitId", async () => {
            await expect(
                service.getGroupedCompletions("", mockUserId),
            ).rejects.toThrow("Habit ID and User ID are required");
        });

        it("should throw error for missing userId", async () => {
            await expect(
                service.getGroupedCompletions(mockHabitId, ""),
            ).rejects.toThrow("Habit ID and User ID are required");
        });
    });

    describe("getCompletionStatistics", () => {
        it("should throw error for missing habitId", async () => {
            await expect(
                service.getCompletionStatistics("", mockUserId),
            ).rejects.toThrow("Habit ID and User ID are required");
        });

        it("should throw error for missing userId", async () => {
            await expect(
                service.getCompletionStatistics(mockHabitId, ""),
            ).rejects.toThrow("Habit ID and User ID are required");
        });
    });

    describe("private helper methods", () => {
        it("should calculate relative time correctly", () => {
            const now = new Date();
            const today = Timestamp.fromDate(now);
            const yesterday = Timestamp.fromDate(
                new Date(now.getTime() - 24 * 60 * 60 * 1000),
            );
            const weekAgo = Timestamp.fromDate(
                new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            );

            // Access private method through any casting for testing
            const getRelativeTimeString = (service as any).getRelativeTimeString.bind(
                service,
            );

            expect(getRelativeTimeString(today)).toBe("Today");
            expect(getRelativeTimeString(yesterday)).toBe("Yesterday");
            expect(getRelativeTimeString(weekAgo)).toBe("1 week ago");
        });

        it("should calculate week start correctly", () => {
            // Access private method through any casting for testing
            const getWeekStart = (service as any).getWeekStart.bind(service);

            // Test various days of the week
            expect(getWeekStart("2024-01-03")).toBe("2024-01-01"); // Wednesday -> Monday
            expect(getWeekStart("2024-01-07")).toBe("2024-01-01"); // Sunday -> Monday
            expect(getWeekStart("2024-01-01")).toBe("2024-01-01"); // Monday -> Monday
        });

        it("should calculate week end correctly", () => {
            // Access private method through any casting for testing
            const getWeekEnd = (service as any).getWeekEnd.bind(service);

            expect(getWeekEnd("2024-01-01")).toBe("2024-01-07"); // Monday -> Sunday
        });
    });
});

describe("completionService singleton", () => {
    it("should export a singleton instance", () => {
        expect(completionService).toBeInstanceOf(CompletionService);
    });
});
