/**
 * Offline Streak Service Tests
 *
 * Tests for offline-aware streak operations
 * Requirements: 10.3, 10.4
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";
import { offlineStreakService } from "../services/firebase/offlineStreakService";
import { HabitCompletion, HabitStreak } from "../types/habit-streaks";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
}));

// Mock the underlying StreakService
jest.mock("../services/firebase/streakService", () => ({
    StreakService: jest.fn().mockImplementation(() => ({
        recordCompletion: jest.fn(),
        calculateStreak: jest.fn(),
        useStreakFreeze: jest.fn(),
        getHabitCalendar: jest.fn(),
        getHabitStreak: jest.fn(),
    })),
}));

// Mock sync service
jest.mock("../services/firebase/syncService", () => ({
    syncService: {
        queueOperation: jest.fn(),
    },
}));

// Mock error handling utilities
jest.mock("../utils/errorHandling", () => ({
    isOnline: jest.fn(),
}));

const { isOnline } = require("../utils/errorHandling");

describe("OfflineStreakService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
        (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
    });

    describe("Completion Recording", () => {
        it("should record completion online when connected", async () => {
            isOnline.mockResolvedValue(true);

            const completion = {
                habitId: "habit1",
                userId: "user1",
                completedAt: Timestamp.now(),
                timezone: "UTC",
                difficulty: "medium" as const,
            };

            const mockResult: HabitCompletion = {
                ...completion,
                id: "completion1",
            };

            // Mock successful online operation
            const mockStreakService = (offlineStreakService as any).streakService;
            mockStreakService.recordCompletion.mockResolvedValue(mockResult);

            const result = await offlineStreakService.recordCompletion(completion);

            expect(mockStreakService.recordCompletion).toHaveBeenCalledWith(
                completion,
            );
            expect(result).toEqual(mockResult);
            expect(AsyncStorage.setItem).toHaveBeenCalled(); // Should cache the result
        });

        it("should record completion offline when disconnected", async () => {
            isOnline.mockResolvedValue(false);

            const completion = {
                habitId: "habit1",
                userId: "user1",
                completedAt: Timestamp.now(),
                timezone: "UTC",
                difficulty: "medium" as const,
            };

            const result = await offlineStreakService.recordCompletion(completion);

            expect(result.id).toMatch(/^offline_/);
            expect(AsyncStorage.setItem).toHaveBeenCalled(); // Should cache offline completion
        });

        it("should fallback to offline mode when online operation fails", async () => {
            isOnline.mockResolvedValue(true);

            const completion = {
                habitId: "habit1",
                userId: "user1",
                completedAt: Timestamp.now(),
                timezone: "UTC",
                difficulty: "medium" as const,
            };

            // Mock failed online operation
            const mockStreakService = (offlineStreakService as any).streakService;
            mockStreakService.recordCompletion.mockRejectedValue(
                new Error("Network error"),
            );

            const result = await offlineStreakService.recordCompletion(completion);

            expect(result.id).toMatch(/^offline_/);
            expect(AsyncStorage.setItem).toHaveBeenCalled();
        });
    });

    describe("Streak Calculation", () => {
        it("should calculate streak online when connected", async () => {
            isOnline.mockResolvedValue(true);

            const mockStreak: HabitStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 5,
                bestStreak: 10,
                lastCompletionDate: "2024-01-15",
                streakStartDate: "2024-01-11",
                freezesAvailable: 1,
                freezesUsed: 0,
                milestones: [],
            };

            const mockStreakService = (offlineStreakService as any).streakService;
            mockStreakService.calculateStreak.mockResolvedValue(mockStreak);

            const result = await offlineStreakService.calculateStreak(
                "habit1",
                "user1",
            );

            expect(mockStreakService.calculateStreak).toHaveBeenCalledWith(
                "habit1",
                "user1",
            );
            expect(result).toEqual(mockStreak);
            expect(AsyncStorage.setItem).toHaveBeenCalled(); // Should cache the result
        });

        it("should return cached streak when offline", async () => {
            isOnline.mockResolvedValue(false);

            const cachedStreak = {
                habitId: "habit1",
                userId: "user1",
                currentStreak: 3,
                bestStreak: 8,
                lastCompletionDate: "2024-01-13",
                streakStartDate: "2024-01-11",
                freezesAvailable: 0,
                freezesUsed: 1,
                milestones: [],
            };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
                JSON.stringify(cachedStreak),
            );

            const result = await offlineStreakService.calculateStreak(
                "habit1",
                "user1",
            );

            expect(result).toEqual(cachedStreak);
        });

        it("should return default streak when no cache available", async () => {
            isOnline.mockResolvedValue(false);
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const result = await offlineStreakService.calculateStreak(
                "habit1",
                "user1",
            );

            expect(result).toEqual({
                habitId: "habit1",
                userId: "user1",
                currentStreak: 0,
                bestStreak: 0,
                lastCompletionDate: "",
                streakStartDate: "",
                freezesAvailable: 0,
                freezesUsed: 0,
                milestones: [],
            });
        });
    });

    describe("Cache Management", () => {
        it("should clear user cache", async () => {
            const mockKeys = [
                "@offline_streak_streak_user1_habit1",
                "@offline_streak_completion_comp1",
                "@offline_streak_calendar_user1_habit1",
                "@other_cache_key",
            ];

            (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);

            await offlineStreakService.clearUserCache("user1");

            expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
                "@offline_streak_streak_user1_habit1",
                "@offline_streak_calendar_user1_habit1",
            ]);
        });

        it("should get cache statistics", async () => {
            const mockKeys = [
                "@offline_streak_streak_user1_habit1",
                "@offline_streak_completion_comp1",
            ];

            const mockData = JSON.stringify({ data: "test", timestamp: Date.now() });

            (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

            const stats = await offlineStreakService.getCacheStats("user1");

            expect(stats.totalItems).toBe(1); // Only one key matches user1
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(typeof stats.lastUpdated).toBe("number");
        });
    });
});
