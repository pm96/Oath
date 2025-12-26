# Design Document: Social Nudging and Friends Feed

## Overview

The Social Nudging and Friends Feed feature transforms passive friendship connections into active accountability partnerships by providing real-time visibility into friends' goal progress and enabling targeted social pressure through push notification nudges. This feature builds directly on the completed friend-management-ui infrastructure and implements the core value proposition of peer accountability.

The design introduces a comprehensive friends feed that displays all friends' goals with traffic light status indicators (green/yellow/red) based on deadline proximity, combined with a nudge system that allows users to send push notifications to friends whose goals are at risk. The system includes intelligent rate limiting to prevent spam and maintains real-time synchronization across all devices.

Key innovations include:

1. **Dynamic Status Calculation** - Real-time goal status based on deadline proximity
2. **Smart Nudge System** - Rate-limited push notifications with 1-hour cooldowns
3. **Feed Prioritization** - Automatic sorting by urgency (red → yellow → green)
4. **Real-Time Synchronization** - Instant updates across all connected devices

The architecture leverages existing Firebase infrastructure (Firestore, Cloud Functions, FCM) and integrates seamlessly with the current friend-management-ui and social-accountability-mvp implementations.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Friends Tab (Enhanced)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ User Search  │  │   Friend     │  │    Friends Feed      │  │
│  │ (Existing)   │  │  Requests    │  │   (New Component)    │  │
│  │              │  │ (Existing)   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐     ┌────────▼────────┐     ┌───────▼────────┐
│  FriendsFeed   │     │  NudgeService   │     │ StatusCalculator│
│   Component    │     │                 │     │                 │
└───────┬────────┘     └────────┬────────┘     └───────┬────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   useFriendsGoals     │
                    │   (Enhanced Hook)     │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐     ┌────────▼────────┐     ┌───────▼────────┐
│   Firestore    │     │ Cloud Functions │     │      FCM       │
│ (goals, nudges,│     │ (sendNudge      │     │ (notifications)│
│  cooldowns)    │     │  Notification)  │     │                │
└────────────────┘     └─────────────────┘     └────────────────┘
```

### Data Flow Architecture

```
1. User opens Friends tab
   ↓
2. useFriendsGoals hook subscribes to friends' goals
   ↓
3. StatusCalculator computes real-time status for each goal
   ↓
4. FriendsFeed renders goals sorted by urgency
   ↓
5. User taps NUDGE button on at-risk goal
   ↓
6. NudgeService creates nudge document + cooldown
   ↓
7. Cloud Function triggers FCM notification
   ↓
8. Friend receives push notification
   ↓
9. Real-time listeners update UI across all devices
```

### Technology Stack

- **Frontend**: Expo SDK 52+, React Native, TypeScript, Expo Router
- **Backend**: Firebase (Firestore, Cloud Functions, FCM)
- **State Management**: React hooks with real-time Firestore listeners
- **UI Components**: GluestackUI components from `/components/ui`
- **Testing**: Jest for unit tests, fast-check for property-based testing
- **Real-Time Updates**: Firestore `onSnapshot` listeners
- **Push Notifications**: Firebase Cloud Messaging (FCM)

## Components and Interfaces

### 1. Enhanced Friends Feed Component

**Purpose**: Display all friends' goals with real-time status and nudge functionality.

**Location**: `components/social/FriendsFeed.tsx` (new)

**Key Features**:

- Real-time goal status calculation based on deadline proximity
- Traffic light color system (green/yellow/red)
- Nudge buttons with rate limiting and cooldowns
- Automatic sorting by urgency (red → yellow → green)
- Pull-to-refresh functionality
- Empty states and loading skeletons

**Props Interface**:

```typescript
interface FriendsFeedProps {
  userId: string;
  onGoalSelect?: (goalId: string, friendId: string) => void;
}

