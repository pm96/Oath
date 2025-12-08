# Quick Start Guide - Cloud Functions

## What Was Implemented

Two Cloud Functions for automated goal monitoring and friend nudging:

1. **checkGoalDeadlines** - Runs every hour to:
   - Check all goals for expired deadlines
   - Update status to Red when deadlines pass
   - Increment shame scores for goals Red for 24+ hours
   - Send notifications to friends

2. **sendNudge** - Callable function to:
   - Send nudge notifications from friends
   - Verify authentication and friendship
   - Include sender name and goal description

## File Structure

```
functions/
├── src/
│   └── index.ts              # Main Cloud Functions code
├── lib/                      # Compiled JavaScript (generated)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── README.md                 # Detailed documentation
├── DEPLOYMENT.md             # Deployment instructions
├── IMPLEMENTATION_SUMMARY.md # Requirements coverage
├── VERIFICATION.md           # Verification checklist
└── QUICK_START.md           # This file

services/firebase/
└── cloudFunctions.ts         # Client-side wrapper for calling functions

components/social/
└── FriendsDashboard.tsx      # Updated to use sendNudge function
```

## Deploy Now

```bash
# 1. Install dependencies
cd functions
npm install

# 2. Build TypeScript
npm run build

# 3. Deploy to Firebase
firebase deploy --only functions
```

## Test It

### Test sendNudge (from mobile app)

1. Add a friend
2. Create a goal that's Yellow or Red
3. Tap "Nudge Now" button
4. Friend should receive notification (once Task 8 is complete)

### Test checkGoalDeadlines (automatic)

1. Create a goal with a past deadline
2. Wait up to 1 hour for scheduled function to run
3. Check Firestore - goal status should be Red
4. Wait 24 hours - shame score should increment

## View Logs

```bash
# View all logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --follow

# View specific function
firebase functions:log --only checkGoalDeadlines
```

## What's Next

**Task 8**: Implement notification system

- Set up FCM in mobile app
- Register device tokens
- Handle incoming notifications

Until Task 8 is complete, notifications won't be delivered to devices, but the Cloud Functions are ready and will queue them.

## Need Help?

- See `DEPLOYMENT.md` for detailed deployment instructions
- See `README.md` for function documentation
- See `VERIFICATION.md` for testing checklist
- Check Firebase Console for function logs and metrics
