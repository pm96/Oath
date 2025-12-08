# Deployment Guide - Social Accountability MVP

This guide covers the complete deployment process for the Social Accountability MVP application.

## Prerequisites

Before deploying, ensure you have:

1. **Firebase CLI installed**

   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project configured**
   - Project ID: `oath-app` (or your configured project)
   - Firebase Authentication enabled
   - Firestore database created
   - Cloud Functions enabled (Blaze plan required)
   - Firebase Cloud Messaging enabled

3. **Logged into Firebase**

   ```bash
   firebase login
   ```

4. **Correct Firebase project selected**
   ```bash
   firebase use <project-id>
   ```

## Deployment Checklist

### 1. Pre-Deployment Verification

- [ ] All code changes committed to version control
- [ ] Environment variables configured in `.env` (if any)
- [ ] Firebase project ID verified in `.firebaserc`
- [ ] Node.js version matches functions requirement (Node 20)
- [ ] All dependencies installed (`npm install` in root and `functions/`)

### 2. Build and Test Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify build output exists
ls lib/index.js
```

### 3. Deploy Firestore Security Rules

```bash
# From project root
firebase deploy --only firestore:rules

# Verify in Firebase Console:
# https://console.firebase.google.com/project/<project-id>/firestore/rules
```

**Expected Rules:**

- User documents: Read/write only by owner
- Goal documents: Read by owner or friends, write by owner only
- All other access denied

### 4. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes

# Verify in Firebase Console:
# https://console.firebase.google.com/project/<project-id>/firestore/indexes
```

### 5. Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:checkGoalDeadlines
firebase deploy --only functions:sendNudge
```

**Expected Functions:**

- `checkGoalDeadlines`: Scheduled function (runs every hour)
- `sendNudge`: Callable function (invoked from client)

### 6. Verify Cloud Functions Deployment

```bash
# List deployed functions
firebase functions:list

# Check function logs
firebase functions:log --only checkGoalDeadlines
firebase functions:log --only sendNudge
```

### 7. Configure Production Environment

#### Firebase Console Checklist:

1. **Authentication** (`/authentication/providers`)
   - [ ] Email/Password provider enabled
   - [ ] Authorized domains configured

2. **Firestore** (`/firestore/data`)
   - [ ] Database created in appropriate region
   - [ ] Security rules deployed and active
   - [ ] Indexes created (check for any building indexes)

3. **Cloud Functions** (`/functions`)
   - [ ] Both functions deployed and active
   - [ ] Scheduler configured for `checkGoalDeadlines`
   - [ ] No errors in function logs

4. **Cloud Messaging** (`/settings/cloudmessaging`)
   - [ ] FCM enabled
   - [ ] Server key available (for testing)

### 8. Test Push Notifications on Physical Devices

#### iOS Testing:

1. Build app with production Firebase config
2. Install on physical iOS device
3. Grant notification permissions
4. Verify FCM token is saved to Firestore
5. Test nudge notification from another device
6. Test shame notification (wait for scheduled function or trigger manually)

#### Android Testing:

1. Build app with production Firebase config
2. Install on physical Android device
3. Grant notification permissions
4. Verify FCM token is saved to Firestore
5. Test nudge notification from another device
6. Test shame notification

### 9. Verify Real-Time Synchronization

Test with multiple devices:

1. **Goal Creation Sync**
   - [ ] Create goal on Device A
   - [ ] Verify appears on Device B in real-time

2. **Goal Completion Sync**
   - [ ] Complete goal on Device A
   - [ ] Verify status updates on Device B immediately

3. **Shame Score Sync**
   - [ ] Trigger shame score increment
   - [ ] Verify updates on all friend devices

4. **Friend Addition Sync**
   - [ ] Add friend on Device A
   - [ ] Verify friend's goals appear on Device A
   - [ ] Verify Device A's goals appear on friend's device

### 10. End-to-End User Flow Testing

#### Complete User Journey:

1. **Account Creation**
   - [ ] Create new account
   - [ ] Verify user document created in Firestore
   - [ ] Verify initial shameScore = 0
   - [ ] Verify empty friends array

2. **Goal Management**
   - [ ] Create daily goal
   - [ ] Create weekly goal
   - [ ] Create 3x/week goal
   - [ ] Verify all goals appear in list
   - [ ] Complete a goal
   - [ ] Verify status changes to Green
   - [ ] Verify nextDeadline recalculated

3. **Social Features**
   - [ ] Add friend (requires friend's userId)
   - [ ] View friend's goals
   - [ ] Send nudge to friend
   - [ ] Verify friend receives notification
   - [ ] Verify nudge button only shows for Yellow/Red goals

4. **Automated Monitoring**
   - [ ] Wait for goal deadline to pass
   - [ ] Verify status changes to Red (within 1 hour)
   - [ ] Wait 24 hours with Red goal
   - [ ] Verify shame score increments
   - [ ] Verify friends receive shame notification

## Deployment Commands Reference

### Quick Deploy All

```bash
# Deploy everything at once
firebase deploy
```

### Selective Deployment

```bash
# Deploy only security rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:checkGoalDeadlines
```

### Rollback

```bash
# Rollback functions to previous version
firebase rollback functions

