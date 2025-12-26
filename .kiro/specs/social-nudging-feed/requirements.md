# Requirements Document

## Introduction

This document specifies the requirements for the Social Nudging and Friends Feed feature - the core accountability mechanism that enables users to monitor their friends' goal progress and apply social pressure through nudges. This feature builds on the existing friend-management-ui by displaying friends' goals with real-time status updates and providing the ability to send push notification nudges when friends are at risk of breaking their oaths. The system transforms passive friendship connections into active accountability partnerships.

## Glossary

- **Friends Feed**: A real-time dashboard displaying all friends' goals with their current status
- **Goal Status**: The current state of a goal (safe/green, warning/yellow, failed/red) based on deadline proximity
- **Nudge**: A push notification sent to a friend to remind them about an incomplete goal
- **Deadline Proximity**: The time remaining until a goal's deadline (e.g., "Due in 2h", "Overdue by 1d")
- **Status Color**: Visual indicator using traffic light colors (green=safe, yellow=warning, red=failed)
- **Firebase App**: The mobile application that users interact with
- **Firestore**: The real-time database storing goals and user data
- **FCM**: Firebase Cloud Messaging service for push notifications
- **Cloud Function**: Server-side function triggered by Firestore events

## Requirements

### Requirement 1: Friends Feed Display

**User Story:** As a user, I want to see all my friends' goals in a single feed, so that I can monitor their progress and provide accountability.

#### Acceptance Criteria

1. WHEN a user views the Friends tab THEN the Firebase App SHALL display all goals belonging to users in the current user's friends array
2. WHEN displaying a friend's goal THEN the Firebase App SHALL show the friend's name, goal description, recurrence pattern, and deadline
3. WHEN a friend has multiple goals THEN the Firebase App SHALL group them under the friend's name
4. WHEN the friends feed is empty THEN the Firebase App SHALL display a message encouraging the user to add friends
5. WHEN a friend's goal list changes THEN the Firebase App SHALL update the display in real-time

### Requirement 2: Goal Status Visualization

**User Story:** As a user, I want to see visual indicators of my friends' goal status, so that I can quickly identify who needs accountability support.

#### Acceptance Criteria

1. WHEN a goal's deadline is more than 6 hours away THEN the Firebase App SHALL display a green status indicator
2. WHEN a goal's deadline is between 2-6 hours away THEN the Firebase App SHALL display a yellow status indicator with "Due in Xh" text
3. WHEN a goal's deadline is less than 2 hours away THEN the Firebase App SHALL display a red status indicator with "Due in Xm" text
4. WHEN a goal is overdue THEN the Firebase App SHALL display a red status indicator with "Overdue by Xh/Xd" text
5. WHEN a goal is completed THEN the Firebase App SHALL display a green checkmark and "Completed" status

### Requirement 3: Nudge Functionality

**User Story:** As a user, I want to send nudges to friends with at-risk goals, so that I can help them stay accountable.

#### Acceptance Criteria

1. WHEN a goal has a yellow or red status THEN the Firebase App SHALL display a "NUDGE" button next to that goal
2. WHEN a goal has a green status or is completed THEN the Firebase App SHALL hide the "NUDGE" button
3. WHEN a user taps the "NUDGE" button THEN the Firestore SHALL create a nudge document with senderId, receiverId, goalId, and timestamp
4. WHEN a nudge is created THEN the Cloud Function SHALL send an FCM notification to the friend with the goal description
5. WHEN a user sends a nudge THEN the Firebase App SHALL display a success toast "Nudge sent to [Friend Name]!"

### Requirement 4: Nudge Rate Limiting

**User Story:** As a user, I want nudges to be rate-limited, so that I don't spam my friends with excessive notifications.

#### Acceptance Criteria

1. WHEN a user sends a nudge for a specific goal THEN the Firebase App SHALL disable the nudge button for that goal for 1 hour
2. WHEN the 1-hour cooldown expires THEN the Firebase App SHALL re-enable the nudge button if the goal is still at-risk
3. WHEN a user attempts to send multiple nudges rapidly THEN the Firebase App SHALL show "Already nudged - wait 1h" message
4. WHEN displaying a goal with an active nudge cooldown THEN the Firebase App SHALL show the remaining cooldown time
5. WHEN a goal is completed during cooldown THEN the Firebase App SHALL clear the cooldown and hide the nudge button

### Requirement 5: Nudge Notifications

**User Story:** As a user, I want to receive nudge notifications from friends, so that I'm reminded to complete my goals.

#### Acceptance Criteria

1. WHEN a nudge is created THEN the Cloud Function SHALL send an FCM notification to the receiver with title "👊 [Friend Name] nudged you!"
2. WHEN a nudge notification is received THEN the Firebase App SHALL display it with the goal description in the body
3. WHEN a user taps a nudge notification THEN the Firebase App SHALL navigate to the Home tab showing their goals
4. WHEN a user receives multiple nudges THEN the Firebase App SHALL display each as a separate notification
5. WHEN a user has notifications disabled THEN the nudge SHALL still be recorded in Firestore but no FCM notification sent

