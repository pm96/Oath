import { Goal, GoalStatus } from "../services/firebase/collections";

/**
 * Goal Status Calculator Utility
 *
 * Calculates real-time goal status based on deadline proximity and completion state.
 * Implements traffic light logic: green (safe), yellow (warning), red (failed/overdue).
 */

export interface DeadlineProximity {
    hoursUntilDeadline: number;
    isOverdue: boolean;
    displayText: string;
}

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Calculate deadline proximity information
 */
export function getDeadlineProximity(deadline: Date): DeadlineProximity {
    const now = new Date();
    const hoursUntilDeadline =
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isOverdue = hoursUntilDeadline < 0;

    let displayText: string;

    if (isOverdue) {
        const hoursOverdue = Math.abs(hoursUntilDeadline);
        const daysOverdue = Math.floor(hoursOverdue / 24);

        if (daysOverdue > 0) {
            displayText = `Overdue by ${daysOverdue}d`;
        } else {
            displayText = `Overdue by ${Math.floor(hoursOverdue)}h`;
        }
    } else {
        const minutesUntilDeadline = Math.floor(hoursUntilDeadline * 60);

        if (hoursUntilDeadline < 1) {
            displayText = `Due in ${minutesUntilDeadline}m`;
        } else if (hoursUntilDeadline < 24) {
            displayText = `Due in ${Math.floor(hoursUntilDeadline)}h`;
        } else {
            const daysUntilDeadline = Math.floor(hoursUntilDeadline / 24);
            displayText = `Due in ${daysUntilDeadline}d`;
        }
    }

    return {
        hoursUntilDeadline,
        isOverdue,
        displayText,
    };
}

/**
 * Calculate goal status based on deadline proximity and completion state
 *
 * Logic:
 * - Completed today: Green with checkmark
 * - Overdue: Red with overdue time
 * - Due in < 2h: Red with time remaining
 * - Due in 2-6h: Yellow with time remaining
 * - Due in > 6h: Green (safe)
 */
export function calculateStatus(goal: Goal): GoalStatus {
    const now = new Date();
    const deadline = goal.nextDeadline;
    const hoursUntilDeadline =
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If goal is completed today, always green
    if (goal.latestCompletionDate && isSameDay(goal.latestCompletionDate, now)) {
        return {
            color: "green",
            priority: 3,
            text: "Completed ✓",
            showNudge: false,
        };
    }

    // If overdue
    if (hoursUntilDeadline < 0) {
        const hoursOverdue = Math.abs(hoursUntilDeadline);
        const daysOverdue = Math.floor(hoursOverdue / 24);

        return {
            color: "red",
            priority: 1,
            text:
                daysOverdue > 0
                    ? `Overdue by ${daysOverdue}d`
                    : `Overdue by ${Math.floor(hoursOverdue)}h`,
            showNudge: true,
        };
    }

    // If due soon (less than 2 hours)
    if (hoursUntilDeadline < 2) {
        const minutesUntilDeadline = Math.floor(hoursUntilDeadline * 60);
        return {
            color: "red",
            priority: 1,
            text: `Due in ${minutesUntilDeadline}m`,
            showNudge: true,
        };
    }

    // If due within 6 hours (warning zone)
    if (hoursUntilDeadline < 6) {
        return {
            color: "yellow",
            priority: 2,
            text: `Due in ${Math.floor(hoursUntilDeadline)}h`,
            showNudge: true,
        };
    }

    // Safe zone (more than 6 hours)
    return {
        color: "green",
        priority: 3,
        text: "Safe",
        showNudge: false,
    };
}

/**
 * Get status color for a goal status
 */
export function getStatusColor(status: GoalStatus): string {
    switch (status.color) {
        case "green":
            return "#22c55e"; // green-500
        case "yellow":
            return "#eab308"; // yellow-500
        case "red":
            return "#ef4444"; // red-500
        default:
            return "#6b7280"; // gray-500
    }
}

/**
 * Get status text for a goal
 */
export function getStatusText(goal: Goal): string {
    const status = calculateStatus(goal);
    return status.text;
}

/**
 * Determine if nudge button should be shown for a goal
 */
export function shouldShowNudgeButton(
    goal: Goal,
    isCompleted: boolean = false,
): boolean {
    // Never show nudge button for completed goals
    if (isCompleted) {
        return false;
    }

    // Check if goal is completed today
    const now = new Date();
    if (goal.latestCompletionDate && isSameDay(goal.latestCompletionDate, now)) {
        return false;
    }

    const status = calculateStatus(goal);
    return status.showNudge;
}
