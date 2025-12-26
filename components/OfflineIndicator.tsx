import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/Text";
import { useSync } from "@/hooks/useSync";
import React from "react";
import { Platform } from "react-native";

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the device is offline with sync status
 * Requirements: 10.1, 10.4 - Implement graceful degradation for offline scenarios
 */
export function OfflineIndicator() {
    const { syncStatus } = useSync();

    if (syncStatus.isOnline) {
        return null;
    }

    return (
        <HStack
            className="bg-warning-500 p-3 justify-center items-center"
            space="sm"
        >
            <Text className="text-white font-semibold">
                {Platform.OS === "web" ? "🔌" : "⚠️"} No Internet Connection
            </Text>

            {syncStatus.pendingOperations > 0 && (
                <Text className="text-white text-sm">
                    • {syncStatus.pendingOperations} changes pending
                </Text>
            )}
        </HStack>
    );
}