interface FriendGoalItemProps {
  goal: GoalWithOwner;
  currentUserId: string;
  onNudge: (goalId: string, friendId: string) => void;
  nudgeCooldowns: Map<string, Date>;
}
```

### 2. Nudge Service Module

**Purpose**: Handle all nudge-related operations including creation, rate limiting, and cooldown management.

**Location**: `services/firebase/nudgeService.ts` (new)

**Key Functions**:

```typescript
interface NudgeService {
  // Nudge operations
  sendNudge(
    senderId: string,
    receiverId: string,
    goalId: string,
    goalDescription: string,
  ): Promise<void>;

  // Cooldown management
  getNudgeCooldowns(userId: string): Promise<Map<string, Date>>;
  subscribeToNudgeCooldowns(
    userId: string,
    callback: (cooldowns: Map<string, Date>) => void,
  ): () => void;

  // Nudge history
  getNudgeHistory(
    userId: string,
    type: "sent" | "received",
    days?: number,
  ): Promise<Nudge[]>;
}

interface Nudge {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  goalId: string;
  goalDescription: string;
  timestamp: Date;
  cooldownUntil: Date;
}
```

### 3. Goal Status Calculator Utility

**Purpose**: Calculate real-time goal status based on deadline proximity and completion state.

**Location**: `utils/goalStatusCalculator.ts` (new)

**Key Functions**:

```typescript
interface GoalStatusCalculator {
  calculateStatus(goal: Goal): GoalStatus;
  getStatusColor(status: GoalStatus): string;
  getStatusText(goal: Goal): string;
  getDeadlineProximity(deadline: Date): DeadlineProximity;
  shouldShowNudgeButton(goal: Goal, isCompleted: boolean): boolean;
}

interface GoalStatus {
  color: "green" | "yellow" | "red";
  priority: number; // For sorting (1=highest, 3=lowest)
  text: string; // "Safe", "Due in 2h", "Overdue by 1d"
  showNudge: boolean;
}

interface DeadlineProximity {
  hoursUntilDeadline: number;
  isOverdue: boolean;
  displayText: string;
}
```

### 4. Enhanced useFriendsGoals Hook

**Purpose**: Extend existing hook to include status calculation and nudge cooldown management.

**Location**: `hooks/useFriendsGoals.ts` (enhance existing)

**New Features**:

- Real-time status calculation for each goal
- Nudge cooldown tracking
- Feed sorting by urgency
- Performance optimization with memoization

**Enhanced Interface**:

```typescript
interface UseFriendsGoalsReturn {
  // Existing
  friendsGoals: GoalWithOwner[];
  loading: boolean;
  error: Error | null;
  friendIds: string[];
  refresh: () => void;

  // New additions
  sortedGoals: GoalWithOwnerAndStatus[];
  nudgeCooldowns: Map<string, Date>;
  sendNudge: (goalId: string, friendId: string) => Promise<void>;
  canNudge: (goalId: string) => boolean;
}

interface GoalWithOwnerAndStatus extends GoalWithOwner {
  status: GoalStatus;
  canNudge: boolean;
  cooldownRemaining?: number; // minutes
}
```

### 5. Nudge Notification Cloud Function

**Purpose**: Send FCM notifications when nudges are created.

**Location**: `functions/src/index.ts` (add new function)

**Function**:

```typescript
export const sendNudgeNotification = functions.firestore
  .document("artifacts/{appId}/nudges/{nudgeId}")
  .onCreate(async (snap, context) => {
    const nudgeData = snap.data();

    // Fetch receiver's FCM token
    const receiverDoc = await admin
      .firestore()
      .doc(`artifacts/${context.params.appId}/users/${nudgeData.receiverId}`)
      .get();

    const receiverData = receiverDoc.data();
    if (!receiverData?.fcmToken) {
      console.log("No FCM token for receiver");
      return;
    }

    // Send FCM notification
    const message = {
      token: receiverData.fcmToken,
      notification: {
        title: `👊 ${nudgeData.senderName} nudged you!`,
        body: `Don't forget: ${nudgeData.goalDescription}`,
      },
      data: {
        type: "nudge",
        goalId: nudgeData.goalId,
        senderId: nudgeData.senderId,
      },
    };

    await admin.messaging().send(message);
  });
