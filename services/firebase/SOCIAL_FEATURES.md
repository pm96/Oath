# Social Features Documentation

This document describes the social features implementation for the Social Accountability MVP.

## Overview

The social features module enables users to:

- Add friends to their network
- View friends' goals in real-time
- See friends' shame scores
- Access goal information combined with owner details

## Components

### 1. Data Models

#### User Interface

```typescript
interface User {
  displayName: string;
  shameScore: number;
  friends: string[]; // Array of userIds
  fcmToken: string | null;
  createdAt: Date;
}
```

#### GoalWithOwner Interface

```typescript
interface GoalWithOwner extends Goal {
  ownerName: string;
  ownerShameScore: number;
}
```

### 2. Services (socialService.ts)

#### getFriendsGoals()

- **Purpose**: Subscribe to real-time updates of friends' goals
- **Parameters**:
  - `friendIds: string[]` - Array of friend user IDs
  - `callback: (goals: GoalWithOwner[]) => void` - Callback for updates
- **Returns**: Unsubscribe function
- **Requirements**: 3.1, 3.3

#### addFriend()

- **Purpose**: Add a friend to the current user's friends list
- **Parameters**:
  - `currentUserId: string` - Current user's ID
  - `friendId: string` - Friend's user ID to add
- **Throws**: Error if trying to add self or friend doesn't exist

#### getFriends()

- **Purpose**: Get list of all friends for a user
- **Parameters**: `userId: string`
- **Returns**: `Promise<User[]>`

#### getUserData()

- **Purpose**: Get user data including shame score and friends
- **Parameters**: `userId: string`
- **Returns**: `Promise<User | null>`
- **Requirements**: 6.1, 6.2

#### subscribeToUserData()

- **Purpose**: Subscribe to real-time user data updates
- **Parameters**:
  - `userId: string`
  - `callback: (user: User | null) => void`
- **Returns**: Unsubscribe function

### 3. Hooks

#### useFriendsGoals()

- **Purpose**: Manage friends' goals with real-time updates
- **Returns**:
  ```typescript
  {
    friendsGoals: GoalWithOwner[];
    loading: boolean;
    error: Error | null;
    friendIds: string[];
  }
  ```
- **Requirements**: 3.1, 3.3, 6.1, 6.2

#### useSocial()

- **Purpose**: Manage social interactions (adding friends, etc.)
- **Returns**:
  ```typescript
  {
    addFriend: (friendId: string) => Promise<void>;
    fetchFriends: () => Promise<User[]>;
    loading: boolean;
    error: Error | null;
  }
  ```

## Usage Examples

### Viewing Friends' Goals

```typescript
import { useFriendsGoals } from '@/hooks/useFriendsGoals';

function FriendsDashboard() {
  const { friendsGoals, loading, error } = useFriendsGoals();

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View>
      {friendsGoals.map(goal => (
        <View key={goal.id}>
          <Text>{goal.description}</Text>
          <Text>Owner: {goal.ownerName}</Text>
          <Text>Shame Score: {goal.ownerShameScore}</Text>
          <Text>Status: {goal.currentStatus}</Text>
        </View>
      ))}
    </View>
  );
}
```

### Adding a Friend

```typescript
import { useSocial } from '@/hooks/useSocial';

function AddFriendButton({ friendId }: { friendId: string }) {
  const { addFriend, loading } = useSocial();

  const handleAddFriend = async () => {
    try {
      await addFriend(friendId);
      alert('Friend added successfully!');
    } catch (error) {
      alert('Failed to add friend');
    }
  };

  return (
    <Button onPress={handleAddFriend} disabled={loading}>
      Add Friend
    </Button>
  );
}
```

### Displaying Shame Score

```typescript
import { subscribeToUserData } from '@/services/firebase/socialService';
import { useEffect, useState } from 'react';

function ShameScoreDisplay({ userId }: { userId: string }) {
  const [shameScore, setShameScore] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToUserData(userId, (user) => {
      if (user) {
        setShameScore(user.shameScore);
      }
    });

    return unsubscribe;
  }, [userId]);

  return <Text>Shame Score: {shameScore}</Text>;
}
```

## Requirements Coverage

- **Requirement 3.1**: getFriendsGoals displays all goals where ownerId matches any userId in user's friends array
- **Requirement 3.3**: GoalWithOwner interface combines goal data with owner name and shame score
- **Requirement 6.1**: getUserData and subscribeToUserData provide access to shame scores
- **Requirement 6.2**: Real-time updates ensure shame scores are always current

## Security Considerations

- Friends can only view goals of users in their friends list (enforced by Firestore Security Rules)
- Users cannot add themselves as friends (validated in addFriend function)
- Friend user existence is verified before adding to friends list
- All operations require authentication

## Future Enhancements

- Bidirectional friend requests (currently one-way)
- Remove friend functionality
- Friend suggestions
- Friend activity feed
- Group friends into lists
