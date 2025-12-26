# Firestore Security Rules Documentation

## Overview

This document describes the Firestore Security Rules implemented for the Social Accountability MVP application. These rules ensure proper data access control and privacy for users and their goals.

## Implementation Status

✅ **COMPLETED** - All security rules have been implemented, deployed, and tested successfully.

## Security Rules Summary

### 1. User Document Access (Requirement 7.1)

**Rule**: Users can only read and write their own user document.

```javascript
match /artifacts/{appId}/users/{userId} {
  allow read, write: if isOwner(userId);
}
```

**Validation**: ✅ Users can access their own document, denied access to others' documents.

### 2. Goal Read Access (Requirement 7.2)

**Rule**: Users can read goals if they are the owner OR if the owner has them in their friends list.

```javascript
allow read: if isAuthenticated() && (
  resource.data.ownerId == request.auth.uid ||
  exists(/databases/$(database)/documents/artifacts/$(appId)/users/$(resource.data.ownerId)) &&
  request.auth.uid in get(/databases/$(database)/documents/artifacts/$(appId)/users/$(resource.data.ownerId)).data.friends
);
```

**Validation**: ✅ Owners can read their goals, friends can read shared goals, non-friends are denied.

### 3. Goal Write Access (Requirement 7.3)

**Rule**: Only the goal owner can update or delete goals.

```javascript
allow update, delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;
allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
```

**Validation**: ✅ Owners can modify their goals, friends cannot modify even though they can read.

### 4. Unauthenticated Access (Requirement 7.4)

**Rule**: All operations require authentication.

```javascript
function isAuthenticated() {
  return request.auth != null;
}
```

**Validation**: ✅ All rules check authentication first, unauthenticated requests are denied.

### 5. Cloud Function Access (Requirement 7.5)

**Rule**: Cloud Functions have privileged access using service account credentials.

**Validation**: ✅ Cloud Functions automatically use admin SDK with elevated permissions.

## Testing

Two test scripts have been created to validate the security rules:

### 1. Comprehensive Test Suite (`scripts/test-security-rules.ts`)

Tests all security rule scenarios:

1. ✅ Unauthenticated access is denied
2. ✅ Users can read/write their own documents
3. ✅ Users cannot read/write other users' documents
4. ✅ Users can create and read their own goals
5. ✅ Users cannot read goals from non-friends
6. ✅ Users can read goals from friends
7. ✅ Users cannot write to other users' goals (even friends)

### 2. Simple Friend Access Test (`scripts/test-simple-friend-access.ts`)

Focused test that validates the friend access functionality works correctly:

- ✅ Creates two users
- ✅ User 1 creates a goal
- ✅ User 1 adds User 2 as a friend
- ✅ User 2 can successfully read User 1's goal

**Result**: ✅ All security rules are working correctly as demonstrated by successful test execution.

### Running Tests

```bash
# Run comprehensive test suite
npx tsx scripts/test-security-rules.ts

# Run simple friend access test
npx tsx scripts/test-simple-friend-access.ts
```

## Deployment

Security rules have been successfully deployed to Firebase:

```bash
firebase deploy --only firestore:rules
```

The rules are defined in `firestore.rules` and are automatically validated during deployment.

**Deployment Status**: ✅ Successfully deployed to production

## Data Structure

### User Document

```
/artifacts/{appId}/users/{userId}
  - displayName: string
  - shameScore: number
  - friends: string[]  // Array of userIds
  - fcmToken: string | null
  - createdAt: timestamp
```

### Goal Document

```
/artifacts/{appId}/public/data/goals/{goalId}
  - ownerId: string
  - description: string
  - frequency: string
  - targetDays: string[]
  - latestCompletionDate: timestamp | null
  - currentStatus: 'Green' | 'Yellow' | 'Red'
  - nextDeadline: timestamp
  - isShared: boolean
  - createdAt: timestamp
  - redSince: timestamp | null
```

## Security Considerations

1. **Friend Relationships**: The security rules check if a user is in the goal owner's friends list. This is a one-way relationship - if User A adds User B as a friend, User B can see User A's goals.

2. **Read vs Write**: Friends can read goals but cannot modify them. Only the owner has write access.

3. **Authentication Required**: All operations require a valid Firebase Authentication token.

4. **Default Deny**: Any paths not explicitly allowed are denied by the catch-all rule at the end.

5. **Hardcoded App ID**: The current implementation uses a hardcoded `oath-app` value for the app ID in the friend access check. This is acceptable for the MVP but could be made more flexible in future versions.

## Requirements Validation

All requirements from the specification have been met:

- ✅ **Requirement 7.1**: Users can only read/write their own user document
- ✅ **Requirement 7.2**: Goal read access for owner or friends
- ✅ **Requirement 7.3**: Goal write access for owner only
- ✅ **Requirement 7.4**: Deny unauthenticated access
- ✅ **Requirement 7.5**: Cloud Functions have privileged access

## Future Enhancements

- Add rate limiting for friend requests
- Implement goal sharing permissions (public/private/friends-only)
- Add audit logging for security-sensitive operations
- Implement role-based access control for admin features
- Make app ID dynamic instead of hardcoded
