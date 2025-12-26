# Design Document: Friend Management UI

## Overview

The Friend Management UI feature completes the social accountability mechanism by providing users with the ability to discover, connect with, and manage their accountability partners. This feature bridges the gap between the existing backend social infrastructure and the user-facing interface, enabling the core value proposition of peer accountability.

The design introduces three main components:

1. **User Search & Discovery** - Find other users by email or display name
2. **Friend Request System** - Send, receive, accept, and reject friend requests
3. **Enhanced Navigation** - Three-tab structure (Home, Friends, Profile) for intuitive access

The architecture leverages existing Firebase infrastructure (Firestore, Cloud Functions, FCM) and integrates seamlessly with the current codebase patterns established in the social-accountability-mvp spec.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                   Tab Navigation (3 tabs)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Home Tab    │  │ Friends Tab  │  │ Profile Tab  │      │
│  │ (My Goals)   │  │ (Search +    │  │ (User Info)  │      │
│  │              │  │  Friends)    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  UserSearch    │  │ FriendRequests  │  │  FriendsList   │
│  Component     │  │   Component     │  │   Component    │
└───────┬────────┘  └────────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ FriendService   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│   Firestore    │  │ Cloud Functions │  │      FCM       │
│ (friendRequests│  │ (sendFriend     │  │ (notifications)│
│  collection)   │  │  RequestNotif)  │  │                │
└────────────────┘  └─────────────────┘  └────────────────┘
```

### Technology Stack

- **Frontend**: Expo SDK 52+, React Native, TypeScript, Expo Router
- **Backend**: Firebase (Firestore, Cloud Functions, FCM)
- **State Management**: React hooks with real-time Firestore listeners
- **Navigation**: Expo Router (file-based routing with tabs)
- **UI Components**: GluestackUI components from `/components/ui`
- **Testing**: Jest for unit tests, fast-check for property-based testing

## Components and Interfaces

### 1. Friend Service Module

**Purpose**: Handle all friend-related operations including search, requests, and relationship management.

**Location**: `services/firebase/friendService.ts`

**Key Functions**:

```typescript
interface FriendService {
  // User search
  searchUsers(
    query: string,
    currentUserId: string,
  ): Promise<UserSearchResult[]>;

  // Friend requests
  sendFriendRequest(senderId: string, receiverId: string): Promise<string>;
  acceptFriendRequest(requestId: string, currentUserId: string): Promise<void>;
  rejectFriendRequest(requestId: string, currentUserId: string): Promise<void>;

  // Friend management
  removeFriend(currentUserId: string, friendId: string): Promise<void>;

  // Real-time subscriptions
  subscribeToPendingRequests(
    userId: string,
    callback: (requests: FriendRequest[]) => void,
  ): () => void;

  subscribeToPendingRequestsCount(
    userId: string,
    callback: (count: number) => void,
  ): () => void;
}

interface UserSearchResult {
  userId: string;
  displayName: string;
  email: string;
  relationshipStatus: "none" | "friend" | "pending_sent" | "pending_received";
  shameScore?: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}
```

### 2. User Search Component

**Purpose**: Allow users to search for other users by email or display name.

**Location**: `components/friends/UserSearch.tsx`

**Key Features**:

- Debounced search input to reduce Firestore queries
- Display search results with relationship status indicators
- Action buttons based on relationship status (Add Friend, Pending, Already Friends)
- Empty states for no query and no results

**Props Interface**:

```typescript
interface UserSearchProps {
  currentUserId: string;
  onUserSelect?: (user: UserSearchResult) => void;
}
```

### 3. Friend Requests Component

**Purpose**: Display and manage incoming friend requests.

**Location**: `components/friends/FriendRequests.tsx`

**Key Features**:

- List of pending incoming requests
- Accept/Reject actions with confirmation
- Real-time updates when requests are accepted/rejected
- Badge count for tab navigation
- Empty state when no pending requests

**Props Interface**:

```typescript
interface FriendRequestsProps {
  userId: string;
  onRequestHandled?: () => void;
}
```

### 4. Friends List Component

**Purpose**: Display all current friends with their shame scores.

**Location**: `components/friends/FriendsList.tsx`

**Key Features**:

- List of friends with displayName, email, and shame score
- Real-time shame score updates
- Tap to view friend's goals
- Swipe-to-delete or long-press for remove friend action
- Empty state encouraging users to add friends

**Props Interface**:

```typescript
interface FriendsListProps {
  userId: string;
  onFriendSelect?: (friendId: string) => void;
}
```

### 5. Friends Tab Screen

**Purpose**: Main screen combining search, requests, and friends list.

**Location**: `app/(tabs)/friends.tsx`

**Layout Structure**:

- Search bar at top (sticky)
- Pending requests section (collapsible, shows count badge)
- Friends list below
- Pull-to-refresh for entire screen

### 6. Profile Tab Screen

**Purpose**: Display user's profile information and settings.

**Location**: `app/(tabs)/profile.tsx`

**Key Features**:

- User's displayName and email
- Large shame score display
- Sign out button
- Future: Settings and preferences

### 7. Enhanced Tab Navigation

**Purpose**: Provide three-tab navigation structure.

**Location**: `app/(tabs)/_layout.tsx` (update existing)

**Tabs**:

1. **Home** - My Goals (existing)
2. **Friends** - Search, requests, friends list (new)
3. **Profile** - User info and settings (new)

### 8. Cloud Function for Friend Request Notifications

**Purpose**: Send push notifications when friend requests are sent or accepted.

**Location**: `functions/src/index.ts` (add new function)

**Function**:

```typescript
export const sendFriendRequestNotification = functions.firestore
  .document("artifacts/{appId}/friendRequests/{requestId}")
  .onCreate(async (snap, context) => {
    // Send FCM notification to receiver
  });

