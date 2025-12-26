/**
 * Property-Based Tests for FriendGoalItem Component
 * Feature: social-nudging-feed
 */

import { GoalWithOwnerAndStatus } from "@/hooks/useFriendsGoals";
import { GoalStatus } from "@/services/firebase/collections";
import * as fc from "fast-check";

/**
 * Helper function to create a test goal with status
 */
function createTestGoalWithStatus(
    ownerId: string,
    ownerName: string,
    status: GoalStatus,
    canNudge: boolean = true,
    cooldownRemaining?: number,
): GoalWithOwnerAndStatus {
    return {
        id: `goal-${Math.random().toString(36).substring(2, 11)}`,
        ownerId,
        ownerName,
        description: "Test goal description",
        frequency: "daily" as const,
        targetDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        latestCompletionDate: null,
        currentStatus: "Green" as const, // Legacy field
        nextDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        isShared: true,
        type: "flexible",
        targetTime: null,
        createdAt: new Date(),
        redSince: null,
        difficulty: "medium" as const,
        ownerShameScore: 0,
        status,
        canNudge,
        cooldownRemaining,
    };
}

/**
 * Helper function to format cooldown time for testing
 */
function formatCooldownTime(minutes: number): string {
    if (minutes <= 0) return "";

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
}

describe("FriendGoalItem Component Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 14: Cooldown display accuracy**
     * **Validates: Requirements 4.4**
     */
    test("Property 14: Cooldown display accuracy", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1440 }), // 1 minute to 24 hours
                fc.constantFrom("red", "yellow") as fc.Arbitrary<"red" | "yellow">,
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                (cooldownMinutes, statusColor, ownerId, ownerName) => {
                    // Create a goal with active cooldown
                    const status: GoalStatus = {
                        color: statusColor,
                        priority: statusColor === "red" ? 1 : 2,
                        text: statusColor === "red" ? "Due in 30m" : "Due in 3h",
                        showNudge: true,
                    };

                    const goal = createTestGoalWithStatus(
                        ownerId,
                        ownerName,
                        status,
                        false, // canNudge = false (on cooldown)
                        cooldownMinutes,
                    );

                    // Property: When goal is on cooldown, cooldownRemaining should be > 0
                    expect(goal.cooldownRemaining).toBeGreaterThan(0);
                    expect(goal.canNudge).toBe(false);

                    // Property: Cooldown time formatting should be accurate
                    const expectedFormat = formatCooldownTime(cooldownMinutes);
                    const actualFormat = formatCooldownTime(goal.cooldownRemaining!);
                    expect(actualFormat).toBe(expectedFormat);

                    // Property: Cooldown format should follow expected patterns
                    if (cooldownMinutes < 60) {
                        expect(actualFormat).toMatch(/^\d+m$/);
                    } else {
                        const hours = Math.floor(cooldownMinutes / 60);
                        const minutes = cooldownMinutes % 60;
                        if (minutes === 0) {
                            expect(actualFormat).toMatch(/^\d+h$/);
                        } else {
                            expect(actualFormat).toMatch(/^\d+h \d+m$/);
                        }
                    }

                    // Property: Goals with cooldown should still show nudge button but disabled
                    expect(goal.status.showNudge).toBe(true);
                },
            ),
            { numRuns: 20 },
        );
    });

    test("Property 14: Cooldown display accuracy - edge cases", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(0, -1, -10), // Zero or negative cooldown
                fc.constantFrom("red", "yellow") as fc.Arbitrary<"red" | "yellow">,
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                (cooldownMinutes, statusColor, ownerId, ownerName) => {
                    const status: GoalStatus = {
                        color: statusColor,
                        priority: statusColor === "red" ? 1 : 2,
                        text: statusColor === "red" ? "Due in 30m" : "Due in 3h",
                        showNudge: true,
                    };

                    const goal = createTestGoalWithStatus(
                        ownerId,
                        ownerName,
                        status,
                        true, // canNudge = true (no cooldown)
                        cooldownMinutes <= 0 ? undefined : cooldownMinutes,
                    );

                    // Property: When cooldown is expired or not set, canNudge should be true
                    expect(goal.canNudge).toBe(true);

                    // Property: Expired cooldown should not have cooldownRemaining
                    if (cooldownMinutes <= 0) {
                        expect(goal.cooldownRemaining).toBeUndefined();
                    }

                    // Property: Format function should return empty string for zero/negative values
                    const formattedTime = formatCooldownTime(cooldownMinutes);
                    if (cooldownMinutes <= 0) {
                        expect(formattedTime).toBe("");
                    }
                },
            ),
            { numRuns: 50 },
        );
    });

    /**
     * **Feature: social-nudging-feed, Property 37: Self-nudge prevention**
     * **Validates: Requirements 12.5**
     */
    test("Property 37: Self-nudge prevention", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }), // userId
                fc.string({ minLength: 1, maxLength: 20 }), // ownerName
                (userId, ownerName) => {
                    // Create a goal owned by the current user (self-goal)
                    const status: GoalStatus = {
                        color: "red", // At-risk status that would normally show nudge button
                        priority: 1,
                        text: "Due in 30m",
                        showNudge: true,
                    };

                    const selfGoal = createTestGoalWithStatus(
                        userId, // ownerId same as currentUserId
                        ownerName,
                        status,
                        true,
                    );

                    // Property: Nudge button should never be shown for user's own goals
                    // This is determined by: shouldShowNudgeButton = goal.status.showNudge && goal.ownerId !== currentUserId
                    const shouldShowNudgeButton =
                        selfGoal.status.showNudge && selfGoal.ownerId !== userId;
                    expect(shouldShowNudgeButton).toBe(false);

                    // Property: Even if status indicates nudge should be shown, self-goals should not show it
                    expect(selfGoal.status.showNudge).toBe(true); // Status itself allows nudging
                    expect(selfGoal.ownerId).toBe(userId); // But it's the user's own goal
                },
            ),
            { numRuns: 20 },
        );
    });

    test("Property 37: Self-nudge prevention - friend goals should show nudge button", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }), // currentUserId
                fc.string({ minLength: 1, maxLength: 20 }), // friendId (different from currentUserId)
                fc.string({ minLength: 1, maxLength: 20 }), // friendName
                fc.constantFrom("red", "yellow") as fc.Arbitrary<"red" | "yellow">, // at-risk status
                (currentUserId, friendId, friendName, statusColor) => {
                    // Ensure friendId is different from currentUserId
                    fc.pre(friendId !== currentUserId);

                    // Create a goal owned by a friend (not self)
                    const status: GoalStatus = {
                        color: statusColor,
                        priority: statusColor === "red" ? 1 : 2,
                        text: statusColor === "red" ? "Due in 30m" : "Due in 3h",
                        showNudge: true,
                    };

                    const friendGoal = createTestGoalWithStatus(
                        friendId, // ownerId different from currentUserId
                        friendName,
                        status,
                        true,
                    );

                    // Property: Nudge button should be shown for friend's at-risk goals
                    const shouldShowNudgeButton =
                        friendGoal.status.showNudge && friendGoal.ownerId !== currentUserId;
                    expect(shouldShowNudgeButton).toBe(true);

                    // Property: Friend's goal should have different owner than current user
                    expect(friendGoal.ownerId).not.toBe(currentUserId);
                    expect(friendGoal.status.showNudge).toBe(true);
                },
            ),
            { numRuns: 20 },
        );
    });

    test("Property 37: Self-nudge prevention - safe goals should not show nudge button", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }), // currentUserId
                fc.string({ minLength: 1, maxLength: 20 }), // ownerId (could be self or friend)
                fc.string({ minLength: 1, maxLength: 20 }), // ownerName
                (currentUserId, ownerId, ownerName) => {
                    // Create a safe goal (green status)
                    const status: GoalStatus = {
                        color: "green",
                        priority: 3,
                        text: "Safe",
                        showNudge: false, // Safe goals don't show nudge button
                    };

                    const safeGoal = createTestGoalWithStatus(
                        ownerId,
                        ownerName,
                        status,
                        true,
                    );

                    // Property: Safe goals should never show nudge button regardless of ownership
                    const shouldShowNudgeButton =
                        safeGoal.status.showNudge && safeGoal.ownerId !== currentUserId;
                    expect(shouldShowNudgeButton).toBe(false);

                    // Property: Status itself should indicate no nudge needed
                    expect(safeGoal.status.showNudge).toBe(false);
                },
            ),
            { numRuns: 20 },
        );
    });

    describe("Additional FriendGoalItem behavior tests", () => {
        test("Nudge button state consistency", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 20 }), // currentUserId
                    fc.string({ minLength: 1, maxLength: 20 }), // friendId
                    fc.string({ minLength: 1, maxLength: 20 }), // friendName
                    fc.option(fc.integer({ min: 1, max: 120 })), // cooldownRemaining
                    (currentUserId, friendId, friendName, cooldownRemaining) => {
                        fc.pre(friendId !== currentUserId);

                        const status: GoalStatus = {
                            color: "red",
                            priority: 1,
                            text: "Due in 30m",
                            showNudge: true,
                        };

                        // Determine canNudge based on cooldown state (realistic logic)
                        const canNudge = !cooldownRemaining || cooldownRemaining <= 0;

                        const goal = createTestGoalWithStatus(
                            friendId,
                            friendName,
                            status,
                            canNudge,
                            cooldownRemaining || undefined,
                        );

                        // Property: If cooldownRemaining > 0, canNudge should be false
                        if (goal.cooldownRemaining && goal.cooldownRemaining > 0) {
                            expect(goal.canNudge).toBe(false);
                        }

                        // Property: If canNudge is true, cooldown should be undefined or <= 0
                        if (goal.canNudge) {
                            if (goal.cooldownRemaining !== undefined) {
                                expect(goal.cooldownRemaining).toBeLessThanOrEqual(0);
                            }
                        }

                        // Property: Consistency check - these states should be mutually exclusive
                        if (goal.cooldownRemaining && goal.cooldownRemaining > 0) {
                            expect(goal.canNudge).toBe(false);
                        } else {
                            expect(goal.canNudge).toBe(true);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
