# Friend Management Feature - Integration Testing Checklist

This document provides a comprehensive checklist for manually testing the friend management feature.

## Prerequisites

- Two test devices or simulators (Device A and Device B)
- Two test accounts created and signed in
- Firebase project configured with proper security rules
- Cloud Functions deployed

## Test 1: Friend Request Flow (search → send → accept → appears in list)

### Device A (Sender)

1. [ ] Navigate to Friends tab
2. [ ] Enter Device B user's email in search bar
3. [ ] Verify search results appear within 300ms after typing stops
4. [ ] Verify Device B user appears in search results with correct displayName and email
5. [ ] Verify "Add Friend" button is visible and enabled
6. [ ] Tap "Add Friend" button
7. [ ] Verify haptic feedback occurs
8. [ ] Verify button changes to "Pending" and is disabled
9. [ ] Verify success toast appears: "Friend request sent!"

### Device B (Receiver)

10. [ ] Verify push notification received with sender's name
11. [ ] Tap notification
12. [ ] Verify app navigates to Friends tab, Pending Requests section
13. [ ] Verify friend request appears with sender's displayName and email
14. [ ] Verify "Accept" and "Reject" buttons are visible (min 44x44 pixels)
15. [ ] Tap "Accept" button
16. [ ] Verify confirmation dialog appears
17. [ ] Confirm acceptance
18. [ ] Verify haptic feedback occurs
19. [ ] Verify success toast appears: "Friend request accepted!"
20. [ ] Verify request disappears from Pending Requests section
21. [ ] Verify sender appears in Friends List with displayName, email, and shame score

### Device A (Sender)

22. [ ] Verify push notification received: "Friend request accepted"
23. [ ] Verify Device B user appears in Friends List
24. [ ] Verify Device B user's displayName, email, and shame score are visible
25. [ ] Verify Device B user no longer appears in search results with "Add Friend" button

### Expected Results

- ✅ Friend request created in Firestore with status 'pending'
- ✅ Both users have each other in their friends arrays
- ✅ Request status updated to 'accepted'
- ✅ Real-time updates work without manual refresh

---

## Test 2: Friend Removal Flow (remove → goals disappear → both users updated)

### Device A

1. [ ] Navigate to Friends tab
2. [ ] Verify Device B user appears in Friends List
3. [ ] Long-press on Device B user's card
4. [ ] Verify haptic feedback occurs
5. [ ] Verify confirmation dialog appears: "Remove Friend"
6. [ ] Confirm removal
7. [ ] Verify haptic feedback occurs
8. [ ] Verify success toast appears: "Friend removed"
9. [ ] Verify Device B user disappears from Friends List immediately
10. [ ] Navigate to Home tab
11. [ ] Verify Device B user's goals no longer appear in friends' goals section

### Device B

12. [ ] Navigate to Friends tab
13. [ ] Verify Device A user disappears from Friends List (real-time update)
14. [ ] Navigate to Home tab
15. [ ] Verify Device A user's goals no longer appear in friends' goals section

### Expected Results

- ✅ Both users removed from each other's friends arrays atomically
- ✅ Real-time updates propagate immediately
- ✅ Goals visibility updated correctly

---

## Test 3: Real-time Updates

### Setup

- Device A and Device B are friends

### Test Shame Score Updates

1. [ ] Device A: Navigate to Friends tab, view Device B in Friends List
2. [ ] Device B: Complete a goal (or manually update shame score in Firestore)
3. [ ] Device A: Verify Device B's shame score updates in real-time without refresh
4. [ ] Verify update happens within 2 seconds

### Test Display Name Updates

5. [ ] Device A: Navigate to Friends tab, view Device B in Friends List
6. [ ] Device B: Update displayName in profile
7. [ ] Device A: Verify Device B's displayName updates in real-time across all screens
8. [ ] Verify update happens within 2 seconds

### Test Pending Request Updates

9. [ ] Device A: Send friend request to Device C
10. [ ] Device C: Navigate to Friends tab
11. [ ] Verify pending request appears immediately without refresh
12. [ ] Device C: Accept or reject request
13. [ ] Verify request disappears from pending list immediately

