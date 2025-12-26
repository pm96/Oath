import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { APP_ID, db } from "../../firebaseConfig";

/**
 * Notification Service
 *
 * Handles Firebase Cloud Messaging (FCM) token registration and notification setup
 * Requirements: 4.4, 5.2, 5.3, 5.4, 5.5
 */

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register device for push notifications and store FCM token in Firestore
 *
 * @param userId - The current user's ID
 * @returns The FCM token if successful, null otherwise
 */
export async function registerForPushNotifications(
    userId: string,
): Promise<string | null> {
    try {
        // Check if running on a physical device
        if (!Device.isDevice) {
            console.log(
                "Push notifications only work on physical devices, not simulators/emulators",
            );
            return null;
        }

        // Request notification permissions
        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                },
            });
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.log("Failed to get push notification permissions");
            return null;
        }

        // Get the Expo Push Token
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.expoConfig?.extra?.projectId ??
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.warn(
                "Expo project ID not found. Ensure eas.projectId is defined in app config.",
            );
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });
        const fcmToken = tokenData.data;

        console.log("FCM Token obtained:", fcmToken);

        // Store the token in Firestore
        await storeFCMToken(userId, fcmToken);

        // Configure notification channel for Android
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
            });
        }

        return fcmToken;
    } catch (error) {
        console.error("Error registering for push notifications:", error);
        return null;
    }
}

/**
 * Store FCM token in user's Firestore document
 *
 * @param userId - The user's ID
 * @param fcmToken - The FCM token to store
 */
export async function storeFCMToken(
    userId: string,
    fcmToken: string,
): Promise<void> {
    try {
        const userRef = doc(db, `artifacts/${APP_ID}/users/${userId}`);
        await updateDoc(userRef, {
            fcmToken: fcmToken,
        });
        console.log("FCM token stored successfully");
    } catch (error) {
        console.error("Error storing FCM token:", error);
        throw error;
    }
}

/**
 * Remove FCM token from user's Firestore document (e.g., on sign out)
 *
 * @param userId - The user's ID
 */
export async function removeFCMToken(userId: string): Promise<void> {
    try {
        const userRef = doc(db, `artifacts/${APP_ID}/users/${userId}`);
        await updateDoc(userRef, {
            fcmToken: null,
        });
        console.log("FCM token removed successfully");
    } catch (error) {
        console.error("Error removing FCM token:", error);
        throw error;
    }
}

/**
 * Add notification received listener
 *
 * @param callback - Function to call when notification is received
 * @returns Subscription object to remove listener
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 *
 * @param callback - Function to call when notification is tapped
 * @returns Subscription object to remove listener
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}
