/**
 * Synchronization Hook
 *
 * React hook for managing data synchronization and offline state
 * Requirements: 10.1, 10.3, 10.4
 */

import { useEffect, useState } from "react";
import { syncService, SyncStatus } from "../services/firebase/syncService";
import { useAuth } from "./useAuth";

/**
 * Hook for managing synchronization state
 */
export function useSync() {
    const { user } = useAuth();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isOnline: true,
        lastSync: null,
        pendingOperations: 0,
        syncInProgress: false,
    });

    useEffect(() => {
        if (!user?.uid) return;

        // Subscribe to sync status updates
        const unsubscribe = syncService.onSyncStatusChange((status) => {
            setSyncStatus(status);
        });

        // Start real-time sync for the user
        syncService.startRealtimeSync(user.uid).catch((error) => {
            console.error("Failed to start realtime sync:", error);
        });

        // Prime caches with the latest data
        syncService.forceSyncUserData(user.uid).catch((error) => {
            console.error("Failed to force sync user data:", error);
        });

        return () => {
            unsubscribe();
            syncService.stopRealtimeSync(user.uid);
        };
    }, [user?.uid]);

    /**
     * Force sync all user data
     */
    const forceSync = async () => {
        if (!user?.uid) {
            throw new Error("User not authenticated");
        }

        try {
            await syncService.forceSyncUserData(user.uid);
        } catch (error) {
            console.error("Force sync failed:", error);
            throw error;
        }
    };

    /**
     * Clear all cached data
     */
    const clearCache = async () => {
        try {
            await syncService.clearCache();
        } catch (error) {
            console.error("Clear cache failed:", error);
            throw error;
        }
    };

    return {
        syncStatus,
        isOnline: syncStatus.isOnline,
        isSync: syncStatus.syncInProgress,
        pendingOperations: syncStatus.pendingOperations,
        lastSync: syncStatus.lastSync,
        forceSync,
        clearCache,
    };
}

/**
 * Hook for offline-aware data operations
 */
export function useOfflineAware() {
    const { syncStatus } = useSync();

    /**
     * Execute operation with offline fallback
     */
    const executeWithFallback = async <T>(
        onlineOperation: () => Promise<T>,
        offlineOperation: () => Promise<T>,
    ): Promise<T> => {
        if (syncStatus.isOnline) {
            try {
                return await onlineOperation();
            } catch (error) {
                console.warn(
                    "Online operation failed, falling back to offline:",
                    error,
                );
                return await offlineOperation();
            }
        } else {
            return await offlineOperation();
        }
    };

    return {
        isOnline: syncStatus.isOnline,
        executeWithFallback,
    };
}
