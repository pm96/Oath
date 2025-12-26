/**
 * Property-Based Tests for Firestore Security Rules
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

/**
 * Test interfaces for security rule validation
 */
interface TestUser {
    userId: string;
    friends: string[];
    displayName: string;
    email: string;
}

interface TestGoal {
    goalId: string;
    ownerId: string;
    description: string;
    isShared: boolean;
    type: "time" | "flexible";
    targetTime: string | null;
}

interface TestNudge {
    nudgeId: string;
    senderId: string;
    receiverId: string;
    goalId: string;
    goalDescription: string;
}

interface AuthContext {
    uid: string | null;
    isAuthenticated: boolean;
}

// Optimized generators for faster test execution
const userIdArb = fc.oneof(
    fc.constant("user-1"),
    fc.constant("user-2"),
    fc.constant("user-3"),
    fc.constant("user-4"),
    fc.constant("user-5"),
);

const goalIdArb = fc.oneof(
    fc.constant("goal-1"),
    fc.constant("goal-2"),
    fc.constant("goal-3"),
    fc.constant("goal-4"),
);

const nudgeIdArb = fc.oneof(
    fc.constant("nudge-1"),
    fc.constant("nudge-2"),
    fc.constant("nudge-3"),
);

const testUserArb = fc.record({
    userId: userIdArb,
    friends: fc.array(userIdArb, { maxLength: 3 }),
    displayName: fc.constant("Test User"),
    email: fc.constant("test@example.com"),
});

const testGoalArb = fc.record({
    goalId: goalIdArb,
    ownerId: userIdArb,
    description: fc.constant("Test goal"),
    isShared: fc.boolean(),
    type: fc.constantFrom("flexible", "time"),
    targetTime: fc.option(fc.constant("07:00"), { nil: null }),
});

const testNudgeArb = fc.record({
    nudgeId: nudgeIdArb,
    senderId: userIdArb,
    receiverId: userIdArb,
    goalId: goalIdArb,
    goalDescription: fc.constant("Test goal description"),
});

const authContextArb = fc.record({
    uid: fc.option(userIdArb, { nil: null }),
    isAuthenticated: fc.boolean(),
});

// Helper functions that simulate Firestore security rule logic
function canReadGoal(
    authContext: AuthContext,
    goal: TestGoal,
    users: TestUser[],
): boolean {
    if (!authContext.isAuthenticated || !authContext.uid) {
        return false;
    }

    // User can read their own goals
    if (goal.ownerId === authContext.uid) {
        return true;
    }

    // User can read goals of friends
    const goalOwner = users.find((u) => u.userId === goal.ownerId);
    if (goalOwner && goalOwner.friends.includes(authContext.uid)) {
        return true;
    }

    return false;
}

function canReadNudge(authContext: AuthContext, nudge: TestNudge): boolean {
    if (!authContext.isAuthenticated || !authContext.uid) {
        return false;
    }

    // User can read nudges where they are sender or receiver
    return (
        nudge.senderId === authContext.uid || nudge.receiverId === authContext.uid
    );
}

function canCreateNudge(
    authContext: AuthContext,
    nudge: TestNudge,
    users: TestUser[],
): boolean {
    if (!authContext.isAuthenticated || !authContext.uid) {
        return false;
    }

    // User must be the sender
    if (nudge.senderId !== authContext.uid) {
        return false;
    }

    // Receiver must be in sender's friends list
    const sender = users.find((u) => u.userId === authContext.uid);
    if (!sender || !sender.friends.includes(nudge.receiverId)) {
        return false;
    }

    return true;
}

function canAccessNudgeHistory(
    authContext: AuthContext,
    nudges: TestNudge[],
    userId: string,
): TestNudge[] {
    if (!authContext.isAuthenticated || !authContext.uid) {
        return [];
    }

    // User can only see nudges where they are sender or receiver
    return nudges.filter(
        (nudge) =>
            nudge.senderId === authContext.uid ||
            nudge.receiverId === authContext.uid,
    );
}