### Requirement 6: Real-Time Feed Updates

**User Story:** As a user, I want the friends feed to update in real-time, so that I always see current goal status.

#### Acceptance Criteria

1. WHEN a friend completes a goal THEN the Firebase App SHALL immediately update the status to "Completed" with green checkmark
2. WHEN a friend creates a new goal THEN the Firebase App SHALL immediately add it to the feed
3. WHEN a friend deletes a goal THEN the Firebase App SHALL immediately remove it from the feed
4. WHEN a goal's deadline approaches THEN the Firebase App SHALL automatically update the status color and time remaining
5. WHEN network connectivity is lost THEN the Firebase App SHALL display cached feed data with an offline indicator

### Requirement 7: Feed Sorting and Organization

**User Story:** As a user, I want the friends feed sorted by urgency, so that I can focus on friends who need help most.

#### Acceptance Criteria

1. WHEN displaying the friends feed THEN the Firebase App SHALL sort goals by status priority (red first, then yellow, then green)
2. WHEN goals have the same status THEN the Firebase App SHALL sort by deadline proximity (soonest first)
3. WHEN a friend has multiple goals THEN the Firebase App SHALL display them grouped under the friend's name
4. WHEN a goal's status changes THEN the Firebase App SHALL re-sort the feed automatically
5. WHEN all friends' goals are completed THEN the Firebase App SHALL display a celebratory message

### Requirement 8: Nudge History Tracking

**User Story:** As a user, I want to see when I last nudged a friend, so that I can avoid over-nudging.

#### Acceptance Criteria

1. WHEN a nudge is sent THEN the Firestore SHALL store the nudge document with senderId, receiverId, goalId, timestamp, and senderName
2. WHEN displaying a goal with recent nudges THEN the Firebase App SHALL show "Last nudged Xm ago" below the nudge button
3. WHEN a user views their own nudge history THEN the Firebase App SHALL display all nudges they've sent in the past 7 days
4. WHEN a user views received nudges THEN the Firebase App SHALL display all nudges they've received in the past 7 days
5. WHEN a nudge is older than 7 days THEN the Firestore SHALL automatically delete it to reduce storage

### Requirement 9: Friend Goal Detail View

**User Story:** As a user, I want to view detailed information about a friend's goal, so that I can understand their commitment better.

#### Acceptance Criteria

1. WHEN a user taps on a friend's goal THEN the Firebase App SHALL navigate to a detail view showing full goal information
2. WHEN displaying goal details THEN the Firebase App SHALL show description, recurrence pattern, deadline, completion history, and shame score impact
3. WHEN viewing goal details THEN the Firebase App SHALL display a "NUDGE" button if the goal is at-risk
4. WHEN viewing goal details THEN the Firebase App SHALL show the friend's total shame score
5. WHEN a user navigates back from goal details THEN the Firebase App SHALL return to the friends feed at the same scroll position

### Requirement 10: Data Security for Nudges and Feed

**User Story:** As a user, I want my nudges and goal visibility protected, so that only my friends can see my goals and nudge me.

#### Acceptance Criteria

1. WHEN a user queries goals for the feed THEN the Firestore SHALL return only goals belonging to users in the requester's friends array
2. WHEN a user attempts to send a nudge THEN the Firestore SHALL verify the receiver is in the sender's friends array
3. WHEN a user attempts to view goal details THEN the Firestore SHALL verify the goal owner is in the requester's friends array
4. WHEN a user queries nudge history THEN the Firestore SHALL return only nudges where the user is sender or receiver
5. WHEN unauthenticated access is attempted THEN the Firestore SHALL deny all nudge and feed operations

### Requirement 11: Mobile-Optimized Feed UI

**User Story:** As a mobile user, I want a responsive and performant friends feed, so that I can quickly check on my friends' progress.

#### Acceptance Criteria

1. WHEN the Firebase App renders the friends feed THEN the Firebase App SHALL use FlatList for optimized scrolling performance
2. WHEN displaying the feed THEN the Firebase App SHALL implement pull-to-refresh functionality
3. WHEN loading the feed THEN the Firebase App SHALL display skeleton loaders while fetching data
4. WHEN the feed contains many goals THEN the Firebase App SHALL implement virtualization to render only visible items
5. WHEN a user scrolls the feed THEN the Firebase App SHALL maintain smooth 60fps scrolling performance

### Requirement 12: Nudge Button Visibility Logic

**User Story:** As a user, I want nudge buttons to appear only when appropriate, so that the interface is clean and purposeful.

#### Acceptance Criteria

1. WHEN a goal status is green (safe) THEN the Firebase App SHALL hide the nudge button
2. WHEN a goal is completed THEN the Firebase App SHALL hide the nudge button
3. WHEN a goal status is yellow or red THEN the Firebase App SHALL show the nudge button
4. WHEN a nudge cooldown is active THEN the Firebase App SHALL show a disabled nudge button with cooldown timer
5. WHEN a user is viewing their own goals THEN the Firebase App SHALL never display nudge buttons
