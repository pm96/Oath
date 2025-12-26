// Export all habit streak related types and utilities
export * from "./habit-streaks";

// Re-export commonly used types for convenience
export type {
    CalendarDay, HabitAnalytics, HabitCompletion,
    HabitStreak,
    StreakMilestone, TrendData
} from "./habit-streaks";

export {
    CalendarDaySchema, DIFFICULTY_MULTIPLIERS,
    DifficultySchema, FIRESTORE_COLLECTIONS, HabitAnalyticsSchema, HabitCompletionSchema,
    HabitStreakSchema, MILESTONE_DAYS
} from "./habit-streaks";

