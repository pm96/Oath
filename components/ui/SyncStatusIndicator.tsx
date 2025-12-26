/**
 * Sync Status Indicator Component
 *
 * Displays current synchronization status and pending operations
 * Requirements: 10.1, 10.4
 */

import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/vstack";
import { useSync } from "@/hooks/useSync";
import React from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";

interface SyncStatusIndicatorProps {
    showDetails?: boolean;
    onPress?: () => void;
}

export function SyncStatusIndicator({
    showDetails = false,
    onPress,
}: SyncStatusIndicatorProps) {
    const { syncStatus, forceSync } = useSync();

    const getStatusColor = () => {
        if (!syncStatus.isOnline) return "text-red-500";
        if (syncStatus.syncInProgress) return "text-yellow-500";
        if (syncStatus.pendingOperations > 0) return "text-orange-500";
        return "text-green-500";
    };

    const getStatusText = () => {
        if (!syncStatus.isOnline) return "Offline";
        if (syncStatus.syncInProgress) return "Syncing...";
        if (syncStatus.pendingOperations > 0)
            return `${syncStatus.pendingOperations} pending`;
        return "Synced";
    };

    const getStatusIcon = () => {
        if (!syncStatus.isOnline) return "⚠️";
        if (syncStatus.syncInProgress) return null; // Will show spinner
        if (syncStatus.pendingOperations > 0) return "⏳";
        return "✅";
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (syncStatus.isOnline && !syncStatus.syncInProgress) {
            forceSync().catch(console.error);
        }
    };

    const Component =
        onPress || (!syncStatus.syncInProgress && syncStatus.isOnline)
            ? TouchableOpacity
            : VStack;

    return (
        <Component
            onPress={handlePress}
            className={`${onPress || (!syncStatus.syncInProgress && syncStatus.isOnline) ? "active:opacity-70" : ""}`}
        >
            <HStack className="items-center space-x-2">
                {syncStatus.syncInProgress ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                    <Text className="text-sm">{getStatusIcon()}</Text>
                )}

                <Text className={`text-sm font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                </Text>
            </HStack>

            {showDetails && (
                <VStack className="mt-2 space-y-1">
                    {syncStatus.lastSync && (
                        <Text className="text-xs text-gray-500">
                            Last sync: {syncStatus.lastSync.toDate().toLocaleTimeString()}
                        </Text>
                    )}

                    {!syncStatus.isOnline && (
                        <Text className="text-xs text-red-600">
                            Changes will sync when connection is restored
                        </Text>
                    )}
                </VStack>
            )}
        </Component>
    );
}

/**
 * Compact sync status for use in headers/toolbars
 */
export function CompactSyncStatus() {
    const { syncStatus } = useSync();

    if (
        syncStatus.isOnline &&
        syncStatus.pendingOperations === 0 &&
        !syncStatus.syncInProgress
    ) {
        return null; // Don't show anything when everything is synced
    }

    return <SyncStatusIndicator showDetails={false} />;
}

/**
 * Detailed sync status for settings/debug screens
 */
export function DetailedSyncStatus() {
    const { syncStatus, forceSync, clearCache } = useSync();

    return (
        <VStack className="p-4 bg-gray-50 rounded-lg space-y-3">
            <Text className="text-lg font-semibold">Sync Status</Text>

            <SyncStatusIndicator showDetails={true} />

            <HStack className="space-x-3">
                <TouchableOpacity
                    onPress={() => forceSync().catch(console.error)}
                    disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
                    className={`px-4 py-2 rounded-md ${syncStatus.isOnline && !syncStatus.syncInProgress
                            ? "bg-blue-500 active:bg-blue-600"
                            : "bg-gray-300"
                        }`}
                >
                    <Text
                        className={`text-sm font-medium ${syncStatus.isOnline && !syncStatus.syncInProgress
                                ? "text-white"
                                : "text-gray-500"
                            }`}
                    >
                        Force Sync
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => clearCache().catch(console.error)}
                    className="px-4 py-2 rounded-md bg-red-500 active:bg-red-600"
                >
                    <Text className="text-sm font-medium text-white">Clear Cache</Text>
                </TouchableOpacity>
            </HStack>
        </VStack>
    );
}
