# Design Document: Social Accountability MVP

## Overview

The Social Accountability MVP is a mobile application built with Expo/React Native that leverages social pressure to help users achieve their goals. The system uses Firebase as the backend infrastructure, providing real-time data synchronization, authentication, and serverless functions for automated monitoring.

The core mechanism is simple: users create goals with specific frequencies and deadlines, share them with friends, and face social consequences (increased "shame score") when they fail to complete goals on time. Friends can view each other's progress and send nudges to encourage accountability.

The architecture follows a client-server model where the mobile app handles user interactions and real-time data display, while Cloud Functions handle automated deadline checking, status updates, and notification delivery.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Screen  │  │ Goals Screen │  │ Friends View │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Firebase SDK   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│ Firebase Auth  │  │   Firestore     │  │ Cloud Functions│
└────────────────┘  └─────────────────┘  └────────────────┘
                             │                    │
                    ┌────────▼────────┐  ┌────────▼────────┐
                    │ Security Rules  │  │  FCM (Push)     │
                    └─────────────────┘  └─────────────────┘
```

### Technology Stack

- **Frontend**: Expo SDK 52+, React Native, TypeScript, Expo Router
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions, Cloud Messaging)
- **State Management**: React hooks with real-time Firestore listeners
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Testing**: Jest for unit tests, fast-check for property-based testing

## Components and Interfaces

### 1. Authentication Module

**Purpose**: Handle user registration, login, and session management.

**Components**:

- `AuthProvider`: Context provider that manages authentication state
- `SignInScreen`: UI for existing users to authenticate
- `CreateAccountScreen`: UI for new user registration
- `useAuth`: Custom hook for accessing auth state and methods

**Key Functions**:

```typescript
interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, displayName: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
}
```

### 2. Goal Management Module

**Purpose**: Create, update, and track user goals.

**Components**:

- `GoalForm`: UI component for creating/editing goals
- `GoalList`: Display list of user's own goals
- `GoalItem`: Individual goal display with completion button
- `useGoals`: Hook for managing goal CRUD operations

**Key Functions**:

```typescript
interface GoalService {
  createGoal(goal: GoalInput): Promise<string>;
  updateGoal(goalId: string, updates: Partial<Goal>): Promise<void>;
  completeGoal(goalId: string): Promise<void>;
  getUserGoals(userId: string): Observable<Goal[]>;
  calculateNextDeadline(
    frequency: string,
    targetDays: string[],
    lastCompletion?: Date,
  ): Date;
}

interface GoalInput {
  description: string;
  frequency: "daily" | "weekly" | "3x_a_week";
  targetDays: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
}

interface Goal {
  id: string;
  ownerId: string;
  description: string;
  frequency: string;
  targetDays: string[];
  latestCompletionDate: Date | null;
  currentStatus: "Green" | "Yellow" | "Red";
  nextDeadline: Date;
  isShared: boolean;
  createdAt: Date;
}
```

### 3. Social Dashboard Module

**Purpose**: Display friends' goals and enable nudging.

**Components**:

- `FriendsDashboard`: Main view showing all friends' goals
- `FriendGoalItem`: Display friend's goal with status and nudge button
- `ShameScoreDisplay`: Component showing shame scores
- `useFriendsGoals`: Hook for fetching friends' goals in real-time

**Key Functions**:

```typescript
interface SocialService {
  getFriendsGoals(friendIds: string[]): Observable<GoalWithOwner[]>;
  sendNudge(targetUserId: string, goalId: string): Promise<void>;
  addFriend(friendId: string): Promise<void>;
  getFriends(userId: string): Observable<User[]>;
}

interface GoalWithOwner extends Goal {
  ownerName: string;
  ownerShameScore: number;
}
```

### 4. Cloud Functions Module

**Purpose**: Automated background tasks for deadline monitoring and notifications.

**Functions**:

```typescript
// Scheduled function - runs every hour
export const checkGoalDeadlines = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    // Query all goals
    // Update status to Red if deadline passed
    // Increment shame score if Red for 24+ hours
    // Send FCM notifications to friends
  });

// Callable function - invoked from client
export const sendNudge = functions.https.onCall(async (data, context) => {
  const { targetUserId, goalId } = data;
  // Verify caller is friend of target
  // Send FCM notification to target user
  // Return success/failure
});
```

### 5. Notification Module

**Purpose**: Handle push notifications via FCM.

**Components**:

- `NotificationService`: Wrapper around FCM
- `useNotifications`: Hook for registering device tokens and handling incoming notifications

**Key Functions**:

```typescript
interface NotificationService {
  registerDeviceToken(userId: string): Promise<void>;
  sendNudgeNotification(
    targetUserId: string,
    senderName: string,
    goalDescription: string,
  ): Promise<void>;
  sendShameNotification(
    friendIds: string[],
    failedUserName: string,
    goalDescription: string,
  ): Promise<void>;
}
```

## Data Models

### Firestore Collections Structure

```
/artifacts/{appId}/
  /public/
    /data/
      /goals/{goalId}
        - ownerId: string
        - description: string
        - frequency: string
        - targetDays: string[]
        - latestCompletionDate: timestamp | null
        - currentStatus: 'Green' | 'Yellow' | 'Red'
        - nextDeadline: timestamp
        - isShared: boolean
        - createdAt: timestamp
        - redSince: timestamp | null  // Track when status became Red

  /users/{userId}
    - displayName: string
    - shameScore: number
    - friends: string[]  // Array of userIds
    - fcmToken: string | null
    - createdAt: timestamp