### Expected Results

- ✅ All real-time listeners working correctly
- ✅ Updates propagate within 2 seconds
- ✅ No manual refresh required

---

## Test 4: Notification Delivery and Navigation

### Friend Request Notification

1. [ ] Device A: Send friend request to Device B
2. [ ] Device B: Verify push notification received
3. [ ] Verify notification shows sender's name
4. [ ] Tap notification
5. [ ] Verify app opens to Friends tab
6. [ ] Verify Pending Requests section is visible/expanded
7. [ ] Verify request is visible in the list

### Friend Request Accepted Notification

8. [ ] Device B: Accept friend request from Device A
9. [ ] Device A: Verify push notification received
10. [ ] Verify notification shows "Friend request accepted"
11. [ ] Tap notification
12. [ ] Verify app opens to Friends tab
13. [ ] Verify Device B appears in Friends List

### Badge Count

14. [ ] Device B: Have 2-3 pending friend requests
15. [ ] Verify Friends tab shows badge with correct count
16. [ ] Accept one request
17. [ ] Verify badge count decrements immediately
18. [ ] Accept all requests
19. [ ] Verify badge disappears

### Expected Results

- ✅ Notifications delivered via FCM
- ✅ Navigation works correctly from notifications
- ✅ Badge count accurate and updates in real-time

---

## Test 5: Offline Behavior and Reconnection

### Offline Mode

1. [ ] Device A: Navigate to Friends tab
2. [ ] Disable network connection (airplane mode)
3. [ ] Verify offline indicator appears
4. [ ] Verify cached friends list still visible
5. [ ] Verify cached shame scores still visible
6. [ ] Try to send friend request
7. [ ] Verify appropriate error message appears
8. [ ] Try to accept friend request
9. [ ] Verify appropriate error message appears

### Reconnection

10. [ ] Re-enable network connection
11. [ ] Verify offline indicator disappears
12. [ ] Verify friends list updates with latest data
13. [ ] Verify shame scores update to current values
14. [ ] Send friend request
15. [ ] Verify request succeeds after reconnection

### Expected Results

- ✅ Offline indicator shows when disconnected
- ✅ Cached data remains accessible
- ✅ Appropriate error messages for failed operations
- ✅ Automatic sync on reconnection

---

## Test 6: Edge Cases and Error Handling

### Self-Request Prevention

1. [ ] Device A: Search for own email
2. [ ] Verify own account does not appear in search results

### Duplicate Request Prevention

3. [ ] Device A: Send friend request to Device B
4. [ ] Device A: Try to send another request to Device B
5. [ ] Verify error message: "Friend request already exists"

### Already Friends

6. [ ] Device A and Device B are already friends
7. [ ] Device A: Search for Device B
8. [ ] Verify Device B shows "Friends" status (button disabled)

### Invalid User

9. [ ] Device A: Search for non-existent email
10. [ ] Verify "No users found" message appears

### Empty Search

11. [ ] Device A: Clear search input
12. [ ] Verify prompt appears: "Enter an email or name to find friends"

### Network Errors

13. [ ] Simulate network error during friend request
14. [ ] Verify error toast with retry option
15. [ ] Verify retry works correctly

### Authorization Errors

16. [ ] Try to accept friend request where user is not the receiver (via Firestore console)
17. [ ] Verify security rules prevent unauthorized access
18. [ ] Verify appropriate error message

### Expected Results

- ✅ All edge cases handled gracefully
- ✅ Clear error messages for users
- ✅ Security rules enforced correctly

---

## Test 7: UI/UX Requirements

### Touch Targets

1. [ ] Verify all buttons are at least 44x44 pixels
2. [ ] Test on smallest supported device
3. [ ] Verify buttons are easily tappable

### Visual Feedback

4. [ ] Verify loading spinners appear during async operations
5. [ ] Verify success toasts appear for all successful actions
6. [ ] Verify error toasts appear for all failed actions
7. [ ] Verify haptic feedback occurs for important actions

