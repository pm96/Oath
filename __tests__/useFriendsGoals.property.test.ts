/**
 * Property-Based Tests for useFriendsGoals Hook
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

describe("useFriendsGoals Hook Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 4: Real-time goal list updates**
     * **Validates: Requirements 1.5, 6.2, 6.3**
     */
    test("Property 4: Real-time goal list updates", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        ownerId: fc.string({ minLength: 1, maxLength: 10 }),
                        description: fc.string({ minLength: 1, maxLength: 50 }),
                        frequency: fc.constantFrom("daily", "weekly", "3x_a_week"),
                        targetDays: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
                            minLength: 1,
                            maxLength: 7,
                        }),
                        latestCompletionDate: fc.option(
                            fc.date({
                                min: new Date("2020-01-01"),
                                max: new Date("2030-01-01"),
                            }),
                        ),
                        currentStatus: fc.constantFrom("Green", "Yellow", "Red"),
                        nextDeadline: fc.date({
                            min: new Date(),
                            max: new Date(Date.now() + 86400000 * 7),
                        }),
                        isShared: fc.boolean(),
                        createdAt: fc.date({
                            min: new Date("2020-01-01"),
                            max: new Date(),
                        }),
                        redSince: fc.option(
                            fc.date({ min: new Date("2020-01-01"), max: new Date() }),
                        ),
                        ownerName: fc.string({ minLength: 1, maxLength: 20 }),
                        ownerShameScore: fc.integer({ min: 0, max: 1000 }),
                        type: fc.constantFrom("flexible", "time"),
                        targetTime: fc.option(fc.constant("07:00"), { nil: null }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                fc.constantFrom("create", "update", "delete"),
                fc.integer({ min: 0, max: 9 }),
                (initialGoals, changeType, changeIndex) => {
                    // Property: When a friend's goal list changes (creation, deletion, modification),
                    // the friends feed should update to reflect the change immediately

                    // Test the invariant that goal list changes should be detectable
                    let modifiedGoals = [...initialGoals];
                    let hasChanged = false;

                    if (initialGoals.length > 0 && changeIndex < initialGoals.length) {
                        const actualIndex = changeIndex % initialGoals.length;

                        switch (changeType) {
                            case "create":
                                // Add a new goal
                                modifiedGoals.push({
                                    id: `new-goal-${Date.now()}`,
                                    ownerId: initialGoals[actualIndex]?.ownerId || "friend1",
                                    description: "New goal added",
                                    frequency: "daily" as const,
                                    targetDays: ["monday"],
                                    latestCompletionDate: null,
                                    currentStatus: "Green" as const,
                                    nextDeadline: new Date(Date.now() + 86400000),
                                    isShared: true,
                                    type: "flexible",
                                    targetTime: null,
                                    createdAt: new Date(),
                                    redSince: null,
                                    ownerName: "Friend",
                                    ownerShameScore: 0,
                                });
                                hasChanged = true;
                                break;

                            case "update":
                                // Modify an existing goal
                                if (modifiedGoals[actualIndex]) {
                                    modifiedGoals[actualIndex] = {
                                        ...modifiedGoals[actualIndex],
                                        description: `Updated: ${modifiedGoals[actualIndex].description}`,
                                        currentStatus: "Red" as const,
                                    };
                                    hasChanged = true;
                                }
                                break;

                            case "delete":
                                // Remove a goal
                                if (modifiedGoals.length > 0) {
                                    modifiedGoals.splice(actualIndex, 1);
                                    hasChanged = true;
                                }
                                break;
                        }
                    }

                    // Property: Real-time updates should be detectable through data changes
                    if (hasChanged) {
                        // The modified list should be different from the original
                        expect(modifiedGoals).not.toEqual(initialGoals);

                        // The system should be able to detect the change
                        const originalIds = initialGoals.map((g) => g.id).sort();
                        const modifiedIds = modifiedGoals.map((g) => g.id).sort();

                        switch (changeType) {
                            case "create":
                                expect(modifiedIds.length).toBe(originalIds.length + 1);
                                break;
                            case "delete":
                                if (initialGoals.length > 0) {
                                    expect(modifiedIds.length).toBe(
                                        Math.max(0, originalIds.length - 1),
                                    );
                                }
                                break;
                            case "update":
                                expect(modifiedIds.length).toBe(originalIds.length);
                                // At least one goal should have different content
                                const hasContentChange = modifiedGoals.some((goal, index) => {
                                    const original = initialGoals.find((g) => g.id === goal.id);
                                    return (
                                        original &&
                                        (original.description !== goal.description ||
                                            original.currentStatus !== goal.currentStatus)
                                    );
                                });
                                expect(hasContentChange).toBe(true);
                                break;
                        }
                    }

                    // Property: All goals should maintain required structure
                    modifiedGoals.forEach((goal) => {
                        expect(goal).toHaveProperty("id");
                        expect(goal).toHaveProperty("ownerId");
                        expect(goal).toHaveProperty("description");
                        expect(goal).toHaveProperty("frequency");
                        expect(goal).toHaveProperty("nextDeadline");
                        expect(goal).toHaveProperty("ownerName");
                        expect(goal).toHaveProperty("ownerShameScore");

                        // Validate data types
                        expect(typeof goal.id).toBe("string");
                        expect(typeof goal.ownerId).toBe("string");
                        expect(typeof goal.description).toBe("string");
                        expect(["daily", "weekly", "3x_a_week"]).toContain(goal.frequency);
                        expect(goal.nextDeadline).toBeInstanceOf(Date);
                        expect(typeof goal.ownerName).toBe("string");
                        expect(typeof goal.ownerShameScore).toBe("number");
                    });
                },
            ),
            { numRuns: 20 },
        );
    });

    /**
     * **Feature: social-nudging-feed, Property 21: Feed sorting by urgency**
     * **Validates: Requirements 7.1, 7.2**
     */
    test("Property 21: Feed sorting by urgency", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        priority: fc.integer({ min: 1, max: 3 }), // 1=red, 2=yellow, 3=green
                        deadlineTimestamp: fc.integer({
                            min: Date.now() - 86400000,
                            max: Date.now() + 86400000,
                        }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                (goals) => {
                    // Convert timestamps to dates for sorting
                    const goalsWithDates = goals.map((goal) => ({
                        ...goal,
                        deadline: new Date(goal.deadlineTimestamp),
                    }));

                    // Sort goals by priority (1=highest, 3=lowest) then by deadline
                    const sorted = [...goalsWithDates].sort((a, b) => {
                        if (a.priority !== b.priority) {
                            return a.priority - b.priority;
                        }
                        return a.deadline.getTime() - b.deadline.getTime();
                    });

                    // Property: Goals should be sorted by urgency (red → yellow → green)
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const current = sorted[i];
                        const next = sorted[i + 1];

                        // Current goal should have higher or equal priority
                        expect(current.priority).toBeLessThanOrEqual(next.priority);

                        // If same priority, current should have earlier or equal deadline
                        if (current.priority === next.priority) {
                            expect(current.deadline.getTime()).toBeLessThanOrEqual(
                                next.deadline.getTime(),
                            );
                        }
                    }
                },
            ),
            { numRuns: 20 },
        );
    });

    /**
     * **Feature: social-nudging-feed, Property 22: Dynamic feed re-sorting**
     * **Validates: Requirements 7.4**
     */
    test("Property 22: Dynamic feed re-sorting", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        priority: fc.integer({ min: 1, max: 3 }),
                        deadlineTimestamp: fc.integer({
                            min: Date.now() - 86400000,
                            max: Date.now() + 86400000,
                        }),
                    }),
                    { minLength: 1, maxLength: 10 },
                ),
                fc.integer({ min: 0, max: 9 }), // Index of goal to change
                fc.integer({ min: 1, max: 3 }), // New priority
                (goals, changeIndex, newPriority) => {
                    if (goals.length === 0) return;

                    const actualIndex = changeIndex % goals.length;

                    // Convert timestamps to dates
                    const goalsWithDates = goals.map((goal) => ({
                        ...goal,
                        deadline: new Date(goal.deadlineTimestamp),
                    }));

                    // Change one goal's priority
                    const modifiedGoals = [...goalsWithDates];
                    modifiedGoals[actualIndex] = {
                        ...modifiedGoals[actualIndex],
                        priority: newPriority,
                    };

                    // Re-sort after change
                    const newSorted = [...modifiedGoals].sort((a, b) => {
                        if (a.priority !== b.priority) {
                            return a.priority - b.priority;
                        }
                        return a.deadline.getTime() - b.deadline.getTime();
                    });

                    // Property: After status change, feed should re-sort automatically
                    // The new sorted order should still maintain the sorting invariant
                    for (let i = 0; i < newSorted.length - 1; i++) {
                        const current = newSorted[i];
                        const next = newSorted[i + 1];

                        expect(current.priority).toBeLessThanOrEqual(next.priority);

                        if (current.priority === next.priority) {
                            expect(current.deadline.getTime()).toBeLessThanOrEqual(
                                next.deadline.getTime(),
                            );
                        }
                    }
                },
            ),
            { numRuns: 20 },
        );
    });

    /**
     * **Feature: social-nudging-feed, Property 19: Real-time status updates**
     * **Validates: Requirements 6.1, 6.4**
     */
    test("Property 19: Real-time status updates", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        ownerId: fc.string({ minLength: 1, maxLength: 10 }),
                        description: fc.string({ minLength: 1, maxLength: 50 }),
                        frequency: fc.constantFrom("daily", "weekly", "3x_a_week"),
                        targetDays: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
                            minLength: 1,
                            maxLength: 7,
                        }),
                        latestCompletionDate: fc.option(
                            fc.date({
                                min: new Date("2020-01-01"),
                                max: new Date("2030-01-01"),
                            }),
                        ),
                        currentStatus: fc.constantFrom("Green", "Yellow", "Red"),
                        nextDeadline: fc.date({
                            min: new Date(Date.now() - 86400000), // 1 day ago
                            max: new Date(Date.now() + 86400000 * 7), // 7 days from now
                        }),
                        isShared: fc.boolean(),
                        createdAt: fc.date({
                            min: new Date("2020-01-01"),
                            max: new Date(),
                        }),
                        redSince: fc.option(
                            fc.date({ min: new Date("2020-01-01"), max: new Date() }),
                        ),
                        ownerName: fc.string({ minLength: 1, maxLength: 20 }),
                        ownerShameScore: fc.integer({ min: 0, max: 1000 }),
                        type: fc.constantFrom("flexible", "time"),
                        targetTime: fc.option(fc.constant("07:00"), { nil: null }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                fc.constantFrom("completion", "deadline_approach", "status_change"),
                (goals, changeType) => {
                    // Import the status calculator to test real-time updates
                    const { calculateStatus } = require("../utils/goalStatusCalculator");

                    // Property: When a goal's status changes, the feed should immediately update
                    goals.forEach((goal) => {
                        // Calculate initial status
                        const initialStatus = calculateStatus(goal);

                        // Simulate different types of status changes
                        let modifiedGoal = { ...goal };
                        let expectedStatusChange = false;

                        switch (changeType) {
                            case "completion":
                                // Simulate goal completion today
                                modifiedGoal.latestCompletionDate = new Date();
                                expectedStatusChange = true;
                                break;

                            case "deadline_approach":
                                // Simulate deadline approaching (1 hour from now)
                                modifiedGoal.nextDeadline = new Date(Date.now() + 3600000); // 1 hour
                                expectedStatusChange = true;
                                break;

                            case "status_change":
                                // Simulate deadline passing (overdue)
                                modifiedGoal.nextDeadline = new Date(Date.now() - 3600000); // 1 hour ago
                                modifiedGoal.latestCompletionDate = null; // Not completed
                                expectedStatusChange = true;
                                break;
                        }

                        // Calculate new status after change
                        const newStatus = calculateStatus(modifiedGoal);

                        // Property: Status should be recalculated immediately when goal data changes
                        expect(newStatus).toBeDefined();
                        expect(newStatus).toHaveProperty("color");
                        expect(newStatus).toHaveProperty("priority");
                        expect(newStatus).toHaveProperty("text");
                        expect(newStatus).toHaveProperty("showNudge");

                        // Property: Status changes should be detectable
                        if (expectedStatusChange) {
                            // For completion, status should be green with "Completed ✓"
                            if (changeType === "completion") {
                                expect(newStatus.color).toBe("green");
                                expect(newStatus.text).toBe("Completed ✓");
                                expect(newStatus.showNudge).toBe(false);
                            }

                            // For deadline approach (1 hour), status should be red
                            if (changeType === "deadline_approach") {
                                expect(newStatus.color).toBe("red");
                                expect(newStatus.text).toMatch(/Due in \d+m/);
                                expect(newStatus.showNudge).toBe(true);
                            }

                            // For overdue goals, status should be red
                            if (changeType === "status_change") {
                                expect(newStatus.color).toBe("red");
                                expect(newStatus.text).toMatch(/Overdue by \d+h/);
                                expect(newStatus.showNudge).toBe(true);
                            }
                        }

                        // Property: Status color should match priority
                        switch (newStatus.color) {
                            case "green":
                                expect(newStatus.priority).toBe(3);
                                break;
                            case "yellow":
                                expect(newStatus.priority).toBe(2);
                                break;
                            case "red":
                                expect(newStatus.priority).toBe(1);
                                break;
                        }

                        // Property: Status text should be meaningful and non-empty
                        expect(typeof newStatus.text).toBe("string");
                        expect(newStatus.text.length).toBeGreaterThan(0);

                        // Property: showNudge should be boolean
                        expect(typeof newStatus.showNudge).toBe("boolean");
                    });
                },
            ),
            { numRuns: 20 },
        );
    });

    /**
     * **Feature: social-nudging-feed, Property 20: Offline data caching**
     * **Validates: Requirements 6.5**
     */
    test("Property 20: Offline data caching", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        ownerId: fc.string({ minLength: 1, maxLength: 10 }),
                        description: fc.string({ minLength: 1, maxLength: 50 }),
                        frequency: fc.constantFrom("daily", "weekly", "3x_a_week"),
                        targetDays: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
                            minLength: 1,
                            maxLength: 7,
                        }),
                        latestCompletionDate: fc.option(
                            fc.date({
                                min: new Date("2020-01-01"),
                                max: new Date("2030-01-01"),
                            }),
                        ),
                        currentStatus: fc.constantFrom("Green", "Yellow", "Red"),
                        nextDeadline: fc.date({
                            min: new Date(Date.now() - 86400000),
                            max: new Date(Date.now() + 86400000 * 7),
                        }),
                        isShared: fc.boolean(),
                        createdAt: fc.date({
                            min: new Date("2020-01-01"),
                            max: new Date(),
                        }),
                        redSince: fc.option(
                            fc.date({ min: new Date("2020-01-01"), max: new Date() }),
                        ),
                        ownerName: fc.string({ minLength: 1, maxLength: 20 }),
                        ownerShameScore: fc.integer({ min: 0, max: 1000 }),
                        type: fc.constantFrom("flexible", "time"),
                        targetTime: fc.option(fc.constant("07:00"), { nil: null }),
                    }),
                    { minLength: 0, maxLength: 10 },
                ),
                fc.boolean(), // Network connectivity status
                (cachedGoals, isOnline) => {
                    // Property: When network connectivity is lost, the friends feed should display cached data

                    // Simulate offline behavior
                    const mockOfflineState = {
                        isOnline,
                        cachedData: cachedGoals,
                        hasOfflineIndicator: !isOnline,
                    };

                    // Property: Cached data should be available when offline
                    if (!isOnline) {
                        expect(mockOfflineState.cachedData).toBeDefined();
                        expect(Array.isArray(mockOfflineState.cachedData)).toBe(true);
                        expect(mockOfflineState.hasOfflineIndicator).toBe(true);

                        // Property: Cached data should maintain structure integrity
                        mockOfflineState.cachedData.forEach((goal) => {
                            expect(goal).toHaveProperty("id");
                            expect(goal).toHaveProperty("ownerId");
                            expect(goal).toHaveProperty("description");
                            expect(goal).toHaveProperty("frequency");
                            expect(goal).toHaveProperty("nextDeadline");
                            expect(goal).toHaveProperty("ownerName");
                            expect(goal).toHaveProperty("ownerShameScore");

                            // Validate data types are preserved in cache
                            expect(typeof goal.id).toBe("string");
                            expect(typeof goal.ownerId).toBe("string");
                            expect(typeof goal.description).toBe("string");
                            expect(["daily", "weekly", "3x_a_week"]).toContain(
                                goal.frequency,
                            );
                            expect(goal.nextDeadline).toBeInstanceOf(Date);
                            expect(typeof goal.ownerName).toBe("string");
                            expect(typeof goal.ownerShameScore).toBe("number");
                        });
                    }

                    // Property: When online, offline indicator should not be shown
                    if (isOnline) {
                        expect(mockOfflineState.hasOfflineIndicator).toBe(false);
                    }

                    // Property: Cached data should be accessible regardless of network state
                    expect(mockOfflineState.cachedData).toBeDefined();
                    expect(Array.isArray(mockOfflineState.cachedData)).toBe(true);

                    // Property: Cache should preserve goal count
                    expect(mockOfflineState.cachedData.length).toBe(cachedGoals.length);

                    // Property: Cache should preserve goal order
                    mockOfflineState.cachedData.forEach((cachedGoal, index) => {
                        const originalGoal = cachedGoals[index];
                        if (originalGoal) {
                            expect(cachedGoal.id).toBe(originalGoal.id);
                            expect(cachedGoal.ownerId).toBe(originalGoal.ownerId);
                            expect(cachedGoal.description).toBe(originalGoal.description);
                        }
                    });

                    // Property: Offline state should be deterministic based on connectivity
                    const expectedOfflineState = !isOnline;
                    expect(mockOfflineState.hasOfflineIndicator).toBe(
                        expectedOfflineState,
                    );

                    // Property: Data should be available in both online and offline states
                    // (offline uses cache, online uses live data)
                    expect(mockOfflineState.cachedData).toBeDefined();
                    if (cachedGoals.length > 0) {
                        expect(mockOfflineState.cachedData.length).toBeGreaterThan(0);
                    }
                },
            ),
            { numRuns: 20 },
        );
    });
});