```

### Status Calculation Logic

The `currentStatus` field uses the following logic:

- **Green**: Goal completed within deadline, or deadline is more than 24 hours away
- **Yellow**: Deadline is within 24 hours and goal not yet completed
- **Red**: Deadline has passed and goal not completed

### Deadline Calculation Logic

The `nextDeadline` is calculated based on frequency and targetDays:

- **daily**: Next occurrence at 23:59 today (or tomorrow if already completed today)
- **weekly**: Next occurrence of the specified target day at 23:59
- **3x_a_week**: Next occurrence of any of the three specified target days at 23:59

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: User account initialization completeness

_For any_ valid email, password, and display name, when a new account is created, the Firestore user document should contain displayName, shameScore initialized to 0, and an empty friends array.
**Validates: Requirements 1.1, 1.3**

### Property 2: Authentication round-trip

_For any_ user account that has been created, signing in with the same credentials should grant access and return the same userId.
**Validates: Requirements 1.2, 1.5**

### Property 3: Goal creation completeness

_For any_ valid goal input (description, frequency, targetDays), when a goal is created, the resulting document should contain all input fields plus ownerId, a calculated nextDeadline in the future, currentStatus set to 'Green', and isShared set to true.
**Validates: Requirements 2.1, 2.2**

### Property 4: Goal ownership filtering

_For any_ user, querying their goals should return exactly the goals where ownerId matches their userId and no others.
**Validates: Requirements 2.3**

### Property 5: Deadline calculation validity

_For any_ frequency and targetDays combination, the calculated nextDeadline should be a future timestamp that falls on one of the specified target days.
**Validates: Requirements 2.4**

### Property 6: Goal completion state transition

_For any_ goal, when marked as complete, the latestCompletionDate should be updated to current time, nextDeadline should be recalculated to a future date, and currentStatus should be set to 'Green'.
**Validates: Requirements 2.5**

### Property 7: Friends goal visibility

_For any_ user with a non-empty friends array, querying friends' goals should return exactly the goals where ownerId is in the friends array and no others.
**Validates: Requirements 3.1**

### Property 8: Goal display completeness

_For any_ goal with owner information, the rendered output should contain the goal description, owner name, and currentStatus.
**Validates: Requirements 3.3**

### Property 9: Goal access authorization

_For any_ goal and any user, read access should be granted if and only if the user is the owner or the user's userId is in the owner's friends array.
**Validates: Requirements 3.4, 3.5**

### Property 10: Deadline expiration status update

_For any_ goal where nextDeadline is in the past, when the Cloud Function processes it, the currentStatus should be updated to 'Red'.
**Validates: Requirements 4.2**

### Property 11: Shame score increment on prolonged failure

_For any_ goal that has been in 'Red' status for 24 or more hours, when the Cloud Function processes it, the owner's shameScore should be incremented by exactly 1.
**Validates: Requirements 4.3**

### Property 12: Shame notification delivery

_For any_ shame score increment, FCM notifications should be sent to all userIds in the owner's friends array.
**Validates: Requirements 4.4**

### Property 13: Nudge button conditional display

_For any_ friend's goal, the "Nudge Now" button should be displayed if and only if the currentStatus is 'Yellow' or 'Red'.
**Validates: Requirements 5.1**

### Property 14: Nudge delivery

_For any_ nudge action on a goal, the sendNudge Cloud Function should be invoked with the goal owner's userId, and an FCM notification should be sent to that userId.
**Validates: Requirements 5.2, 5.3**

### Property 15: Nudge notification content

_For any_ nudge notification, the notification payload should contain the sender's name and the goal description.
**Validates: Requirements 5.5**

### Property 16: Shame score display

_For any_ user viewing their profile or friends dashboard, all displayed shame scores should match the current shameScore values in Firestore.
**Validates: Requirements 6.1, 6.2**

### Property 17: Atomic shame score increment

_For any_ concurrent shame score increments on the same user, all increments should be applied without loss (final value = initial value + number of increments).
**Validates: Requirements 6.4**

### Property 18: User document access control

_For any_ user, they should have read and write access to their own user document and no access to other users' documents.
**Validates: Requirements 7.1**

### Property 19: Goal read access control

_For any_ user and goal combination, read access should be granted if and only if the user is the owner or is in the owner's friends array.
**Validates: Requirements 7.2**

### Property 20: Goal write access control

_For any_ user and goal combination, write access should be granted if and only if the user is the owner.
**Validates: Requirements 7.3**

### Property 21: Status color mapping consistency

_For any_ goal status value ('Green', 'Yellow', 'Red'), the displayed color should consistently map to the same color across all UI components.
**Validates: Requirements 8.2**

## Error Handling

### Authentication Errors

- Invalid credentials: Display user-friendly error message without exposing security details
- Network failures: Retry with exponential backoff, show offline indicator
- Session expiration: Automatically redirect to sign-in screen

### Goal Operation Errors

- Invalid goal data: Validate on client before submission, show specific field errors
- Deadline calculation errors: Fall back to default deadline (24 hours from now)
- Completion failures: Retry operation, show error toast if persistent

### Cloud Function Errors

- Timeout: Log error, retry on next scheduled run
- Permission errors: Log and alert administrators
- FCM delivery failures: Log failed notifications for manual review

### Firestore Errors

- Permission denied: Show appropriate error message, log for debugging
- Network errors: Queue operations for retry when connection restored
- Quota exceeded: Implement rate limiting, show user-friendly message

### General Error Handling Strategy

- All errors should be logged with sufficient context for debugging
- User-facing errors should be clear and actionable
- Critical errors (auth, data loss) should be reported to error tracking service
- Graceful degradation: App should remain functional even if some features fail

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases for core functionality:

- **Authentication flows**: Test sign-up, sign-in, sign-out with specific credentials
- **Deadline calculation**: Test specific date/time scenarios for each frequency type
- **Status determination**: Test boundary conditions (exactly at deadline, 1 second before/after)
- **Data validation**: Test invalid inputs (empty strings, invalid dates, malformed data)
- **Error handling**: Test specific error scenarios (network failures, permission denials)

Unit tests will use Jest as the testing framework and will be co-located with source files using the `.test.ts` suffix.

### Property-Based Testing

Property-based tests will verify universal properties that should hold across all inputs using **fast-check** library:

- **Configuration**: Each property test will run a minimum of 100 iterations to ensure thorough coverage
- **Tagging**: Each property-based test will include a comment tag in the format: `**Feature: social-accountability-mvp, Property {number}: {property_text}**`
- **Coverage**: Each correctness property listed above will be implemented as a single property-based test
- **Generators**: Custom generators will be created for domain objects (User, Goal, etc.) to ensure realistic test data

Property-based tests will focus on:

- Data transformation properties (goal creation, completion, status updates)
- Authorization properties (security rules for different user/goal combinations)
- Calculation properties (deadline calculation for various frequencies)
- Invariant properties (shame score never decreases, status transitions are valid)

### Integration Testing

Integration tests will verify component interactions:

- Firebase SDK integration (auth, Firestore, FCM)
- Cloud Function invocation from client
- Real-time listener behavior
- Navigation flows between screens

### Testing Approach

1. **Implementation-first development**: Implement features before writing corresponding tests
2. **Core functionality validation**: Write tests to validate that implemented features work correctly
3. **Property tests for business logic**: Use property-based testing for deadline calculations, status updates, and authorization rules
4. **Unit tests for edge cases**: Use unit tests for specific error conditions and boundary cases
5. **Integration tests for workflows**: Test complete user flows (create account → create goal → complete goal)

## Implementation Notes

### Firebase Configuration

The app will use the existing `firebaseConfig.js` for Firebase initialization. Cloud Functions will be deployed separately using the Firebase CLI.

### Real-Time Data Synchronization

All goal and user data will use Firestore's `onSnapshot` listeners for real-time updates. This ensures that when a friend completes a goal or receives a shame score increment, all connected clients see the update immediately.

### Deadline Calculation Details

The deadline calculation must account for:

- Current time zone of the user
- Handling of goals completed early (next deadline should be the next occurrence, not immediate)
- Edge case: If all target days have passed this week, calculate for next week

### Cloud Function Scheduling

The `checkGoalDeadlines` function should run frequently enough to catch deadlines promptly but not so frequently that it incurs excessive costs. Running every hour is a reasonable balance for MVP.

### Security Rules Implementation

Firestore Security Rules will be defined in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents
    match /artifacts/{appId}/users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Goal documents
    match /artifacts/{appId}/public/data/goals/{goalId} {
      allow read: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        request.auth.uid in get(/databases/$(database)/documents/artifacts/$(appId)/users/$(resource.data.ownerId)).data.friends
      );
      allow write: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
    }
  }
}
```

### Performance Considerations

- Use Firestore indexes for common queries (goals by ownerId, goals by friends array)
- Implement pagination for goal lists if users have many goals
- Cache user data (displayName, shameScore) to reduce reads
- Use Firestore batch operations for Cloud Function updates to reduce latency

### Future Enhancements (Out of Scope for MVP)

- Goal history/analytics
- Custom goal frequencies
- Group goals (multiple people working on same goal)
- Streak tracking
- Customizable shame score penalties
- In-app messaging between friends
