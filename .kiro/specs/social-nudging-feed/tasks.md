# Implementation Plan

- [x] 1. Set up nudge data model and Firestore collection
  - Create nudges collection structure in Firestore
  - Create TypeScript interfaces for Nudge and GoalStatus
  - Update collections.ts with nudge collection helpers
  - Create Firestore indexes for nudge queries (senderId, receiverId, goalId, timestamp)
  - _Requirements: 3.3, 8.1, 10.4_

- [x] 2. Implement goal status calculator utility
  - Create utils/goalStatusCalculator.ts with status calculation logic
  - Implement calculateStatus function with traffic light logic (6h/2h thresholds)
  - Implement getStatusColor and getStatusText functions
  - Implement getDeadlineProximity for time remaining calculations
  - Implement shouldShowNudgeButton logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

- [x] 2.1 Write property test for status color calculation accuracy
  - **Property 5: Status color calculation accuracy**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 2.2 Write property test for completed goal status display
  - **Property 6: Completed goal status display**
  - **Validates: Requirements 2.5**

- [x] 2.3 Write property test for nudge button visibility for at-risk goals
  - **Property 7: Nudge button visibility for at-risk goals**
  - **Validates: Requirements 3.1, 12.3**

- [x] 2.4 Write property test for nudge button hiding for safe goals
  - **Property 8: Nudge button hiding for safe goals**
  - **Validates: Requirements 3.2, 12.1, 12.2**

- [x] 3. Create nudge service module
  - Create services/firebase/nudgeService.ts with core nudge functions
  - Implement sendNudge function with validation and cooldown creation
  - Implement getNudgeCooldowns function for rate limiting
  - Implement subscribeToNudgeCooldowns real-time listener
  - Implement getNudgeHistory function for sent/received nudges
  - Add error handling and retry logic for all operations
  - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 8.4_

- [x] 3.1 Write property test for nudge document creation completeness
  - **Property 9: Nudge document creation completeness**
  - **Validates: Requirements 3.3, 8.1**

- [x] 3.2 Write property test for nudge cooldown enforcement
  - **Property 12: Nudge cooldown enforcement**
  - **Validates: Requirements 4.1, 4.2**

- [x] 3.3 Write property test for rapid nudge prevention
  - **Property 13: Rapid nudge prevention**
  - **Validates: Requirements 4.3**

- [x] 4. Enhance useFriendsGoals hook with status and nudge functionality
  - Update hooks/useFriendsGoals.ts to include status calculation
  - Add nudge cooldown tracking with real-time updates
  - Implement sendNudge function with error handling
  - Add feed sorting by urgency (red → yellow → green)
  - Add canNudge function for rate limit checking
  - Optimize with memoization for performance
  - _Requirements: 1.1, 1.5, 3.5, 4.1, 4.4, 6.1, 6.4, 7.1, 7.2, 7.4_

- [x] 4.1 Write property test for real-time goal list updates
  - **Property 4: Real-time goal list updates**
  - **Validates: Requirements 1.5, 6.2, 6.3**

- [x] 4.2 Write property test for feed sorting by urgency
  - **Property 21: Feed sorting by urgency**
  - **Validates: Requirements 7.1, 7.2**

- [x] 4.3 Write property test for dynamic feed re-sorting
  - **Property 22: Dynamic feed re-sorting**
  - **Validates: Requirements 7.4**

- [x] 5. Create friends feed component
  - Create components/social/FriendsFeed.tsx component
  - Display friends' goals with real-time status indicators
  - Implement traffic light color system (green/yellow/red)
  - Add nudge buttons with cooldown states
  - Implement pull-to-refresh functionality
  - Add empty state for no friends/goals
  - Use FlatList for performance with many goals
  - Add loading skeletons and error states
  - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 4.4, 11.1, 11.2, 11.3, 11.4_

- [x] 5.1 Write property test for friends feed displays only friend goals
  - **Property 1: Friends feed displays only friend goals**
  - **Validates: Requirements 1.1**

