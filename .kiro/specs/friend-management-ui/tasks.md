# Implementation Plan

- [x] 1. Set up friend requests data model and Firestore collection
  - Add friendRequests collection structure to Firestore
  - Update User interface to include searchableEmail and searchableName fields
  - Create TypeScript interfaces for FriendRequest and UserSearchResult
  - Update existing user documents with searchable fields (migration script if needed)
  - _Requirements: 1.1, 2.1, 8.1, 8.2, 8.3_

- [x] 2. Implement friend service module
  - Create services/firebase/friendService.ts with core functions
  - Implement searchUsers function with debouncing and filtering
  - Implement sendFriendRequest function with validation
  - Implement acceptFriendRequest function with bidirectional updates
  - Implement rejectFriendRequest function
  - Implement removeFriend function with atomic batch writes
  - Implement subscribeToPendingRequests real-time listener
  - Implement subscribeToPendingRequestsCount for badge
  - _Requirements: 1.1, 1.3, 2.1, 2.4, 2.5, 5.2, 5.4, 6.1, 6.4, 7.5_

- [x] 2.1 Write property test for search results matching query
  - **Property 1: Search results match query**
  - **Validates: Requirements 1.1**

- [x] 2.2 Write property test for friend request creation completeness
  - **Property 4: Friend request creation completeness**
  - **Validates: Requirements 2.1**

- [x] 2.3 Write property test for friend request acceptance bidirectionality
  - **Property 7: Friend request acceptance bidirectionality**
  - **Validates: Requirements 2.4**

- [x] 2.4 Write property test for friend removal bidirectionality and atomicity
  - **Property 15: Friend removal bidirectionality and atomicity**
  - **Validates: Requirements 5.2, 5.4**

- [x] 3. Create user search component
  - Create components/friends/UserSearch.tsx component
  - Implement debounced search input (300ms delay)
  - Display search results in scrollable FlatList
  - Show relationship status indicators (none, friend, pending)
  - Implement "Add Friend" button with loading state
  - Handle empty query and no results states
  - Add error handling and retry logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4_

- [x] 3.1 Write property test for search result display completeness
  - **Property 2: Search result display completeness**
  - **Validates: Requirements 1.2**

- [x] 3.2 Write property test for search result relationship status accuracy
  - **Property 3: Search result relationship status accuracy**
  - **Validates: Requirements 1.3**

- [x] 4. Create friend requests component
  - Create components/friends/FriendRequests.tsx component
  - Display pending incoming requests in FlatList
  - Implement Accept button with confirmation
  - Implement Reject button with confirmation
  - Show real-time updates when requests change
  - Handle empty state (no pending requests)
  - Add loading states for accept/reject actions
  - _Requirements: 2.3, 2.4, 2.5, 6.4, 9.3, 9.4_

- [x] 4.1 Write property test for pending requests display completeness
  - **Property 6: Pending requests display completeness**
  - **Validates: Requirements 2.3**

- [x] 4.2 Write property test for friend request rejection cleanup
  - **Property 8: Friend request rejection cleanup**
  - **Validates: Requirements 2.5**

- [x] 5. Create friends list component
  - Create components/friends/FriendsList.tsx component
  - Display friends with displayName, email, and shameScore
  - Implement real-time shame score updates
  - Add tap handler to navigate to friend's goals
  - Implement swipe-to-delete or long-press for remove friend
  - Show confirmation dialog for friend removal
  - Handle empty state with encouragement message
  - Optimize with FlatList for performance
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.5, 6.2, 6.3, 9.3, 9.5_

- [x] 5.1 Write property test for friends list completeness
  - **Property 9: Friends list completeness**
  - **Validates: Requirements 3.1**

- [x] 5.2 Write property test for friend display completeness
  - **Property 10: Friend display completeness**
  - **Validates: Requirements 3.2**

- [x] 5.3 Write property test for real-time shame score synchronization
  - **Property 11: Real-time shame score synchronization**
  - **Validates: Requirements 3.3, 6.3**

- [x] 6. Create friends tab screen
  - Create app/(tabs)/friends.tsx screen
  - Integrate UserSearch component at top (sticky)
  - Add collapsible Pending Requests section with badge
  - Integrate FriendsList component below
  - Implement pull-to-refresh for entire screen
  - Add proper spacing and layout with GluestackUI
  - Handle loading states with skeletons
  - _Requirements: 1.1, 2.3, 3.1, 4.3, 9.1, 9.5_

- [x] 6.1 Write property test for friend request UI status update
  - **Property 5: Friend request UI status update**
  - **Validates: Requirements 2.2**

- [x] 6.2 Write property test for real-time pending request updates
  - **Property 20: Real-time pending request updates**
  - **Validates: Requirements 6.4**

