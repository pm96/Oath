# Custom Hooks Documentation

This directory contains custom React hooks for managing various aspects of the application.

## Friend Management Hooks

### `useFriendSearch`

Hook for searching and adding friends.

**Usage:**

```typescript
import { useFriendSearch } from "@/hooks";

function MyComponent() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    error,
    sendingRequestTo,
    sendRequest,
    clearSearch,
    retrySearch,
  } = useFriendSearch(userId);

  // Use the hook values and functions
}
```

**Features:**

- Debounced search (300ms delay)
- Automatic search result updates
- Send friend request functionality
- Loading and error states

### `useFriendRequests`

Hook for managing incoming friend requests.

**Usage:**

```typescript
import { useFriendRequests } from "@/hooks";

function MyComponent() {
  const {
    pendingRequests,
    loading,
    error,
    processingRequestId,
    acceptRequest,
    rejectRequest,
  } = useFriendRequests(userId);

  // Use the hook values and functions
}
```

**Features:**

- Real-time pending requests updates
- Accept/reject functionality
- Loading and error states
- Automatic cleanup

### `useFriends`

Hook for managing the friends list.

**Usage:**

```typescript
import { useFriends } from "@/hooks";

function MyComponent() {
  const {
    currentUser,
    friendsList,
    friendsData,
    loading,
    error,
    removingFriendId,
    removeFriendById,
  } = useFriends(userId);

  // Use the hook values and functions
}
```

**Features:**

- Real-time friends list updates
- Real-time shame score updates
- Remove friend functionality
- Loading and error states
- Automatic cleanup

## Other Hooks

### `useAuth`

Authentication hook for managing user authentication state.

### `useGoals`

Hook for managing user goals.

### `useFriendsGoals`

Hook for viewing friends' goals.

### `useSocial`

Hook for social features and interactions.

### `useNotifications`

Hook for managing push notifications.

## Best Practices

1. **Always provide userId**: Most hooks require a userId parameter. Pass `undefined` if the user is not logged in.

2. **Cleanup is automatic**: All hooks handle cleanup automatically when the component unmounts.

3. **Error handling**: Hooks provide error states. Always check and handle errors in your components.

4. **Loading states**: Use loading states to show appropriate UI feedback to users.

5. **Real-time updates**: Friend-related hooks use Firestore real-time listeners, so data updates automatically.

## Requirements Coverage

- **Requirement 1.1**: User search and discovery - `useFriendSearch`
- **Requirement 2.3**: Friend request management - `useFriendRequests`
- **Requirement 3.1**: Friends list display - `useFriends`
- **Requirement 6.1, 6.2, 6.3, 6.4**: Real-time updates - All friend hooks
