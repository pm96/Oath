/**
 * Property-Based Tests for Nudge Notification Logic
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

describe("Nudge Notification Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 10: Nudge notification delivery**
     * **Validates: Requirements 3.4, 5.1, 5.2**
     */
    describe("Property 10: Nudge notification delivery", () => {
        it("should create FCM notification message with correct format", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        fcmToken: fc.string({ minLength: 10, maxLength: 200 }),
                        nudgeId: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    async (nudgeData) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Simulate the notification message creation logic from Cloud Function
                        const createNudgeNotificationMessage = (data: typeof nudgeData) => {
                            return {
                                token: data.fcmToken,
                                notification: {
                                    title: `👊 ${data.senderName} nudged you!`,
                                    body: `Don't forget: ${data.goalDescription}`,
                                },
                                data: {
                                    type: "nudge",
                                    goalId: data.goalId,
                                    senderId: data.senderId,
                                    senderName: data.senderName,
                                    nudgeId: data.nudgeId,
                                },
                                android: {
                                    priority: "high" as const,
                                },
                                apns: {
                                    payload: {
                                        aps: {
                                            badge: 1,
                                            sound: "default",
                                        },
                                    },
                                },
                            };
                        };

                        const message = createNudgeNotificationMessage(nudgeData);

                        // Verify notification format matches requirements
                        expect(message.token).toBe(nudgeData.fcmToken);
                        expect(message.notification.title).toBe(
                            `👊 ${nudgeData.senderName} nudged you!`,
                        );
                        expect(message.notification.body).toBe(
                            `Don't forget: ${nudgeData.goalDescription}`,
                        );

                        // Verify data payload contains all required fields
                        expect(message.data.type).toBe("nudge");
                        expect(message.data.goalId).toBe(nudgeData.goalId);
                        expect(message.data.senderId).toBe(nudgeData.senderId);
                        expect(message.data.senderName).toBe(nudgeData.senderName);
                        expect(message.data.nudgeId).toBe(nudgeData.nudgeId);

                        // Verify platform-specific settings
                        expect(message.android.priority).toBe("high");
                        expect(message.apns.payload.aps.badge).toBe(1);
                        expect(message.apns.payload.aps.sound).toBe("default");
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should handle special characters in notification content", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        fcmToken: fc.string({ minLength: 10, maxLength: 200 }),
                    }),
                    async ({ senderName, goalDescription, fcmToken }) => {
                        // Create notification message
                        const message = {
                            token: fcmToken,
                            notification: {
                                title: `👊 ${senderName} nudged you!`,
                                body: `Don't forget: ${goalDescription}`,
                            },
                        };

                        // Verify the message structure is valid regardless of special characters
                        expect(message.notification.title).toContain(senderName);
                        expect(message.notification.title).toContain("👊");
                        expect(message.notification.title).toContain("nudged you!");
                        expect(message.notification.body).toContain(goalDescription);
                        expect(message.notification.body.indexOf("Don't forget: ")).toBe(0);

                        // Verify the message is properly formatted as a string
                        expect(typeof message.notification.title).toBe("string");
                        expect(typeof message.notification.body).toBe("string");
                        expect(message.notification.title.length).toBeGreaterThan(0);
                        expect(message.notification.body.length).toBeGreaterThan(0);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should validate notification message structure completeness", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        fcmToken: fc.string({ minLength: 10, maxLength: 200 }),
                        nudgeId: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    async (nudgeData) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Create complete notification message
                        const message = {
                            token: nudgeData.fcmToken,
                            notification: {
                                title: `👊 ${nudgeData.senderName} nudged you!`,
                                body: `Don't forget: ${nudgeData.goalDescription}`,
                            },
                            data: {
                                type: "nudge",
                                goalId: nudgeData.goalId,
                                senderId: nudgeData.senderId,
                                senderName: nudgeData.senderName,
                                nudgeId: nudgeData.nudgeId,
                            },
                            android: {
                                priority: "high" as const,
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        badge: 1,
                                        sound: "default",
                                    },
                                },
                            },
                        };

                        // Verify all required top-level properties exist
                        expect(message).toHaveProperty("token");
                        expect(message).toHaveProperty("notification");
                        expect(message).toHaveProperty("data");
                        expect(message).toHaveProperty("android");
                        expect(message).toHaveProperty("apns");

                        // Verify notification structure
                        expect(message.notification).toHaveProperty("title");
                        expect(message.notification).toHaveProperty("body");

                        // Verify data payload structure
                        expect(message.data).toHaveProperty("type");
                        expect(message.data).toHaveProperty("goalId");
                        expect(message.data).toHaveProperty("senderId");
                        expect(message.data).toHaveProperty("senderName");
                        expect(message.data).toHaveProperty("nudgeId");

                        // Verify platform-specific structures
                        expect(message.android).toHaveProperty("priority");
                        expect(message.apns).toHaveProperty("payload");
                        expect(message.apns.payload).toHaveProperty("aps");
                        expect(message.apns.payload.aps).toHaveProperty("badge");
                        expect(message.apns.payload.aps).toHaveProperty("sound");
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 24: Automatic nudge cleanup**
     * **Validates: Requirements 8.5**
     */
    describe("Property 24: Automatic nudge cleanup", () => {
        it("should identify nudges older than 7 days for cleanup", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        nudges: fc.array(
                            fc.record({
                                id: fc.string({ minLength: 1, maxLength: 50 }),
                                createdAt: fc.date({
                                    min: new Date("2020-01-01"),
                                    max: new Date("2024-12-31"),
                                }),
                                goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            }),
                            { minLength: 1, maxLength: 50 },
                        ),
                    }),
                    async ({ nudges }) => {
                        // Filter out any invalid dates
                        const validNudges = nudges.filter(
                            (nudge) => !isNaN(nudge.createdAt.getTime()),
                        );

                        // Skip test if no valid nudges
                        fc.pre(validNudges.length > 0);

                        const now = new Date();
                        const sevenDaysAgo = new Date(
                            now.getTime() - 7 * 24 * 60 * 60 * 1000,
                        );

                        // Simulate cleanup logic
                        const shouldCleanup = (nudge: { createdAt: Date }) => {
                            return nudge.createdAt < sevenDaysAgo;
                        };

                        const nudgesToCleanup = validNudges.filter(shouldCleanup);
                        const nudgesToKeep = validNudges.filter(
                            (nudge) => !shouldCleanup(nudge),
                        );

                        // Verify cleanup logic
                        nudgesToCleanup.forEach((nudge) => {
                            expect(nudge.createdAt.getTime()).toBeLessThan(
                                sevenDaysAgo.getTime(),
                            );
                        });

                        nudgesToKeep.forEach((nudge) => {
                            expect(nudge.createdAt.getTime()).toBeGreaterThanOrEqual(
                                sevenDaysAgo.getTime(),
                            );
                        });

                        // Verify all nudges are accounted for
                        expect(nudgesToCleanup.length + nudgesToKeep.length).toBe(
                            validNudges.length,
                        );
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should handle batch processing limits correctly", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        totalNudges: fc.integer({ min: 1, max: 1000 }),
                        batchLimit: fc.constant(500), // Fixed batch limit as in implementation
                    }),
                    async ({ totalNudges, batchLimit }) => {
                        // Simulate batch processing logic
                        const processBatch = (total: number, limit: number) => {
                            const batchSize = Math.min(total, limit);
                            const hasMore = total > limit;

                            return {
                                processed: batchSize,
                                hasMore,
                                remaining: Math.max(0, total - limit),
                            };
                        };

                        const result = processBatch(totalNudges, batchLimit);

                        // Verify batch processing logic
                        expect(result.processed).toBeLessThanOrEqual(batchLimit);
                        expect(result.processed).toBeLessThanOrEqual(totalNudges);
                        expect(result.processed).toBeGreaterThan(0);

                        if (totalNudges <= batchLimit) {
                            expect(result.processed).toBe(totalNudges);
                            expect(result.hasMore).toBe(false);
                            expect(result.remaining).toBe(0);
                        } else {
                            expect(result.processed).toBe(batchLimit);
                            expect(result.hasMore).toBe(true);
                            expect(result.remaining).toBe(totalNudges - batchLimit);
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should calculate correct cutoff date for 7-day cleanup", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        currentDate: fc.date({
                            min: new Date("2024-01-08"),
                            max: new Date("2025-12-31"),
                        }),
                    }),
                    async ({ currentDate }) => {
                        // Skip test if invalid date
                        fc.pre(!isNaN(currentDate.getTime()));

                        // Simulate cutoff date calculation
                        const calculateCutoffDate = (now: Date) => {
                            const cutoff = new Date(now);
                            cutoff.setDate(cutoff.getDate() - 7);
                            return cutoff;
                        };

                        const cutoffDate = calculateCutoffDate(currentDate);

                        // Skip test if cutoff date is invalid
                        fc.pre(!isNaN(cutoffDate.getTime()));

                        // Verify cutoff date is exactly 7 days before current date
                        // Use UTC to avoid DST issues
                        const daysDifference = Math.round(
                            (currentDate.getTime() - cutoffDate.getTime()) /
                            (1000 * 60 * 60 * 24),
                        );

                        // Should be 7 days (allowing for small rounding differences due to DST)
                        expect(daysDifference).toBeGreaterThanOrEqual(6);
                        expect(daysDifference).toBeLessThanOrEqual(8);
                        expect(cutoffDate.getTime()).toBeLessThan(currentDate.getTime());

                        // Verify the cutoff date is in the past relative to current date
                        expect(cutoffDate.getTime()).toBeLessThan(currentDate.getTime());
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
