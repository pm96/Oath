import { Timestamp } from "firebase/firestore";
import { z } from "zod";

// Core TypeScript Interfaces

export interface HabitCompletion {
    id: string;
    habitId: string;
    userId: string;
    completedAt: Timestamp;
    timezone: string;
    notes?: string;
    difficulty: "easy" | "medium" | "hard";
    isActive?: boolean;
    revertedAt?: Timestamp | null;
}

export interface HabitStreak {
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

export interface StreakMilestone {
    days: number;
    achievedAt: Timestamp;
    celebrated: boolean;
}

export interface HabitAnalytics {
    habitId: string;
    userId: string;
    totalCompletions: number;
    completionRate30Days: number;
    averageStreakLength: number;
    bestDayOfWeek: string;
    consistencyScore: number;
    lastUpdated: Timestamp;
}

// Calendar and UI Types

export interface CalendarDay {
    date: string; // YYYY-MM-DD format
    completed: boolean;
    isToday: boolean;
    isInStreak: boolean;
    completionTime?: string;
    notes?: string;
}

export interface TrendData {
    period: string;
    completionRate: number;
    streakLength: number;
    totalCompletions: number;
}

// Zod Validation Schemas

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const HabitCompletionSchema = z.object({
    id: z.string().min(1),
    habitId: z.string().min(1),
    userId: z.string().min(1),
    completedAt: z.any(), // Timestamp validation handled separately
    timezone: z.string().min(1),
    notes: z.string().optional(),
    difficulty: DifficultySchema,
});

export const StreakMilestoneSchema = z.object({
    days: z.number().int().positive(),
    achievedAt: z.any(), // Timestamp validation handled separately
    celebrated: z.boolean(),
});

export const HabitStreakSchema = z.object({
    habitId: z.string().min(1),
    userId: z.string().min(1),
    currentStreak: z.number().int().min(0),
    bestStreak: z.number().int().min(0),
    lastCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    streakStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    freezesAvailable: z.number().int().min(0),
    freezesUsed: z.number().int().min(0),
    milestones: z.array(StreakMilestoneSchema),
});

export const HabitAnalyticsSchema = z.object({
    habitId: z.string().min(1),
    userId: z.string().min(1),
    totalCompletions: z.number().int().min(0),
    completionRate30Days: z.number().min(0).max(100),
    averageStreakLength: z.number().min(0),
    bestDayOfWeek: z.string().min(1),
    consistencyScore: z.number().min(0).max(100),
    lastUpdated: z.any(), // Timestamp validation handled separately
});

export const CalendarDaySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completed: z.boolean(),
    isToday: z.boolean(),
    isInStreak: z.boolean(),
    completionTime: z.string().optional(),
    notes: z.string().optional(),
});

// Type guards for runtime validation

export const isValidDifficulty = (
    value: any,
): value is "easy" | "medium" | "hard" => {
    return DifficultySchema.safeParse(value).success;
};

export const isValidHabitCompletion = (
    value: any,
): value is HabitCompletion => {
    return HabitCompletionSchema.safeParse(value).success;
};

export const isValidHabitStreak = (value: any): value is HabitStreak => {
    return HabitStreakSchema.safeParse(value).success;
};

export const isValidHabitAnalytics = (value: any): value is HabitAnalytics => {
    return HabitAnalyticsSchema.safeParse(value).success;
};

// Firestore Collection Names
export const FIRESTORE_COLLECTIONS = {
    COMPLETIONS: "completions",
    STREAKS: "streaks",
    ANALYTICS: "analytics",
} as const;

// Milestone Constants
export const MILESTONE_DAYS = [7, 30, 60, 100, 365] as const;
export const DIFFICULTY_MULTIPLIERS = {
    easy: 1,
    medium: 1.5,
    hard: 2,
} as const;