```

### 6. Enhanced Friends Tab Screen

**Purpose**: Integrate the new friends feed component into the existing friends tab.

**Location**: `app/(tabs)/friends.tsx` (enhance existing)

**New Layout Structure**:

- Keep existing search and friend requests at top
- Add new friends feed section below
- Implement tab switching between "Requests" and "Feed" views
- Add pull-to-refresh for entire screen

### 7. Goal Detail Modal

**Purpose**: Show detailed information about a friend's goal when tapped.

**Location**: `components/social/FriendGoalDetail.tsx` (new)

**Key Features**:

- Full goal information (description, recurrence, deadline, history)
- Friend's total shame score
- Large nudge button if goal is at-risk
- Navigation back to feed with preserved scroll position

**Props Interface**:

```typescript
interface FriendGoalDetailProps {
  goal: GoalWithOwnerAndStatus;
  currentUserId: string;
  onNudge: (goalId: string, friendId: string) => void;
  onClose: () => void;
  canNudge: boolean;
  cooldownRemaining?: number;
}
```

## Data Models

### Firestore Collections Structure

```
/artifacts/{appId}/
  /users/{userId}
    - displayName: string
    - email: string
    - shameScore: number
    - friends: string[]  // Array of userIds (existing)
    - fcmToken: string | null
    - createdAt: timestamp
    - searchableEmail: string  // Lowercase (existing)
    - searchableName: string   // Lowercase (existing)

  /nudges/{nudgeId}  // New collection
    - senderId: string
    - senderName: string
    - receiverId: string
    - goalId: string
    - goalDescription: string
    - timestamp: timestamp
    - cooldownUntil: timestamp  // timestamp + 1 hour
    - createdAt: timestamp

  /public/data/goals/{goalId}  // Existing collection
    - ownerId: string
    - description: string
    - frequency: 'daily' | 'weekly' | '3x_a_week'
    - targetDays: string[]
    - latestCompletionDate: timestamp | null
    - currentStatus: 'Green' | 'Yellow' | 'Red'
    - nextDeadline: timestamp
    - isShared: boolean
    - createdAt: timestamp
    - redSince: timestamp | null
```

### Goal Status Calculation Logic

```typescript
function calculateGoalStatus(goal: Goal): GoalStatus {
  const now = new Date();
  const deadline = goal.nextDeadline;
  const hoursUntilDeadline =
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  // If goal is completed today, always green
  if (goal.latestCompletionDate && isSameDay(goal.latestCompletionDate, now)) {
    return {
      color: "green",
      priority: 3,
      text: "Completed ✓",
      showNudge: false,
    };
  }

  // If overdue
  if (hoursUntilDeadline < 0) {
    const hoursOverdue = Math.abs(hoursUntilDeadline);
    const daysOverdue = Math.floor(hoursOverdue / 24);

    return {
      color: "red",
      priority: 1,
      text:
        daysOverdue > 0
          ? `Overdue by ${daysOverdue}d`
          : `Overdue by ${Math.floor(hoursOverdue)}h`,
      showNudge: true,
    };
  }

  // If due soon (less than 2 hours)
  if (hoursUntilDeadline < 2) {
    const minutesUntilDeadline = Math.floor(hoursUntilDeadline * 60);
    return {
      color: "red",
      priority: 1,
      text: `Due in ${minutesUntilDeadline}m`,
      showNudge: true,
    };
  }

  // If due within 6 hours (warning zone)
  if (hoursUntilDeadline < 6) {
    return {
      color: "yellow",
      priority: 2,
      text: `Due in ${Math.floor(hoursUntilDeadline)}h`,
      showNudge: true,
    };
  }

  // Safe zone (more than 6 hours)
  return {
    color: "green",
    priority: 3,
    text: "Safe",
    showNudge: false,
  };
}
```

### Nudge Rate Limiting Logic

```typescript
function canSendNudge(goalId: string, cooldowns: Map<string, Date>): boolean {
  const cooldownEnd = cooldowns.get(goalId);
  if (!cooldownEnd) return true;

  const now = new Date();
  return now > cooldownEnd;
}

