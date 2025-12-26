/**
 * Sync Service Tests
 *
 * Tests for data synchronization and offline support functionality
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";
import { syncService } from "../services/firebase/syncService";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
    getAllKeys: jest.fn(),
}));

// Mock Firebase
jest.mock("../firebaseConfig", () => ({
    db: {},
}));

// Mock error handling utilities
jest.mock("../utils/errorHandling", () => ({
    isOnline: jest.fn().mockResolvedValue(true),
    retryWithBackoff: jest.fn().mockImplementation((fn) => fn()),
}));

describe("SyncService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    });

    describe("Cache Management", () => {
        it("should cache data with integrity verification", async () => {
            const testData = { test: "data", value: 123 };

            await syncService.cacheData("test_key", testData);

            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                "test_key",
                expect.stringContaining('"data":{"test":"data","value":123}'),
            );
        });

        it("should retrieve cached data and verify integrity", async () => {
            const testData = { test: "data", value: 123 };
            const cachedData = {
                data: testData,
                timestamp: Timestamp.now().toMillis(),
                version: 1,
                checksum: "123456789", // Mock checksum
            };

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
                JSON.stringify(cachedData),
            );

            const result = await syncService.getCachedData("test_key");

            // Should return null due to checksum mismatch (integrity check)
            expect(result).toBeNull();
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith("test_key");
        });

        it("should return null for non-existent cache", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const result = await syncService.getCachedData("non_existent_key");

            expect(result).toBeNull();
        });
    });

    describe("Operation Queuing", () => {
        it("should queue operations for offline sync", async () => {
            const operation = {
                type: "completion" as const,
                action: "create" as const,
                data: { habitId: "habit1", userId: "user1" },
                userId: "user1",
                habitId: "habit1",
            };

            await syncService.queueOperation(operation);

            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                "@pending_sync_operations",
                expect.stringContaining('"type":"completion"'),
            );
        });

        it("should load pending operations from storage", async () => {
            const operations = [
                {
                    id: "op1",
                    type: "completion",
                    action: "create",
                    data: {},
                    userId: "user1",
                    habitId: "habit1",
                    retryCount: 0,
                    timestamp: Date.now(),
                },
            ];

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
                JSON.stringify(operations),
            );

            // Reset the mock to clear previous calls
            (AsyncStorage.getItem as jest.Mock).mockClear();

            // Access the private loadPendingOperations method directly
            await (syncService as any).loadPendingOperations();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith(
                "@pending_sync_operations",
            );
        });
    });

    describe("Sync Status", () => {
        it("should provide current sync status", () => {
            const status = syncService.getSyncStatus();

            expect(status).toHaveProperty("isOnline");
            expect(status).toHaveProperty("lastSync");
            expect(status).toHaveProperty("pendingOperations");
            expect(status).toHaveProperty("syncInProgress");
        });

        it("should allow subscribing to status changes", () => {
            const callback = jest.fn();

            const unsubscribe = syncService.onSyncStatusChange(callback);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    isOnline: expect.any(Boolean),
                    pendingOperations: expect.any(Number),
                }),
            );

            unsubscribe();
        });
    });

    describe("Cache Cleanup", () => {
        it("should clear all cached data", async () => {
            await syncService.clearCache();

            expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
                "@habit_streaks_cache",
                "@habit_completions_cache",
                "@pending_sync_operations",
                "@last_sync_timestamp",
            ]);
        });
    });
});
