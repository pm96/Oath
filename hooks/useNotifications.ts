import {
    addNotificationReceivedListener,
    addNotificationResponseListener,
    registerForPushNotifications,
    removeFCMToken,
} from "@/services/firebase/notificationService";
import { showInfoToast } from "@/utils/toast";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

/**
 * useNotifications Hook
 *
 * Custom hook for managing push notifications
 * Automatically registers device token when user is authenticated
 * Handles notification listeners and cleanup
 *
 * Requirements: 4.4, 5.4, 7.3
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
    const previousUserIdRef = useRef<string | null>(null);

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

                    // Handle multiple notifications properly
                    // Requirement 5.4: Handle multiple notifications properly
                    const data = notification.request.content.data;

                    // For nudge notifications received while app is in foreground,
                    // show a toast notification
                    if (
                        data.type === "nudge" &&
                        data.senderName &&
                        data.goalDescription
                    ) {
                        showInfoToast(
                            `Don't forget: ${data.goalDescription}`,
                            `👊 Nudge from ${data.senderName}`,
                        );
                    }
                },
            );

            responseListener.current = addNotificationResponseListener((response) => {
                console.log("Notification tapped:", response);
                // Handle notification tap - navigate to specific screen
                const data = response.notification.request.content.data as any;

                if (data.type === "friend_request") {
                    // Navigate to Friends tab and pending requests section
                    // Requirement 7.3: Navigate to Friends tab and pending requests section on tap
                    console.log("Friend request notification tapped:", data);
                    router.push("/(tabs)/friends");
                } else if (data.type === "friend_request_accepted") {
                    // Navigate to Friends tab to see the new friend
                    // Requirement 7.3: Navigate to Friends tab on friend request acceptance
                    console.log("Friend request accepted notification tapped:", data);
                    router.push("/(tabs)/friends");
                } else if (data.type === "nudge") {
                    // Navigate to Home tab when nudge notification is tapped
                    // Requirement 5.3: Navigate to Home tab when nudge notification is tapped
                    console.log("Nudge notification tapped:", data);
                    
                    if (data.goalId || data.habitId) {
                        router.push({
                            pathname: "/habit-detail",
                            params: { 
                                habitId: data.goalId || data.habitId,
                                habitName: data.goalDescription || "Habit Details"
                            }
                        });
                    } else {
                        router.push("/(tabs)/home");
                    }

                    // Show toast with nudge sender and goal information
                    // Requirement 5.3: Show toast with nudge sender and goal information
                    if (data.senderName && data.goalDescription) {
                        showInfoToast(
                            `Don't forget: ${data.goalDescription}`,
                            `👊 Nudge from ${data.senderName}`,
                        );
                    }
                } else if (data.type === "nudge_notification") {
                    // Legacy support for old nudge notification format
                    console.log("Legacy nudge notification tapped:", data);
                    router.push("/(tabs)/home");
                } else if (data.type === "shame_notification") {
                    // Navigate to friends dashboard
                    console.log("Shame notification tapped:", data);
                    router.push("/(tabs)/friends");
                } else if (data.type === "streak_reminder") {
                    // Navigate to Home tab when streak reminder is tapped
                    console.log("Streak reminder notification tapped:", data);
                    router.push("/(tabs)/home");
                } else if (data.type === "streak_milestone") {
                    // Navigate to Home tab and show celebration
                    console.log("Streak milestone notification tapped:", data);
                    router.push("/(tabs)/home");
                } else if (data.type === "streak_recovery") {
                    // Navigate to Home tab for recovery
                    console.log("Streak recovery notification tapped:", data);
                    router.push("/(tabs)/home");
                } else if (data.type === "weekly_progress") {
                    // Navigate to Home tab for progress
                    console.log("Weekly progress notification tapped:", data);
                    router.push("/(tabs)/home");
                }
            });
            previousUserIdRef.current = user.uid;
        } else {
            // User signed out - clean up token for the previous user
            const previousUserId = previousUserIdRef.current;
            if (previousUserId) {
                removeFCMToken(previousUserId).catch((error) => {
                    console.error("Failed to remove FCM token:", error);
                });
            }
            previousUserIdRef.current = null;
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