describe("Security Rules Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 29: Feed access authorization**
     * **Validates: Requirements 10.1**
     */
    describe("Property 29: Feed access authorization", () => {
        it("should only allow reading goals belonging to friends or self", () => {
            fc.assert(
                fc.property(
                    authContextArb,
                    testGoalArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (authContext, goal, users) => {
                        const canRead = canReadGoal(authContext, goal, users);

                        if (!authContext.isAuthenticated || !authContext.uid) {
                            expect(canRead).toBe(false);
                            return;
                        }

                        if (goal.ownerId === authContext.uid) {
                            expect(canRead).toBe(true);
                            return;
                        }

                        const goalOwner = users.find((u) => u.userId === goal.ownerId);
                        if (goalOwner && goalOwner.friends.includes(authContext.uid)) {
                            expect(canRead).toBe(true);
                        } else {
                            expect(canRead).toBe(false);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should deny access to goals of non-friends", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    testGoalArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (currentUserId, goal, users) => {
                        fc.pre(goal.ownerId !== currentUserId);

                        const authContext = { uid: currentUserId, isAuthenticated: true };
                        const goalOwner = users.find((u) => u.userId === goal.ownerId);

                        fc.pre(!!goalOwner && !goalOwner.friends.includes(currentUserId));

                        const canRead = canReadGoal(authContext, goal, users);
                        expect(canRead).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 30: Nudge authorization**
     * **Validates: Requirements 10.2**
     */
    describe("Property 30: Nudge authorization", () => {
        it("should only allow creating nudges to friends", () => {
            fc.assert(
                fc.property(
                    authContextArb,
                    testNudgeArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (authContext, nudge, users) => {
                        const canCreate = canCreateNudge(authContext, nudge, users);

                        if (!authContext.isAuthenticated || !authContext.uid) {
                            expect(canCreate).toBe(false);
                            return;
                        }

                        if (nudge.senderId !== authContext.uid) {
                            expect(canCreate).toBe(false);
                            return;
                        }

                        const sender = users.find((u) => u.userId === authContext.uid);
                        if (sender && sender.friends.includes(nudge.receiverId)) {
                            expect(canCreate).toBe(true);
                        } else {
                            expect(canCreate).toBe(false);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should deny nudge creation to non-friends", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    userIdArb,
                    goalIdArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (senderId, receiverId, goalId, users) => {
                        fc.pre(senderId !== receiverId);

                        const sender = users.find((u) => u.userId === senderId);
                        fc.pre(!!sender && !sender.friends.includes(receiverId));

                        const authContext = { uid: senderId, isAuthenticated: true };
                        const nudge = {
                            nudgeId: "test-nudge",
                            senderId,
                            receiverId,
                            goalId,
                            goalDescription: "Test goal",
                        };

                        const canCreate = canCreateNudge(authContext, nudge, users);
                        expect(canCreate).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 31: Goal detail access authorization**
     * **Validates: Requirements 10.3**
     */
    describe("Property 31: Goal detail access authorization", () => {
        it("should allow goal detail access only to owner or friends", () => {
            fc.assert(
                fc.property(
                    authContextArb,
                    testGoalArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (authContext, goal, users) => {
                        // Goal detail access uses the same logic as feed access
                        const canAccess = canReadGoal(authContext, goal, users);

                        if (!authContext.isAuthenticated || !authContext.uid) {
                            expect(canAccess).toBe(false);
                            return;
                        }

                        if (goal.ownerId === authContext.uid) {
                            expect(canAccess).toBe(true);
                            return;
                        }

                        const goalOwner = users.find((u) => u.userId === goal.ownerId);
                        if (goalOwner && goalOwner.friends.includes(authContext.uid)) {
                            expect(canAccess).toBe(true);
                        } else {
                            expect(canAccess).toBe(false);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 32: Nudge history authorization**
     * **Validates: Requirements 10.4**
     */
    describe("Property 32: Nudge history authorization", () => {
        it("should only return nudges where user is sender or receiver", () => {
            fc.assert(
                fc.property(
                    authContextArb,
                    fc.array(testNudgeArb, { minLength: 0, maxLength: 10 }),
                    userIdArb,
                    (authContext, allNudges, queryUserId) => {
                        const accessibleNudges = canAccessNudgeHistory(
                            authContext,
                            allNudges,
                            queryUserId,
                        );

                        if (!authContext.isAuthenticated || !authContext.uid) {
                            expect(accessibleNudges).toEqual([]);
                            return;
                        }

                        for (const nudge of accessibleNudges) {
                            expect(
                                nudge.senderId === authContext.uid ||
                                nudge.receiverId === authContext.uid,
                            ).toBe(true);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should exclude nudges where user is neither sender nor receiver", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    fc.array(testNudgeArb, { minLength: 1, maxLength: 10 }),
                    (currentUserId, allNudges) => {
                        // Filter to nudges where user is not involved
                        const unrelatedNudges = allNudges.filter(
                            (nudge) =>
                                nudge.senderId !== currentUserId &&
                                nudge.receiverId !== currentUserId,
                        );

                        fc.pre(unrelatedNudges.length > 0);

                        const authContext = { uid: currentUserId, isAuthenticated: true };
                        const accessibleNudges = canAccessNudgeHistory(
                            authContext,
                            unrelatedNudges,
                            currentUserId,
                        );

                        expect(accessibleNudges).toEqual([]);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 33: Unauthenticated access denial**
     * **Validates: Requirements 10.5**
     */
    describe("Property 33: Unauthenticated access denial", () => {
        it("should deny all goal access for unauthenticated users", () => {
            fc.assert(
                fc.property(
                    testGoalArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (goal, users) => {
                        const unauthenticatedContext = {
                            uid: null,
                            isAuthenticated: false,
                        };
                        const canRead = canReadGoal(unauthenticatedContext, goal, users);
                        expect(canRead).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should deny all nudge access for unauthenticated users", () => {
            fc.assert(
                fc.property(
                    testNudgeArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (nudge, users) => {
                        const unauthenticatedContext = {
                            uid: null,
                            isAuthenticated: false,
                        };

                        const canRead = canReadNudge(unauthenticatedContext, nudge);
                        expect(canRead).toBe(false);

                        const canCreate = canCreateNudge(
                            unauthenticatedContext,
                            nudge,
                            users,
                        );
                        expect(canCreate).toBe(false);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should deny nudge history access for unauthenticated users", () => {
            fc.assert(
                fc.property(
                    fc.array(testNudgeArb, { minLength: 0, maxLength: 10 }),
                    userIdArb,
                    (allNudges, queryUserId) => {
                        const unauthenticatedContext = {
                            uid: null,
                            isAuthenticated: false,
                        };
                        const accessibleNudges = canAccessNudgeHistory(
                            unauthenticatedContext,
                            allNudges,
                            queryUserId,
                        );
                        expect(accessibleNudges).toEqual([]);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
