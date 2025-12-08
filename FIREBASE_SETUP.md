# Firebase Setup Guide

This document provides instructions for setting up and deploying Firebase infrastructure for the Social Accountability MVP.

## Prerequisites

1. Install Firebase CLI globally:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in the project (if not already done):

```bash
firebase init
```

Select the following options:

- Firestore: Configure security rules and indexes files
- Functions: Configure Cloud Functions (for future tasks)

## Project Structure

The Firebase configuration follows this structure:

```
/artifacts/{APP_ID}/
  /users/{userId}
    - displayName: string
    - shameScore: number
    - friends: string[]
    - fcmToken: string | null
    - createdAt: timestamp

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
        - redSince: timestamp | null
```

## Deploying Firestore Security Rules

To deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

## Deploying Firestore Indexes

To deploy the indexes to Firebase:

```bash
firebase deploy --only firestore:indexes
```

## Deploy Everything

To deploy all Firebase resources at once:

```bash
firebase deploy
```

## Security Rules Overview

The security rules implement the following access control:

### User Documents

- Users can only read and write their own user document
- Path: `/artifacts/{appId}/users/{userId}`

### Goal Documents

- **Read Access**: Granted if user is the goal owner OR user is in the owner's friends list
- **Write Access**: Granted only if user is the goal owner
- **Create Access**: Granted only if user sets themselves as the owner
- Path: `/artifacts/{appId}/public/data/goals/{goalId}`

### Unauthenticated Access

- All unauthenticated requests are denied

## Testing Security Rules

You can test the security rules locally using the Firebase Emulator:

```bash
firebase emulators:start
```

Then run your app against the local emulator by updating the Firebase configuration to point to localhost.

## Firestore Indexes

The following composite indexes are configured:

1. **Goals by Owner and Deadline**
   - Fields: `ownerId` (ASC), `nextDeadline` (ASC)
   - Used for: Querying a user's goals sorted by deadline

2. **Goals by Status and Deadline**
   - Fields: `currentStatus` (ASC), `nextDeadline` (ASC)
   - Used for: Cloud Functions to find expired goals

## Configuration Files

- `firebaseConfig.js` - Client-side Firebase initialization
- `firestore.rules` - Security rules for Firestore
- `firestore.indexes.json` - Composite index definitions
- `firebase.json` - Firebase project configuration
- `services/firebase/collections.ts` - TypeScript helpers for collection references

## Validation

After deployment, verify:

1. Security rules are active in Firebase Console → Firestore → Rules
2. Indexes are created in Firebase Console → Firestore → Indexes
3. Authentication is enabled in Firebase Console → Authentication

## Requirements Satisfied

This setup satisfies the following requirements:

- **1.1, 1.2**: Firebase Authentication configured
- **7.1**: User document access control implemented
- **7.2**: Goal read access control implemented
- **7.3**: Goal write access control implemented
- **7.4**: Unauthenticated access denied
