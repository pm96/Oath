# Firebase Cloud Functions

This directory contains the Cloud Functions for the Social Accountability App.

## Functions

### 1. checkGoalDeadlines (Scheduled Function)

**Schedule**: Runs every 1 hour  
**Purpose**: Automated goal deadline monitoring and shame score management

**Functionality**:

- Queries all goals in the system
- Compares `nextDeadline` to current timestamp
- Updates goal status to 'Red' if deadline has passed
- Tracks when goals enter Red status using `redSince` timestamp
- Increments user's `shameScore` by 1 if goal has been Red for 24+ hours
- Sends FCM notifications to all friends when shame score is incremented
- Uses batched writes for efficient Firestore updates

**Requirements**: 4.1, 4.2, 4.3, 4.4

### 2. sendNudge (Callable Function)

**Trigger**: Called from client app  
**Purpose**: Send nudge notifications from friends

**Functionality**:

- Verifies user authentication
- Validates sender is a friend of the target user
- Retrieves sender name and goal description
- Sends FCM notification to target user with sender name and goal details
- Returns success/failure status

**Requirements**: 5.2, 5.3, 5.4, 5.5

## Setup

### Install Dependencies

```bash
cd functions
npm install
```

### Build

```bash
npm run build
```

### Deploy

```bash
# Deploy all functions
npm run deploy

# Or deploy from project root
firebase deploy --only functions
```

### Local Development

```bash
# Start Firebase emulators
npm run serve
```

### View Logs

```bash
npm run logs
```

## Data Structure

The functions interact with the following Firestore structure:

```
/artifacts/{appId}/
  /users/{userId}
    - displayName: string
    - shameScore: number
    - friends: string[]
    - fcmToken: string | null

  /public/data/goals/{goalId}
    - ownerId: string
    - description: string
    - currentStatus: 'Green' | 'Yellow' | 'Red'
    - nextDeadline: timestamp
    - redSince: timestamp | null
```

## Environment Variables

The functions use the following configuration:

- `APP_ID`: "oath-app" (hardcoded, matches client app)
- Firebase Admin SDK is initialized with default credentials

## Error Handling

- All errors are logged to Cloud Functions logs
- Failed FCM notifications are logged but don't block execution
- Batch operations ensure atomic updates
- Authentication and authorization errors return appropriate HTTPS errors

## Performance Considerations

- Uses batched writes to minimize Firestore operations
- Queries all goals once per execution
- Notifications are sent in parallel using Promise.all
- Function timeout is set to default (60 seconds for scheduled, 60 seconds for callable)

## Security

- `sendNudge` requires authentication
- Verifies friendship relationship before sending nudges
- Uses Firebase Admin SDK with elevated privileges for scheduled function
- All Firestore operations respect security rules when called from client