### Animations

8. [ ] Verify smooth animations when adding items to lists
9. [ ] Verify smooth animations when removing items from lists
10. [ ] Verify no janky or stuttering animations

### Responsive Design

11. [ ] Test on various screen sizes (small phone, large phone, tablet)
12. [ ] Verify layout adapts correctly
13. [ ] Verify text remains readable
14. [ ] Verify no content cutoff

### Performance

15. [ ] Scroll through large friends list (20+ friends)
16. [ ] Verify smooth scrolling (60fps)
17. [ ] Verify no lag or stuttering
18. [ ] Search with various queries
19. [ ] Verify search results appear quickly (<500ms)

### Expected Results

- ✅ All UI/UX requirements met
- ✅ Smooth, responsive interface
- ✅ Clear visual feedback for all actions

---

## Test 8: Data Consistency

### Bidirectional Consistency

1. [ ] Device A and Device B are friends
2. [ ] Check Firestore console
3. [ ] Verify Device A has Device B's ID in friends array
4. [ ] Verify Device B has Device A's ID in friends array
5. [ ] Device A: Remove Device B as friend
6. [ ] Check Firestore console
7. [ ] Verify both users' friends arrays updated atomically
8. [ ] Verify no orphaned friendships

### Request Status Consistency

9. [ ] Device A: Send friend request to Device C
10. [ ] Check Firestore console
11. [ ] Verify request document has status 'pending'
12. [ ] Device C: Accept request
13. [ ] Check Firestore console
14. [ ] Verify request status updated to 'accepted'
15. [ ] Verify both users' friends arrays updated

### Searchable Fields

16. [ ] Check Firestore console
17. [ ] Verify all users have searchableEmail field (lowercase)
18. [ ] Verify all users have searchableName field (lowercase)
19. [ ] Test search with mixed case query
20. [ ] Verify case-insensitive search works

### Expected Results

- ✅ All data relationships consistent
- ✅ No orphaned or inconsistent data
- ✅ Atomic operations work correctly

---

## Test 9: Security Rules

### Friend Request Creation

1. [ ] Try to create friend request with senderId != authenticated user (via Firestore console)
2. [ ] Verify security rules deny the operation

### Friend Request Acceptance

3. [ ] Try to accept friend request where receiverId != authenticated user (via Firestore console)
4. [ ] Verify security rules deny the operation

### Friend Removal

5. [ ] Try to remove friend where user is not one of the parties (via Firestore console)
6. [ ] Verify security rules deny the operation

### Unauthenticated Access

7. [ ] Sign out
8. [ ] Try to access friend-related operations
9. [ ] Verify all operations denied

### Expected Results

- ✅ Security rules properly enforced
- ✅ Unauthorized operations denied
- ✅ No data leakage

---

## Bug Tracking

### Bugs Found

| #   | Description | Severity | Status | Notes |
| --- | ----------- | -------- | ------ | ----- |
| 1   |             |          |        |       |
| 2   |             |          |        |       |
| 3   |             |          |        |       |

### Severity Levels

- **Critical**: Blocks core functionality, data loss, security issue
- **High**: Major feature broken, poor UX
- **Medium**: Minor feature issue, workaround available
- **Low**: Cosmetic issue, edge case

---

## Sign-off

### Tester Information

- **Tester Name**: ******\_\_\_******
- **Date**: ******\_\_\_******
- **Devices Used**: ******\_\_\_******
- **OS Versions**: ******\_\_\_******

### Test Results Summary

- **Total Tests**: ******\_\_\_******
- **Passed**: ******\_\_\_******
- **Failed**: ******\_\_\_******
- **Blocked**: ******\_\_\_******

### Overall Status

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Ready for production

### Notes

_Add any additional notes or observations here_

---

## Automated Testing

For automated testing, run:

```bash
# Note: Requires Firebase credentials configured
npx tsx scripts/test-friend-integration.ts
```

The automated test script covers:

- Friend request flow
- Friend removal flow
- Real-time updates
- Notification setup verification
- Data consistency checks
