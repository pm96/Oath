# Notification Service Documentation

## Overview

The notification system uses Firebase Cloud Messaging (FCM) via Expo's push notification service to deliver real-time notifications to users. This implementation satisfies requirements 4.4, 5.2, 5.3, 5.4, and 5.5.

## Architecture

### Client-Side Components

1. **NotificationService** (`notificationService.ts`)
   - Handles device registration for push notifications
   - Manages FCM token storage in Firestore
   - Provides notification listeners for received notifications and user interactions

2. **useNotifications Hook** (`hooks/useNotifications.ts`)
   - React hook that automatically registers the device when user authenticates
   - Sets up notification listeners
   - Cleans up on user sign-out

3. **Integration** (`app/_layout.tsx`)
   - The hook is called in the root layout to ensure notifications are active throughout the app

### Server-Side Components

1. **checkGoalDeadlines Cloud Function** (`functions/src/index.ts`)
   - Scheduled function that runs every hour
   - Checks for expired goals and updates statuses
   - Increments shame scores for goals that have been Red for 24+ hours
   - Sends FCM notifications to friends when shame scores increase

2. **sendNudge Cloud Function** (`functions/src/index.ts`)
   - Callable function invoked from the client
   - Verifies sender is a friend of the target user
   - Sends FCM notification to the target user with sender name and goal description

## Notification Types

### 1. Shame Notifications

**Trigger**: When a user's goal has been Red for 24+ hours
**Recipients**: All friends of the user who failed the goal
**Content**:

- Title: "Friend Failed Goal!"
- Body: "{userName} failed: {goalDescription}" (or count if multiple)
- Data: `{ type: "shame_notification", count: "1" }`

### 2. Nudge Notifications

**Trigger**: When a friend taps the "Nudge Now" button
**Recipients**: The owner of the goal being nudged
**Content**:

- Title: "Nudge from a Friend!"
- Body: "{senderName} is nudging you about: {goalDescription}"
- Data: `{ type: "nudge_notification", senderId, senderName, goalId, goalDescription }`

## Setup Requirements

### 1. Expo Configuration

The `app.json` includes:

```json
{
  "notification": {
    "icon": "./assets/images/splash-icon.png",
    "color": "#ffffff",
    "androidMode": "default"
  },
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/splash-icon.png",
        "color": "#ffffff"
      }
    ]
  ]
}
```

### 2. Firestore Data Model

User documents include an `fcmToken` field:

```typescript
{
  displayName: string;
  shameScore: number;
  friends: string[];
  fcmToken: string | null;  // Expo Push Token
  createdAt: timestamp;
}
```

### 3. Permissions

The app requests notification permissions on first launch when a user signs in. Permissions are required for:

- iOS: Alert, Badge, Sound
- Android: Automatically granted

## Usage

### Client-Side

The notification system is automatically initialized when the app starts:

```typescript
// In app/_layout.tsx
function RootNavigator() {
  const { user, loading } = useAuth();
  useNotifications(); // Automatically registers device when user is authenticated
  // ...
}
```

To send a nudge:

```typescript
import { sendNudge } from "@/services/firebase/cloudFunctions";

// In a component
const handleNudge = async () => {
  try {
    const result = await sendNudge(friendUserId, goalId);
    console.log(result.message);
  } catch (error) {
    console.error("Failed to send nudge:", error);
  }
};
```

### Server-Side

The Cloud Functions automatically handle:

- Scheduled deadline checks (every hour)
- Shame score increments
- Notification delivery to friends

## Testing

### On Physical Devices

Push notifications only work on physical devices, not simulators/emulators.

### Testing Shame Notifications

1. Create a goal with a short deadline
2. Wait for the deadline to pass
3. Wait 24 hours (or modify the Cloud Function for testing)
4. The scheduled function will increment shame score and notify friends

### Testing Nudge Notifications

1. Add a friend
2. View their goals in the friends dashboard
3. Tap "Nudge Now" on a Yellow or Red goal
4. The friend should receive a notification

## Troubleshooting

### No Notifications Received

1. Verify the device is physical (not simulator)
2. Check notification permissions are granted
3. Verify FCM token is stored in Firestore user document
4. Check Cloud Function logs for errors
5. Ensure the app is using the correct Expo project ID

### Token Registration Fails

1. Check internet connectivity
2. Verify Expo project ID in `app.json` matches the actual project
3. Check console logs for specific error messages

### Cloud Function Errors

1. Check Firebase Console > Functions for execution logs
2. Verify firebase-admin is properly initialized
3. Ensure Firestore security rules allow Cloud Functions to read/write

## Future Enhancements

- Notification preferences (mute specific friends, quiet hours)
- In-app notification history
- Custom notification sounds
- Rich notifications with images
- Notification grouping for multiple shame events
