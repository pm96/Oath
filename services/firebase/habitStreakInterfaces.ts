import { Timestamp } from "firebase/firestore";
import {
    CalendarDay,
    HabitAnalytics,
    HabitCompletion,
    HabitStreak,
    StreakMilestone,
    TrendData,
} from "../../types/habit-streaks";

/**
 * Service interfaces for habit streak functionality
 * These interfaces define the contracts that will be implemented in subsequent tasks
 */

export interface StreakService {
    /**
     * Calculate and update streak information for a habit
     */
    calculateStreak(habitId: string, userId: string): Promise<HabitStreak>;

    /**
     * Record a new habit completion and update streak
     */
    recordCompletion(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<HabitCompletion>;

    /**
     * Record completion and check for milestone achievements
     */
    recordCompletionWithMilestoneCheck(
        completion: Omit<HabitCompletion, "id">,
    ): Promise<{
        completion: HabitCompletion;
        newMilestones: StreakMilestone[];
        updatedStreak: HabitStreak;
    }>;

    /**
     * Use a streak freeze to protect from a missed day
     */
    useStreakFreeze(
        habitId: string,
        userId: string,
        missedDate: string,
    ): Promise<boolean>;

    /**
     * Get calendar data for a habit showing completion status
     */
    getHabitCalendar(
        habitId: string,
        userId: string,
        days: number,
        timezone: string,
    ): Promise<CalendarDay[]>;

    /**
     * Check for new milestones and return any that should be celebrated
     */
    checkMilestones(streak: HabitStreak): Promise<StreakMilestone[]>;

    /**
     * Get streak information for a specific habit
     */
    getHabitStreak(habitId: string, userId: string): Promise<HabitStreak | null>;

    /**
     * Initialize streak data for a new habit
     */
    initializeHabitStreak(habitId: string, userId: string): Promise<HabitStreak>;

    /**
     * Reset a streak (used when streak is broken and no freeze available)
     */
    resetStreak(
        habitId: string,
        userId: string,
        resetDate: string,
    ): Promise<HabitStreak>;
}

export interface AnalyticsService {
    /**
     * Calculate comprehensive analytics for a habit
     */
    calculateHabitAnalytics(
        habitId: string,
        userId: string,
    ): Promise<HabitAnalytics>;

    /**
     * Get completion trends over a specified period
     */
    getCompletionTrends(
        habitId: string,
        userId: string,
        period: "week" | "month" | "quarter" | "year",
    ): Promise<TrendData[]>;

    /**
     * Calculate overall consistency score across all user habits
     */
    getOverallConsistencyScore(userId: string): Promise<number>;

    /**
     * Get the most consistent day of the week for a habit
     */
    getBestDayOfWeek(habitId: string, userId: string): Promise<string>;

    /**
     * Calculate completion rate for a specific time period
     */
    getCompletionRate(
        habitId: string,
        userId: string,
        startDate: string,
        endDate: string,
    ): Promise<number>;

    /**
     * Get analytics for multiple habits (dashboard view)
     */
    getMultiHabitAnalytics(
        habitIds: string[],
        userId: string,
    ): Promise<HabitAnalytics[]>;
}

export interface NotificationService {
    /**
     * Schedule streak risk reminder notifications
     */
    scheduleStreakRiskReminder(
        habitId: string,
        userId: string,
        timezone: string,
    ): Promise<void>;

    /**
     * Send immediate milestone celebration notification
     */
    sendMilestoneNotification(
        userId: string,
        habitId: string,
        milestone: StreakMilestone,
    ): Promise<void>;

    /**
     * Send streak recovery encouragement notification
     */
    sendRecoveryNotification(
        userId: string,
        habitId: string,
        previousBestStreak: number,
    ): Promise<void>;

    /**
     * Send weekly progress notification for long streaks
     */
    sendWeeklyProgressNotification(
        userId: string,
        habitId: string,
        currentStreak: number,
    ): Promise<void>;

    /**
     * Cancel scheduled notifications for a habit
     */
    cancelHabitNotifications(habitId: string, userId: string): Promise<void>;
}

export interface MilestoneService {
    /**
     * Trigger celebration for a milestone achievement
     */
    triggerMilestoneCelebration(
        userId: string,
        habitId: string,
        milestone: StreakMilestone,
    ): Promise<void>;

    /**
     * Mark a milestone as celebrated in the database
     */
    markMilestoneCelebrated(
        userId: string,
        habitId: string,
        milestoneDays: number,
    ): Promise<void>;

    /**
     * Get all milestone badges for a specific habit
     */
    getHabitMilestoneBadges(
        userId: string,
        habitId: string,
    ): Promise<MilestoneBadge[]>;

    /**
     * Get total milestone count across all user habits
     */
    getTotalMilestoneCount(userId: string): Promise<MilestoneCount>;

    /**
     * Get milestone badges for multiple habits
     */
    getMultiHabitMilestoneBadges(
        userId: string,
        habitIds: string[],
    ): Promise<Record<string, MilestoneBadge[]>>;

    /**
     * Check if a milestone should trigger a celebration
     */
    shouldTriggerCelebration(milestone: StreakMilestone): boolean;

    /**
     * Get the next milestone target for a given streak
     */
    getNextMilestoneTarget(currentStreak: number): number | null;

