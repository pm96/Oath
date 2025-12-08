import {
    addNotificationReceivedListener,
    addNotificationResponseListener,
    registerForPushNotifications,
} from "@/services/firebase/notificationService";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * useNotifications Hook
 *
 * Custom hook for managing push notifications
 * Automatically registers device token when user is authenticated
 * Handles notification listeners and cleanup
 *
 * Requirements: 4.4, 5.4
 */
export function useNotifications() {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] =
        useState<Notifications.Notification | null>(null);
    const notificationListener = useRef<
        Notifications.EventSubscription | undefined
    >(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(
        undefined,
    );

    useEffect(() => {
        // Register for push notifications when user is authenticated
        if (user) {
            registerForPushNotifications(user.uid)
                .then((token) => {
                    if (token) {
                        setExpoPushToken(token);
                    }
                })
                .catch((error) => {
                    console.error("Failed to register for notifications:", error);
                });

            // Set up notification listeners
            notificationListener.current = addNotificationReceivedListener(
                (notification) => {
                    console.log("Notification received:", notification);
                    setNotification(notification);
                },
            );

            responseListener.current = addNotificationResponseListener((response) => {
                console.log("Notification tapped:", response);
                // Handle notification tap - could navigate to specific screen
                const data = response.notification.request.content.data;
                if (data.type === "nudge_notification") {
                    // Could navigate to goals screen
                    console.log("Nudge notification tapped:", data);
                } else if (data.type === "shame_notification") {
                    // Could navigate to friends dashboard
                    console.log("Shame notification tapped:", data);
                }
            });
        } else {
            // Clean up token when user signs out
            setExpoPushToken(null);
        }

        // Cleanup listeners on unmount
        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]); // Only depend on user.uid to avoid unnecessary re-renders

    return {
        expoPushToken,
        notification,
    };
}
