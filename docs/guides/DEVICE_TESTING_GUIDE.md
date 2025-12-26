# Physical Device Testing Guide

This guide provides step-by-step instructions for testing the Social Accountability MVP on physical iOS and Android devices.

## Prerequisites

### For iOS Testing

- Physical iOS device (iPhone or iPad)
- macOS computer with Xcode installed
- Apple Developer account (for device provisioning)
- Device connected via USB or on same network

### For Android Testing

- Physical Android device
- Android Studio installed (optional but recommended)
- USB debugging enabled on device
- Device connected via USB or on same network

### General Requirements

- Firebase project configured with FCM
- App built with production Firebase configuration
- Test user accounts created
- At least 2 devices for multi-device testing

## Building for Physical Devices

### iOS Build

#### Option 1: Development Build (Recommended for Testing)

```bash
# Create development build for iOS device
eas build --profile development --platform ios

# Or use the workflow
npm run development-builds
```

#### Option 2: Local Build

```bash
# Start development server
npx expo start

# Press 'i' for iOS simulator, or scan QR code with device
```

### Android Build

#### Option 1: Development Build (Recommended for Testing)

```bash
# Create development build for Android device
eas build --profile development --platform android

# Or use the workflow
npm run development-builds
```

#### Option 2: Local Build

```bash
# Start development server
npx expo start

# Press 'a' for Android emulator, or scan QR code with device
```

## Test Scenarios

### Scenario 1: First-Time User Experience

**Objective:** Verify new user onboarding works correctly.

**Steps:**

1. Install app on Device A (fresh install)
2. Open app
3. Tap "Create Account"
4. Enter test email: `test-user-1@example.com`
5. Enter password: `TestPassword123!`
6. Enter display name: `Test User 1`
7. Tap "Create Account" button

**Expected Results:**

- [ ] Account creation succeeds
- [ ] User is automatically signed in
- [ ] Home screen loads with empty goal list
- [ ] No errors displayed

**Verification in Firebase Console:**

- [ ] User appears in Authentication → Users
- [ ] User document exists in Firestore → `artifacts/oath-app/users/{userId}`
- [ ] User document has: `shameScore: 0`, `friends: []`, `displayName: "Test User 1"`

### Scenario 2: Push Notification Setup

**Objective:** Verify FCM token is registered correctly.

**Steps:**

1. Continue from Scenario 1 (user signed in)
2. When prompted, grant notification permissions
3. Wait 2-3 seconds for token registration

**Expected Results:**

- [ ] Notification permission prompt appears
- [ ] User grants permission
- [ ] No errors displayed

**Verification in Firebase Console:**

- [ ] User document in Firestore has `fcmToken` field populated
- [ ] Token is a valid FCM token string

**Test Notification:**

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and body
4. Click "Send test message"
5. Paste the FCM token from Firestore
6. Click "Test"

**Expected Results:**

- [ ] Notification appears on device
- [ ] Tapping notification opens app

### Scenario 3: Goal Creation and Real-Time Sync

**Objective:** Verify goals can be created and sync across devices.

**Setup:**

- Device A: Signed in as User 1
- Device B: Signed in as User 2 (create second account)
- Add User 2 to User 1's friends list (manually in Firestore for now)

**Steps on Device A:**

1. Tap "Create Goal" or "+" button
2. Enter description: "Morning workout"
3. Select frequency: "Daily"
4. Select all days of the week
5. Tap "Create" button

**Expected Results on Device A:**

- [ ] Goal appears in goal list immediately
- [ ] Goal has Green status
- [ ] Goal shows correct description
- [ ] No errors displayed

**Expected Results on Device B:**

- [ ] Goal appears in Friends Dashboard within 2 seconds
- [ ] Goal shows User 1's name
- [ ] Goal shows correct description and status
- [ ] Real-time update occurs without refresh

**Verification in Firebase Console:**