- [x] 7. Create profile tab screen
  - Create app/(tabs)/profile.tsx screen
  - Display user's displayName and email
  - Show large shame score display using ShameScoreDisplay component
  - Add sign out button
  - Use GluestackUI components for consistent styling
  - Add proper spacing and layout
  - _Requirements: 4.4, 6.1_

- [x] 8. Update tab navigation layout
  - Update app/(tabs)/\_layout.tsx to include three tabs
  - Add Home tab (existing, rename from "index")
  - Add Friends tab with badge count for pending requests
  - Add Profile tab
  - Implement proper icons for each tab
  - Ensure state preservation when switching tabs
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5_

- [x] 8.1 Write property test for tab navigation state preservation
  - **Property 13: Tab navigation state preservation**
  - **Validates: Requirements 4.5**

- [x] 9. Implement Cloud Functions for friend request notifications
  - Add sendFriendRequestNotification function triggered on friendRequest creation
  - Add sendFriendRequestAcceptedNotification function triggered on status update
  - Fetch sender/receiver FCM tokens from user documents
  - Send FCM notifications with proper payload (sender name, action type)
  - Handle errors gracefully (log but don't block operations)
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 9.1 Write property test for friend request notification delivery
  - **Property 21: Friend request notification delivery**
  - **Validates: Requirements 7.1, 7.2**

- [x] 9.2 Write property test for friend request acceptance notification
  - **Property 23: Friend request acceptance notification**
  - **Validates: Requirements 7.4**

- [x] 10. Implement notification handling in app
  - Update hooks/useNotifications.ts to handle friend request notifications
  - Add navigation handler for friend request notification taps
  - Navigate to Friends tab and pending requests section on tap
  - Update notification permissions and token registration
  - _Requirements: 7.3_

- [x] 10.1 Write property test for friend request notification navigation
  - **Property 22: Friend request notification navigation**
  - **Validates: Requirements 7.3**

- [x] 11. Update Firestore Security Rules
  - Add security rules for friendRequests collection
  - Allow read if user is sender or receiver
  - Allow create if senderId matches authenticated user
  - Allow update if receiverId matches authenticated user (for accept/reject)
  - Update users collection rules to allow read for search
  - Deploy updated security rules
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11.1 Write property test for friend request sender authorization
  - **Property 25: Friend request sender authorization**
  - **Validates: Requirements 8.1**

- [x] 11.2 Write property test for friend request acceptance authorization
  - **Property 26: Friend request acceptance authorization**
  - **Validates: Requirements 8.2**

- [x] 11.3 Write property test for friend removal authorization
  - **Property 27: Friend removal authorization**
  - **Validates: Requirements 8.3**

- [x] 11.4 Write property test for friend request query filtering
  - **Property 28: Friend request query filtering**
  - **Validates: Requirements 8.4**

- [x] 11.5 Write property test for unauthenticated access denial
  - **Property 29: Unauthenticated access denial**
  - **Validates: Requirements 8.5**

- [x] 12. Create Firestore indexes for search queries
  - Create composite index for users collection (searchableEmail, searchableName)
  - Create index for friendRequests collection (senderId, receiverId, status)
  - Deploy indexes using firestore.indexes.json
  - Test query performance with indexes
  - _Requirements: 1.1, 2.3_

- [x] 13. Add custom hooks for friend management
  - Create hooks/useFriendSearch.ts for search functionality
  - Create hooks/useFriendRequests.ts for pending requests
  - Create hooks/useFriends.ts for friends list (if not exists)
  - Implement proper cleanup and error handling in hooks
  - Add loading and error states
  - _Requirements: 1.1, 2.3, 3.1, 6.1, 6.2, 6.3, 6.4_

- [x] 13.1 Write property test for pending requests badge count accuracy
  - **Property 24: Pending requests badge count accuracy**
  - **Validates: Requirements 7.5**

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Polish UI and add visual feedback
  - Ensure all touch targets are at least 44x44 pixels
  - Add loading spinners for all async operations
  - Add success toasts for friend actions (added, accepted, removed)
  - Add error toasts with retry options
  - Implement smooth animations for list updates
  - Add haptic feedback for important actions
  - Test on various screen sizes
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 15.1 Write property test for touch target size compliance
  - **Property 30: Touch target size compliance**
  - **Validates: Requirements 9.3**

- [x] 15.2 Write property test for friend action visual feedback
  - **Property 31: Friend action visual feedback**
  - **Validates: Requirements 9.4**

- [x] 16. Integration testing and bug fixes
  - Test complete friend request flow (search → send → accept → appears in list)
  - Test friend removal flow (remove → goals disappear → both users updated)
  - Test real-time updates across multiple devices/sessions
  - Test notification delivery and navigation
  - Test offline behavior and reconnection
  - Fix any bugs discovered during testing
  - _Requirements: All_

- [x] 17. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