export const sendFriendRequestAcceptedNotification = functions.firestore
  .document("artifacts/{appId}/friendRequests/{requestId}")
  .onUpdate(async (change, context) => {
    // If status changed to 'accepted', notify sender
  });
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
    - searchableEmail: string  // Lowercase for case-insensitive search
    - searchableName: string   // Lowercase for case-insensitive search

  /friendRequests/{requestId}
    - senderId: string
    - senderName: string
    - senderEmail: string
    - receiverId: string
    - status: 'pending' | 'accepted' | 'rejected'
    - createdAt: timestamp
    - updatedAt: timestamp
```

### Search Strategy

To enable efficient user search:

1. **Email Search**: Query users collection where `searchableEmail` starts with lowercase query
2. **Name Search**: Query users collection where `searchableName` contains lowercase query
3. **Composite Index**: Create Firestore composite index for efficient queries
4. **Client-side Filtering**: Exclude current user and apply relationship status

### Friend Request Workflow

```
1. User A searches for User B
2. User A taps "Add Friend"
   → Create friendRequest document (status: 'pending')
   → Trigger Cloud Function to send FCM notification to User B
3. User B receives notification
   → Opens app to Friends tab
   → Sees pending request in "Pending Requests" section
4. User B taps "Accept"
   → Update friendRequest status to 'accepted'
   → Add User A's ID to User B's friends array
   → Add User B's ID to User A's friends array (atomic batch write)
   → Trigger Cloud Function to send FCM notification to User A
5. Both users now see each other in friends list
```

### Friend Removal Workflow

```
1. User A views friend list
2. User A swipes or long-presses on User B
3. User A confirms "Remove Friend"
   → Remove User B's ID from User A's friends array
   → Remove User A's ID from User B's friends array (atomic batch write)
   → User B's goals immediately disappear from User A's view
   → User A's goals immediately disappear from User B's view
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Search results match query

_For any_ search query and user database, all returned results should have either email or displayName matching the query, and should never include the searching user's own account.
**Validates: Requirements 1.1**

### Property 2: Search result display completeness

_For any_ search result, the rendered output should contain both displayName and email fields.
**Validates: Requirements 1.2**

### Property 3: Search result relationship status accuracy

_For any_ search result, the displayed relationship status should accurately reflect the current state (none, friend, pending_sent, pending_received) based on Firestore data.
**Validates: Requirements 1.3**

### Property 4: Friend request creation completeness

_For any_ friend request creation, the Firestore document should contain senderId, receiverId, status 'pending', and a valid createdAt timestamp.
**Validates: Requirements 2.1**

### Property 5: Friend request UI status update

_For any_ sent friend request, the UI should update to show "Request Sent" status for that user in search results.
**Validates: Requirements 2.2**

### Property 6: Pending requests display completeness

_For any_ user with incoming friend requests, all pending requests should appear in the "Pending Requests" section.
**Validates: Requirements 2.3**

### Property 7: Friend request acceptance bidirectionality

_For any_ accepted friend request, both users should have each other's ID in their friends array and the request status should be 'accepted'.
**Validates: Requirements 2.4**

### Property 8: Friend request rejection cleanup

_For any_ rejected friend request, the request status should be 'rejected' and it should not appear in the pending requests list.
**Validates: Requirements 2.5**

### Property 9: Friends list completeness

_For any_ user, the friends list should display exactly the users whose IDs are in the user's friends array.
**Validates: Requirements 3.1**

### Property 10: Friend display completeness

_For any_ displayed friend, the rendered output should contain displayName, email, and current shameScore.
**Validates: Requirements 3.2**

### Property 11: Real-time shame score synchronization

