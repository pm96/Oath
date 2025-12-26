/**
 * Example usage of the Habit Completion Tracking System
 *
 * This example demonstrates how to use the CompletionService
 * to track habit completions, calculate rates, and view history.
 *
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1
 */

import { Timestamp } from "firebase/firestore";
import { completionService } from "../services/firebase/completionService";
import { streakService } from "../services/firebase/streakService";
import { HabitCompletion } from "../types/habit-streaks";
import { getCurrentDateString, getUserTimezone } from "../utils/dateUtils";

export class CompletionTrackingExample {
    private userId = "example-user-123";
    private habitId = "example-habit-456";

    /**
     * Example: Record a new habit completion
     * Requirements: 5.1, 12.1
     */
    async recordHabitCompletion(): Promise<void> {
        try {
            const completion: Omit<HabitCompletion, "id"> = {
                habitId: this.habitId,
                userId: this.userId,
                completedAt: Timestamp.now(),
                timezone: getUserTimezone(),
                notes: "Completed my morning workout routine",
                difficulty: "medium",
            };

            // Record the completion
            const recordedCompletion =
                await completionService.recordCompletion(completion);
            console.log("✅ Completion recorded:", recordedCompletion.id);

            // Update streak after completion
            const updatedStreak = await streakService.calculateStreak(
                this.habitId,
                this.userId,
            );
            console.log(`🔥 Current streak: ${updatedStreak.currentStreak} days`);
            console.log(`🏆 Best streak: ${updatedStreak.bestStreak} days`);
        } catch (error) {
            console.error("❌ Failed to record completion:", error);
        }
    }

    /**
     * Example: Get completion history with pagination
     * Requirements: 5.2, 5.4
     */
    async viewCompletionHistory(): Promise<void> {
        try {
            const history = await completionService.getCompletionHistory(
                this.habitId,
                this.userId,
                20, // Last 20 completions
            );

            console.log(`📊 Completion History (${history.period}):`);
            console.log(`Total completions: ${history.totalCount}`);
            console.log(`Completion rate: ${history.completionRate.toFixed(1)}%`);

            // Show recent completions
            history.completions.slice(0, 5).forEach((completion, index) => {
                const date = completion.completedAt.toDate().toLocaleDateString();
                const time = completion.completedAt.toDate().toLocaleTimeString();
                console.log(
                    `${index + 1}. ${date} at ${time} - ${completion.notes || "No notes"}`,
                );
            });
        } catch (error) {
            console.error("❌ Failed to get completion history:", error);
        }
    }

    /**
     * Example: Calculate completion rates for different periods
     * Requirements: 5.3, 5.5
     */
    async calculateCompletionRates(): Promise<void> {
        try {
            const stats = await completionService.getCompletionStatistics(
                this.habitId,
                this.userId,
            );

            console.log("📈 Completion Rate Statistics:");
            console.log(
                `Weekly: ${stats.weekly.rate.toFixed(1)}% (${stats.weekly.completedDays}/${stats.weekly.totalDays} days)`,
            );
            console.log(
                `Monthly: ${stats.monthly.rate.toFixed(1)}% (${stats.monthly.completedDays}/${stats.monthly.totalDays} days)`,
            );
            console.log(
                `Quarterly: ${stats.quarterly.rate.toFixed(1)}% (${stats.quarterly.completedDays}/${stats.quarterly.totalDays} days)`,
            );
            console.log(
                `All-time: ${stats.allTime.rate.toFixed(1)}% (${stats.allTime.completedDays}/${stats.allTime.totalDays} days)`,
            );
        } catch (error) {
            console.error("❌ Failed to calculate completion rates:", error);
        }
    }

    /**
     * Example: View grouped completions by week and month
     * Requirements: 5.2
     */
    async viewGroupedCompletions(): Promise<void> {
        try {
            const grouped = await completionService.getGroupedCompletions(
                this.habitId,
                this.userId,
                3, // Last 3 months
            );

            console.log("📅 Weekly Completion Groups:");
            grouped.weekly.slice(0, 4).forEach((week, index) => {
                console.log(`Week ${index + 1}: ${week.weekStart} to ${week.weekEnd}`);
                console.log(`  Completions: ${week.completionCount}`);
                console.log(`  Rate: ${week.completionRate.toFixed(1)}%`);
            });

            console.log("\n📅 Monthly Completion Groups:");
            grouped.monthly.slice(0, 3).forEach((month, index) => {
                console.log(`${month.monthName}:`);
                console.log(`  Completions: ${month.completionCount}`);
                console.log(`  Rate: ${month.completionRate.toFixed(1)}%`);
            });
        } catch (error) {
            console.error("❌ Failed to get grouped completions:", error);
        }
    }

    /**
     * Example: Get detailed information about a specific completion
     * Requirements: 5.4
     */
    async viewCompletionDetail(completionId: string): Promise<void> {
        try {
            const detail = await completionService.getCompletionDetail(
                completionId,
                this.userId,
            );

            console.log("🔍 Completion Detail:");
            console.log(
                `Date: ${detail.completion.completedAt.toDate().toLocaleDateString()}`,
            );
            console.log(`Time: ${detail.timeOfDay}`);
            console.log(`Day of week: ${detail.dayOfWeek}`);
            console.log(`Relative time: ${detail.relativeTime}`);
            console.log(`Difficulty: ${detail.completion.difficulty}`);
            console.log(`Notes: ${detail.completion.notes || "No notes"}`);
            console.log(`Timezone: ${detail.completion.timezone}`);
        } catch (error) {
            console.error("❌ Failed to get completion detail:", error);
        }
    }

    /**
     * Example: Calculate completion rate for a custom period
     * Requirements: 5.3
     */
    async calculateCustomPeriodRate(): Promise<void> {
        try {
            const timezone = getUserTimezone();
            const endDate = getCurrentDateString(timezone);

            // Calculate rate for last 30 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const startDateString = startDate.toISOString().split("T")[0];

            const rate = await completionService.calculateCompletionRate(
                this.habitId,
                this.userId,
                startDateString,
                endDate,
            );

            console.log("📊 Custom Period Completion Rate:");
            console.log(`Period: ${rate.period}`);
            console.log(`Total days: ${rate.totalDays}`);
            console.log(`Completed days: ${rate.completedDays}`);
            console.log(`Rate: ${rate.rate.toFixed(1)}%`);
        } catch (error) {
            console.error("❌ Failed to calculate custom period rate:", error);
        }
    }

    /**
     * Run all examples
     */
    async runAllExamples(): Promise<void> {
        console.log("🚀 Starting Completion Tracking Examples\n");

        await this.recordHabitCompletion();
        console.log("\n" + "=".repeat(50) + "\n");

        await this.viewCompletionHistory();
        console.log("\n" + "=".repeat(50) + "\n");

        await this.calculateCompletionRates();
        console.log("\n" + "=".repeat(50) + "\n");

        await this.viewGroupedCompletions();
        console.log("\n" + "=".repeat(50) + "\n");

        await this.calculateCustomPeriodRate();
        console.log("\n" + "=".repeat(50) + "\n");

        console.log("✨ All examples completed!");
    }
}

// Export for use in other files
export const completionTrackingExample = new CompletionTrackingExample();

// Usage example:
// import { completionTrackingExample } from './examples/completionTrackingExample';
// await completionTrackingExample.runAllExamples();
