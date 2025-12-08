# Verification Checklist - Social Accountability MVP

Use this checklist to verify all functionality before considering the deployment complete.

## Pre-Deployment Verification

### Code Quality

- [ ] All TypeScript files compile without errors
- [ ] No ESLint errors or warnings
- [ ] All imports are correct and no unused imports
- [ ] Environment variables are properly configured
- [ ] Firebase configuration is correct for production

### Build Verification

- [ ] Mobile app builds successfully for iOS
- [ ] Mobile app builds successfully for Android
- [ ] Cloud Functions build successfully (`npm run build` in functions/)
- [ ] No build warnings or errors

## Deployment Verification

### Firebase Console Checks

#### Authentication

- [ ] Navigate to Firebase Console → Authentication
- [ ] Email/Password provider is enabled
- [ ] Test user accounts can be created
- [ ] Authorized domains include your app domain

#### Firestore Database

- [ ] Navigate to Firebase Console → Firestore Database
- [ ] Database is created and active
- [ ] Collections structure exists: `artifacts/oath-app/users` and `artifacts/oath-app/public/data/goals`
- [ ] Security rules are deployed (check timestamp)
- [ ] Indexes are created and active (not building)

#### Cloud Functions

- [ ] Navigate to Firebase Console → Functions
- [ ] `checkGoalDeadlines` function is deployed and healthy
- [ ] `sendNudge` function is deployed and healthy
- [ ] Scheduler is configured for `checkGoalDeadlines` (every 1 hour)
- [ ] No errors in function logs (last 24 hours)

#### Cloud Messaging

- [ ] Navigate to Firebase Console → Cloud Messaging
- [ ] FCM is enabled
- [ ] Server key is available

### Security Rules Verification

Test security rules with the following scenarios:

#### User Document Access

- [ ] User can read their own user document
- [ ] User cannot read another user's document
- [ ] User can write to their own user document
- [ ] User cannot write to another user's document
- [ ] Unauthenticated users cannot access any user documents

#### Goal Document Access

- [ ] User can read their own goals
- [ ] User can read goals of users in their friends list
- [ ] User cannot read goals of non-friends
- [ ] User can create goals with themselves as owner
- [ ] User cannot create goals with another user as owner
- [ ] User can update/delete their own goals
- [ ] User cannot update/delete other users' goals
- [ ] Unauthenticated users cannot access any goals

## End-to-End User Flow Testing

### Flow 1: New User Onboarding

- [ ] Open app on fresh install
- [ ] Navigate to "Create Account" screen
- [ ] Enter email, password, and display name
- [ ] Submit form
- [ ] Verify account is created successfully
- [ ] Verify user is automatically signed in
- [ ] Verify user document exists in Firestore with:
  - [ ] displayName matches input
  - [ ] shameScore = 0
  - [ ] friends = []
  - [ ] createdAt timestamp is set

### Flow 2: Sign In / Sign Out

- [ ] Sign out from app
- [ ] Navigate to "Sign In" screen
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify successful sign in
- [ ] Verify user data loads correctly
- [ ] Sign out again
- [ ] Verify user is redirected to sign in screen

### Flow 3: Goal Creation - Daily

- [ ] Sign in as test user
- [ ] Navigate to goal creation form
- [ ] Enter goal description: "Exercise for 30 minutes"
- [ ] Select frequency: "Daily"
- [ ] Select all days of the week
- [ ] Submit form
- [ ] Verify goal appears in goal list
- [ ] Verify goal has Green status
- [ ] Verify goal document in Firestore has:
  - [ ] Correct ownerId
  - [ ] Correct description
  - [ ] frequency = "daily"
  - [ ] targetDays = all 7 days
  - [ ] currentStatus = "Green"
  - [ ] nextDeadline is in the future
  - [ ] isShared = true

### Flow 4: Goal Creation - Weekly

- [ ] Create new goal
- [ ] Enter description: "Grocery shopping"
- [ ] Select frequency: "Weekly"
- [ ] Select target day: "Saturday"
- [ ] Submit form
- [ ] Verify goal appears in list
- [ ] Verify nextDeadline is next Saturday at 23:59

### Flow 5: Goal Creation - 3x per Week

- [ ] Create new goal
- [ ] Enter description: "Gym workout"
- [ ] Select frequency: "3x per week"
- [ ] Select three days: "Monday", "Wednesday", "Friday"
- [ ] Submit form
- [ ] Verify goal appears in list
- [ ] Verify nextDeadline is the next occurrence of one of the three days