_For any_ friend whose shame score changes, the displayed value should update to reflect the new score.
**Validates: Requirements 3.3, 6.3**

### Property 12: Friend navigation behavior

_For any_ friend tap action, the app should navigate to a view showing that friend's goals.
**Validates: Requirements 3.5**

### Property 13: Tab navigation state preservation

_For any_ sequence of tab navigations, returning to a previously visited tab should preserve its scroll position and component state.
**Validates: Requirements 4.5**

### Property 14: Friend removal option visibility

_For any_ friend's detail view, a "Remove Friend" option should be displayed.
**Validates: Requirements 5.1**

### Property 15: Friend removal bidirectionality and atomicity

_For any_ friend removal, both users should have each other's ID removed from their friends arrays atomically (either both succeed or both fail).
**Validates: Requirements 5.2, 5.4**

### Property 16: Friend removal goal visibility

_For any_ friend removal, the removed friend's goals should immediately disappear from the user's friends dashboard.
**Validates: Requirements 5.3**

### Property 17: Friend removal confirmation feedback

_For any_ friend removal, the app should display a confirmation message.
**Validates: Requirements 5.5**

### Property 18: Real-time friend list updates

_For any_ friend request acceptance, the new friend should immediately appear in both users' friends lists without requiring a refresh.
**Validates: Requirements 6.1**

### Property 19: Real-time display name updates

_For any_ friend's displayName change, the updated name should appear across all screens showing that friend.
**Validates: Requirements 6.2**

### Property 20: Real-time pending request updates

_For any_ pending request status change (accepted or rejected), the request should immediately disappear from the pending requests list.
**Validates: Requirements 6.4**

### Property 21: Friend request notification delivery

_For any_ friend request creation, an FCM notification should be sent to the receiver containing the sender's name.
**Validates: Requirements 7.1, 7.2**

### Property 22: Friend request notification navigation

_For any_ friend request notification tap, the app should navigate to the pending requests section.
**Validates: Requirements 7.3**

### Property 23: Friend request acceptance notification

_For any_ friend request acceptance, an FCM notification should be sent to the original sender.
**Validates: Requirements 7.4**

### Property 24: Pending requests badge count accuracy

_For any_ user, the badge count on the Friends tab should equal the number of pending incoming requests.
**Validates: Requirements 7.5**

### Property 25: Friend request sender authorization

_For any_ friend request creation attempt, the operation should only succeed if the senderId matches the authenticated user's ID.
**Validates: Requirements 8.1**

### Property 26: Friend request acceptance authorization

_For any_ friend request acceptance attempt, the operation should only succeed if the receiverId matches the authenticated user's ID.
**Validates: Requirements 8.2**

### Property 27: Friend removal authorization

_For any_ friend removal attempt, the operation should only succeed if the authenticated user is one of the two parties in the friendship.
**Validates: Requirements 8.3**

### Property 28: Friend request query filtering

_For any_ user querying friend requests, only requests where the user is sender or receiver should be returned.
**Validates: Requirements 8.4**

### Property 29: Unauthenticated access denial

_For any_ unauthenticated friend-related operation attempt, the operation should be denied.
**Validates: Requirements 8.5**

### Property 30: Touch target size compliance

_For any_ interactive element in friend management UI (buttons, list items), the touch target should be at least 44x44 pixels.
**Validates: Requirements 9.3**

### Property 31: Friend action visual feedback

_For any_ friend-related action (add, accept, reject, remove), the app should provide immediate visual feedback (loading state or success message).
**Validates: Requirements 9.4**

## Error Handling

### Search Errors

- **Empty query**: Display prompt to enter search term
- **No results**: Display "No users found" message with suggestion to check spelling
- **Network error**: Show offline indicator, cache last results
- **Permission denied**: Log error, show generic error message

### Friend Request Errors

- **Duplicate request**: Prevent sending if request already exists (check before creation)
- **Self-request**: Validate on client and server, show error "Cannot add yourself"
- **Already friends**: Show "Already friends" status, disable add button
- **Network error**: Retry with exponential backoff, show error toast
- **Firestore write failure**: Show error message, allow retry

### Friend Removal Errors

- **Network error**: Queue operation for retry, show pending state
- **Partial failure**: Use Firestore batch writes to ensure atomicity
- **Permission denied**: Show error message, log for debugging

### Notification Errors

- **FCM token missing**: Log warning, continue without notification
- **FCM delivery failure**: Log error for manual review, don't block operation
- **Cloud Function timeout**: Retry on next trigger, log error

### General Error Handling Strategy

