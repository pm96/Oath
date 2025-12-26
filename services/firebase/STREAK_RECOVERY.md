# Streak Recovery and Motivation System

## Overview

The Streak Recovery and Motivation System provides comprehensive support for users when their habit streaks are broken. It implements psychological principles of motivation, resilience building, and habit formation to help users restart and maintain their habits effectively.

## Requirements Coverage

This system implements the following requirements from the habit-tracking-streaks specification:

- **7.1**: Motivational messaging for broken streaks
- **7.2**: Previous best streak targeting
- **7.3**: Achievement preservation messaging
- **7.4**: Guidance system for multiple broken streaks
- **7.5**: Restart reminder offering

## Architecture

```
┌─────────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│   StreakRecoveryService │    │   React Components       │    │   useStreakRecovery     │
│                         │    │                          │    │                         │
│ • Message Generation    │◄──►│ • StreakRecoveryModal    │◄──►│ • State Management      │
│ • Guidance Strategies   │    │ • StreakRecoveryCard     │    │ • Action Handlers       │
│ • Reminder Management   │    │ • StreakRecoveryBanner   │    │ • Status Checking       │
└─────────────────────────┘    └──────────────────────────┘    └─────────────────────────┘
```

## Core Components

### 1. StreakRecoveryService

**Location**: `services/firebase/streakRecoveryService.ts`

The main service class that handles all streak recovery logic:

#### Key Methods:

- `generateBrokenStreakMessage()` - Creates motivational messages for broken streaks
- `generateRestartEncouragement()` - Provides encouragement with target streak goals
- `generateAchievementPreservationMessage()` - Emphasizes that past progress still counts
- `generateMultipleBreakGuidance()` - Offers strategies for users with repeated failures
- `generateRestartReminderOffer()` - Provides reminder setup options
- `getStreakRecoverySupport()` - Comprehensive recovery package
- `isStreakBroken()` - Determines if a streak needs recovery support

#### Message Types:

1. **Broken Streak Messages** (Requirement 7.1)
   - Motivational titles and encouraging language
   - Emphasizes fresh starts and resilience
   - Includes action buttons for immediate engagement

2. **Restart Encouragement** (Requirement 7.2)
   - Sets target streak as previous best + 1
   - Frames as a challenge to beat personal record
   - Provides specific numerical goals

3. **Achievement Preservation** (Requirement 7.3)
   - Highlights total completions and best streak
   - Reinforces that progress is not lost
   - Links to achievement viewing

4. **Multiple Break Guidance** (Requirement 7.4)
   - Habit stacking strategies (2+ breaks)
   - Easier goal setting (3+ breaks)
   - Schedule optimization (4+ breaks)
   - Accountability partners (5+ breaks)

5. **Restart Reminders** (Requirement 7.5)
   - Optimal time suggestions based on habit type
   - Customizable reminder times
   - Integration ready for notification services

### 2. React Components

#### StreakRecoveryModal

**Location**: `components/habits/StreakRecoveryModal.tsx`

A comprehensive modal that guides users through the recovery process:

- **Multi-step interface** with progress indicators
- **Customizable reminder times** with preset options
- **Expandable guidance sections** for detailed strategies
- **Action buttons** for immediate engagement

#### StreakRecoveryCard

**Location**: `components/habits/StreakRecoveryCard.tsx`

Inline cards for displaying recovery messages:

- **Compact and full display modes**
- **Type-specific styling** with color coding
- **Action and dismiss buttons**
- **Icon indicators** for message types

#### StreakRecoveryBanner

**Location**: `components/habits/StreakRecoveryCard.tsx`

Top-of-screen banners for immediate attention:

- **Minimal space usage**
- **Quick action buttons**
- **Dismissible interface**
- **Type-specific color schemes**

### 3. useStreakRecovery Hook

**Location**: `hooks/useStreakRecovery.ts`

React hook for managing streak recovery state and actions:

#### State Management:

- Loading states for async operations
- Error handling and user feedback
- Recovery data caching
- Modal visibility control

#### Key Functions:

- `checkStreakStatus()` - Monitors streak health
- `loadRecoverySupport()` - Fetches comprehensive recovery data
- `showRecoveryModal()` - Displays full recovery interface
- `setRestartReminder()` - Handles reminder configuration
- `startFresh()` - Initiates streak restart process
- `viewAchievements()` - Navigation to achievements

## Usage Examples

### Basic Integration

```typescript
import { useStreakRecovery } from '../hooks/useStreakRecovery';
import { StreakRecoveryBanner, StreakRecoveryModal } from '../components/habits';

function HabitScreen({ habitId, userId, habitName }) {
    const {
        activeRecoveryMessage,
        showModal,
        recoveryData,
        showRecoveryModal,
        hideRecoveryModal,
        setRestartReminder,
        startFresh,
        viewAchievements,
        dismissRecoveryMessage
    } = useStreakRecovery(habitId, userId, habitName);

    return (
        <View>
            {/* Show banner for broken streaks */}
            {activeRecoveryMessage && (
                <StreakRecoveryBanner
                    message={activeRecoveryMessage}
                    onAction={showRecoveryModal}
                    onDismiss={dismissRecoveryMessage}
                />
            )}

            {/* Full recovery modal */}
            {recoveryData && (
                <StreakRecoveryModal
                    visible={showModal}
                    onClose={hideRecoveryModal}
                    habitName={habitName}
                    recoveryData={recoveryData}
                    onSetReminder={setRestartReminder}
                    onStartFresh={startFresh}
                    onViewAchievements={viewAchievements}
                />
            )}

            {/* Rest of habit screen */}
        </View>
    );
}
```