# View deployment history
firebase functions:list
```

## Monitoring and Maintenance

### Check Function Logs

```bash
# Real-time logs
firebase functions:log --only checkGoalDeadlines

# Filter by time
firebase functions:log --since 1h

# Filter by severity
firebase functions:log --only checkGoalDeadlines --severity ERROR
```

### Monitor Function Performance

- Firebase Console → Functions → Dashboard
- Check execution time, memory usage, error rate
- Set up alerts for function failures

### Monitor Firestore Usage

- Firebase Console → Firestore → Usage
- Check read/write operations
- Monitor storage size
- Set up billing alerts

## Troubleshooting

### Functions Not Deploying

```bash
# Check Node version
node --version  # Should be 20.x

# Rebuild functions
cd functions
rm -rf lib node_modules
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Security Rules Errors

```bash
# Test rules locally
firebase emulators:start --only firestore

# Check rules syntax
firebase firestore:rules:get
```

### Notifications Not Working

1. Verify FCM is enabled in Firebase Console
2. Check device FCM token is saved in Firestore
3. Verify notification permissions granted on device
4. Check function logs for FCM errors
5. Test with Firebase Console → Cloud Messaging → Send test message

### Real-Time Sync Issues

1. Check Firestore security rules allow read access
2. Verify user is authenticated
3. Check network connectivity
4. Verify Firestore listeners are properly set up in code
5. Check browser/app console for errors

## Production Configuration

### Environment Variables

If using environment variables, configure them:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

### Firestore Indexes

Monitor index creation status:

- Firebase Console → Firestore → Indexes
- Wait for all indexes to finish building before testing

### Function Timeout and Memory

Adjust in `functions/src/index.ts` if needed:

```typescript
export const checkGoalDeadlines = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "UTC",
    timeoutSeconds: 540, // 9 minutes max
    memory: "256MiB", // Adjust as needed
  },
  async (event) => {
    // ...
  },
);
```

## Post-Deployment Verification

After deployment, verify:

1. **Firebase Console Checks**
   - [ ] All functions show "Healthy" status
   - [ ] Security rules show last deployed timestamp
   - [ ] No errors in function logs
   - [ ] Scheduler shows next run time for checkGoalDeadlines

2. **App Functionality**
   - [ ] Users can sign up and sign in
   - [ ] Goals can be created and completed
   - [ ] Friends can be added
   - [ ] Real-time updates work
   - [ ] Notifications are received

3. **Performance**
   - [ ] App loads quickly
   - [ ] Real-time updates are instant
   - [ ] No lag in UI interactions
   - [ ] Functions complete within timeout

## Support and Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firebase Console**: https://console.firebase.google.com
- **Firebase Status**: https://status.firebase.google.com
- **Firebase Support**: https://firebase.google.com/support

## Rollback Plan

If issues occur after deployment:

1. **Rollback Functions**

   ```bash
   firebase rollback functions
   ```

2. **Revert Security Rules**
   - Keep previous rules in version control
   - Deploy previous version: `firebase deploy --only firestore:rules`

3. **Monitor Logs**

   ```bash
   firebase functions:log --severity ERROR
   ```

4. **Communicate with Users**
   - Notify users of any downtime
   - Provide status updates
   - Document issues for post-mortem
