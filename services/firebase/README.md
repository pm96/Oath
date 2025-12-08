# Firebase Services

This directory contains Firebase service modules and utilities for the Social Accountability MVP.

## Structure

```
services/firebase/
├── collections.ts    # Firestore collection references and type definitions
└── README.md        # This file
```

## Collections Module

The `collections.ts` module provides:

1. **Type Definitions**: TypeScript interfaces for User and Goal data models
2. **Collection References**: Helper functions to get typed Firestore collection references
3. **Document References**: Helper functions to get specific document references

### Usage Example

```typescript
import {
  getUsersCollection,
  getUserDoc,
  getGoalsCollection,
  getGoalDoc,
} from "@/services/firebase/collections";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Get a user document
const userRef = getUserDoc("user123");
const userSnap = await getDoc(userRef);

// Query goals collection
const goalsRef = getGoalsCollection();
const q = query(goalsRef, where("ownerId", "==", "user123"));
const querySnapshot = await getDocs(q);
```

## Data Models

### User

```typescript
interface User {
  displayName: string;
  shameScore: number;
  friends: string[];
  fcmToken: string | null;
  createdAt: Date;
}
```

### Goal

```typescript
interface Goal {
  id: string;
  ownerId: string;
  description: string;
  frequency: "daily" | "weekly" | "3x_a_week";
  targetDays: string[];
  latestCompletionDate: Date | null;
  currentStatus: "Green" | "Yellow" | "Red";
  nextDeadline: Date;
  isShared: boolean;
  createdAt: Date;
  redSince: Date | null;
}
```

## Firestore Path Structure

All data is stored under the `/artifacts/{APP_ID}/` path:

- **Users**: `/artifacts/{APP_ID}/users/{userId}`
- **Goals**: `/artifacts/{APP_ID}/public/data/goals/{goalId}`

This structure allows for:

- Clear separation of user data and shared data
- Easier security rule management
- Future multi-tenancy support if needed

## Security

Access control is enforced through Firestore Security Rules (see `firestore.rules`):

- Users can only access their own user documents
- Goals are readable by owner and friends
- Goals are writable only by owner
- All unauthenticated requests are denied