- [x] 5.2 Write property test for goal display completeness
  - **Property 2: Goal display completeness**
  - **Validates: Requirements 1.2**

- [x] 5.3 Write property test for goal grouping by friend
  - **Property 3: Goal grouping by friend**
  - **Validates: Requirements 1.3, 7.3**

- [x] 6. Create friend goal item component
  - Create components/social/FriendGoalItem.tsx component
  - Display individual goal with friend name, description, and status
  - Implement nudge button with loading states
  - Show cooldown timer when nudge is rate-limited
  - Add tap handler for goal detail navigation
  - Ensure 44x44pt minimum touch targets
  - Add haptic feedback for nudge actions
  - _Requirements: 1.2, 3.1, 3.2, 4.4, 9.1, 9.4, 12.4_

- [x] 6.1 Write property test for cooldown display accuracy
  - **Property 14: Cooldown display accuracy**
  - **Validates: Requirements 4.4**

- [x] 6.2 Write property test for self-nudge prevention
  - **Property 37: Self-nudge prevention**
  - **Validates: Requirements 12.5**

- [x] 7. Create goal detail modal component
  - Create components/social/FriendGoalDetail.tsx modal component
  - Display complete goal information (description, recurrence, deadline, history)
  - Show friend's total shame score
  - Add large nudge button if goal is at-risk
  - Implement modal close with navigation state preservation
  - Add proper accessibility labels and focus management
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.1 Write property test for goal detail navigation
  - **Property 25: Goal detail navigation**
  - **Validates: Requirements 9.1**

- [x] 7.2 Write property test for goal detail information completeness
  - **Property 26: Goal detail information completeness**
  - **Validates: Requirements 9.2, 9.4**

- [x] 7.3 Write property test for navigation state preservation
  - **Property 28: Navigation state preservation**
  - **Validates: Requirements 9.5**

- [x] 8. Enhance friends tab screen with feed integration
  - Update app/(tabs)/friends.tsx to include friends feed
  - Add tab switching between "Requests" and "Feed" views
  - Integrate FriendsFeed component below existing sections
  - Implement pull-to-refresh for entire screen
  - Add proper spacing and layout with GluestackUI
  - Handle loading states and error boundaries
  - _Requirements: 1.1, 1.4, 7.5, 11.2, 11.3_

- [x] 8.1 Write property test for pull-to-refresh functionality
  - **Property 34: Pull-to-refresh functionality**
  - **Validates: Requirements 11.2**