    /**
     * Get progress towards next milestone
     */
    getMilestoneProgress(currentStreak: number): MilestoneProgress | null;
}

export interface MilestoneBadge {
    days: number;
    achievedAt: Timestamp;
    celebrated: boolean;
    badgeType: BadgeType;
    title: string;
    description: string;
}

export interface MilestoneCount {
    total: number;
    breakdown: Record<number, number>;
    lastUpdated: Timestamp;
}

export interface MilestoneProgress {
    currentStreak: number;
    nextTarget: number;
    progress: number;
    total: number;
    percentage: number;
    daysRemaining: number;
}

export type BadgeType = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface SocialService {
    /**
     * Share a milestone achievement with friends
     */
    shareMilestoneAchievement(
        userId: string,
        habitId: string,
        milestone: StreakMilestone,
    ): Promise<void>;

    /**
     * Get visible streaks from friends for shared habits
     */
    getFriendStreaks(userId: string, habitId: string): Promise<HabitStreak[]>;

    /**
     * React to a friend's streak achievement
     */
    reactToStreakAchievement(
        userId: string,
        friendUserId: string,
        habitId: string,
        reaction: "congratulations" | "fire" | "clap",
    ): Promise<void>;

    /**
     * Get social feed of streak achievements from friends
     */
    getStreakFeed(userId: string, limit?: number): Promise<StreakFeedItem[]>;
}

export interface StreakFeedItem {
    id: string;
    userId: string;
    userName: string;
    habitId: string;
    habitName: string;
    achievementType: "milestone" | "best_streak" | "comeback";
    achievementValue: number;
    achievedAt: Timestamp;
    reactions: StreakReaction[];
}

export interface StreakReaction {
    userId: string;
    userName: string;
    reaction: "congratulations" | "fire" | "clap";
    reactedAt: Timestamp;
}

export interface DataSyncService {
    /**
     * Sync habit completion data across devices
     */
    syncCompletionData(userId: string): Promise<void>;

    /**
     * Sync streak data across devices
     */
    syncStreakData(userId: string): Promise<void>;

    /**
     * Handle offline completion sync when connection returns
     */
    syncOfflineCompletions(userId: string): Promise<void>;

    /**
     * Resolve data conflicts using timestamp priority
     */
    resolveDataConflicts(userId: string): Promise<void>;

    /**
     * Verify data integrity before display
     */
    verifyDataIntegrity(userId: string, habitId: string): Promise<boolean>;
}

export interface StreakRecoveryService {
    /**
     * Generate motivational message for a broken streak
     */
    generateBrokenStreakMessage(
        habitId: string,
        previousStreak: number,
        habitName: string,
    ): StreakRecoveryMessage;

    /**
     * Generate restart encouragement with previous best streak targeting
     */
    generateRestartEncouragement(
        habitId: string,
        bestStreak: number,
        habitName: string,
    ): StreakRecoveryMessage;

    /**
     * Generate achievement preservation message
     */
    generateAchievementPreservationMessage(
        habitId: string,
        bestStreak: number,
        totalCompletions: number,
        habitName: string,
    ): StreakRecoveryMessage;

    /**
     * Generate guidance for users with multiple broken streaks
     */
    generateMultipleBreakGuidance(
        brokenStreakCount: number,
    ): MultipleBreakGuidance[];

    /**
     * Generate restart reminder offer
     */
    generateRestartReminderOffer(
        habitId: string,
        habitName: string,
        userTimezone: string,
    ): StreakRecoveryMessage;

    /**
     * Get comprehensive recovery support for a broken streak
     */
    getStreakRecoverySupport(
        habitId: string,
        userId: string,
        habitName: string,
    ): Promise<StreakRecoverySupport>;

    /**
     * Check if a streak is considered "broken"
     */
    isStreakBroken(streak: HabitStreak, timezone?: string): boolean;

    /**
     * Get recovery message based on streak status
     */
    getRecoveryMessageForStreak(
        habitId: string,
        userId: string,
        habitName: string,
    ): Promise<StreakRecoveryMessage | null>;
}

export interface StreakRecoveryMessage {
    type:
    | "broken_streak"
    | "restart_encouragement"
    | "achievement_preservation"
    | "multiple_breaks"
    | "restart_reminder";
    title: string;
    message: string;
    actionText?: string;
    targetStreak?: number;
    reminderOffered?: boolean;
}

export interface MultipleBreakGuidance {
    type:
    | "habit_stacking"
    | "easier_goals"
    | "schedule_adjustment"
    | "accountability_partner";
    title: string;
    description: string;
    actionSteps: string[];
}

export interface RestartReminderOptions {
    enabled: boolean;
    time: string; // HH:MM format
    timezone: string;
    message: string;
}

export interface StreakRecoverySupport {
    motivationalMessage: StreakRecoveryMessage;
    restartEncouragement: StreakRecoveryMessage;
    achievementPreservation: StreakRecoveryMessage;
    multipleBreakGuidance?: MultipleBreakGuidance[];
    restartReminder: StreakRecoveryMessage;
}

// Error types for habit streak operations
export class HabitStreakError extends Error {
    constructor(
        message: string,
        public code: string,
        public habitId?: string,
        public userId?: string,
    ) {
        super(message);
        this.name = "HabitStreakError";
    }
}

export class ValidationError extends HabitStreakError {
    constructor(message: string, habitId?: string, userId?: string) {
        super(message, "VALIDATION_ERROR", habitId, userId);
        this.name = "ValidationError";
    }
}

export class SecurityError extends HabitStreakError {
    constructor(message: string, habitId?: string, userId?: string) {
        super(message, "SECURITY_ERROR", habitId, userId);
        this.name = "SecurityError";
    }
}

export class DataIntegrityError extends HabitStreakError {
    constructor(message: string, habitId?: string, userId?: string) {
        super(message, "DATA_INTEGRITY_ERROR", habitId, userId);
        this.name = "DataIntegrityError";
    }
}