### Manual Recovery Check

```typescript
import { streakRecoveryService } from "../services/firebase";

async function checkHabitRecovery(
  habitId: string,
  userId: string,
  habitName: string,
) {
  const recoveryMessage =
    await streakRecoveryService.getRecoveryMessageForStreak(
      habitId,
      userId,
      habitName,
    );

  if (recoveryMessage) {
    // Show recovery support
    console.log("Streak needs recovery:", recoveryMessage.title);
  }
}
```

## Psychological Principles

### 1. Motivational Messaging (Requirement 7.1)

- **Growth mindset language**: Emphasizes learning and improvement
- **Resilience framing**: Positions setbacks as normal parts of growth
- **Action-oriented**: Provides immediate next steps
- **Positive reinforcement**: Celebrates past achievements

### 2. Goal Setting (Requirement 7.2)

- **Specific targets**: Previous best streak + 1 day
- **Achievable challenges**: Builds on proven capability
- **Progress tracking**: Clear numerical goals
- **Personal records**: Competitive element with self

### 3. Achievement Recognition (Requirement 7.3)

- **Progress preservation**: Emphasizes that effort wasn't wasted
- **Cumulative thinking**: Highlights total completions
- **Identity reinforcement**: "You are someone who does X"
- **Milestone celebration**: References past achievements

### 4. Adaptive Strategies (Requirement 7.4)

- **Habit stacking**: Links new habits to existing routines
- **Goal adjustment**: Reduces difficulty to build momentum
- **Environmental design**: Optimizes timing and context
- **Social support**: Leverages accountability and community

### 5. Implementation Intentions (Requirement 7.5)

- **If-then planning**: "If tomorrow at 8am, then I will..."
- **Cue-based reminders**: Time-based triggers
- **Commitment devices**: Public or semi-public commitments
- **Fresh start effect**: Leverages temporal landmarks

## Configuration

### Reminder Time Optimization

The system suggests optimal reminder times based on habit categories:

```typescript
const HABIT_TIME_MAPPING = {
  morning: ["exercise", "meditation", "reading", "journaling"],
  evening: ["reflection", "planning", "stretching"],
  default: "10:00",
};
```

### Guidance Thresholds

Multiple break guidance is triggered based on estimated break count:

- **2+ breaks**: Habit stacking strategies
- **3+ breaks**: Easier goal recommendations
- **4+ breaks**: Schedule optimization advice
- **5+ breaks**: Accountability partner suggestions

### Message Randomization

Multiple message variants prevent repetition and maintain engagement:

- 4 different motivational message templates
- 3 different encouragement message templates
- Randomized selection on each generation

## Integration Points

### Notification Service Integration

```typescript
// Future integration point for push notifications
interface NotificationIntegration {
  scheduleReminder(options: RestartReminderOptions): Promise<void>;
  cancelReminder(habitId: string, userId: string): Promise<void>;
}
```

### Analytics Integration

```typescript
// Track recovery system effectiveness
interface RecoveryAnalytics {
  trackRecoveryShown(habitId: string, messageType: string): void;
  trackRecoveryAction(habitId: string, action: string): void;
  trackSuccessfulRestart(habitId: string, daysToRestart: number): void;
}
```

### Achievement System Integration

```typescript
// Link to existing achievement/milestone system
interface AchievementIntegration {
  getHabitAchievements(habitId: string, userId: string): Promise<Achievement[]>;
  navigateToAchievements(habitId?: string): void;
}
```

## Testing

The system includes comprehensive tests covering:

- **Message generation logic** for all requirement types
- **Guidance strategy selection** based on break patterns
- **Reminder time optimization** for different habit types
- **Streak status detection** and recovery triggering
- **Performance ratio calculations** for break estimation

## Performance Considerations

- **Lazy loading**: Recovery data loaded only when needed
- **Caching**: Recovery messages cached to prevent regeneration
- **Minimal dependencies**: Core logic independent of Firebase
- **Async operations**: Non-blocking streak status checks

## Future Enhancements

1. **Machine Learning**: Personalized message selection based on user response
2. **A/B Testing**: Optimize message effectiveness through experimentation
3. **Social Features**: Share recovery journeys with accountability partners
4. **Gamification**: Recovery badges and comeback achievements
5. **Advanced Analytics**: Detailed recovery success metrics and patterns

## Error Handling

The system includes robust error handling:

- **Graceful degradation**: Falls back to basic messages if data unavailable
- **User feedback**: Clear error messages for failed operations
- **Retry mechanisms**: Automatic retry for transient failures
- **Logging**: Comprehensive logging for debugging and monitoring

## Accessibility

All components follow accessibility best practices:

- **Screen reader support**: Proper ARIA labels and descriptions
- **Keyboard navigation**: Full keyboard accessibility
- **Color contrast**: Meets WCAG guidelines for color usage
- **Text scaling**: Supports dynamic text sizing
- **Focus management**: Proper focus handling in modals

This streak recovery system provides comprehensive support for users experiencing habit streak breaks, implementing evidence-based psychological principles to maximize the likelihood of successful habit restart and long-term maintenance.
