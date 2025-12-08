import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { isOnline } from "@/utils/errorHandling";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the device is offline
 * Requirement: Implement graceful degradation for offline scenarios
 */
export function OfflineIndicator() {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        // Check connectivity on mount
        checkConnectivity();

        // Check connectivity periodically
        const interval = setInterval(checkConnectivity, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const checkConnectivity = async () => {
        const connected = await isOnline();
        setOnline(connected);
    };

    if (online) {
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
        </HStack>
    );
}
