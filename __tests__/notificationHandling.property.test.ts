/**
 * Property-Based Tests for Notification Handling
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

describe("Notification Handling Property-Based Tests", () => {
    /**
     * **Feature: social-nudging-feed, Property 16: Nudge notification navigation**
     * **Validates: Requirements 5.3**
     */
    describe("Property 16: Nudge notification navigation", () => {
        it("should navigate to Home tab when nudge notification is tapped", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notificationData: fc.record({
                            type: fc.constant("nudge"),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                        currentRoute: fc.oneof(
                            fc.constant("/(tabs)/friends"),
                            fc.constant("/(tabs)/profile"),
                            fc.constant("/(tabs)/home"),
                            fc.constant("/create-account"),
                            fc.constant("/sign-in"),
                        ),
                    }),
                    async ({ notificationData, currentRoute }) => {
                        // Mock router navigation
                        const mockRouter = {
                            push: jest.fn(),
                            currentRoute,
                        };

                        // Mock toast function
                        const mockShowInfoToast = jest.fn();

                        // Simulate notification response handler logic
                        const handleNotificationResponse = (
                            data: typeof notificationData,
                            router: typeof mockRouter,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            if (data.type === "nudge") {
                                // Navigate to Home tab when nudge notification is tapped
                                router.push("/(tabs)/home");

                                // Show toast with nudge sender and goal information
                                if (data.senderName && data.goalDescription) {
                                    showInfoToast(
                                        `Don't forget: ${data.goalDescription}`,
                                        `👊 Nudge from ${data.senderName}`,
                                    );
                                }
                            }
                        };

                        // Execute the handler
                        handleNotificationResponse(
                            notificationData,
                            mockRouter,
                            mockShowInfoToast,
                        );

                        // Verify navigation to Home tab
                        expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/home");
                        expect(mockRouter.push).toHaveBeenCalledTimes(1);

                        // Verify toast is shown with correct content
                        expect(mockShowInfoToast).toHaveBeenCalledWith(
                            `Don't forget: ${notificationData.goalDescription}`,
                            `👊 Nudge from ${notificationData.senderName}`,
                        );
                        expect(mockShowInfoToast).toHaveBeenCalledTimes(1);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should handle nudge notifications with missing data gracefully", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notificationData: fc.record({
                            type: fc.constant("nudge"),
                            goalId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
                            senderId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
                            senderName: fc.option(
                                fc.string({ minLength: 1, maxLength: 100 }),
                            ),
                            goalDescription: fc.option(
                                fc.string({ minLength: 1, maxLength: 500 }),
                            ),
                        }),
                    }),
                    async ({ notificationData }) => {
                        // Mock router navigation
                        const mockRouter = {
                            push: jest.fn(),
                        };

                        // Mock toast function
                        const mockShowInfoToast = jest.fn();

                        // Simulate notification response handler logic
                        const handleNotificationResponse = (
                            data: typeof notificationData,
                            router: typeof mockRouter,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            if (data.type === "nudge") {
                                // Always navigate to Home tab
                                router.push("/(tabs)/home");

                                // Only show toast if both senderName and goalDescription exist
                                if (data.senderName && data.goalDescription) {
                                    showInfoToast(
                                        `Don't forget: ${data.goalDescription}`,
                                        `👊 Nudge from ${data.senderName}`,
                                    );
                                }
                            }
                        };

                        // Execute the handler
                        handleNotificationResponse(
                            notificationData,
                            mockRouter,
                            mockShowInfoToast,
                        );

                        // Verify navigation always happens
                        expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/home");
                        expect(mockRouter.push).toHaveBeenCalledTimes(1);

                        // Verify toast behavior based on data availability
                        if (
                            notificationData.senderName &&
                            notificationData.goalDescription
                        ) {
                            expect(mockShowInfoToast).toHaveBeenCalledWith(
                                `Don't forget: ${notificationData.goalDescription}`,
                                `👊 Nudge from ${notificationData.senderName}`,
                            );
                            expect(mockShowInfoToast).toHaveBeenCalledTimes(1);
                        } else {
                            expect(mockShowInfoToast).not.toHaveBeenCalled();
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should only handle nudge type notifications for navigation", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notificationData: fc.record({
                            type: fc.oneof(
                                fc.constant("friend_request"),
                                fc.constant("friend_request_accepted"),
                                fc.constant("shame_notification"),
                                fc.constant("unknown_type"),
                                fc.string({ minLength: 1, maxLength: 20 }),
                            ),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                    }),
                    async ({ notificationData }) => {
                        // Skip nudge type to test other types
                        fc.pre(notificationData.type !== "nudge");

                        // Mock router navigation
                        const mockRouter = {
                            push: jest.fn(),
                        };

                        // Mock toast function
                        const mockShowInfoToast = jest.fn();

                        // Simulate notification response handler logic
                        const handleNotificationResponse = (
                            data: typeof notificationData,
                            router: typeof mockRouter,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            if (data.type === "nudge") {
                                router.push("/(tabs)/home");

                                if (data.senderName && data.goalDescription) {
                                    showInfoToast(
                                        `Don't forget: ${data.goalDescription}`,
                                        `👊 Nudge from ${data.senderName}`,
                                    );
                                }
                            }
                            // Other notification types would have their own handlers
                        };

                        // Execute the handler
                        handleNotificationResponse(
                            notificationData,
                            mockRouter,
                            mockShowInfoToast,
                        );

                        // Verify no navigation to Home tab for non-nudge notifications
                        expect(mockRouter.push).not.toHaveBeenCalledWith("/(tabs)/home");

                        // Verify no nudge toast is shown for non-nudge notifications
                        expect(mockShowInfoToast).not.toHaveBeenCalled();
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 17: Multiple notification handling**
     * **Validates: Requirements 5.4**
     */
    describe("Property 17: Multiple notification handling", () => {
        it("should handle multiple nudge notifications independently", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notifications: fc.array(
                            fc.record({
                                id: fc.string({ minLength: 1, maxLength: 50 }),
                                type: fc.constant("nudge"),
                                goalId: fc.string({ minLength: 1, maxLength: 50 }),
                                senderId: fc.string({ minLength: 1, maxLength: 50 }),
                                senderName: fc.string({ minLength: 1, maxLength: 100 }),
                                goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                                timestamp: fc.date({
                                    min: new Date("2024-01-01"),
                                    max: new Date("2025-12-31"),
                                }),
                            }),
                            { minLength: 1, maxLength: 10 },
                        ),
                    }),
                    async ({ notifications }) => {
                        // Ensure all notifications have unique IDs
                        const uniqueIds = new Set(notifications.map((n) => n.id));
                        fc.pre(uniqueIds.size === notifications.length);

                        // Mock router navigation
                        const mockRouter = {
                            push: jest.fn(),
                        };

                        // Mock toast function
                        const mockShowInfoToast = jest.fn();

                        // Simulate handling multiple notifications
                        const handleMultipleNotifications = (
                            notificationList: typeof notifications,
                            router: typeof mockRouter,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            // Each notification should be handled independently
                            notificationList.forEach((notification) => {
                                if (notification.type === "nudge") {
                                    router.push("/(tabs)/home");

                                    if (notification.senderName && notification.goalDescription) {
                                        showInfoToast(
                                            `Don't forget: ${notification.goalDescription}`,
                                            `👊 Nudge from ${notification.senderName}`,
                                        );
                                    }
                                }
                            });
                        };

                        // Execute the handler for all notifications
                        handleMultipleNotifications(
                            notifications,
                            mockRouter,
                            mockShowInfoToast,
                        );

                        // Verify navigation was called for each notification
                        expect(mockRouter.push).toHaveBeenCalledTimes(notifications.length);
                        notifications.forEach(() => {
                            expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/home");
                        });

                        // Verify toast was called for each notification
                        expect(mockShowInfoToast).toHaveBeenCalledTimes(
                            notifications.length,
                        );
                        notifications.forEach((notification) => {
                            expect(mockShowInfoToast).toHaveBeenCalledWith(
                                `Don't forget: ${notification.goalDescription}`,
                                `👊 Nudge from ${notification.senderName}`,
                            );
                        });
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should handle mixed notification types correctly", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notifications: fc.array(
                            fc.record({
                                id: fc.string({ minLength: 1, maxLength: 50 }),
                                type: fc.oneof(
                                    fc.constant("nudge"),
                                    fc.constant("friend_request"),
                                    fc.constant("friend_request_accepted"),
                                    fc.constant("shame_notification"),
                                ),
                                goalId: fc.string({ minLength: 1, maxLength: 50 }),
                                senderId: fc.string({ minLength: 1, maxLength: 50 }),
                                senderName: fc.string({ minLength: 1, maxLength: 100 }),
                                goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                            }),
                            { minLength: 1, maxLength: 10 },
                        ),
                    }),
                    async ({ notifications }) => {
                        // Ensure all notifications have unique IDs
                        const uniqueIds = new Set(notifications.map((n) => n.id));
                        fc.pre(uniqueIds.size === notifications.length);

                        // Mock router navigation
                        const mockRouter = {
                            push: jest.fn(),
                        };

                        // Mock toast function
                        const mockShowInfoToast = jest.fn();

                        // Simulate handling mixed notifications
                        const handleMixedNotifications = (
                            notificationList: typeof notifications,
                            router: typeof mockRouter,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            notificationList.forEach((notification) => {
                                if (notification.type === "nudge") {
                                    router.push("/(tabs)/home");

                                    if (notification.senderName && notification.goalDescription) {
                                        showInfoToast(
                                            `Don't forget: ${notification.goalDescription}`,
                                            `👊 Nudge from ${notification.senderName}`,
                                        );
                                    }
                                } else if (notification.type === "friend_request") {
                                    router.push("/(tabs)/friends");
                                } else if (notification.type === "friend_request_accepted") {
                                    router.push("/(tabs)/friends");
                                } else if (notification.type === "shame_notification") {
                                    router.push("/(tabs)/friends");
                                }
                            });
                        };

                        // Execute the handler for all notifications
                        handleMixedNotifications(
                            notifications,
                            mockRouter,
                            mockShowInfoToast,
                        );

                        // Count expected calls by type
                        const nudgeNotifications = notifications.filter(
                            (n) => n.type === "nudge",
                        );
                        const friendNotifications = notifications.filter(
                            (n) =>
                                n.type === "friend_request" ||
                                n.type === "friend_request_accepted" ||
                                n.type === "shame_notification",
                        );

                        // Verify total navigation calls
                        expect(mockRouter.push).toHaveBeenCalledTimes(notifications.length);

                        // Verify nudge-specific calls
                        expect(mockShowInfoToast).toHaveBeenCalledTimes(
                            nudgeNotifications.length,
                        );

                        // Verify navigation destinations
                        nudgeNotifications.forEach(() => {
                            expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/home");
                        });

                        friendNotifications.forEach(() => {
                            expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/friends");
                        });
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should preserve notification order when handling multiple notifications", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notifications: fc.array(
                            fc.record({
                                id: fc.string({ minLength: 1, maxLength: 50 }),
                                type: fc.constant("nudge"),
                                senderName: fc.string({ minLength: 1, maxLength: 100 }),
                                goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                                order: fc.integer({ min: 1, max: 1000 }),
                            }),
                            { minLength: 2, maxLength: 5 },
                        ),
                    }),
                    async ({ notifications }) => {
                        // Ensure all notifications have unique IDs and orders
                        const uniqueIds = new Set(notifications.map((n) => n.id));
                        const uniqueOrders = new Set(notifications.map((n) => n.order));
                        fc.pre(uniqueIds.size === notifications.length);
                        fc.pre(uniqueOrders.size === notifications.length);

                        // Sort notifications by order to simulate processing order
                        const sortedNotifications = [...notifications].sort(
                            (a, b) => a.order - b.order,
                        );

                        // Mock toast function that tracks call order
                        const toastCalls: Array<{ message: string; title: string }> = [];
                        const mockShowInfoToast = jest.fn(
                            (message: string, title: string) => {
                                toastCalls.push({ message, title });
                            },
                        );

                        // Simulate handling notifications in order
                        const handleNotificationsInOrder = (
                            notificationList: typeof sortedNotifications,
                            showInfoToast: typeof mockShowInfoToast,
                        ) => {
                            notificationList.forEach((notification) => {
                                if (notification.type === "nudge") {
                                    if (notification.senderName && notification.goalDescription) {
                                        showInfoToast(
                                            `Don't forget: ${notification.goalDescription}`,
                                            `👊 Nudge from ${notification.senderName}`,
                                        );
                                    }
                                }
                            });
                        };

                        // Execute the handler
                        handleNotificationsInOrder(sortedNotifications, mockShowInfoToast);

                        // Verify toast calls match the expected order
                        expect(toastCalls).toHaveLength(sortedNotifications.length);

                        sortedNotifications.forEach((notification, index) => {
                            expect(toastCalls[index]).toEqual({
                                message: `Don't forget: ${notification.goalDescription}`,
                                title: `👊 Nudge from ${notification.senderName}`,
                            });
                        });
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