### Flow 6: Goal Completion

- [ ] Select a goal with Yellow or Red status
- [ ] Tap "Complete" button
- [ ] Verify goal status changes to Green immediately
- [ ] Verify latestCompletionDate is updated in Firestore
- [ ] Verify nextDeadline is recalculated to next occurrence
- [ ] Verify UI updates in real-time

### Flow 7: Adding Friends

- [ ] Get userId of another test account (from Firestore or Firebase Auth)
- [ ] In app, navigate to add friend functionality
- [ ] Enter friend's userId
- [ ] Submit
- [ ] Verify friend is added to friends array in Firestore
- [ ] Verify friend's goals become visible in friends dashboard

### Flow 8: Viewing Friends' Goals

- [ ] Navigate to Friends Dashboard
- [ ] Verify all friends' goals are displayed
- [ ] Verify each goal shows:
  - [ ] Goal description
  - [ ] Owner name
  - [ ] Current status (Green/Yellow/Red)
  - [ ] Owner's shame score
- [ ] Verify goals update in real-time when friend completes a goal

### Flow 9: Sending Nudge

- [ ] In Friends Dashboard, find a goal with Yellow or Red status
- [ ] Verify "Nudge Now" button is visible
- [ ] Tap "Nudge Now" button
- [ ] Verify success message appears
- [ ] On friend's device, verify push notification is received
- [ ] Verify notification contains:
  - [ ] Sender's name
  - [ ] Goal description
  - [ ] Appropriate message

### Flow 10: Automated Deadline Checking

This test requires waiting for the scheduled function to run (every hour).

- [ ] Create a goal with a deadline in the near future (e.g., 5 minutes)
- [ ] Wait for deadline to pass
- [ ] Within 1 hour, verify goal status changes to Red
- [ ] Verify redSince timestamp is set in Firestore
- [ ] Wait 24 hours with goal still Red
- [ ] Verify shame score increments by 1
- [ ] Verify friends receive shame notification

### Flow 11: Shame Score Visibility

- [ ] View own profile/dashboard
- [ ] Verify shame score is displayed prominently
- [ ] View Friends Dashboard
- [ ] Verify each friend's shame score is displayed
- [ ] Trigger shame score increment (via automated function)
- [ ] Verify shame score updates in real-time on all devices

## Push Notification Testing

### iOS Device Testing

- [ ] Install app on physical iOS device
- [ ] Grant notification permissions when prompted
- [ ] Verify FCM token is saved to Firestore user document
- [ ] Send test notification from Firebase Console
- [ ] Verify notification is received
- [ ] Test nudge notification from another device
- [ ] Verify nudge notification is received and displays correctly
- [ ] Test shame notification (trigger via automated function)
- [ ] Verify shame notification is received

### Android Device Testing

- [ ] Install app on physical Android device
- [ ] Grant notification permissions when prompted
- [ ] Verify FCM token is saved to Firestore user document
- [ ] Send test notification from Firebase Console
- [ ] Verify notification is received
- [ ] Test nudge notification from another device
- [ ] Verify nudge notification is received and displays correctly
- [ ] Test shame notification (trigger via automated function)
- [ ] Verify shame notification is received

### Notification Content Verification

- [ ] Nudge notification includes sender name
- [ ] Nudge notification includes goal description
- [ ] Shame notification includes failed user's name
- [ ] Shame notification includes goal description
- [ ] Notifications are actionable (tapping opens app)

## Real-Time Synchronization Testing

Test with 2+ devices signed in as different users who are friends:

### Goal Creation Sync

