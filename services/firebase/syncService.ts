/**
 * Data Synchronization Service
 *
 * Handles cross-device data synchronization, offline caching, and conflict resolution
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { db } from "@/firebaseConfig";
import { HabitCompletion, HabitStreak } from "@/types";
import { isOnline, retryWithBackoff } from "@/utils/errorHandling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Unsubscribe } from "firebase/auth";
import {
    Timestamp,
    doc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    where,
} from "firebase/firestore";
import {
    getHabitCompletionsCollection,
    getHabitStreaksCollection,
} from "./collections";
import {
    generateStreakId,
    transformFirestoreToCompletion,
    transformFirestoreToStreak,
    transformStreakToFirestore,
} from "./habitStreakSchemas";

/**
 * Sync operation types
 */
export interface SyncOperation {
    id: string;
    type: "completion" | "streak" | "milestone";
    action: "create" | "update" | "delete";
    data: any;
    timestamp: Timestamp;
    userId: string;
    habitId?: string;
    retryCount: number;
    lastAttempt?: Timestamp;
}

/**
 * Cached data structure
 */
export interface CachedData<T> {
    data: T;
    timestamp: Timestamp;
    version: number;
    checksum: string;
}

/**
 * Sync status
 */
export interface SyncStatus {
    isOnline: boolean;
    lastSync: Timestamp | null;
    pendingOperations: number;
    syncInProgress: boolean;
}
/**
 * Data Synchronization Service Implementation
 */
export class SyncService {
    private static instance: SyncService;
    private syncListeners: Map<string, Unsubscribe> = new Map();
    private pendingOperations: Map<string, SyncOperation> = new Map();
    private syncStatus: SyncStatus = {
        isOnline: true,
        lastSync: null,
        pendingOperations: 0,
        syncInProgress: false,
    };
    private statusCallbacks: Set<(status: SyncStatus) => void> = new Set();

    // Cache keys
    private static readonly CACHE_KEYS = {
        STREAKS: "@habit_streaks_cache",
        COMPLETIONS: "@habit_completions_cache",
        PENDING_OPS: "@pending_sync_operations",
        LAST_SYNC: "@last_sync_timestamp",
    };

    private constructor() {
        this.initializeSync();
    }

    public static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    /**
     * Initialize synchronization system
     * Requirements: 10.1, 10.4
     */
    private async initializeSync(): Promise<void> {
        try {
            // Load pending operations from storage
            await this.loadPendingOperations();

            // Check connectivity and start sync if online
            const online = await isOnline();
            this.updateSyncStatus({ isOnline: online });

            if (online) {
                await this.processPendingOperations();
            }

            // Set up connectivity monitoring
            this.startConnectivityMonitoring();
        } catch (error) {
            console.error("Failed to initialize sync service:", error);
        }
    }

    /**
     * Start real-time synchronization for a user's habit data
     * Requirements: 10.1
     */
    async startRealtimeSync(userId: string): Promise<void> {
        if (!userId) {
            throw new Error("User ID is required for sync");
        }

        // Stop existing listeners for this user
        this.stopRealtimeSync(userId);

        try {
            // Set up streak data listener
            const streaksCollection = getHabitStreaksCollection();
            const streaksQuery = query(
                streaksCollection,
                where("userId", "==", userId),
            );
            const streakListener = onSnapshot(
                streaksQuery,
                (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        const streakData = change.doc.data();
                        await this.handleRealtimeStreakUpdate(
                            change.doc.id,
                            streakData,
                            change.type,
                        );
                    });
                },
                (error) => {
                    console.error("Streak sync error:", error);
                    this.handleSyncError(error);
                },
            );

