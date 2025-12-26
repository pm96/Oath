# Design Document

## Overview

The Habit Tracking & Streaks System is a comprehensive engagement feature that transforms simple goal completion into a compelling habit-building experience. The system leverages psychological principles of gamification, progress visualization, and social reinforcement to maintain long-term user engagement. It provides real-time streak tracking, visual progress indicators, milestone celebrations, and social sharing capabilities while ensuring data integrity and cross-device synchronization.

## Architecture

The system follows a client-server architecture with real-time synchronization:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │◄──►│   Firestore DB   │◄──►│ Cloud Functions │
│                 │    │                  │    │                 │
│ • Streak UI     │    │ • Completions    │    │ • Calculations  │
│ • Celebrations  │    │ • Streaks        │    │ • Notifications │
│ • Calendar      │    │ • Milestones     │    │ • Validation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Core Data Models

```typescript
interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completedAt: Timestamp;
  timezone: string;
  notes?: string;
  difficulty: "easy" | "medium" | "hard";
}

interface HabitStreak {
  habitId: string;
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletionDate: string; // YYYY-MM-DD format
  streakStartDate: string;
  freezesAvailable: number;
  freezesUsed: number;
  milestones: StreakMilestone[];
}

interface StreakMilestone {
  days: number;
  achievedAt: Timestamp;
  celebrated: boolean;
}

interface HabitAnalytics {
  habitId: string;
  userId: string;
  totalCompletions: number;
  completionRate30Days: number;
  averageStreakLength: number;
  bestDayOfWeek: string;
  consistencyScore: number;
  lastUpdated: Timestamp;
}
```

### Service Interfaces

```typescript
interface StreakService {
  calculateStreak(habitId: string, userId: string): Promise<HabitStreak>;
  recordCompletion(completion: HabitCompletion): Promise<void>;
  useStreakFreeze(habitId: string, userId: string): Promise<boolean>;
  getHabitCalendar(
    habitId: string,
    userId: string,
    days: number,
  ): Promise<CalendarDay[]>;
  checkMilestones(streak: HabitStreak): Promise<StreakMilestone[]>;
}

interface AnalyticsService {
  calculateHabitAnalytics(
    habitId: string,
    userId: string,
  ): Promise<HabitAnalytics>;
  getCompletionTrends(
    habitId: string,
    userId: string,
    period: string,
  ): Promise<TrendData>;
  getOverallConsistencyScore(userId: string): Promise<number>;
}
```

## Data Models

### Firestore Collections

**completions** collection:

```
/completions/{completionId}
{
  habitId: string,
  userId: string,
  completedAt: timestamp,
  timezone: string,
  notes?: string,
  difficulty: 'easy' | 'medium' | 'hard',
  createdAt: timestamp
}
```

**streaks** collection:

```
/streaks/{userId}_{habitId}
{
  habitId: string,
  userId: string,
  currentStreak: number,
  bestStreak: number,
  lastCompletionDate: string,
  streakStartDate: string,
  freezesAvailable: number,
  freezesUsed: number,
  milestones: array,
  updatedAt: timestamp
}
```

**analytics** collection:

```
/analytics/{userId}_{habitId}
{
  habitId: string,
  userId: string,
  totalCompletions: number,
  completionRate30Days: number,
  averageStreakLength: number,
  bestDayOfWeek: string,
  consistencyScore: number,
  lastUpdated: timestamp
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._
Property 1: Consecutive completion streak increment
_For any_ habit and completion sequence, when completions occur on consecutive days, the current streak should increment by 1 for each consecutive completion
**Validates: Requirements 1.1**

Property 2: Streak reset on missed day
_For any_ habit with an active streak, when a day is missed (no completion), the current streak should reset to 0
**Validates: Requirements 1.2**

Property 3: Best streak tracking invariant
_For any_ habit, the best streak should always be greater than or equal to the current streak, and should update when current streak exceeds it
**Validates: Requirements 1.3**

Property 4: Streak display completeness
_For any_ habit display, the rendered output should contain both current streak and best streak values with appropriate indicators
**Validates: Requirements 1.4**

Property 5: Calendar day count accuracy
_For any_ habit calendar, the displayed grid should contain exactly 90 days with correct completion status for each day
**Validates: Requirements 2.1**

Property 6: Completion visual indicator mapping
_For any_ calendar day with a completion, the display should show a green dot or checkmark indicator
**Validates: Requirements 2.2**

Property 7: Incomplete day indicator mapping
_For any_ calendar day without a completion, the display should show a gray or empty indicator
**Validates: Requirements 2.3**

Property 8: Calendar interaction detail display
_For any_ calendar day tap interaction, the system should display completion details including time and notes
**Validates: Requirements 2.4**

Property 9: Streak period highlighting
_For any_ calendar with an active streak, the current streak period should be highlighted with a distinct visual indicator
**Validates: Requirements 2.5**

Property 10: Milestone celebration triggering
_For any_ habit reaching milestone values (30, 60, 100, 365 days), the system should trigger appropriate milestone celebrations
**Validates: Requirements 3.2**

Property 11: Milestone notification delivery
_For any_ milestone achievement, the system should send a congratulatory push notification with achievement details
**Validates: Requirements 3.3**

Property 12: Milestone badge display
_For any_ habit with earned milestones, the display should show all milestone badges with correct achievement dates
**Validates: Requirements 3.4**

Property 13: Milestone count aggregation
_For any_ user profile, the total milestone count should equal the sum of milestones across all user habits
**Validates: Requirements 3.5**

Property 14: Streak freeze availability logic
_For any_ missed habit day, streak freeze should be offered if and only if freezes are available
**Validates: Requirements 4.1, 4.5**

Property 15: Streak freeze application
_For any_ streak freeze usage, the current streak should be maintained and the day should be marked as protected
**Validates: Requirements 4.2**

Property 16: Freeze indicator display
_For any_ habit with an active streak freeze, the display should show a shield icon next to the streak counter
**Validates: Requirements 4.3**

Property 17: Freeze earning from milestones
_For any_ 30-day milestone achievement, the system should award exactly one streak freeze
**Validates: Requirements 4.4**

Property 18: Completion record persistence
_For any_ habit completion, the system should store a record with timestamp, habit ID, and user ID
**Validates: Requirements 5.1**

Property 19: History grouping accuracy
_For any_ habit history display, completions should be correctly grouped by week and month periods
**Validates: Requirements 5.2**

Property 20: Completion rate calculation
_For any_ time period, completion rate percentages should be accurately calculated from completion data
**Validates: Requirements 5.3, 5.5**

Property 21: Completion detail display
_For any_ completion entry tap, the system should display exact time and notes for that completion
**Validates: Requirements 5.4**

Property 22: Analytics trend calculation
_For any_ habit analytics, completion rate trends should be accurately calculated over the last 30 days
**Validates: Requirements 6.1**

Property 23: Consistent day identification
_For any_ habit with multiple completions, the system should correctly identify the most consistent day of the week
**Validates: Requirements 6.2**

Property 24: Analytics metric accuracy
_For any_ habit analytics, average streak length and total days completed should be accurately calculated
**Validates: Requirements 6.3**

Property 25: Cross-habit consistency scoring
_For any_ user with multiple habits, the overall consistency score should be correctly calculated across all habits
**Validates: Requirements 6.4**

Property 26: Improvement trend detection
_For any_ performance improvement, the system should highlight positive trends with encouraging messages
**Validates: Requirements 6.5**

Property 27: Broken streak motivation
_For any_ broken streak, the system should display motivational messages encouraging restart
**Validates: Requirements 7.1**

Property 28: Previous best streak targeting
_For any_ restart after broken streak, the system should show previous best streak as a target to beat
**Validates: Requirements 7.2**

Property 29: Achievement preservation messaging
_For any_ broken streak display, the system should emphasize that previous achievements still count
**Validates: Requirements 7.3**

Property 30: Multiple break guidance
_For any_ user with multiple broken streaks, the system should provide guidance on habit stacking or easier goals
**Validates: Requirements 7.4**

Property 31: Restart reminder offering
_For any_ broken streak, the system should offer to set a reminder for the next day to help restart
**Validates: Requirements 7.5**

Property 32: Milestone sharing offer
_For any_ milestone streak achievement, the system should offer to share the achievement with friends
**Validates: Requirements 8.1**

Property 33: Social post creation
_For any_ streak sharing action, the system should create a social post visible to the user's friends
**Validates: Requirements 8.2**

Property 34: Achievement reaction display
_For any_ shared streak viewed by friends, the system should display the achievement with congratulatory reaction options
**Validates: Requirements 8.3**

Property 35: Friend streak visibility
_For any_ user viewing friend's habits, the system should show current streaks for shared habits
**Validates: Requirements 8.4**

Property 36: Reaction notification delivery
_For any_ friend reaction to streak achievements, the system should send notifications to the streak achiever
**Validates: Requirements 8.5**

Property 37: Difficulty level availability
_For any_ habit creation, the system should allow setting difficulty levels (Easy, Medium, Hard)
**Validates: Requirements 9.1**

Property 38: Difficulty score weighting
_For any_ habit score calculation, streaks should be weighted by difficulty multiplier (1x, 1.5x, 2x)
**Validates: Requirements 9.2**

Property 39: Score display completeness
_For any_ habit achievement display, both difficulty-adjusted scores and raw streaks should be shown
**Validates: Requirements 9.3**

Property 40: Score normalization for comparison
_For any_ habit comparison, scores should be normalized to account for different difficulty levels
**Validates: Requirements 9.4**

Property 41: Hard habit recognition
_For any_ user maintaining hard habits, the system should provide additional recognition and rewards
**Validates: Requirements 9.5**

Property 42: Cross-device data synchronization
_For any_ habit completion, the data should immediately sync across all user devices
**Validates: Requirements 10.1**

Property 43: Atomic update integrity
_For any_ streak data update, the system should ensure atomic updates to prevent data corruption
**Validates: Requirements 10.2**

Property 44: Cross-device consistency
_For any_ user switching devices, streak information should be identical across all devices
**Validates: Requirements 10.3**

Property 45: Offline caching and sync
_For any_ network connectivity loss, streak updates should be cached and synced when connection returns
**Validates: Requirements 10.4**

Property 46: Conflict resolution by timestamp
_For any_ data conflicts, the system should resolve using the most recent timestamp for each completion
**Validates: Requirements 10.5**

Property 47: Streak risk reminder timing
_For any_ user at risk of breaking a streak, reminder notifications should be sent 2 hours before day end
**Validates: Requirements 11.1**

Property 48: Immediate milestone notifications
_For any_ milestone achievement, celebration notifications should be sent immediately
**Validates: Requirements 11.2**

Property 49: Recovery notification timing
_For any_ broken streak, encouraging notifications should be sent the next day to restart
**Validates: Requirements 11.3**

Property 50: Long streak progress notifications
_For any_ user with long streaks, weekly progress notifications should highlight the achievement
**Validates: Requirements 11.4**

Property 51: Notification preference compliance
_For any_ notification preferences set, the system should respect user choices for timing and frequency
**Validates: Requirements 11.5**

Property 52: Timezone-aware completion validation
_For any_ completion record, the timestamp should be validated within the current day in the user's timezone
**Validates: Requirements 12.1**

Property 53: Server-side calculation validation
_For any_ streak calculation, the system should use server-side validation to prevent manipulation
**Validates: Requirements 12.2**

Property 54: Owner-only modification access
_For any_ streak data access, only the habit owner should be able to modify their completion records
**Validates: Requirements 12.3**

Property 55: Integrity verification before display
_For any_ streak display to friends, the system should verify data integrity before showing achievements
**Validates: Requirements 12.4**

Property 56: Suspicious activity flagging
_For any_ suspicious activity detection, accounts should be flagged for review while preserving legitimate data
**Validates: Requirements 12.5**

## Error Handling

The system implements comprehensive error handling across all components:

### Client-Side Error Handling

- **Network Failures**: Graceful degradation with cached data and retry mechanisms
- **Data Validation**: Input validation with user-friendly error messages
- **State Corruption**: Automatic state recovery and data refresh
- **UI Errors**: Error boundaries with fallback components

### Server-Side Error Handling

- **Database Failures**: Transaction rollbacks and data consistency checks
- **Calculation Errors**: Validation and recalculation mechanisms
- **Notification Failures**: Retry queues and fallback delivery methods
- **Security Violations**: Automatic flagging and audit logging

### Data Integrity Protection

- **Atomic Operations**: All streak updates use Firestore transactions
- **Validation Rules**: Server-side validation for all data modifications
- **Conflict Resolution**: Timestamp-based conflict resolution for concurrent updates
- **Backup Mechanisms**: Regular data backups and recovery procedures

## Testing Strategy

The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage and correctness validation.

### Unit Testing Approach

Unit tests will focus on:

- Specific streak calculation scenarios (first completion, consecutive days, gaps)
- Milestone detection edge cases (exactly reaching thresholds)
- UI component rendering with various data states
- Error handling for network failures and invalid data
- Integration points between streak service and analytics service

### Property-Based Testing Approach

Property-based tests will use **fast-check** library for JavaScript/TypeScript and will be configured to run a minimum of 100 iterations per test. Each property-based test will be tagged with a comment explicitly referencing the correctness property from this design document using the format: **Feature: habit-tracking-streaks, Property {number}: {property_text}**

Property tests will verify:

- Streak calculation correctness across all possible completion sequences
- Calendar display accuracy for any 90-day period
- Milestone detection for all possible streak lengths
- Analytics calculation accuracy across various data distributions
- Data synchronization consistency across multiple devices
- Security validation for all user inputs and access patterns

The dual testing approach ensures that unit tests catch concrete bugs in specific scenarios while property tests verify general correctness across the entire input space, providing comprehensive validation of the habit tracking and streaks system.