- [ ] Create goal on Device A
- [ ] Verify goal appears on Device A immediately
- [ ] Verify goal appears on Device B (friend's device) within 1-2 seconds
- [ ] Verify goal data is correct on both devices

### Goal Completion Sync

- [ ] Complete goal on Device A
- [ ] Verify status changes to Green on Device A immediately
- [ ] Verify status changes to Green on Device B within 1-2 seconds
- [ ] Verify nextDeadline is updated on both devices

### Shame Score Sync

- [ ] Trigger shame score increment (via automated function or manual Firestore update)
- [ ] Verify shame score updates on owner's device
- [ ] Verify shame score updates on all friends' devices
- [ ] Verify update happens within 1-2 seconds

### Friend Addition Sync

- [ ] User A adds User B as friend on Device A
- [ ] Verify User B's goals appear on Device A
- [ ] User B creates new goal on Device B
- [ ] Verify new goal appears on Device A within 1-2 seconds

## Performance Testing

### App Performance

- [ ] App launches in < 3 seconds
- [ ] Goal list loads in < 2 seconds
- [ ] Friends dashboard loads in < 2 seconds
- [ ] Goal creation completes in < 1 second
- [ ] Goal completion updates in < 500ms
- [ ] Real-time updates appear in < 2 seconds
- [ ] No lag or stuttering in UI interactions
- [ ] Smooth scrolling in goal lists

### Cloud Function Performance

- [ ] `checkGoalDeadlines` completes within timeout (< 9 minutes)
- [ ] `sendNudge` responds within 5 seconds
- [ ] No timeout errors in function logs
- [ ] Function memory usage is reasonable (< 256MB)

### Network Performance

- [ ] App works on slow 3G connection
- [ ] Offline indicator appears when network is lost
- [ ] App recovers gracefully when network is restored
- [ ] Queued operations execute when back online

## Error Handling Testing

### Authentication Errors

- [ ] Invalid email format shows appropriate error
- [ ] Wrong password shows appropriate error
- [ ] Weak password shows appropriate error
- [ ] Network error during auth shows retry option
- [ ] Session expiration redirects to sign in

### Goal Operation Errors

- [ ] Empty goal description shows validation error
- [ ] No target days selected shows validation error
- [ ] Network error during goal creation shows retry option
- [ ] Permission denied error shows appropriate message

### Notification Errors

- [ ] User without FCM token receives graceful error message
- [ ] Failed notification delivery is logged
- [ ] App continues to function if notifications fail

## Edge Cases Testing

### Boundary Conditions

- [ ] Goal with deadline exactly at midnight
- [ ] Goal completed exactly at deadline
- [ ] Goal completed 1 second before deadline
- [ ] Goal completed 1 second after deadline
- [ ] User with 0 friends
- [ ] User with many friends (10+)
- [ ] User with many goals (20+)

### Data Validation

- [ ] Very long goal description (500+ characters)
- [ ] Special characters in goal description
- [ ] Emoji in goal description
- [ ] Empty friends array
- [ ] Negative shame score (should not be possible)

### Concurrent Operations

- [ ] Two users completing same goal simultaneously
- [ ] Multiple shame score increments at same time
- [ ] Multiple friends sending nudges simultaneously
- [ ] User deleting goal while friend is viewing it

## Security Testing

### Authentication Security

- [ ] Cannot access app without authentication
- [ ] Session expires after reasonable time
- [ ] Cannot access another user's data
- [ ] Password is not visible in logs or network traffic

### Data Security

- [ ] Cannot read other users' goals (non-friends)
- [ ] Cannot modify other users' goals
- [ ] Cannot modify other users' shame scores
- [ ] Cannot add friends without proper authentication
- [ ] Security rules prevent unauthorized access

### API Security

- [ ] Cloud Functions require authentication
- [ ] Cannot call sendNudge for non-friend
- [ ] Cannot manipulate data via direct Firestore access
- [ ] Rate limiting prevents abuse

## Monitoring and Logging

### Firebase Console Monitoring

- [ ] Function execution count is reasonable
- [ ] Function error rate is < 1%
- [ ] Firestore read/write operations are within quota
- [ ] No unexpected spikes in usage
- [ ] Billing alerts are configured

### Error Logging

- [ ] Errors are logged with sufficient context
- [ ] Critical errors are highlighted
- [ ] User-facing errors are clear and actionable
- [ ] No sensitive data in logs

## Documentation Verification

- [ ] README.md is up to date
- [ ] DEPLOYMENT_GUIDE.md is accurate
- [ ] API documentation is complete
- [ ] Code comments are clear and helpful
- [ ] Environment setup instructions are correct

## Final Sign-Off

- [ ] All critical tests pass
- [ ] All high-priority bugs are fixed
- [ ] Performance meets requirements
- [ ] Security is verified
- [ ] Documentation is complete
- [ ] Monitoring is in place
- [ ] Rollback plan is documented
- [ ] Team is trained on deployment process

## Post-Deployment Monitoring (First 24 Hours)

- [ ] Monitor function logs for errors
- [ ] Monitor Firestore usage
- [ ] Monitor app crash reports
- [ ] Monitor user feedback
- [ ] Verify scheduled function runs successfully
- [ ] Verify notifications are being delivered
- [ ] Check for any security issues
- [ ] Monitor performance metrics

---

**Deployment Date:** ********\_********

**Deployed By:** ********\_********

**Sign-Off:** ********\_********

**Notes:**