- [ ] Goal document exists in `artifacts/oath-app/public/data/goals`
- [ ] Goal has correct `ownerId` (User 1's ID)
- [ ] Goal has `currentStatus: "Green"`
- [ ] Goal has `isShared: true`
- [ ] Goal has `nextDeadline` in the future

### Scenario 4: Goal Completion

**Objective:** Verify goal completion updates status and syncs.

**Steps on Device A:**

1. Find the "Morning workout" goal
2. Tap "Complete" button

**Expected Results on Device A:**

- [ ] Goal status changes to Green immediately
- [ ] Completion animation/feedback appears
- [ ] Goal shows updated completion date
- [ ] No errors displayed

**Expected Results on Device B:**

- [ ] Goal status updates to Green within 2 seconds
- [ ] Update occurs without manual refresh

**Verification in Firebase Console:**

- [ ] Goal document has `latestCompletionDate` updated
- [ ] Goal has `currentStatus: "Green"`
- [ ] Goal has `nextDeadline` recalculated to tomorrow

### Scenario 5: Nudge Notification

**Objective:** Verify nudge notifications work end-to-end.

**Setup:**

- Device A: User 1 (goal owner)
- Device B: User 2 (friend)
- Create a goal on Device A with Yellow or Red status (manually update in Firestore if needed)

**Steps on Device B:**

1. Navigate to Friends Dashboard
2. Find User 1's Yellow/Red goal
3. Verify "Nudge Now" button is visible
4. Tap "Nudge Now" button

**Expected Results on Device B:**

- [ ] Success message appears
- [ ] Button shows feedback (disabled temporarily or shows "Sent")
- [ ] No errors displayed

**Expected Results on Device A:**

- [ ] Push notification appears within 5 seconds
- [ ] Notification title: "Nudge from a Friend!"
- [ ] Notification body includes User 2's name
- [ ] Notification body includes goal description
- [ ] Tapping notification opens app

**Verification in Firebase Console:**

- [ ] Check Functions logs for `sendNudge` execution
- [ ] No errors in function logs
- [ ] FCM message sent successfully

### Scenario 6: Automated Deadline Checking

**Objective:** Verify scheduled function updates goal statuses.

**Setup:**

- Create a goal with a deadline in the near future (e.g., 10 minutes from now)
- You can manually set `nextDeadline` in Firestore to speed up testing

**Steps:**

1. Create goal on Device A with near-future deadline
2. Wait for deadline to pass
3. Wait up to 1 hour for scheduled function to run

**Expected Results:**

- [ ] Within 1 hour of deadline passing, goal status changes to Red
- [ ] Status updates on all devices viewing the goal
- [ ] `redSince` timestamp is set in Firestore

**Verification in Firebase Console:**

- [ ] Check Functions logs for `checkGoalDeadlines` execution
- [ ] Goal document has `currentStatus: "Red"`
- [ ] Goal document has `redSince` timestamp
- [ ] No errors in function logs

### Scenario 7: Shame Score Increment

**Objective:** Verify shame score increments after 24 hours of Red status.

**Setup:**

- Goal has been Red for 24+ hours (manually set `redSince` in Firestore to 25 hours ago)

**Steps:**

1. Wait for scheduled function to run (every hour)
2. Check user's shame score

**Expected Results:**

- [ ] Shame score increments by 1
- [ ] Shame score updates on all devices
- [ ] Friends receive shame notification

**Expected Notification on Friend Devices:**

- [ ] Push notification appears
- [ ] Notification title: "Friend Failed Goal!"
- [ ] Notification body includes failed user's name
- [ ] Notification body includes goal description

**Verification in Firebase Console:**

- [ ] User document has `shameScore` incremented
- [ ] Check Functions logs for shame score increment
- [ ] Check Functions logs for FCM notifications sent
- [ ] No errors in function logs

### Scenario 8: Multi-Device Real-Time Sync

**Objective:** Verify real-time synchronization across multiple devices.

**Setup:**

- Device A: User 1
- Device B: User 2 (friend of User 1)
- Device C: User 3 (friend of User 1)

**Test 1: Goal Creation Sync**

1. Create goal on Device A
2. Observe Devices B and C

**Expected Results:**

- [ ] Goal appears on Device B within 2 seconds
- [ ] Goal appears on Device C within 2 seconds
- [ ] No manual refresh needed

**Test 2: Goal Completion Sync**

1. Complete goal on Device A
2. Observe Devices B and C

**Expected Results:**

- [ ] Status updates to Green on Device B within 2 seconds
- [ ] Status updates to Green on Device C within 2 seconds
- [ ] No manual refresh needed

**Test 3: Shame Score Sync**

1. Trigger shame score increment (via function or manual update)
2. Observe all devices

**Expected Results:**

- [ ] Shame score updates on Device A (owner)
- [ ] Shame score updates on Device B (friend)
- [ ] Shame score updates on Device C (friend)
- [ ] All updates occur within 2 seconds

### Scenario 9: Offline Behavior

**Objective:** Verify app handles offline scenarios gracefully.

**Steps:**

1. Sign in on Device A
2. Load goal list
3. Turn on Airplane Mode
4. Try to create a goal
5. Try to complete a goal
6. Turn off Airplane Mode

**Expected Results:**

- [ ] Offline indicator appears when network is lost
- [ ] App shows cached data
- [ ] Operations fail gracefully with clear error messages
- [ ] When network restored, app reconnects automatically
- [ ] Pending operations retry (if implemented)
- [ ] Real-time updates resume

### Scenario 10: Error Handling

**Objective:** Verify error handling works correctly.

**Test 1: Invalid Credentials**

1. Try to sign in with wrong password
2. Expected: Clear error message, no crash

**Test 2: Empty Goal Description**

1. Try to create goal with empty description
2. Expected: Validation error, form not submitted

**Test 3: Network Error During Goal Creation**

1. Start creating goal
2. Turn off network mid-submission
3. Expected: Error message, retry option

**Test 4: Permission Denied**

1. Try to access another user's goal (manually via deep link if possible)
2. Expected: Permission denied error, graceful handling

## Performance Testing

### App Launch Time

- [ ] Cold start: < 3 seconds
- [ ] Warm start: < 1 second
- [ ] No splash screen hang

### Data Loading

- [ ] Goal list loads: < 2 seconds
- [ ] Friends dashboard loads: < 2 seconds
- [ ] Real-time updates: < 2 seconds

### UI Responsiveness

- [ ] Button taps respond immediately
- [ ] No lag in scrolling
- [ ] Smooth animations
- [ ] No frame drops

### Memory Usage

- [ ] App doesn't crash after extended use
- [ ] No memory leaks (test by using app for 30+ minutes)
- [ ] Background operation doesn't drain battery excessively

## Security Testing

### Authentication

- [ ] Cannot access app without signing in
- [ ] Session persists across app restarts
- [ ] Sign out works correctly
- [ ] Cannot access another user's data

### Data Access

- [ ] Cannot view non-friend's goals
- [ ] Cannot modify other users' goals
- [ ] Cannot modify other users' shame scores
- [ ] Security rules enforce access control

## Troubleshooting

### Notifications Not Received

**Check:**

1. Notification permissions granted in device settings
2. FCM token saved in Firestore user document
3. Firebase Cloud Messaging enabled in Firebase Console
4. Function logs show no errors
5. Device has internet connection
6. App is not in battery saver mode (Android)

**Debug:**

```bash
# Check function logs
firebase functions:log --only sendNudge

# Send test notification from Firebase Console
# Cloud Messaging → Send test message
```

### Real-Time Updates Not Working

**Check:**

1. User is authenticated
2. Internet connection is active
3. Firestore security rules allow read access
4. No errors in browser/app console

**Debug:**

- Check Firestore security rules in Firebase Console
- Verify user is in friends list
- Check network tab for WebSocket connection

### Goal Status Not Updating

**Check:**

1. Scheduled function is running (check logs)
2. Goal deadline has actually passed
3. Function has no errors

**Debug:**

```bash
# Check scheduled function logs
firebase functions:log --only checkGoalDeadlines

# Manually trigger function (if test function exists)
```

### App Crashes

**Check:**

1. Device logs for crash reports
2. Firebase Crashlytics (if enabled)
3. Console errors

**Debug:**

- Connect device to computer
- View logs in Xcode (iOS) or Android Studio (Android)
- Check for JavaScript errors in Metro bundler

## Test Data Cleanup

After testing, clean up test data:

1. **Delete Test Users:**
   - Firebase Console → Authentication → Users
   - Delete test user accounts

2. **Delete Test Goals:**
   - Firebase Console → Firestore → `artifacts/oath-app/public/data/goals`
   - Delete test goal documents

3. **Delete Test User Documents:**
   - Firebase Console → Firestore → `artifacts/oath-app/users`
   - Delete test user documents

## Reporting Issues

When reporting issues, include:

- Device model and OS version
- App version/build number
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or screen recordings
- Relevant logs from Firebase Console
- Network conditions (WiFi, cellular, offline)

## Sign-Off Checklist

After completing all tests:

- [ ] All critical scenarios pass
- [ ] Push notifications work on iOS
- [ ] Push notifications work on Android
- [ ] Real-time sync works across devices
- [ ] Performance is acceptable
- [ ] No critical bugs found
- [ ] Error handling is graceful
- [ ] Security is verified

**Tested By:** ********\_********

**Date:** ********\_********

**Devices Used:**

- iOS: ********\_********
- Android: ********\_********

**Notes:**