- [x] 9. Implement Cloud Functions for nudge notifications
  - Add sendNudgeNotification function triggered on nudge creation
  - Fetch receiver's FCM token from user document
  - Send FCM notification with proper title and body format
  - Handle errors gracefully (log but don't block nudge creation)
  - Add cleanupOldNudges scheduled function for 7-day cleanup
  - _Requirements: 3.4, 5.1, 5.2, 8.5_

- [x] 9.1 Write property test for nudge notification delivery
  - **Property 10: Nudge notification delivery**
  - **Validates: Requirements 3.4, 5.1, 5.2**

- [x] 9.2 Write property test for automatic nudge cleanup
  - **Property 24: Automatic nudge cleanup**
  - **Validates: Requirements 8.5**

- [x] 10. Implement notification handling in app
  - Update hooks/useNotifications.ts to handle nudge notifications
  - Add navigation handler for nudge notification taps
  - Navigate to Home tab when nudge notification is tapped
  - Show toast with nudge sender and goal information
  - Handle multiple notifications properly
  - _Requirements: 5.3, 5.4_

- [x] 10.1 Write property test for nudge notification navigation
  - **Property 16: Nudge notification navigation**
  - **Validates: Requirements 5.3**

- [x] 10.2 Write property test for multiple notification handling
  - **Property 17: Multiple notification handling**
  - **Validates: Requirements 5.4**

- [x] 11. Update Firestore Security Rules for nudges
  - Add security rules for nudges collection
  - Allow read if user is sender or receiver
  - Allow create if senderId matches authenticated user and receiver is friend
  - Prevent updates and deletes (nudges are immutable)
  - Add helper function to check friend relationships
  - Enhance goals collection rules for friend access
  - Deploy updated security rules
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11.1 Write property test for feed access authorization
  - **Property 29: Feed access authorization**
  - **Validates: Requirements 10.1**

- [x] 11.2 Write property test for nudge authorization
  - **Property 30: Nudge authorization**
  - **Validates: Requirements 10.2**

- [x] 11.3 Write property test for goal detail access authorization
  - **Property 31: Goal detail access authorization**
  - **Validates: Requirements 10.3**

- [x] 11.4 Write property test for nudge history authorization
  - **Property 32: Nudge history authorization**
  - **Validates: Requirements 10.4**

- [x] 11.5 Write property test for unauthenticated access denial
  - **Property 33: Unauthenticated access denial**
  - **Validates: Requirements 10.5**

- [x] 12. Add toast notifications and visual feedback
  - Implement nudge success toast with friend name
  - Add error toasts for nudge failures with retry options
  - Show loading spinners during nudge operations
  - Add haptic feedback for nudge button taps
  - Implement cooldown countdown display
  - Add visual feedback for all async operations
  - _Requirements: 3.5, 4.3, 9.4_

- [x] 12.1 Write property test for nudge success feedback
  - **Property 11: Nudge success feedback**
  - **Validates: Requirements 3.5**

- [x] 13. Implement real-time status updates
  - Add automatic status recalculation as time passes
  - Implement real-time feed re-sorting when statuses change
  - Add real-time cooldown updates across devices
  - Handle goal completion status updates immediately
  - Add offline/online state management with cached data
  - _Requirements: 6.1, 6.4, 6.5, 7.4_

- [x] 13.1 Write property test for real-time status updates
  - **Property 19: Real-time status updates**
  - **Validates: Requirements 6.1, 6.4**

- [x] 13.2 Write property test for offline data caching
  - **Property 20: Offline data caching**
  - **Validates: Requirements 6.5**

- [x] 14. Add performance optimizations
  - Implement React.memo for FriendGoalItem components
  - Add useMemo for expensive status calculations
  - Use useCallback for event handlers to prevent re-renders
  - Implement FlatList virtualization with getItemLayout
  - Add debouncing for rapid status updates
  - Optimize Firestore queries with proper indexing
  - _Requirements: 11.4, 11.5_

- [x] 14.1 Write property test for virtualization performance
  - **Property 36: Virtualization performance**
  - **Validates: Requirements 11.4**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Integration testing and bug fixes
  - Test complete nudge flow (tap → create → notify → cooldown)
  - Test feed sorting and re-sorting with status changes
  - Test real-time updates across multiple devices/sessions
  - Test notification delivery and navigation
  - Test offline behavior and reconnection
  - Test goal completion during active cooldowns
  - Fix any bugs discovered during testing
  - _Requirements: All_

- [x] 16.1 Write property test for cooldown clearing on completion
  - **Property 15: Cooldown clearing on completion**
  - **Validates: Requirements 4.5**

- [x] 16.2 Write property test for graceful notification degradation
  - **Property 18: Graceful notification degradation**
  - **Validates: Requirements 5.5**

- [x] 17. Polish UI and accessibility
  - Ensure all touch targets are at least 44x44 pixels
  - Add proper accessibility labels for screen readers
  - Implement focus management for modal navigation
  - Add color contrast compliance for status indicators
  - Test with VoiceOver/TalkBack for accessibility
  - Add loading states with skeleton animations
  - Implement smooth animations for status changes
  - _Requirements: 9.3, 9.4, 11.3_

- [x] 17.1 Write property test for loading state display
  - **Property 35: Loading state display**
  - **Validates: Requirements 11.3**

- [x] 18. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
