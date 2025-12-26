# Requirements Document

## Introduction

This document specifies the requirements for the Friend Management UI feature - a critical missing component of the Social Accountability App that enables users to discover, add, and manage their accountability partners. Without this feature, users cannot leverage the core social accountability mechanism. The system will provide intuitive interfaces for searching users, sending/accepting friend requests, and managing existing friendships.

## Glossary

- **Friend Request**: An invitation sent from one user to another to establish a friendship connection
- **Pending Request**: A friend request that has been sent but not yet accepted or rejected
- **Friend Connection**: A bidirectional relationship between two users that enables goal visibility and nudging
- **User Search**: A query mechanism to find other users by email or display name
- **Friends Tab**: A dedicated navigation tab for viewing friends, their goals, and managing connections
- **Profile Tab**: A navigation tab showing the current user's profile, goals, and shame score
- **Firebase App**: The mobile application that users interact with
- **Firestore**: The real-time database that stores all user and relationship data

## Requirements

### Requirement 1: User Search and Discovery

**User Story:** As a user, I want to search for other users by email or name, so that I can find friends to add for accountability.

#### Acceptance Criteria

1. WHEN a user enters a search query THEN the Firebase App SHALL query Firestore for users matching the email or displayName
2. WHEN search results are returned THEN the Firebase App SHALL display matching users with their displayName and email
3. WHEN a user appears in search results THEN the Firebase App SHALL indicate if they are already a friend or have a pending request
4. WHEN no users match the search query THEN the Firebase App SHALL display a "No users found" message
5. WHEN the search query is empty THEN the Firebase App SHALL display a prompt to enter an email or name

### Requirement 2: Friend Request Management

**User Story:** As a user, I want to send friend requests and respond to incoming requests, so that I can build my accountability network.

#### Acceptance Criteria

1. WHEN a user taps "Add Friend" on a search result THEN the Firestore SHALL create a friend request document with senderId, receiverId, and status 'pending'
2. WHEN a friend request is sent THEN the Firebase App SHALL update the UI to show "Request Sent" status
3. WHEN a user receives a friend request THEN the Firebase App SHALL display it in a "Pending Requests" section
4. WHEN a user accepts a friend request THEN the Firestore SHALL add each user's ID to the other's friends array and update request status to 'accepted'
5. WHEN a user rejects a friend request THEN the Firestore SHALL update the request status to 'rejected' and remove it from the pending list

### Requirement 3: Friends List Display

**User Story:** As a user, I want to view my list of friends with their current shame scores, so that I can see who needs accountability support.

#### Acceptance Criteria

1. WHEN a user views the Friends tab THEN the Firebase App SHALL display all users whose IDs are in the current user's friends array
2. WHEN displaying a friend THEN the Firebase App SHALL show their displayName, email, and current shameScore
3. WHEN a friend's shameScore changes THEN the Firebase App SHALL update the display in real-time
4. WHEN the friends list is empty THEN the Firebase App SHALL display a message encouraging the user to add friends
5. WHEN a user taps on a friend THEN the Firebase App SHALL navigate to a detailed view showing that friend's goals

### Requirement 4: Enhanced Navigation Structure

**User Story:** As a user, I want clear navigation between my goals, friends, and profile, so that I can easily access all app features.

#### Acceptance Criteria

1. WHEN the app loads for an authenticated user THEN the Firebase App SHALL display a tab bar with Home, Friends, and Profile tabs
2. WHEN a user taps the Home tab THEN the Firebase App SHALL navigate to the goals management screen
3. WHEN a user taps the Friends tab THEN the Firebase App SHALL navigate to the friends dashboard with search and friends list
4. WHEN a user taps the Profile tab THEN the Firebase App SHALL navigate to the user's profile showing their shame score and settings
5. WHEN navigating between tabs THEN the Firebase App SHALL preserve the state of each screen

### Requirement 5: Friend Removal

**User Story:** As a user, I want to remove friends from my list, so that I can manage my accountability network.

#### Acceptance Criteria

1. WHEN a user views a friend's details THEN the Firebase App SHALL display a "Remove Friend" option
2. WHEN a user confirms friend removal THEN the Firestore SHALL remove each user's ID from the other's friends array
3. WHEN a friendship is removed THEN the Firebase App SHALL immediately hide the removed friend's goals
4. WHEN a friendship is removed THEN the Firestore SHALL update both users' data atomically to prevent inconsistency
5. WHEN a user removes a friend THEN the Firebase App SHALL display a confirmation message

### Requirement 6: Real-Time Friend Updates

**User Story:** As a user, I want to see real-time updates when friends accept my requests or when their information changes, so that my view is always current.

#### Acceptance Criteria

1. WHEN a friend accepts a request THEN the Firebase App SHALL immediately add them to the friends list without requiring a refresh
2. WHEN a friend's displayName changes THEN the Firebase App SHALL update the display across all screens showing that friend
3. WHEN a friend's shameScore changes THEN the Firebase App SHALL update the displayed value in real-time
4. WHEN a pending request is accepted or rejected THEN the Firebase App SHALL remove it from the pending requests list immediately
5. WHEN network connectivity is lost THEN the Firebase App SHALL display cached friend data and show an offline indicator

### Requirement 7: Friend Request Notifications

**User Story:** As a user, I want to receive notifications when someone sends me a friend request, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN a friend request is created THEN the Cloud Function SHALL send an FCM notification to the receiver
2. WHEN a user receives a friend request notification THEN the Firebase App SHALL display it with the sender's name
3. WHEN a user taps a friend request notification THEN the Firebase App SHALL navigate to the pending requests section
4. WHEN a friend request is accepted THEN the Cloud Function SHALL send an FCM notification to the original sender
5. WHEN a user has pending requests THEN the Firebase App SHALL display a badge count on the Friends tab

### Requirement 8: Data Security for Friend Relationships

**User Story:** As a user, I want my friend relationships protected, so that only I can manage my connections.

#### Acceptance Criteria

1. WHEN a user attempts to create a friend request THEN the Firestore SHALL verify the senderId matches the authenticated user
2. WHEN a user attempts to accept a friend request THEN the Firestore SHALL verify the receiverId matches the authenticated user
3. WHEN a user attempts to remove a friend THEN the Firestore SHALL verify the user is one of the parties in the friendship
4. WHEN a user queries friend requests THEN the Firestore SHALL return only requests where the user is sender or receiver
5. WHEN unauthenticated access is attempted THEN the Firestore SHALL deny all friend-related operations

### Requirement 9: Mobile-Optimized Friend Management UI

**User Story:** As a mobile user, I want a responsive and intuitive friend management interface, so that I can easily manage my accountability network on my device.

#### Acceptance Criteria

1. WHEN the Firebase App renders the Friends tab THEN the Firebase App SHALL use responsive design that adapts to mobile screen sizes
2. WHEN displaying search results THEN the Firebase App SHALL show results in a scrollable list with clear visual separation
3. WHEN rendering friend request actions THEN the Firebase App SHALL provide touch targets of at least 44x44 pixels
4. WHEN a user performs a friend action THEN the Firebase App SHALL provide immediate visual feedback (loading states, success messages)
5. WHEN displaying the friends list THEN the Firebase App SHALL optimize rendering performance for smooth scrolling
