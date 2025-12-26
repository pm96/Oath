import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import {
    FIRESTORE_COLLECTIONS,
    HabitAnalytics,
    HabitCompletion,
    HabitStreak
} from "../../types/habit-streaks";

/**
 * Firestore collection schemas and validation utilities for habit streaks
 */

// Firestore document validation schemas
export const FirestoreTimestampSchema = z.custom<Timestamp>((val) => {
    return val instanceof Timestamp;
}, "Must be a Firestore Timestamp");

// Completion document schema for Firestore
export const CompletionDocumentSchema = z.object({
    habitId: z.string().min(1),
    userId: z.string().min(1),
    completedAt: FirestoreTimestampSchema,
    timezone: z.string().min(1),
    notes: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    isActive: z.boolean().optional(),
    revertedAt: FirestoreTimestampSchema.optional(),
    createdAt: FirestoreTimestampSchema,
});

// Streak document schema for Firestore
export const StreakDocumentSchema = z.object({
    habitId: z.string().min(1),
    userId: z.string().min(1),
    currentStreak: z.number().int().min(0),
    bestStreak: z.number().int().min(0),
    lastCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    streakStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    freezesAvailable: z.number().int().min(0),
    freezesUsed: z.number().int().min(0),
    milestones: z.array(
        z.object({
            days: z.number().int().positive(),
            achievedAt: FirestoreTimestampSchema,
            celebrated: z.boolean(),
        }),
    ),
    updatedAt: FirestoreTimestampSchema,
});

// Analytics document schema for Firestore
export const AnalyticsDocumentSchema = z.object({
    habitId: z.string().min(1),
    userId: z.string().min(1),
    totalCompletions: z.number().int().min(0),
    completionRate30Days: z.number().min(0).max(100),
    averageStreakLength: z.number().min(0),
    bestDayOfWeek: z.string().min(1),
    consistencyScore: z.number().min(0).max(100),
    lastUpdated: FirestoreTimestampSchema,
});

// Document ID generators
export const generateCompletionId = (
    userId: string,
    habitId: string,
    timestamp: Timestamp,
): string => {
    return `${userId}_${habitId}_${timestamp.seconds}`;
};

export const generateStreakId = (userId: string, habitId: string): string => {
    return `${userId}_${habitId}`;
};

export const generateAnalyticsId = (
    userId: string,
    habitId: string,
): string => {
    return `${userId}_${habitId}`;
};

// Collection references helpers
export const getCollectionPath = (
    collection: keyof typeof FIRESTORE_COLLECTIONS,
): string => {
    return FIRESTORE_COLLECTIONS[collection];
};

// Data transformation utilities
export const transformCompletionToFirestore = (completion: HabitCompletion) => {
    return {
        habitId: completion.habitId,
        userId: completion.userId,
        completedAt: completion.completedAt,
        timezone: completion.timezone,
        notes: completion.notes,
        difficulty: completion.difficulty,
        isActive: completion.isActive ?? true,
        revertedAt: completion.revertedAt ?? null,
        createdAt: Timestamp.now(),
    };
};

export const transformFirestoreToCompletion = (
    id: string,
    data: any,
): HabitCompletion => {
    return {
        id,
        habitId: data.habitId,
        userId: data.userId,
        completedAt: data.completedAt,
        timezone: data.timezone,
        notes: data.notes,
        difficulty: data.difficulty,
        isActive: data.isActive ?? true,
        revertedAt: data.revertedAt ?? null,
    };
};

export const filterActiveCompletions = (
    completions: HabitCompletion[],
): HabitCompletion[] => {
    return completions.filter((completion) => completion.isActive !== false);
};

export const transformStreakToFirestore = (streak: HabitStreak) => {
    return {
        habitId: streak.habitId,
        userId: streak.userId,
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        lastCompletionDate: streak.lastCompletionDate,
        streakStartDate: streak.streakStartDate,
        freezesAvailable: streak.freezesAvailable,
        freezesUsed: streak.freezesUsed,
        milestones: streak.milestones,
        updatedAt: Timestamp.now(),
    };
};

export const transformFirestoreToStreak = (data: any): HabitStreak => {
    return {
        habitId: data.habitId,
        userId: data.userId,
        currentStreak: data.currentStreak,
        bestStreak: data.bestStreak,
        lastCompletionDate: data.lastCompletionDate,
        streakStartDate: data.streakStartDate,
        freezesAvailable: data.freezesAvailable,
        freezesUsed: data.freezesUsed,
        milestones: data.milestones || [],
    };
};

export const transformAnalyticsToFirestore = (analytics: HabitAnalytics) => {
    return {
        habitId: analytics.habitId,
        userId: analytics.userId,
        totalCompletions: analytics.totalCompletions,
        completionRate30Days: analytics.completionRate30Days,
        averageStreakLength: analytics.averageStreakLength,
        bestDayOfWeek: analytics.bestDayOfWeek,
        consistencyScore: analytics.consistencyScore,
        lastUpdated: analytics.lastUpdated,
    };
};

export const transformFirestoreToAnalytics = (data: any): HabitAnalytics => {
    return {
        habitId: data.habitId,
        userId: data.userId,
        totalCompletions: data.totalCompletions,
        completionRate30Days: data.completionRate30Days,
        averageStreakLength: data.averageStreakLength,
        bestDayOfWeek: data.bestDayOfWeek,
        consistencyScore: data.consistencyScore,
        lastUpdated: data.lastUpdated,
    };
};

// Validation functions
export const validateCompletionDocument = (data: any): boolean => {
    return CompletionDocumentSchema.safeParse(data).success;
};

export const validateStreakDocument = (data: any): boolean => {
    return StreakDocumentSchema.safeParse(data).success;
};

export const validateAnalyticsDocument = (data: any): boolean => {
    return AnalyticsDocumentSchema.safeParse(data).success;
};

// Security validation helpers
export const validateUserOwnership = (
    userId: string,
    documentUserId: string,
): boolean => {
    return userId === documentUserId;
};

export const validateTimestampRecency = (
    timestamp: Timestamp,
    maxHoursOld: number = 24,
): boolean => {
    const now = Timestamp.now();
    const diffMs = now.toMillis() - timestamp.toMillis();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours <= maxHoursOld;
};

// Firestore security rules helpers (for documentation)
export const SECURITY_RULES_DOCUMENTATION = {
    completions: {
        read: "Only the owner can read their completion records",
        write: "Only the owner can create/update their completion records",
        validation: "Timestamp must be within current day in user timezone",
    },
    streaks: {
        read: "Owner can read their streaks, friends can read shared habit streaks",
        write: "Only server-side functions can update streak calculations",
        validation: "All calculations must be server-side validated",
    },
    analytics: {
        read: "Only the owner can read their analytics",
        write: "Only server-side functions can update analytics",
        validation: "All metrics must be server-side calculated",
    },
} as const;