- All errors logged with context for debugging
- User-facing errors are clear and actionable
- Network errors trigger retry logic with exponential backoff
- Critical operations (friend acceptance, removal) use Firestore transactions/batches
- Graceful degradation: App remains functional even if notifications fail

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Search functionality**: Test specific queries, empty results, self-exclusion
- **Friend request workflow**: Test creation, acceptance, rejection with specific users
- **Relationship status determination**: Test all status combinations
- **Data validation**: Test invalid inputs (empty IDs, malformed data)
- **Error handling**: Test specific error scenarios (network failures, permission denials)

Unit tests will use Jest and be co-located with source files using `.test.ts` suffix.

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** library:

- **Configuration**: Each property test will run a minimum of 100 iterations
- **Tagging**: Format: `**Feature: friend-management-ui, Property {number}: {property_text}**`
- **Coverage**: Each correctness property will be implemented as a single property-based test

Property-based tests will focus on:

- Search result filtering (self-exclusion, relationship status accuracy)
- Friend request state transitions (pending → accepted, bidirectionality)
- Friend removal atomicity (both users updated together)
- Real-time update consistency (shame scores, friend lists)
- Authorization properties (only authorized users can perform actions)

### Integration Testing

Integration tests will verify component interactions:

- Complete friend request flow (search → send → accept → appears in list)
- Friend removal flow (remove → goals disappear → both users updated)
- Navigation flow (tab switching, state preservation)
- Real-time listener behavior (updates propagate correctly)
- Notification delivery (FCM triggers on correct events)

### Testing Approach

1. **Implementation-first development**: Implement features before writing tests
2. **Core functionality validation**: Write tests to validate implemented features work
3. **Property tests for business logic**: Use PBT for search, requests, relationships
4. **Unit tests for edge cases**: Test specific error conditions and boundary cases
5. **Integration tests for workflows**: Test complete user flows end-to-end

## Implementation Notes

### Firebase Configuration

The app will use existing `firebaseConfig.js`. Cloud Functions will be added to existing `functions/src/index.ts`.

### Real-Time Data Synchronization

All friend-related data will use Firestore's `onSnapshot` listeners:

- Friend requests list updates in real-time
- Friends list updates when requests accepted
- Shame scores update in real-time
- Badge counts update immediately

### Search Performance Optimization

To optimize search performance:

1. **Debouncing**: Debounce search input by 300ms to reduce queries
2. **Indexed fields**: Use `searchableEmail` and `searchableName` (lowercase) for efficient queries
3. **Limit results**: Limit search results to 20 users
4. **Client-side caching**: Cache recent search results for 5 minutes
5. **Composite indexes**: Create Firestore composite indexes for search queries

### Firestore Security Rules

Add to existing `firestore.rules`:

```javascript
// Friend requests collection
match /artifacts/{appId}/friendRequests/{requestId} {
  // Users can read requests where they are sender or receiver
  allow read: if request.auth != null && (
    resource.data.senderId == request.auth.uid ||
    resource.data.receiverId == request.auth.uid
  );

  // Users can create requests where they are the sender
  allow create: if request.auth != null &&
    request.resource.data.senderId == request.auth.uid &&
    request.resource.data.status == 'pending';

  // Users can update requests where they are the receiver (to accept/reject)
  allow update: if request.auth != null &&
    resource.data.receiverId == request.auth.uid &&
    request.resource.data.status in ['accepted', 'rejected'];
}

// User documents - add search fields
match /artifacts/{appId}/users/{userId} {
  // Existing rules...

  // Allow reading any user document for search purposes
  allow read: if request.auth != null;
}
```

### Navigation Implementation

Update `app/(tabs)/_layout.tsx` to include three tabs:

```typescript
<Tabs>
  <Tabs.Screen name="home" options={{ title: "My Goals", icon: "check-circle" }} />
  <Tabs.Screen name="friends" options={{ title: "Friends", icon: "people", badge: pendingCount }} />
  <Tabs.Screen name="profile" options={{ title: "Profile", icon: "person" }} />
</Tabs>
```

### Performance Considerations

- Use `FlatList` for all scrollable lists (search results, friends, requests)
- Implement pagination for search results if needed
- Cache user data (displayName, email) to reduce reads
- Use Firestore batch operations for friend acceptance/removal
- Debounce search input to reduce query frequency
- Optimize re-renders with `React.memo` and `useCallback`

### Accessibility Considerations

- All interactive elements have minimum 44x44pt touch targets
- Proper labels for screen readers
- Color contrast ratios meet WCAG AA standards
- Focus indicators for keyboard navigation (web)
- Semantic HTML elements for web version

### Future Enhancements (Out of Scope for MVP)

- Friend suggestions based on mutual friends
- Friend groups/categories
- Block/unblock users
- Friend request expiration
- Search by username (in addition to email/name)
- QR code for easy friend adding
- Import contacts for friend suggestions
