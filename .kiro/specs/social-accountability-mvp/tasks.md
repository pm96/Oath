# Implementation Plan

- [x] 1. Set up Firebase infrastructure and configuration
  - Initialize Firebase project structure with proper configuration
  - Set up Firestore database with collections structure
  - Configure Firebase Authentication
  - Deploy initial Firestore Security Rules
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement authentication module
  - Create AuthProvider context with state management
  - Implement AuthService with signIn, signUp, and signOut functions
  - Create useAuth custom hook for accessing auth state
  - Build SignInScreen component with form validation
  - Build CreateAccountScreen component with user initialization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]\* 2.1 Write property test for user account initialization
  - **Property 1: User account initialization completeness**
  - **Validates: Requirements 1.1, 1.3**

- [ ]\* 2.2 Write property test for authentication round-trip
  - **Property 2: Authentication round-trip**
  - **Validates: Requirements 1.2, 1.5**

- [x] 3. Implement goal data models and services
  - Create TypeScript interfaces for Goal and GoalInput
  - Implement GoalService with createGoal, updateGoal, and getUserGoals functions
  - Implement deadline calculation logic for daily, weekly, and 3x_a_week frequencies
  - Implement completeGoal function with status and deadline updates
  - Create useGoals custom hook with real-time Firestore listeners
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 3.1 Write property test for goal creation completeness
  - **Property 3: Goal creation completeness**
  - **Validates: Requirements 2.1, 2.2**

- [ ]\* 3.2 Write property test for deadline calculation validity
  - **Property 5: Deadline calculation validity**
  - **Validates: Requirements 2.4**

- [ ]\* 3.3 Write property test for goal completion state transition
  - **Property 6: Goal completion state transition**
  - **Validates: Requirements 2.5**

- [x] 4. Build goal management UI components
  - Create GoalForm component for creating/editing goals
  - Create GoalItem component with completion button and status display
  - Create GoalList component displaying user's goals with real-time updates
  - Implement status color coding (Green/Yellow/Red) consistently
  - Add form validation and error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 8.2_

- [ ]\* 4.1 Write property test for goal ownership filtering
  - **Property 4: Goal ownership filtering**
  - **Validates: Requirements 2.3**

- [ ]\* 4.2 Write property test for status color mapping consistency
  - **Property 21: Status color mapping consistency**
  - **Validates: Requirements 8.2**

- [x] 5. Implement social features and friends system
  - Create User data model with shameScore and friends array
  - Implement SocialService with getFriendsGoals and addFriend functions
  - Create useFriendsGoals hook with real-time listeners for friends' goals
  - Implement GoalWithOwner interface combining goal and owner data
  - _Requirements: 3.1, 3.3, 6.1, 6.2_

- [ ]\* 5.1 Write property test for friends goal visibility
  - **Property 7: Friends goal visibility**
  - **Validates: Requirements 3.1**

- [ ]\* 5.2 Write property test for goal display completeness
  - **Property 8: Goal display completeness**
  - **Validates: Requirements 3.3**

- [x] 6. Build social dashboard UI
  - Create FriendsDashboard component showing all friends' goals
  - Create FriendGoalItem component with status display and nudge button
  - Create ShameScoreDisplay component for showing shame scores
  - Implement conditional "Nudge Now" button display for Yellow/Red goals
  - Add real-time updates for friends' goal changes
  - _Requirements: 3.1, 3.3, 5.1, 6.1, 6.2_

- [ ]\* 6.1 Write property test for nudge button conditional display
  - **Property 13: Nudge button conditional display**
  - **Validates: Requirements 5.1**

- [ ]\* 6.2 Write property test for shame score display
  - **Property 16: Shame score display**
  - **Validates: Requirements 6.1, 6.2**

- [x] 7. Implement Firebase Cloud Functions for automation
  - Set up Cloud Functions project structure
  - Implement checkGoalDeadlines scheduled function (runs every hour)
  - Add logic to query all goals and compare nextDeadline to current time
  - Implement status update to 'Red' for expired deadlines
  - Add redSince timestamp tracking for goals entering Red status
  - Implement shame score increment for goals Red for 24+ hours
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]\* 7.1 Write property test for deadline expiration status update
  - **Property 10: Deadline expiration status update**
  - **Validates: Requirements 4.2**

- [ ]\* 7.2 Write property test for shame score increment on prolonged failure
  - **Property 11: Shame score increment on prolonged failure**
  - **Validates: Requirements 4.3**

- [ ]\* 7.3 Write property test for atomic shame score increment
  - **Property 17: Atomic shame score increment**
  - **Validates: Requirements 6.4**

- [x] 8. Implement notification system
  - Set up Firebase Cloud Messaging (FCM) in the app
  - Create NotificationService for handling FCM tokens and notifications
  - Implement useNotifications hook for registering device tokens
  - Add FCM notification sending to checkGoalDeadlines function for shame events
  - Implement sendNudge callable Cloud Function
  - Add notification content formatting with sender name and goal description
  - _Requirements: 4.4, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 8.1 Write property test for shame notification delivery
  - **Property 12: Shame notification delivery**
  - **Validates: Requirements 4.4**

- [ ]\* 8.2 Write property test for nudge delivery
  - **Property 14: Nudge delivery**
  - **Validates: Requirements 5.2, 5.3**

- [ ]\* 8.3 Write property test for nudge notification content
  - **Property 15: Nudge notification content**
  - **Validates: Requirements 5.5**

- [ ] 9. Implement Firestore Security Rules
  - Write security rules for user document access (own document only)
  - Write security rules for goal read access (owner or friends)
  - Write security rules for goal write access (owner only)
  - Write security rules to deny unauthenticated access
  - Deploy and test security rules
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]\* 9.1 Write property test for user document access control
  - **Property 18: User document access control**
  - **Validates: Requirements 7.1**

- [ ]\* 9.2 Write property test for goal read access control
  - **Property 19: Goal read access control**
  - **Validates: Requirements 7.2**

- [ ]\* 9.3 Write property test for goal write access control
  - **Property 20: Goal write access control**
  - **Validates: Requirements 7.3**

- [ ]\* 9.4 Write property test for goal access authorization
  - **Property 9: Goal access authorization**
  - **Validates: Requirements 3.4, 3.5**

- [x] 10. Implement navigation and app structure
  - Set up Expo Router file-based routing structure
  - Create root layout with authentication state checking
  - Create tabs layout for authenticated users
  - Implement navigation between sign-in, create account, home, and friends screens
  - Add protected routes that require authentication
  - _Requirements: 8.4_

- [x] 11. Add error handling and edge cases
  - Implement error handling for authentication failures
  - Add network error handling with retry logic
  - Implement validation for empty/invalid goal inputs
  - Add error boundaries for React components
  - Implement graceful degradation for offline scenarios
  - Add user-friendly error messages throughout the app
  - _Requirements: 1.4, 2.1_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Polish UI and mobile optimization
  - Ensure to use the gluestackUi elements from /components
  - Ensure all touch targets are at least 44x44 pixels
  - Implement responsive design for various mobile screen sizes
  - Add loading states and skeleton screens
  - Implement smooth transitions and animations
  - Optimize list rendering performance with FlatList
  - Add pull-to-refresh functionality
  - _Requirements: 8.1, 8.3, 8.5_

- [x] 14. Final integration and deployment preparation
  - Test complete user flows end-to-end
  - Deploy Cloud Functions to Firebase
  - Deploy Firestore Security Rules
  - Configure Firebase project for production
  - Test push notifications on physical devices
  - Verify real-time synchronization across multiple devices
  - _Requirements: All_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