            // Set up completion data listener
            const completionsCollection = getHabitCompletionsCollection();
            const completionsQuery = query(
                completionsCollection,
                where("userId", "==", userId),
            );
            const completionListener = onSnapshot(
                completionsQuery,
                (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        const completionData = change.doc.data();
                        await this.handleRealtimeCompletionUpdate(
                            change.doc.id,
                            completionData,
                            change.type,
                        );
                    });
                },
                (error) => {
                    console.error("Completion sync error:", error);
                    this.handleSyncError(error);
                },
            );

            // Store listeners
            this.syncListeners.set(`streaks_${userId}`, streakListener);
            this.syncListeners.set(`completions_${userId}`, completionListener);
        } catch (error) {
            console.error("Failed to start realtime sync:", error);
            throw error;
        }
    }
    /**
     * Stop real-time synchronization for a user
     */
    stopRealtimeSync(userId: string): void {
        const streakKey = `streaks_${userId}`;
        const completionKey = `completions_${userId}`;

        const streakListener = this.syncListeners.get(streakKey);
        if (streakListener) {
            streakListener();
            this.syncListeners.delete(streakKey);
        }

        const completionListener = this.syncListeners.get(completionKey);
        if (completionListener) {
            completionListener();
            this.syncListeners.delete(completionKey);
        }
    }

    /**
     * Cache data locally with integrity verification
     * Requirements: 10.4
     */
    async cacheData<T>(key: string, data: T, version: number = 1): Promise<void> {
        try {
            const checksum = this.generateChecksum(data);
            const cachedData: CachedData<T> = {
                data,
                timestamp: Timestamp.now(),
                version,
                checksum,
            };

            await AsyncStorage.setItem(key, JSON.stringify(cachedData));
        } catch (error) {
            console.error("Failed to cache data:", error);
            // Don't throw - caching failure shouldn't break the app
        }
    }

    /**
     * Retrieve cached data with integrity verification
     * Requirements: 10.4, 12.5
     */
    async getCachedData<T>(key: string): Promise<T | null> {
        try {
            const cachedString = await AsyncStorage.getItem(key);
            if (!cachedString) {
                return null;
            }

            const cachedData: CachedData<T> = JSON.parse(cachedString);

            // Verify data integrity
            const expectedChecksum = this.generateChecksum(cachedData.data);
            if (cachedData.checksum !== expectedChecksum) {
                console.warn("Cache integrity check failed, removing corrupted data");
                await AsyncStorage.removeItem(key);
                return null;
            }

            return cachedData.data;
        } catch (error) {
            console.error("Failed to retrieve cached data:", error);
            return null;
        }
    }

    private async updateAggregateRecord<T>(
        key: string,
        docId: string,
        entry?: T,
    ): Promise<void> {
        const current =
            (await this.getCachedData<Record<string, T>>(key)) || {};

        if (entry) {
            current[docId] = entry;
        } else {
            delete current[docId];
        }

        await this.cacheData(key, current);
    }

    async getCachedStreakMap(): Promise<Record<string, HabitStreak>> {
        const record =
            (await this.getCachedData<Record<string, HabitStreak>>(
                SyncService.CACHE_KEYS.STREAKS,
            )) || {};

        return Object.values(record).reduce(
            (acc, streak) => {
                if (streak.habitId) {
                    acc[streak.habitId] = streak;
                }
                return acc;
            },
            {} as Record<string, HabitStreak>,
        );
    }

    async getCachedCompletionsMap(): Promise<Record<string, HabitCompletion>> {
        return (
            (await this.getCachedData<Record<string, HabitCompletion>>(
                SyncService.CACHE_KEYS.COMPLETIONS,
            )) || {}
        );
    }

    /**
     * Remove cached entries for a prefix that are no longer active
     */
    private async cleanupCachePrefix(
        prefix: string,
        activeDocIds?: Set<string>,
    ): Promise<void> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            if (!allKeys || allKeys.length === 0) {
                return;
            }

            const prefixWithSeparator = `${prefix}_`;
            const allowedKeys =
                activeDocIds &&
                new Set(
                    Array.from(activeDocIds.values()).map(
                        (id) => `${prefixWithSeparator}${id}`,
                    ),
                );

            const keysToRemove = allKeys.filter((key) => {
                if (!key.startsWith(prefixWithSeparator)) {
                    return false;
                }

                if (!allowedKeys) {
                    return true;
                }

                return !allowedKeys.has(key);
            });

            if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
            }
        } catch (error) {
            console.error("Failed to clean up cache prefix:", error);
        }
    }

    /**
     * Queue operation for offline sync
     * Requirements: 10.4
     */
    async queueOperation(
        operation: Omit<SyncOperation, "id" | "retryCount" | "timestamp">,
    ): Promise<void> {
        const syncOp: SyncOperation = {
            ...operation,
            id: this.generateOperationId(),
            timestamp: Timestamp.now(),
            retryCount: 0,
        };

        this.pendingOperations.set(syncOp.id, syncOp);
        await this.savePendingOperations();

        this.updateSyncStatus({
            pendingOperations: this.pendingOperations.size,
        });

        // Try to process immediately if online
        if (this.syncStatus.isOnline) {
            await this.processPendingOperations();
        }
    }

    /**
     * Process pending operations when connection is restored
     * Requirements: 10.4, 10.5
     */
    async processPendingOperations(): Promise<void> {
        if (this.syncStatus.syncInProgress || this.pendingOperations.size === 0) {
            return;
        }

        this.updateSyncStatus({ syncInProgress: true });

        try {
            const operations = Array.from(this.pendingOperations.values()).sort(
                (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis(),
            );

            for (const operation of operations) {
                try {
                    await this.executeOperation(operation);
                    this.pendingOperations.delete(operation.id);
                } catch (error) {
                    console.error("Failed to execute operation:", error);

                    // Increment retry count
                    operation.retryCount++;
                    operation.lastAttempt = Timestamp.now();

                    // Remove operation if max retries exceeded
                    if (operation.retryCount >= 3) {
                        console.warn(
                            "Max retries exceeded, removing operation:",
                            operation.id,
                        );
                        this.pendingOperations.delete(operation.id);
                    }
                }
            }

            await this.savePendingOperations();
            this.updateSyncStatus({
                pendingOperations: this.pendingOperations.size,
                lastSync: Timestamp.now(),
            });
        } finally {
            this.updateSyncStatus({ syncInProgress: false });
        }
    }

    /**
     * Execute a sync operation with atomic updates
     * Requirements: 10.2
     */
    private async executeOperation(operation: SyncOperation): Promise<void> {
        return await retryWithBackoff(async () => {
            return await runTransaction(db, async (transaction) => {
                switch (operation.type) {
                    case "completion":
                        await this.executeCompletionOperation(operation, transaction);
                        break;
                    case "streak":
                        await this.executeStreakOperation(operation, transaction);
                        break;
                    case "milestone":
                        await this.executeMilestoneOperation(operation, transaction);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
            });
        });
    }

    /**
     * Handle real-time streak updates with conflict resolution
     * Requirements: 10.1, 10.5
     */
    private async handleRealtimeStreakUpdate(
        docId: string,
        data: any,
        changeType: "added" | "modified" | "removed",
    ): Promise<void> {
        try {
            if (changeType === "removed") {
                // Remove from cache
                const removeCacheKey = `${SyncService.CACHE_KEYS.STREAKS}_${docId}`;
                await AsyncStorage.removeItem(removeCacheKey);
                await this.updateAggregateRecord(
                    SyncService.CACHE_KEYS.STREAKS,
                    docId,
                );
                return;
            }

            const streak = transformFirestoreToStreak(data);

            // Check for conflicts with local data
            const cacheKey = `${SyncService.CACHE_KEYS.STREAKS}_${docId}`;
            const cachedStreak = await this.getCachedData<HabitStreak>(cacheKey);

            if (cachedStreak && this.hasConflict(cachedStreak, streak)) {
                const resolvedStreak = await this.resolveStreakConflict(
                    cachedStreak,
                    streak,
                );
                await this.cacheData(cacheKey, resolvedStreak);
            } else {
                await this.cacheData(cacheKey, streak);
            }

            await this.updateAggregateRecord(
                SyncService.CACHE_KEYS.STREAKS,
                docId,
                streak,
            );
        } catch (error) {
            console.error("Error handling realtime streak update:", error);
        }
    }

    /**
     * Handle real-time completion updates
     * Requirements: 10.1
     */
    private async handleRealtimeCompletionUpdate(
        docId: string,
        data: any,
        changeType: "added" | "modified" | "removed",
    ): Promise<void> {
        try {
            if (changeType === "removed") {
                const removeCacheKey = `${SyncService.CACHE_KEYS.COMPLETIONS}_${docId}`;
                await AsyncStorage.removeItem(removeCacheKey);
                await this.updateAggregateRecord(
                    SyncService.CACHE_KEYS.COMPLETIONS,
                    docId,
                );
                return;
            }

            const completion = transformFirestoreToCompletion(docId, data);
            const cacheKey = `${SyncService.CACHE_KEYS.COMPLETIONS}_${docId}`;
            await this.cacheData(cacheKey, completion);
            await this.updateAggregateRecord(
                SyncService.CACHE_KEYS.COMPLETIONS,
                docId,
                completion,
            );
        } catch (error) {
            console.error("Error handling realtime completion update:", error);
        }
    }

    /**
     * Resolve conflicts using timestamp priority
     * Requirements: 10.5
     */
    private async resolveStreakConflict(
        localStreak: HabitStreak,
        remoteStreak: HabitStreak,
    ): Promise<HabitStreak> {
        // Use the streak with the most recent lastCompletionDate
        // If dates are equal, prefer the one with higher currentStreak

        if (!localStreak.lastCompletionDate && remoteStreak.lastCompletionDate) {
            return remoteStreak;
        }

        if (localStreak.lastCompletionDate && !remoteStreak.lastCompletionDate) {
            return localStreak;
        }

        if (localStreak.lastCompletionDate && remoteStreak.lastCompletionDate) {
            if (localStreak.lastCompletionDate > remoteStreak.lastCompletionDate) {
                return localStreak;
            } else if (
                localStreak.lastCompletionDate < remoteStreak.lastCompletionDate
            ) {
                return remoteStreak;
            } else {
                // Same date, use higher streak
                return localStreak.currentStreak >= remoteStreak.currentStreak
                    ? localStreak
                    : remoteStreak;
            }
        }

        // Fallback to remote if no clear winner
        return remoteStreak;
    }

    /**
     * Check if there's a conflict between local and remote data
     */
    private hasConflict(local: HabitStreak, remote: HabitStreak): boolean {
        return (
            local.currentStreak !== remote.currentStreak ||
            local.bestStreak !== remote.bestStreak ||
            local.lastCompletionDate !== remote.lastCompletionDate ||
            local.freezesAvailable !== remote.freezesAvailable ||
            local.freezesUsed !== remote.freezesUsed
        );
    }
    /**
     * Execute completion operation
     */
    private async executeCompletionOperation(
        operation: SyncOperation,
        transaction: any,
    ): Promise<void> {
        const completionsCollection = getHabitCompletionsCollection();

        switch (operation.action) {
            case "create":
                const completionRef = doc(completionsCollection);
                transaction.set(completionRef, {
                    ...operation.data,
                    createdAt: serverTimestamp(),
                });
                break;
            case "update":
                const updateRef = doc(completionsCollection, operation.data.id);
                transaction.update(updateRef, {
                    ...operation.data,
                    updatedAt: serverTimestamp(),
                });
                break;
            case "delete":
                const deleteRef = doc(completionsCollection, operation.data.id);
                transaction.delete(deleteRef);
                break;
        }
    }

    /**
     * Execute streak operation
     */
    private async executeStreakOperation(
        operation: SyncOperation,
        transaction: any,
    ): Promise<void> {
        const streaksCollection = getHabitStreaksCollection();
        const streakId = generateStreakId(operation.userId, operation.habitId!);
        const streakRef = doc(streaksCollection, streakId);

        switch (operation.action) {
            case "create":
            case "update":
                const streakData = transformStreakToFirestore(operation.data);
                transaction.set(streakRef, streakData);
                break;
            case "delete":
                transaction.delete(streakRef);
                break;
        }
    }

    /**
     * Execute milestone operation
     */
    private async executeMilestoneOperation(
        operation: SyncOperation,
        transaction: any,
    ): Promise<void> {
        // Milestone operations are typically part of streak updates
        // This is a placeholder for future milestone-specific operations
        console.log("Executing milestone operation:", operation);
    }

    /**
     * Generate checksum for data integrity
     */
    private generateChecksum(data: any): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Generate unique operation ID
     */
    private generateOperationId(): string {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save pending operations to storage
     */
    private async savePendingOperations(): Promise<void> {
        try {
            const operations = Array.from(this.pendingOperations.values());
            const serialized = operations.map((op) => ({
                ...op,
                timestamp: op.timestamp.toMillis(),
                lastAttempt: op.lastAttempt?.toMillis(),
            }));

            await AsyncStorage.setItem(
                SyncService.CACHE_KEYS.PENDING_OPS,
                JSON.stringify(serialized),
            );
        } catch (error) {
            console.error("Failed to save pending operations:", error);
        }
    }

    /**
     * Load pending operations from storage
     */
    private async loadPendingOperations(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(
                SyncService.CACHE_KEYS.PENDING_OPS,
            );
            if (!stored) return;

            const operations = JSON.parse(stored);
            this.pendingOperations.clear();

            operations.forEach((op: any) => {
                const operation: SyncOperation = {
                    ...op,
                    timestamp: Timestamp.fromMillis(op.timestamp),
                    lastAttempt: op.lastAttempt
                        ? Timestamp.fromMillis(op.lastAttempt)
                        : undefined,
                };
                this.pendingOperations.set(operation.id, operation);
            });
        } catch (error) {
            console.error("Failed to load pending operations:", error);
        }
    }
    /**
     * Start connectivity monitoring
     */
    private startConnectivityMonitoring(): void {
        // Check connectivity every 30 seconds
        setInterval(async () => {
            const online = await isOnline();
            const wasOnline = this.syncStatus.isOnline;

            this.updateSyncStatus({ isOnline: online });

            // If we just came back online, process pending operations
            if (online && !wasOnline) {
                console.log("Connection restored, processing pending operations");
                await this.processPendingOperations();
            }
        }, 30000);
    }

    /**
     * Handle sync errors
     */
    private handleSyncError(error: any): void {
        console.error("Sync error:", error);

        // Update sync status based on error type
        if (error.code === "unavailable" || error.message?.includes("network")) {
            this.updateSyncStatus({ isOnline: false });
        }
    }

    /**
     * Update sync status and notify listeners
     */
    private updateSyncStatus(updates: Partial<SyncStatus>): void {
        this.syncStatus = { ...this.syncStatus, ...updates };

        // Notify all status callbacks
        this.statusCallbacks.forEach((callback) => {
            try {
                callback(this.syncStatus);
            } catch (error) {
                console.error("Error in sync status callback:", error);
            }
        });
    }

    /**
     * Subscribe to sync status updates
     */
    onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
        this.statusCallbacks.add(callback);

        // Call immediately with current status
        callback(this.syncStatus);

        // Return unsubscribe function
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    /**
     * Get current sync status
     */
    getSyncStatus(): SyncStatus {
        return { ...this.syncStatus };
    }

    /**
     * Force sync all data for a user
     * Requirements: 10.1, 10.3
     */
    async forceSyncUserData(userId: string): Promise<void> {
        if (!this.syncStatus.isOnline) {
            throw new Error("Cannot force sync while offline");
        }

        try {
            this.updateSyncStatus({ syncInProgress: true });

            // Sync all streak data
            await this.syncUserStreaks(userId);

            // Sync all completion data
            await this.syncUserCompletions(userId);

            this.updateSyncStatus({ lastSync: Timestamp.now() });
        } finally {
            this.updateSyncStatus({ syncInProgress: false });
        }
    }

    /**
     * Sync user streaks from server
     */
    private async syncUserStreaks(userId: string): Promise<void> {
        try {
            const streaksCollection = getHabitStreaksCollection();
            const streaksQuery = query(
                streaksCollection,
                where("userId", "==", userId),
            );
            const snapshot = await getDocs(streaksQuery);

            const streakEntries = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                streak: transformFirestoreToStreak(docSnap.data()),
            }));

            const aggregateRecord: Record<string, HabitStreak> = {};

            await Promise.all(
                streakEntries.map(async ({ id, streak }) => {
                    aggregateRecord[id] = streak;
                    await this.cacheData(
                        `${SyncService.CACHE_KEYS.STREAKS}_${id}`,
                        streak,
                    );
                }),
            );

            await this.cacheData(
                SyncService.CACHE_KEYS.STREAKS,
                aggregateRecord,
            );

            await this.cleanupCachePrefix(
                SyncService.CACHE_KEYS.STREAKS,
                new Set(streakEntries.map((entry) => entry.id)),
            );
        } catch (error) {
            console.error("Failed to sync streaks:", error);
        }
    }

    /**
     * Sync user completions from server
     */
    private async syncUserCompletions(userId: string): Promise<void> {
        try {
            const completionsCollection = getHabitCompletionsCollection();
            const completionsQuery = query(
                completionsCollection,
                where("userId", "==", userId),
            );
            const snapshot = await getDocs(completionsQuery);

            const completionEntries = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                completion: transformFirestoreToCompletion(docSnap.id, docSnap.data()),
            }));

            const aggregateRecord: Record<string, HabitCompletion> = {};

            await Promise.all(
                completionEntries.map(async ({ id, completion }) => {
                    aggregateRecord[id] = completion;
                    await this.cacheData(
                        `${SyncService.CACHE_KEYS.COMPLETIONS}_${id}`,
                        completion,
                    );
                }),
            );

            await this.cacheData(
                SyncService.CACHE_KEYS.COMPLETIONS,
                aggregateRecord,
            );

            await this.cleanupCachePrefix(
                SyncService.CACHE_KEYS.COMPLETIONS,
                new Set(completionEntries.map((entry) => entry.id)),
            );
        } catch (error) {
            console.error("Failed to sync completions:", error);
        }
    }

    /**
     * Clear all cached data
     */
    async clearCache(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                SyncService.CACHE_KEYS.STREAKS,
                SyncService.CACHE_KEYS.COMPLETIONS,
                SyncService.CACHE_KEYS.PENDING_OPS,
                SyncService.CACHE_KEYS.LAST_SYNC,
            ]);
            await this.cleanupCachePrefix(SyncService.CACHE_KEYS.STREAKS);
            await this.cleanupCachePrefix(SyncService.CACHE_KEYS.COMPLETIONS);

            this.pendingOperations.clear();
            this.updateSyncStatus({
                pendingOperations: 0,
                lastSync: null,
            });
        } catch (error) {
            console.error("Failed to clear cache:", error);
        }
    }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