function createNudgeCooldown(goalId: string): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
}
```

### Feed Sorting Algorithm

```typescript
function sortGoalsByUrgency(
  goals: GoalWithOwnerAndStatus[],
): GoalWithOwnerAndStatus[] {
  return goals.sort((a, b) => {
    // First sort by status priority (1=red, 2=yellow, 3=green)
    if (a.status.priority !== b.status.priority) {
      return a.status.priority - b.status.priority;
    }

    // Then sort by deadline proximity (soonest first)
    return a.nextDeadline.getTime() - b.nextDeadline.getTime();
  });
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Before writing the correctness properties, I need to analyze the acceptance criteria for testability:

<function_calls>
<invoke name="prework">
<parameter name="featureName">social-nudging-feed

### Property 1: Friends feed displays only friend goals

_For any_ user with a friends array, the friends feed should display exactly the goals belonging to users whose IDs are in the friends array, and no others.
**Validates: Requirements 1.1**

### Property 2: Goal display completeness

_For any_ displayed goal in the friends feed, the rendered output should contain the friend's name, goal description, recurrence pattern, and deadline information.
**Validates: Requirements 1.2**

### Property 3: Goal grouping by friend

_For any_ friend with multiple goals, all their goals should appear grouped together under the friend's name in the feed.
**Validates: Requirements 1.3, 7.3**

### Property 4: Real-time goal list updates

_For any_ change to a friend's goal list (creation, deletion, modification), the friends feed should update to reflect the change immediately.
**Validates: Requirements 1.5, 6.2, 6.3**

### Property 5: Status color calculation accuracy

_For any_ goal with a deadline more than 6 hours away and not completed today, the status should be green; for deadlines between 2-6 hours, yellow; for deadlines less than 2 hours or overdue, red.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 6: Completed goal status display

_For any_ goal completed today, the status should display as green with a checkmark and "Completed" text, regardless of deadline.
**Validates: Requirements 2.5**

### Property 7: Nudge button visibility for at-risk goals

_For any_ goal with yellow or red status, a "NUDGE" button should be visible and enabled (unless cooldown is active).
**Validates: Requirements 3.1, 12.3**

### Property 8: Nudge button hiding for safe goals

_For any_ goal with green status or completed status, the "NUDGE" button should be hidden.
**Validates: Requirements 3.2, 12.1, 12.2**

### Property 9: Nudge document creation completeness

_For any_ nudge creation, the Firestore document should contain senderId, receiverId, goalId, goalDescription, timestamp, senderName, and cooldownUntil fields.
**Validates: Requirements 3.3, 8.1**

### Property 10: Nudge notification delivery

_For any_ nudge creation, an FCM notification should be sent to the receiver with title format "👊 [Friend Name] nudged you!" and body containing the goal description.
**Validates: Requirements 3.4, 5.1, 5.2**

### Property 11: Nudge success feedback

_For any_ successful nudge send, a success toast should display with the message "Nudge sent to [Friend Name]!".
**Validates: Requirements 3.5**

### Property 12: Nudge cooldown enforcement

_For any_ goal that has been nudged, the nudge button should be disabled for exactly 1 hour from the nudge timestamp.
**Validates: Requirements 4.1, 4.2**

### Property 13: Rapid nudge prevention

_For any_ attempt to send multiple nudges to the same goal within the cooldown period, the system should show "Already nudged - wait 1h" message and prevent the nudge.
**Validates: Requirements 4.3**

### Property 14: Cooldown display accuracy

_For any_ goal with an active nudge cooldown, the remaining cooldown time should be displayed accurately and update in real-time.
**Validates: Requirements 4.4**

### Property 15: Cooldown clearing on completion

_For any_ goal that is completed while a nudge cooldown is active, the cooldown should be cleared and the nudge button should be hidden.
**Validates: Requirements 4.5**

### Property 16: Nudge notification navigation

_For any_ nudge notification tap, the app should navigate to the Home tab showing the user's goals.
**Validates: Requirements 5.3**

### Property 17: Multiple notification handling

_For any_ user receiving multiple nudges, each should appear as a separate FCM notification.
**Validates: Requirements 5.4**

### Property 18: Graceful notification degradation

_For any_ nudge sent to a user with notifications disabled, the nudge should still be recorded in Firestore but no FCM notification should be sent.
**Validates: Requirements 5.5**

### Property 19: Real-time status updates

_For any_ goal whose status changes (completion, deadline approach), the friends feed should immediately update the status color and text.
**Validates: Requirements 6.1, 6.4**

### Property 20: Offline data caching

_For any_ network connectivity loss, the friends feed should display cached goal data with an offline indicator.
**Validates: Requirements 6.5**

### Property 21: Feed sorting by urgency

_For any_ friends feed display, goals should be sorted with red status first, then yellow, then green, with secondary sorting by deadline proximity (soonest first).
**Validates: Requirements 7.1, 7.2**

### Property 22: Dynamic feed re-sorting

_For any_ goal status change, the friends feed should automatically re-sort to maintain urgency order.
**Validates: Requirements 7.4**

### Property 23: Nudge history completeness

_For any_ user querying their nudge history, all nudges sent or received within the specified timeframe should be returned with complete information.
**Validates: Requirements 8.2, 8.3, 8.4**

### Property 24: Automatic nudge cleanup

_For any_ nudge older than 7 days, it should be automatically deleted from Firestore to reduce storage.
**Validates: Requirements 8.5**

### Property 25: Goal detail navigation

_For any_ goal tap in the friends feed, the app should navigate to a detail view showing complete goal information.
**Validates: Requirements 9.1**

### Property 26: Goal detail information completeness

_For any_ goal detail view, it should display description, recurrence pattern, deadline, completion history, shame score impact, and the friend's total shame score.
**Validates: Requirements 9.2, 9.4**

### Property 27: Goal detail nudge button visibility

_For any_ at-risk goal in detail view, a "NUDGE" button should be displayed and functional.
**Validates: Requirements 9.3**

### Property 28: Navigation state preservation

_For any_ navigation from friends feed to goal detail and back, the feed should return to the same scroll position.
**Validates: Requirements 9.5**

### Property 29: Feed access authorization

_For any_ user querying the friends feed, only goals belonging to users in their friends array should be returned.
**Validates: Requirements 10.1**

### Property 30: Nudge authorization

_For any_ nudge attempt, the system should verify the receiver is in the sender's friends array before allowing the nudge.
**Validates: Requirements 10.2**

### Property 31: Goal detail access authorization

_For any_ goal detail access attempt, the system should verify the goal owner is in the requester's friends array.
**Validates: Requirements 10.3**

### Property 32: Nudge history authorization

_For any_ nudge history query, only nudges where the user is sender or receiver should be returned.
**Validates: Requirements 10.4**

### Property 33: Unauthenticated access denial

_For any_ unauthenticated access attempt to nudge or feed operations, the system should deny access.
**Validates: Requirements 10.5**

### Property 34: Pull-to-refresh functionality

_For any_ pull-to-refresh gesture on the friends feed, the data should be refreshed and loading indicators should be displayed.
**Validates: Requirements 11.2**

### Property 35: Loading state display

_For any_ friends feed loading state, skeleton loaders should be displayed while fetching data.
**Validates: Requirements 11.3**

### Property 36: Virtualization performance

_For any_ friends feed with many goals, only visible items should be rendered to maintain performance.
**Validates: Requirements 11.4**

### Property 37: Self-nudge prevention

_For any_ user viewing their own goals, nudge buttons should never be displayed.
**Validates: Requirements 12.5**

## Error Handling

### Feed Loading Errors

- **Network timeout**: Display cached data with offline indicator, retry with exponential backoff
- **Permission denied**: Log error, show "Unable to load friends' goals" message
- **Empty friends list**: Show encouraging message to add friends
- **Firestore query failure**: Retry up to 3 times, then show error toast with retry button

### Nudge Sending Errors

- **Rate limit exceeded**: Show "Already nudged - wait Xm" message with countdown
- **Friend not found**: Show "Friend no longer available" error
- **Network error**: Queue nudge for retry, show pending state
- **FCM delivery failure**: Log error but don't block UI (nudge still recorded)
- **Permission denied**: Show "Unable to send nudge" error

### Status Calculation Errors

- **Invalid deadline**: Default to red status, log error for debugging
- **Missing goal data**: Skip goal in feed, log error
- **Timezone issues**: Use device timezone for calculations, log discrepancies

### Real-Time Update Errors

- **Listener disconnection**: Attempt reconnection, show offline indicator
- **Partial data sync**: Use last known good state, retry sync
- **Conflicting updates**: Use server timestamp as source of truth

### General Error Handling Strategy

- All errors logged with context for debugging
- User-facing errors are clear and actionable
- Network errors trigger retry logic with exponential backoff
- Critical operations (nudge sending) use Firestore transactions
- Graceful degradation: Feed remains functional even if nudges fail
- Offline support: Cache last known state, sync when reconnected

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Status calculation**: Test specific deadline scenarios (6h, 2h, overdue)
- **Nudge rate limiting**: Test cooldown enforcement with specific timestamps
- **Feed sorting**: Test sorting with specific goal combinations
- **Error handling**: Test specific error scenarios (network failures, permission denials)
- **Navigation**: Test specific navigation flows and state preservation

Unit tests will use Jest and be co-located with source files using `.test.ts` suffix.

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** library:

- **Configuration**: Each property test will run a minimum of 100 iterations
- **Tagging**: Format: `**Feature: social-nudging-feed, Property {number}: {property_text}**`
- **Coverage**: Each correctness property will be implemented as a single property-based test

Property-based tests will focus on:

- Status calculation across all possible deadline combinations
- Feed filtering and sorting with random goal sets
- Nudge authorization with random friend relationships
- Real-time update consistency across random state changes
- Rate limiting behavior with random nudge patterns

### Integration Testing

Integration tests will verify component interactions:

- Complete nudge flow (tap button → create nudge → send notification → update UI)
- Feed update flow (goal status change → re-sort → update display)
- Navigation flow (feed → goal detail → back with state preservation)
- Real-time synchronization (changes on one device appear on another)
- Offline/online transitions (cache → sync → update)

### Testing Approach

1. **Implementation-first development**: Implement features before writing tests
2. **Core functionality validation**: Write tests to validate implemented features work
3. **Property tests for business logic**: Use PBT for status calculation, sorting, authorization
4. **Unit tests for edge cases**: Test specific error conditions and boundary cases
5. **Integration tests for workflows**: Test complete user flows end-to-end

## Implementation Notes

### Performance Optimizations

1. **Memoization**: Use `React.memo` and `useMemo` for expensive calculations
2. **Virtualization**: Use `FlatList` with `getItemLayout` for large goal lists
3. **Debouncing**: Debounce status calculations to reduce CPU usage
4. **Batch Updates**: Group Firestore writes using batch operations
5. **Selective Re-renders**: Use `useCallback` to prevent unnecessary re-renders

### Real-Time Data Synchronization

All nudge and goal data will use Firestore's `onSnapshot` listeners:

- Friends feed updates in real-time when goals change
- Nudge cooldowns update in real-time across devices
- Status colors update automatically as deadlines approach
- Feed re-sorts automatically when statuses change

### Firestore Security Rules

Add to existing `firestore.rules`:

```javascript
// Nudges collection
match /artifacts/{appId}/nudges/{nudgeId} {
  // Users can read nudges where they are sender or receiver
  allow read: if request.auth != null && (
    resource.data.senderId == request.auth.uid ||
    resource.data.receiverId == request.auth.uid
  );

  // Users can create nudges where they are the sender and receiver is a friend
  allow create: if request.auth != null &&
    request.resource.data.senderId == request.auth.uid &&
    isUserFriend(request.auth.uid, request.resource.data.receiverId);

  // No updates or deletes allowed (nudges are immutable)
  allow update, delete: if false;
}

// Helper function to check if users are friends
function isUserFriend(userId, friendId) {
  return friendId in get(/databases/$(database)/documents/artifacts/$(appId)/users/$(userId)).data.friends;
}

// Goals collection - enhance existing rules
match /artifacts/{appId}/public/data/goals/{goalId} {
  // Existing rules...

  // Allow reading goals if owner is in user's friends array
  allow read: if request.auth != null && (
    resource.data.ownerId == request.auth.uid ||
    resource.data.ownerId in get(/databases/$(database)/documents/artifacts/$(appId)/users/$(request.auth.uid)).data.friends
  );
}
```

### Cloud Function Implementation

```typescript
// Enhanced nudge notification function
export const sendNudgeNotification = functions.firestore
  .document("artifacts/{appId}/nudges/{nudgeId}")
  .onCreate(async (snap, context) => {
    const nudgeData = snap.data();

    try {
      // Fetch receiver's user document
      const receiverDoc = await admin
        .firestore()
        .doc(`artifacts/${context.params.appId}/users/${nudgeData.receiverId}`)
        .get();

      const receiverData = receiverDoc.data();

      // Check if receiver has FCM token and notifications enabled
      if (!receiverData?.fcmToken) {
        console.log(`No FCM token for user ${nudgeData.receiverId}`);
        return;
      }

      // Send FCM notification
      const message = {
        token: receiverData.fcmToken,
        notification: {
          title: `👊 ${nudgeData.senderName} nudged you!`,
          body: `Don't forget: ${nudgeData.goalDescription}`,
        },
        data: {
          type: "nudge",
          goalId: nudgeData.goalId,
          senderId: nudgeData.senderId,
          senderName: nudgeData.senderName,
        },
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: "default",
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`Nudge notification sent successfully: ${response}`);
    } catch (error) {
      console.error("Error sending nudge notification:", error);
      // Don't throw - we don't want to block the nudge creation
    }
  });

