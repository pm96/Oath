# Requirements Document

## Introduction

This document specifies the requirements for a Social Accountability App MVP - a mobile application that helps users achieve their goals through social pressure and peer accountability. The system enables users to set goals, track progress, and receive nudges from friends when falling behind. A "shame score" mechanism provides social consequences for missed goals, creating motivation through accountability.

## Glossary

- **Goal**: A user-defined objective with a specific frequency and deadline that must be completed regularly
- **Shame Score**: A numerical counter that increases when a user fails to complete their goals, visible to friends
- **Nudge**: A push notification sent by a friend to remind a user about an incomplete goal
- **Goal Status**: A visual indicator (Green/Yellow/Red) showing the current state of a goal relative to its deadline
- **Partner**: Another user who has been added as a friend and can view shared goals
- **Completion Date**: The timestamp when a user marks a goal as completed
- **Deadline**: The calculated date/time by which a goal must be completed based on its frequency
- **Firebase App**: The mobile application that users interact with
- **Cloud Function**: A serverless function that runs automatically on a schedule or in response to events
- **Firestore**: The real-time database that stores all user and goal data
- **FCM**: Firebase Cloud Messaging service for sending push notifications

## Requirements

### Requirement 1: User Authentication

**User Story:** As a new user, I want to create an account and sign in securely, so that I can access my personal goals and connect with friends.

#### Acceptance Criteria

1. WHEN a user provides valid email and password credentials THEN the Firebase App SHALL create a new user account with a unique userId
2. WHEN a user provides valid existing credentials THEN the Firebase App SHALL authenticate the user and grant access to their data
3. WHEN a user account is created THEN the Firestore SHALL initialize a user document with displayName, shameScore set to 0, and an empty friends array
4. WHEN authentication fails THEN the Firebase App SHALL display an appropriate error message and prevent access
5. WHEN a user is authenticated THEN the Firebase App SHALL maintain the session until explicit sign-out

### Requirement 2: Goal Creation and Management

**User Story:** As a user, I want to create and define my goals with specific frequencies and target days, so that I can track my commitments systematically.

#### Acceptance Criteria

1. WHEN a user submits a goal with description, frequency, and target days THEN the Firestore SHALL create a new goal document with ownerId, description, frequency, targetDays, and calculated nextDeadline
2. WHEN a goal is created THEN the Firebase App SHALL set currentStatus to 'Green' and isShared to true
3. WHEN a user views their goals list THEN the Firebase App SHALL display all goals owned by that user in real-time
4. WHEN a goal's nextDeadline is calculated THEN the Firebase App SHALL determine the next occurrence based on frequency and targetDays
5. WHEN a user marks a goal as complete THEN the Firestore SHALL update latestCompletionDate, recalculate nextDeadline, and set currentStatus to 'Green'

### Requirement 3: Social Goal Visibility

**User Story:** As a user, I want to see my friends' goals and their progress status, so that I can provide support and accountability.

#### Acceptance Criteria

1. WHEN a user views the friends dashboard THEN the Firebase App SHALL display all goals where ownerId matches any userId in the user's friends array
2. WHEN a friend's goal status changes THEN the Firebase App SHALL update the display in real-time
3. WHEN displaying a goal THEN the Firebase App SHALL show the goal description, owner name, and currentStatus with appropriate color coding
4. WHILE a goal has isShared set to true THEN the Firestore SHALL allow read access to users in the owner's friends list
5. WHEN a user is not in another user's friends list THEN the Firestore SHALL prevent access to that user's goals

### Requirement 4: Automated Goal Status Monitoring

**User Story:** As the system, I want to automatically check goal deadlines and update statuses, so that users and their friends see accurate progress without manual intervention.

#### Acceptance Criteria

1. WHEN the scheduled Cloud Function executes THEN the Cloud Function SHALL query all goals and compare nextDeadline to current timestamp
2. WHEN a goal's nextDeadline has passed THEN the Cloud Function SHALL update currentStatus to 'Red'
3. WHEN a goal has been in 'Red' status for 24 hours THEN the Cloud Function SHALL increment the owner's shameScore by 1
4. WHEN a shameScore is incremented THEN the Cloud Function SHALL send FCM notifications to all users in the owner's friends array
5. WHEN the Cloud Function runs THEN the Cloud Function SHALL complete execution within the allocated timeout period

### Requirement 5: Friend Nudging System

**User Story:** As a user, I want to send nudges to friends who are falling behind on their goals, so that I can help them stay accountable.

#### Acceptance Criteria

1. WHEN a user views a friend's goal with 'Yellow' or 'Red' status THEN the Firebase App SHALL display a "Nudge Now" button
2. WHEN a user taps the "Nudge Now" button THEN the Firebase App SHALL invoke the sendNudge Cloud Function with the goal owner's userId
3. WHEN the sendNudge Cloud Function is invoked THEN the Cloud Function SHALL send an FCM notification to the goal owner
4. WHEN a nudge notification is sent THEN the FCM SHALL deliver the notification to the recipient's device
5. WHEN a user receives a nudge THEN the Firebase App SHALL display the notification with the sender's name and goal description

### Requirement 6: Shame Score Visibility

**User Story:** As a user, I want to see my shame score and my friends' shame scores, so that social consequences motivate goal completion.

#### Acceptance Criteria

1. WHEN a user views their profile THEN the Firebase App SHALL display their current shameScore prominently
2. WHEN a user views the friends dashboard THEN the Firebase App SHALL display each friend's shameScore alongside their goals
3. WHEN a shameScore changes THEN the Firebase App SHALL update the display in real-time
4. WHEN a goal failure occurs THEN the Firestore SHALL increment shameScore atomically to prevent race conditions
5. WHEN displaying shameScore THEN the Firebase App SHALL use visual emphasis to highlight the social consequence

### Requirement 7: Data Security and Privacy

**User Story:** As a user, I want my private data protected while allowing friends to see my shared goals, so that I maintain appropriate privacy boundaries.

#### Acceptance Criteria

1. WHEN Firestore Security Rules are evaluated THEN the Firestore SHALL allow users to read and write only their own user document
2. WHEN a user attempts to read a goal THEN the Firestore SHALL allow access only if the goal's ownerId matches the user's userId or the user's userId is in the owner's friends array
3. WHEN a user attempts to write a goal THEN the Firestore SHALL allow access only if the goal's ownerId matches the user's userId
4. WHEN authentication is not present THEN the Firestore SHALL deny all read and write operations
5. WHEN a Cloud Function executes THEN the Firestore SHALL allow privileged access using service account credentials

### Requirement 8: Mobile-Optimized User Interface

**User Story:** As a mobile user, I want a responsive and visually clear interface, so that I can easily interact with the app on my device.

#### Acceptance Criteria

1. WHEN the Firebase App renders any screen THEN the Firebase App SHALL use responsive design that adapts to mobile screen sizes
2. WHEN displaying goal status THEN the Firebase App SHALL use consistent color coding with Green for on-track, Yellow for approaching deadline, and Red for overdue
3. WHEN rendering interactive elements THEN the Firebase App SHALL provide touch targets of at least 44x44 pixels for easy tapping
4. WHEN the user navigates between screens THEN the Firebase App SHALL use Expo Router for consistent navigation patterns
5. WHEN displaying lists of goals THEN the Firebase App SHALL optimize rendering performance for smooth scrolling
