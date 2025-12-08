# Cloud Functions Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install if not already installed

   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Login**: Authenticate with Firebase

   ```bash
   firebase login
   ```

3. **Project Selection**: Ensure you're using the correct Firebase project
   ```bash
   firebase use oath-34449
   ```

## Initial Setup

1. **Install Dependencies**

   ```bash
   cd functions
   npm install
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

## Deployment

### Deploy All Functions

```bash
# From project root
firebase deploy --only functions

# Or from functions directory
npm run deploy
```

### Deploy Specific Function

```bash
# Deploy only checkGoalDeadlines
firebase deploy --only functions:checkGoalDeadlines

# Deploy only sendNudge
firebase deploy --only functions:sendNudge
```

## Testing

### Local Emulation

```bash
cd functions
npm run serve
```

This will start the Firebase emulators for local testing.

### Test sendNudge Function Locally

```bash
# From another terminal while emulators are running
firebase functions:shell

# In the shell:
sendNudge({targetUserId: "user123", goalId: "goal456"})
```

### View Logs

```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only checkGoalDeadlines

# Follow logs in real-time
firebase functions:log --only checkGoalDeadlines --follow
```

## Monitoring

### Cloud Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `oath-34449`
3. Navigate to Functions section
4. View execution logs, errors, and performance metrics

### Check Scheduled Function

The `checkGoalDeadlines` function runs every hour. To verify it's working:

1. Check the Functions dashboard for execution history
2. View logs to see processing output
3. Monitor Firestore for status updates

## Troubleshooting

### Build Errors

If you encounter TypeScript errors:

```bash
cd functions
npm run build
```

Fix any type errors before deploying.

### Deployment Errors

**Permission Denied**: Ensure you're logged in and have proper permissions

```bash
firebase login
firebase projects:list
```

**Quota Exceeded**: Check your Firebase plan limits

**Function Timeout**: Increase timeout in function options if needed

### Runtime Errors

**FCM Token Issues**: Ensure users have registered FCM tokens
**Firestore Permission Errors**: Verify security rules allow Cloud Functions access
**Missing Data**: Check that all required fields exist in Firestore documents

## Configuration

### Environment Variables

If you need to add environment variables:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

Access in code:

```typescript
const config = functions.config();
const apiKey = config.someservice.key;
```

### Function Options

To modify function configuration (memory, timeout, region), update the function definition:

```typescript
export const checkGoalDeadlines = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "UTC",
    memory: "256MiB",
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (event) => {
    // ...
  },
);
```

## Cost Optimization

- **Scheduled Function**: Runs 24 times per day (every hour)
- **Callable Function**: Runs on-demand when users send nudges
- **Firestore Reads**: One read per goal + one read per user with shame increment
- **Firestore Writes**: Batched writes for efficiency
- **FCM Messages**: One message per friend when shame score increments

### Estimated Costs (Free Tier)

- Cloud Functions: 2M invocations/month free
- Firestore: 50K reads, 20K writes per day free
- FCM: Unlimited messages free

The MVP should stay well within free tier limits.

## Security

- Functions use Firebase Admin SDK with elevated privileges
- `sendNudge` verifies authentication and friendship relationships
- All client-side Firestore access still respects security rules
- Scheduled function has full admin access (necessary for batch updates)

## Next Steps

After deployment:

1. ✅ Verify functions appear in Firebase Console
2. ✅ Check logs for successful execution
3. ✅ Test sendNudge from the mobile app
4. ✅ Wait for scheduled function to run (or trigger manually for testing)
5. ✅ Monitor Firestore for status updates and shame score increments
6. ✅ Verify FCM notifications are received on devices
