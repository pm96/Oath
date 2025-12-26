import {
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    Timestamp,
    where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
    HabitStreak,
    MILESTONE_DAYS,
    StreakMilestone,
} from "../../types/habit-streaks";
import { celebrationManager } from "../../utils/celebrations";
import {
    getUserFriendlyErrorMessage,
    retryWithBackoff,
} from "../../utils/errorHandling";
import { getHabitStreaksCollection } from "./collections";
import {
    transformFirestoreToStreak,
    transformStreakToFirestore,
    validateUserOwnership,
} from "./habitStreakSchemas";

/**
 * Milestone Service
 *
 * Handles milestone detection, celebration triggering, badge tracking,
 * and milestone count aggregation across habits.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4
 */
export class MilestoneService {
    /**
     * Trigger celebration for a milestone achievement
     * Requirements: 3.1, 3.2, 8.1
     */
    async triggerMilestoneCelebration(
        userId: string,
        habitId: string,
        habitDescription: string,
        milestone: StreakMilestone,
        offerSharing: boolean = true,
    ): Promise<{ shouldOfferSharing: boolean }> {
        if (!userId || !habitId || !habitDescription || !milestone) {
            throw new Error(
                "User ID, Habit ID, habit description, and milestone are required",
            );
        }

        try {
            // Mark milestone as celebrated
            await this.markMilestoneCelebrated(userId, habitId, milestone.days);

            // Trigger celebration animation and haptics
            if (milestone.days === 7) {
                // First milestone - basic celebration
                celebrationManager.celebrateGoalCompletion();
            } else {
                // Major milestone - enhanced celebration
                celebrationManager.celebrateStreakMilestone(milestone.days);
            }

            // Log celebration for analytics (could be used for notifications)
            console.log(
                `Milestone celebration triggered: ${milestone.days} days for habit ${habitId}`,
            );

            // Return whether to offer sharing (Requirements: 8.1)
            return {
                shouldOfferSharing:
                    offerSharing && this.shouldOfferSharing(milestone.days),
            };
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to trigger milestone celebration: ${message}`);
        }
    }

    /**
     * Mark a milestone as celebrated in the database
     * Requirements: 3.2
     */
    async markMilestoneCelebrated(
        userId: string,
        habitId: string,
        milestoneDays: number,
    ): Promise<void> {
        if (!userId || !habitId || !milestoneDays) {
            throw new Error("User ID, Habit ID, and milestone days are required");
        }

        try {
            await retryWithBackoff(async () => {
                return await runTransaction(db, async (transaction) => {
                    const streaksCollection = getHabitStreaksCollection();
                    const streakId = `${userId}_${habitId}`;
                    const streakDocRef = doc(streaksCollection, streakId);
                    const streakDoc = await transaction.get(streakDocRef);

                    if (!streakDoc.exists()) {
                        throw new Error("Streak data not found");
                    }

                    const streak = transformFirestoreToStreak(streakDoc.data());

                    // Validate user ownership
                    if (!validateUserOwnership(userId, streak.userId)) {
                        throw new Error("Unauthorized access to streak data");
                    }

                    // Update the milestone to mark it as celebrated
                    const updatedMilestones = streak.milestones.map((m) =>
                        m.days === milestoneDays ? { ...m, celebrated: true } : m,
                    );

                    const updatedStreak: HabitStreak = {
                        ...streak,
                        milestones: updatedMilestones,
                    };

                    const streakData = transformStreakToFirestore(updatedStreak);
                    transaction.set(streakDocRef, streakData);
                });
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to mark milestone as celebrated: ${message}`);
        }
    }

    /**
     * Get all milestone badges for a specific habit
     * Requirements: 3.4
     */
    async getHabitMilestoneBadges(
        userId: string,
        habitId: string,
    ): Promise<MilestoneBadge[]> {
        if (!userId || !habitId) {
            throw new Error("User ID and Habit ID are required");
        }

        try {
            const streaksCollection = getHabitStreaksCollection();
            const streakId = `${userId}_${habitId}`;
            const streakDocRef = doc(streaksCollection, streakId);
            const streakDoc = await getDoc(streakDocRef);

            if (!streakDoc.exists()) {
                return [];
            }

            const streak = transformFirestoreToStreak(streakDoc.data());

            // Validate user ownership
            if (!validateUserOwnership(userId, streak.userId)) {
                throw new Error("Unauthorized access to streak data");
            }

            // Transform milestones to badges
            const badges: MilestoneBadge[] = streak.milestones.map((milestone) => ({
                days: milestone.days,
                achievedAt: milestone.achievedAt,
                celebrated: milestone.celebrated,
                badgeType: this.getBadgeType(milestone.days),
                title: this.getMilestoneTitle(milestone.days),
                description: this.getMilestoneDescription(milestone.days),
            }));

            // Sort badges by days achieved
            return badges.sort((a, b) => a.days - b.days);
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get habit milestone badges: ${message}`);
        }
    }

    /**
     * Get total milestone count across all user habits
     * Requirements: 3.5
     */
    async getTotalMilestoneCount(userId: string): Promise<MilestoneCount> {
        if (!userId) {
            throw new Error("User ID is required");
        }

        try {
            return await retryWithBackoff(async () => {
                const streaksCollection = getHabitStreaksCollection();
                const userStreaksQuery = query(
                    streaksCollection,
                    where("userId", "==", userId),
                );
                const streaksSnapshot = await getDocs(userStreaksQuery);

                let totalMilestones = 0;
                const milestoneBreakdown: Record<number, number> = {};

                // Initialize milestone breakdown
                MILESTONE_DAYS.forEach((days) => {
                    milestoneBreakdown[days] = 0;
                });

                // Count milestones across all habits
                streaksSnapshot.docs.forEach((doc) => {
                    const streak = transformFirestoreToStreak(doc.data());

                    streak.milestones.forEach((milestone) => {
                        totalMilestones++;
                        milestoneBreakdown[milestone.days] =
                            (milestoneBreakdown[milestone.days] || 0) + 1;
                    });
                });

                return {
                    total: totalMilestones,
                    breakdown: milestoneBreakdown,
                    lastUpdated: Timestamp.now(),
                };
            });
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get total milestone count: ${message}`);
        }
    }

    /**
     * Get milestone badges for multiple habits (for dashboard display)
     * Requirements: 3.4
     */
    async getMultiHabitMilestoneBadges(
        userId: string,
        habitIds: string[],
    ): Promise<Record<string, MilestoneBadge[]>> {
        if (!userId || !habitIds || habitIds.length === 0) {
            throw new Error("User ID and habit IDs are required");
        }

        try {
            const result: Record<string, MilestoneBadge[]> = {};

            // Get badges for each habit
            for (const habitId of habitIds) {
                result[habitId] = await this.getHabitMilestoneBadges(userId, habitId);
            }

            return result;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            throw new Error(`Failed to get multi-habit milestone badges: ${message}`);
        }
    }

    /**
     * Check if a milestone should trigger a celebration
     * Requirements: 3.1, 3.2
     */
    shouldTriggerCelebration(milestone: StreakMilestone): boolean {
        // Only trigger celebration for uncelebrated milestones
        return !milestone.celebrated;
    }

    /**
     * Get the next milestone target for a given streak
     * Requirements: 7.2 (for motivation)
     */
    getNextMilestoneTarget(currentStreak: number): number | null {
        for (const milestoneDay of MILESTONE_DAYS) {
            if (currentStreak < milestoneDay) {
                return milestoneDay;
            }
        }
        return null; // Already achieved all milestones
    }

    /**
     * Get progress towards next milestone
     * Requirements: 7.2
     */
    getMilestoneProgress(currentStreak: number): MilestoneProgress | null {
        const nextTarget = this.getNextMilestoneTarget(currentStreak);

        if (!nextTarget) {
            return null;
        }

        const previousTarget =
            MILESTONE_DAYS.find(
                (days, index) => MILESTONE_DAYS[index + 1] === nextTarget,
            ) || 0;

        const progress = currentStreak - previousTarget;
        const total = nextTarget - previousTarget;
        const percentage = Math.round((progress / total) * 100);

        return {
            currentStreak,
            nextTarget,
            progress,
            total,
            percentage,
            daysRemaining: nextTarget - currentStreak,
        };
    }

    /**
     * Check if milestone should offer social sharing
     * Requirements: 8.1
     */
    shouldOfferSharing(milestoneDays: number): boolean {
        // Offer sharing for significant milestones
        return milestoneDays >= 7;
    }

    // Private helper methods

    private getBadgeType(days: number): BadgeType {
        switch (days) {
            case 7:
                return "bronze";
            case 30:
                return "silver";
            case 60:
                return "gold";
            case 100:
                return "platinum";
            case 365:
                return "diamond";
            default:
                return "bronze";
        }
    }

    private getMilestoneTitle(days: number): string {
        switch (days) {
            case 7:
                return "Week Warrior";
            case 30:
                return "Month Master";
            case 60:
                return "Consistency Champion";
            case 100:
                return "Century Achiever";
            case 365:
                return "Year Legend";
            default:
                return `${days} Day Streak`;
        }
    }

    private getMilestoneDescription(days: number): string {
        switch (days) {
            case 7:
                return "Completed 7 consecutive days";
            case 30:
                return "Completed 30 consecutive days";
            case 60:
                return "Completed 60 consecutive days";
            case 100:
                return "Completed 100 consecutive days";
            case 365:
                return "Completed a full year of consistency";
            default:
                return `Completed ${days} consecutive days`;
        }
    }
}

// Types for milestone badges and counts
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

// Export singleton instance
export const milestoneService = new MilestoneService();