// Cleanup old nudges function
export const cleanupOldNudges = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const batch = admin.firestore().batch();

    // Query all app instances
    const appsSnapshot = await admin.firestore().collection("artifacts").get();

    for (const appDoc of appsSnapshot.docs) {
      const appId = appDoc.id;

      // Query old nudges for this app
      const oldNudgesQuery = await admin
        .firestore()
        .collection(`artifacts/${appId}/nudges`)
        .where("createdAt", "<", sevenDaysAgo)
        .get();

      oldNudgesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    await batch.commit();
    console.log(`Cleaned up old nudges older than 7 days`);
  });
```

### Notification Handling

Update `hooks/useNotifications.ts` to handle nudge notifications:

```typescript
// Add to existing notification handler
const handleNotification = (notification: any) => {
  const { data } = notification;

  if (data?.type === "nudge") {
    // Navigate to Home tab to show user's goals
    router.push("/(tabs)/home");

    // Show toast with nudge details
    showInfoToast(
      `${data.senderName} nudged you about: ${data.goalDescription}`,
    );
  }

  // Handle other notification types...
};
```

### Accessibility Considerations

- All interactive elements have minimum 44x44pt touch targets
- Proper labels for screen readers on nudge buttons
- Color contrast ratios meet WCAG AA standards for status colors
- Focus indicators for keyboard navigation (web)
- Semantic HTML elements for web version
- VoiceOver/TalkBack announcements for status changes

### Future Enhancements (Out of Scope for MVP)

- Nudge templates with custom messages
- Nudge scheduling (send reminder at specific time)
- Group nudges (nudge multiple friends at once)
- Nudge analytics (most effective nudge times)
- Custom nudge sounds/vibrations
- Nudge streaks and gamification
- Smart nudge suggestions based on patterns
- Nudge response tracking (did it help?)
