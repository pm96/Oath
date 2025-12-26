/**
 * Property-Based Tests for Goal Status Calculator
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";
import { Goal, GoalStatus } from "../services/firebase/collections";
import {
    calculateStatus,
    getDeadlineProximity,
    getStatusColor,
    getStatusText,
    shouldShowNudgeButton,
} from "../utils/goalStatusCalculator";

/**
 * Helper function to create a test goal
 */
function createTestGoal(
    nextDeadline: Date,
    latestCompletionDate: Date | null = null,
): Goal {
    return {
        id: "test-goal-1",
        ownerId: "test-user-1",
        description: "Test goal",
        frequency: "daily" as const,
        targetDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        latestCompletionDate,
        currentStatus: "Green" as const,
        nextDeadline,
        isShared: true,
        type: "flexible",
        targetTime: null,
        createdAt: new Date(),
        redSince: null,
        difficulty: "medium" as const,
    };
}

/**
 * Helper function to check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

describe("Goal Status Calculator Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 5: Status color calculation accuracy**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     */
    describe("Property 5: Status color calculation accuracy", () => {
        it("should return green for goals with deadline more than 6 hours away and not completed today", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 7, max: 168 }), // 7 hours to 1 week
                    (hoursFromNow) => {
                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const status = calculateStatus(goal);

                        expect(status.color).toBe("green");
                        expect(status.priority).toBe(3);
                        expect(status.showNudge).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should return yellow for goals with deadline between 2-6 hours away", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(2.1), max: Math.fround(5.9) }), // Between 2 and 6 hours
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const status = calculateStatus(goal);

                        expect(status.color).toBe("yellow");
                        expect(status.priority).toBe(2);
                        expect(status.showNudge).toBe(true);
                        expect(status.text).toMatch(/^Due in \d+h$/);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should return red for goals with deadline less than 2 hours away", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(1.9) }), // Less than 2 hours
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const status = calculateStatus(goal);

                        expect(status.color).toBe("red");
                        expect(status.priority).toBe(1);
                        expect(status.showNudge).toBe(true);
                        expect(status.text).toMatch(/^Due in \d+m$/);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should return red for overdue goals", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(168.0) }), // Up to 1 week overdue
                    (hoursOverdue) => {
                        fc.pre(!isNaN(hoursOverdue)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() - hoursOverdue * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const status = calculateStatus(goal);

                        expect(status.color).toBe("red");
                        expect(status.priority).toBe(1);
                        expect(status.showNudge).toBe(true);
                        expect(status.text).toMatch(/^Overdue by \d+[hd]$/);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 6: Completed goal status display**
     * **Validates: Requirements 2.5**
     */
    describe("Property 6: Completed goal status display", () => {
        it("should return green with checkmark for goals completed today regardless of deadline", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(-168.0), max: Math.fround(168.0) }), // Any deadline from 1 week ago to 1 week from now
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = new Date(); // Completed today
                        const goal = createTestGoal(deadline, completionDate);

                        const status = calculateStatus(goal);

                        expect(status.color).toBe("green");
                        expect(status.priority).toBe(3);
                        expect(status.text).toBe("Completed ✓");
                        expect(status.showNudge).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should not show completed status for goals completed on different days", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 30 }), // 1 to 30 days ago
                    fc.float({ min: Math.fround(0.1), max: Math.fround(1.9) }), // Less than 2 hours from now (should be red)
                    (daysAgo, hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = new Date(
                            now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline, completionDate);

                        const status = calculateStatus(goal);

                        // Should not show as completed since it wasn't completed today
                        expect(status.text).not.toBe("Completed ✓");
                        expect(status.color).toBe("red"); // Should be red due to deadline < 2h
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 7: Nudge button visibility for at-risk goals**
     * **Validates: Requirements 3.1, 12.3**
     */
    describe("Property 7: Nudge button visibility for at-risk goals", () => {
        it("should show nudge button for yellow and red status goals", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(5.9) }), // Less than 6 hours (yellow or red)
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const shouldShow = shouldShowNudgeButton(goal);
                        const status = calculateStatus(goal);

                        expect(shouldShow).toBe(true);
                        expect(status.showNudge).toBe(true);
                        expect(status.color === "yellow" || status.color === "red").toBe(
                            true,
                        );
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should show nudge button for overdue goals", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(168.0) }), // Up to 1 week overdue
                    (hoursOverdue) => {
                        fc.pre(!isNaN(hoursOverdue)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() - hoursOverdue * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const shouldShow = shouldShowNudgeButton(goal);
                        const status = calculateStatus(goal);

                        expect(shouldShow).toBe(true);
                        expect(status.showNudge).toBe(true);
                        expect(status.color).toBe("red");
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 8: Nudge button hiding for safe goals**
     * **Validates: Requirements 3.2, 12.1, 12.2**
     */
    describe("Property 8: Nudge button hiding for safe goals", () => {
        it("should hide nudge button for green status goals (safe)", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 7, max: 168 }), // More than 6 hours away
                    (hoursFromNow) => {
                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const shouldShow = shouldShowNudgeButton(goal);
                        const status = calculateStatus(goal);

                        expect(shouldShow).toBe(false);
                        expect(status.showNudge).toBe(false);
                        expect(status.color).toBe("green");
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should hide nudge button for completed goals regardless of deadline", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(-168.0), max: Math.fround(168.0) }), // Any deadline
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = new Date(); // Completed today
                        const goal = createTestGoal(deadline, completionDate);

                        const shouldShow = shouldShowNudgeButton(goal);
                        const status = calculateStatus(goal);

                        expect(shouldShow).toBe(false);
                        expect(status.showNudge).toBe(false);
                        expect(status.text).toBe("Completed ✓");
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should hide nudge button when explicitly marked as completed", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(1.9) }), // Would normally be red
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const shouldShow = shouldShowNudgeButton(goal, true); // Explicitly completed

                        expect(shouldShow).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    describe("Additional utility function tests", () => {
        it("should return correct status colors", () => {
            const greenStatus: GoalStatus = {
                color: "green",
                priority: 3,
                text: "Safe",
                showNudge: false,
            };
            const yellowStatus: GoalStatus = {
                color: "yellow",
                priority: 2,
                text: "Due in 3h",
                showNudge: true,
            };
            const redStatus: GoalStatus = {
                color: "red",
                priority: 1,
                text: "Due in 30m",
                showNudge: true,
            };

            expect(getStatusColor(greenStatus)).toBe("#22c55e");
            expect(getStatusColor(yellowStatus)).toBe("#eab308");
            expect(getStatusColor(redStatus)).toBe("#ef4444");
        });

        it("should return correct status text", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(7.0), max: Math.fround(168.0) }), // Safe zone
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const goal = createTestGoal(deadline);

                        const text = getStatusText(goal);
                        expect(text).toBe("Safe");
                    },
                ),
                { numRuns: 50 },
            );
        });

        it("should calculate deadline proximity correctly", () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(1.0), max: Math.fround(48.0) }), // 1 to 48 hours
                    (hoursFromNow) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );

                        const proximity = getDeadlineProximity(deadline);

                        expect(proximity.hoursUntilDeadline).toBeCloseTo(hoursFromNow, 1);
                        expect(proximity.isOverdue).toBe(false);
                        expect(proximity.displayText).toMatch(/^Due in \d+[hmd]$/);
                    },
                ),
                { numRuns: 50 },
            );
        });
    });
});
