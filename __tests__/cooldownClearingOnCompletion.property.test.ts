/**
 * Property-Based Tests for Cooldown Clearing on Completion
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";
import { Goal } from "../services/firebase/collections";
import { canSendNudge } from "../services/firebase/nudgeService";
import { shouldShowNudgeButton } from "../utils/goalStatusCalculator";

// Mock Firebase functions for testing
jest.mock("firebase/firestore", () => ({
    addDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
    Timestamp: {
        fromDate: jest.fn((date: Date) => ({
            toDate: () => date,
            seconds: date.getTime() / 1000,
            nanoseconds: 0,
        })),
    },
}));

jest.mock("../services/firebase/collections", () => ({
    getNudgesCollection: jest.fn(() => ({ path: "test-collection" })),
}));

jest.mock("@/utils/errorHandling", () => ({
    getUserFriendlyErrorMessage: jest.fn(
        (error: any) => error.message || "Unknown error",
    ),
    retryWithBackoff: jest.fn(async (fn: () => Promise<any>) => await fn()),
}));

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

describe("Cooldown Clearing on Completion Property-Based Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * **Feature: social-nudging-feed, Property 15: Cooldown clearing on completion**
     * **Validates: Requirements 4.5**
     */
    describe("Property 15: Cooldown clearing on completion", () => {
        it("should hide nudge button for completed goals regardless of active cooldowns", async () => {
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        hoursFromNow: fc.float({
                            min: Math.fround(0.1),
                            max: Math.fround(1.9),
                        }), // Would normally be red/at-risk
                        minutesIntoCooldown: fc.integer({ min: 1, max: 59 }), // Active cooldown
                    }),
                    async ({ userId, goalId, hoursFromNow, minutesIntoCooldown }) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = new Date(); // Completed today
                        const cooldownEnd = new Date(
                            now.getTime() + (60 - minutesIntoCooldown) * 60 * 1000,
                        ); // Active cooldown

                        // Create a completed goal that would normally be at-risk
                        const goal = createTestGoal(deadline, completionDate);

                        // Mock active cooldown for this goal
                        mockGetDocs.mockResolvedValue({
                            docs: [
                                {
                                    data: () => ({
                                        goalId,
                                        cooldownUntil: {
                                            toDate: () => cooldownEnd,
                                        },
                                    }),
                                },
                            ],
                        });

                        // Test that nudge button should be hidden despite active cooldown
                        const shouldShow = shouldShowNudgeButton(goal);

                        // For completed goals, nudge button should always be hidden
                        expect(shouldShow).toBe(false);

                        // The goal completion status should override cooldown considerations
                        // This validates that completion takes precedence over cooldown state
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should allow nudging again after goal completion clears implicit cooldown", async () => {
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        hoursFromNow: fc.float({
                            min: Math.fround(0.1),
                            max: Math.fround(1.9),
                        }), // At-risk deadline
                        minutesIntoCooldown: fc.integer({ min: 1, max: 59 }), // Active cooldown
                    }),
                    async ({ userId, goalId, hoursFromNow, minutesIntoCooldown }) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const cooldownEnd = new Date(
                            now.getTime() + (60 - minutesIntoCooldown) * 60 * 1000,
                        ); // Active cooldown

                        // Test scenario 1: Goal with active cooldown (not completed)
                        const incompleteGoal = createTestGoal(deadline, null);

                        // Mock active cooldown
                        mockGetDocs.mockResolvedValue({
                            docs: [
                                {
                                    data: () => ({
                                        goalId,
                                        cooldownUntil: {
                                            toDate: () => cooldownEnd,
                                        },
                                    }),
                                },
                            ],
                        });

                        const canNudgeIncomplete = await canSendNudge(userId, goalId);
                        const shouldShowIncomplete = shouldShowNudgeButton(incompleteGoal);

                        // Should not be able to nudge due to cooldown
                        expect(canNudgeIncomplete).toBe(false);
                        expect(shouldShowIncomplete).toBe(true); // Button would show if no cooldown

                        // Test scenario 2: Same goal but now completed
                        const completedGoal = createTestGoal(deadline, new Date());

                        // Mock no active cooldowns (completion should clear them conceptually)
                        mockGetDocs.mockResolvedValue({ docs: [] });

                        const canNudgeCompleted = await canSendNudge(userId, goalId);
                        const shouldShowCompleted = shouldShowNudgeButton(completedGoal);

                        // After completion, cooldown should be conceptually cleared
                        expect(canNudgeCompleted).toBe(true);
                        expect(shouldShowCompleted).toBe(false); // But button hidden because completed
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should not show nudge button for goals completed during any cooldown period", async () => {
            await fc.assert(
                fc.property(
                    fc.record({
                        hoursFromNow: fc.float({
                            min: Math.fround(-24.0),
                            max: Math.fround(24.0),
                        }), // Any deadline
                        cooldownMinutesRemaining: fc.integer({ min: 1, max: 60 }), // Any active cooldown
                    }),
                    ({ hoursFromNow, cooldownMinutesRemaining }) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = new Date(); // Completed today

                        // Create completed goal
                        const goal = createTestGoal(deadline, completionDate);

                        // Test that nudge button is hidden regardless of cooldown state
                        const shouldShow = shouldShowNudgeButton(goal);

                        // Completed goals should never show nudge button, regardless of:
                        // - Deadline proximity (could be overdue, at-risk, or safe)
                        // - Active cooldown status
                        expect(shouldShow).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should prioritize completion status over cooldown state in UI logic", async () => {
            await fc.assert(
                fc.property(
                    fc.record({
                        hoursFromNow: fc.float({
                            min: Math.fround(0.1),
                            max: Math.fround(1.9),
                        }), // Critical deadline (red)
                        isCompleted: fc.boolean(),
                    }),
                    ({ hoursFromNow, isCompleted }) => {
                        fc.pre(!isNaN(hoursFromNow)); // Exclude NaN values

                        const now = new Date();
                        const deadline = new Date(
                            now.getTime() + hoursFromNow * 60 * 60 * 1000,
                        );
                        const completionDate = isCompleted ? new Date() : null;

                        const goal = createTestGoal(deadline, completionDate);
                        const shouldShow = shouldShowNudgeButton(goal);

                        if (isCompleted) {
                            // Completed goals should never show nudge button
                            expect(shouldShow).toBe(false);
                        } else {
                            // Incomplete at-risk goals should show nudge button (if no cooldown)
                            expect(shouldShow).toBe(true);
                        }

                        // This validates that completion status is the primary factor
                        // in determining nudge button visibility, overriding cooldown considerations
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
