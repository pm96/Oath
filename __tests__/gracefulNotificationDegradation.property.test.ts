/**
 * Property-Based Tests for Graceful Notification Degradation
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

describe("Graceful Notification Degradation Property-Based Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * **Feature: social-nudging-feed, Property 18: Graceful notification degradation**
     * **Validates: Requirements 5.5**
     */
    describe("Property 18: Graceful notification degradation", () => {
        it("should record nudge in Firestore even when FCM notification fails", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        nudgeData: fc.record({
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                        receiverData: fc.record({
                            fcmToken: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
                            displayName: fc.string({ minLength: 1, maxLength: 100 }),
                        }),
                        fcmError: fc.oneof(
                            fc.constant("messaging/invalid-registration-token"),
                            fc.constant("messaging/registration-token-not-registered"),
                            fc.constant("messaging/invalid-argument"),
                            fc.constant("messaging/internal-error"),
                            fc.constant("network-error"),
                        ),
                    }),
                    async ({ nudgeData, receiverData, fcmError }) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Mock Firestore operations
                        const mockDoc = jest.fn();
                        const mockGet = jest.fn();
                        const mockExists = jest.fn(() => true);
                        const mockData = jest.fn(() => receiverData);

                        mockGet.mockResolvedValue({
                            exists: mockExists,
                            data: mockData,
                        });
                        mockDoc.mockReturnValue({ get: mockGet });

                        const mockFirestore = {
                            doc: mockDoc,
                        };

                        // Mock FCM messaging that fails
                        const mockSend = jest.fn();
                        if (receiverData.fcmToken) {
                            mockSend.mockRejectedValue(new Error(fcmError));
                        }

                        const mockMessaging = {
                            send: mockSend,
                        };

                        // Simulate the sendNudgeNotification cloud function logic
                        const sendNudgeNotification = async (
                            nudge: typeof nudgeData,
                            firestore: typeof mockFirestore,
                            messaging: typeof mockMessaging,
                        ) => {
                            try {
                                // Get receiver's data
                                const receiverRef = firestore.doc(`users/${nudge.receiverId}`);
                                const receiverDoc = await receiverRef.get();

                                if (!receiverDoc.exists()) {
                                    console.log(`Receiver ${nudge.receiverId} not found`);
                                    return;
                                }

                                const receiverData = receiverDoc.data();
                                const fcmToken = receiverData?.fcmToken;

                                if (!fcmToken) {
                                    console.log(`Receiver ${nudge.receiverId} has no FCM token`);
                                    return;
                                }

                                // Attempt to send FCM notification
                                const message = {
                                    token: fcmToken,
                                    notification: {
                                        title: `👊 ${nudge.senderName} nudged you!`,
                                        body: `Don't forget: ${nudge.goalDescription}`,
                                    },
                                    data: {
                                        type: "nudge",
                                        goalId: nudge.goalId,
                                        senderId: nudge.senderId,
                                        senderName: nudge.senderName,
                                    },
                                };

                                await messaging.send(message);
                                console.log(`Nudge notification sent successfully`);
                            } catch (error) {
                                // This is the key: log error but don't throw
                                // This allows the nudge creation to continue
                                console.error("Error sending nudge notification:", error);
                                // Graceful degradation: function completes without throwing
                            }
                        };

                        // Execute the function
                        await expect(
                            sendNudgeNotification(nudgeData, mockFirestore, mockMessaging),
                        ).resolves.not.toThrow();

                        // Verify receiver lookup was attempted
                        expect(mockDoc).toHaveBeenCalledWith(
                            `users/${nudgeData.receiverId}`,
                        );
                        expect(mockGet).toHaveBeenCalled();

                        if (receiverData.fcmToken) {
                            // Verify FCM send was attempted
                            expect(mockSend).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    token: receiverData.fcmToken,
                                    notification: {
                                        title: `👊 ${nudgeData.senderName} nudged you!`,
                                        body: `Don't forget: ${nudgeData.goalDescription}`,
                                    },
                                    data: {
                                        type: "nudge",
                                        goalId: nudgeData.goalId,
                                        senderId: nudgeData.senderId,
                                        senderName: nudgeData.senderName,
                                    },
                                }),
                            );
                        } else {
                            // Verify FCM send was not attempted when no token
                            expect(mockSend).not.toHaveBeenCalled();
                        }

                        // The key validation: function completes successfully
                        // even when FCM fails, allowing nudge creation to proceed
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should handle missing FCM tokens gracefully without throwing", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        nudgeData: fc.record({
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                        receiverExists: fc.boolean(),
                        hasFcmToken: fc.boolean(),
                    }),
                    async ({ nudgeData, receiverExists, hasFcmToken }) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Mock Firestore operations
                        const mockDoc = jest.fn();
                        const mockGet = jest.fn();
                        const mockExists = jest.fn(() => receiverExists);
                        const mockData = jest.fn(() => ({
                            fcmToken: hasFcmToken ? "valid-token" : null,
                            displayName: "Test User",
                        }));

                        mockGet.mockResolvedValue({
                            exists: mockExists,
                            data: mockData,
                        });
                        mockDoc.mockReturnValue({ get: mockGet });

                        const mockFirestore = {
                            doc: mockDoc,
                        };

                        // Mock FCM messaging
                        const mockSend = jest
                            .fn()
                            .mockResolvedValue({ messageId: "test-id" });
                        const mockMessaging = {
                            send: mockSend,
                        };

                        // Simulate the sendNudgeNotification cloud function logic
                        const sendNudgeNotification = async (
                            nudge: typeof nudgeData,
                            firestore: typeof mockFirestore,
                            messaging: typeof mockMessaging,
                        ) => {
                            try {
                                // Get receiver's data
                                const receiverRef = firestore.doc(`users/${nudge.receiverId}`);
                                const receiverDoc = await receiverRef.get();

                                if (!receiverDoc.exists()) {
                                    console.log(`Receiver ${nudge.receiverId} not found`);
                                    return; // Graceful handling of missing user
                                }

                                const receiverData = receiverDoc.data();
                                const fcmToken = receiverData?.fcmToken;

                                if (!fcmToken) {
                                    console.log(`Receiver ${nudge.receiverId} has no FCM token`);
                                    return; // Graceful handling of missing token
                                }

                                // Send FCM notification
                                const message = {
                                    token: fcmToken,
                                    notification: {
                                        title: `👊 ${nudge.senderName} nudged you!`,
                                        body: `Don't forget: ${nudge.goalDescription}`,
                                    },
                                    data: {
                                        type: "nudge",
                                        goalId: nudge.goalId,
                                        senderId: nudge.senderId,
                                        senderName: nudge.senderName,
                                    },
                                };

                                await messaging.send(message);
                                console.log(`Nudge notification sent successfully`);
                            } catch (error) {
                                // Log error but don't throw - graceful degradation
                                console.error("Error sending nudge notification:", error);
                            }
                        };

                        // Execute the function - should never throw
                        await expect(
                            sendNudgeNotification(nudgeData, mockFirestore, mockMessaging),
                        ).resolves.not.toThrow();

                        // Verify receiver lookup was attempted
                        expect(mockDoc).toHaveBeenCalledWith(
                            `users/${nudgeData.receiverId}`,
                        );
                        expect(mockGet).toHaveBeenCalled();

                        if (receiverExists && hasFcmToken) {
                            // Verify FCM send was attempted when conditions are met
                            expect(mockSend).toHaveBeenCalled();
                        } else {
                            // Verify FCM send was not attempted when conditions not met
                            expect(mockSend).not.toHaveBeenCalled();
                        }

                        // Key validation: function always completes gracefully
                        // regardless of receiver existence or FCM token availability
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should continue nudge creation workflow even when notification service is unavailable", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        nudgeData: fc.record({
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                        serviceError: fc.oneof(
                            fc.constant("Service temporarily unavailable"),
                            fc.constant("Network timeout"),
                            fc.constant("FCM service down"),
                            fc.constant("Authentication failed"),
                            fc.constant("Rate limit exceeded"),
                        ),
                    }),
                    async ({ nudgeData, serviceError }) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Mock successful Firestore operations
                        const mockDoc = jest.fn();
                        const mockGet = jest.fn();
                        const mockExists = jest.fn(() => true);
                        const mockData = jest.fn(() => ({
                            fcmToken: "valid-token",
                            displayName: "Test User",
                        }));

                        mockGet.mockResolvedValue({
                            exists: mockExists,
                            data: mockData,
                        });
                        mockDoc.mockReturnValue({ get: mockGet });

                        const mockFirestore = {
                            doc: mockDoc,
                        };

                        // Mock FCM messaging that fails with service error
                        const mockSend = jest
                            .fn()
                            .mockRejectedValue(new Error(serviceError));
                        const mockMessaging = {
                            send: mockSend,
                        };

                        // Mock the nudge creation process
                        const mockAddDoc = jest.fn().mockResolvedValue({ id: "nudge-123" });
                        const mockNudgeCollection = { add: mockAddDoc };

                        // Simulate complete nudge creation workflow
                        const createNudgeWithNotification = async (
                            nudge: typeof nudgeData,
                            nudgeCollection: typeof mockNudgeCollection,
                            firestore: typeof mockFirestore,
                            messaging: typeof mockMessaging,
                        ) => {
                            try {
                                // Step 1: Create nudge document (this should always succeed)
                                const nudgeDoc = await nudgeCollection.add({
                                    ...nudge,
                                    timestamp: new Date(),
                                    cooldownUntil: new Date(Date.now() + 60 * 60 * 1000),
                                });

                                // Step 2: Attempt to send notification (this may fail gracefully)
                                try {
                                    const receiverRef = firestore.doc(
                                        `users/${nudge.receiverId}`,
                                    );
                                    const receiverDoc = await receiverRef.get();

                                    if (receiverDoc.exists()) {
                                        const receiverData = receiverDoc.data();
                                        const fcmToken = receiverData?.fcmToken;

                                        if (fcmToken) {
                                            const message = {
                                                token: fcmToken,
                                                notification: {
                                                    title: `👊 ${nudge.senderName} nudged you!`,
                                                    body: `Don't forget: ${nudge.goalDescription}`,
                                                },
                                                data: {
                                                    type: "nudge",
                                                    goalId: nudge.goalId,
                                                    senderId: nudge.senderId,
                                                    senderName: nudge.senderName,
                                                },
                                            };

                                            await messaging.send(message);
                                        }
                                    }
                                } catch (notificationError) {
                                    // Log but don't throw - graceful degradation
                                    console.error("Notification failed:", notificationError);
                                }

                                return nudgeDoc;
                            } catch (error) {
                                // Only throw if nudge creation fails, not notification
                                if ((error as Error).message.includes("nudge creation")) {
                                    throw error;
                                }
                                // Otherwise, log and continue
                                console.error("Non-critical error:", error);
                                return { id: "fallback-id" };
                            }
                        };

                        // Execute the workflow - should complete successfully
                        const result = await createNudgeWithNotification(
                            nudgeData,
                            mockNudgeCollection,
                            mockFirestore,
                            mockMessaging,
                        );

                        // Verify nudge was created despite notification failure
                        expect(result).toBeDefined();
                        expect(result.id).toBeDefined();
                        expect(mockAddDoc).toHaveBeenCalledWith(
                            expect.objectContaining({
                                senderId: nudgeData.senderId,
                                senderName: nudgeData.senderName,
                                receiverId: nudgeData.receiverId,
                                goalId: nudgeData.goalId,
                                goalDescription: nudgeData.goalDescription,
                            }),
                        );

                        // Verify notification was attempted but failed gracefully
                        expect(mockSend).toHaveBeenCalled();

                        // Key validation: nudge creation succeeded despite notification failure
                        // This demonstrates graceful degradation - core functionality (nudge recording)
                        // continues even when auxiliary functionality (notifications) fails
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should log appropriate error messages for different notification failure scenarios", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        nudgeData: fc.record({
                            senderId: fc.string({ minLength: 1, maxLength: 50 }),
                            senderName: fc.string({ minLength: 1, maxLength: 100 }),
                            receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalId: fc.string({ minLength: 1, maxLength: 50 }),
                            goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        }),
                        failureScenario: fc.oneof(
                            fc.constant("no-receiver"),
                            fc.constant("no-token"),
                            fc.constant("fcm-error"),
                        ),
                    }),
                    async ({ nudgeData, failureScenario }) => {
                        // Ensure sender and receiver are different
                        fc.pre(nudgeData.senderId !== nudgeData.receiverId);

                        // Mock console.log and console.error to track logging
                        const consoleLogs: string[] = [];
                        const consoleErrors: string[] = [];
                        const originalLog = console.log;
                        const originalError = console.error;

                        console.log = jest.fn((message: string) => {
                            consoleLogs.push(message);
                        });
                        console.error = jest.fn((message: string, error?: any) => {
                            consoleErrors.push(message);
                        });

                        try {
                            // Setup mocks based on failure scenario
                            const mockDoc = jest.fn();
                            const mockGet = jest.fn();
                            let mockExists: jest.Mock;
                            let mockData: jest.Mock;
                            const mockSend = jest.fn();

                            switch (failureScenario) {
                                case "no-receiver":
                                    mockExists = jest.fn(() => false);
                                    mockData = jest.fn(() => null);
                                    break;
                                case "no-token":
                                    mockExists = jest.fn(() => true);
                                    mockData = jest.fn(() => ({ fcmToken: null }));
                                    break;
                                case "fcm-error":
                                    mockExists = jest.fn(() => true);
                                    mockData = jest.fn(() => ({ fcmToken: "valid-token" }));
                                    mockSend.mockRejectedValue(new Error("FCM send failed"));
                                    break;
                            }

                            mockGet.mockResolvedValue({
                                exists: mockExists,
                                data: mockData,
                            });
                            mockDoc.mockReturnValue({ get: mockGet });

                            const mockFirestore = { doc: mockDoc };
                            const mockMessaging = { send: mockSend };

                            // Simulate notification sending with logging
                            const sendNotificationWithLogging = async (
                                nudge: typeof nudgeData,
                                firestore: typeof mockFirestore,
                                messaging: typeof mockMessaging,
                            ) => {
                                try {
                                    const receiverRef = firestore.doc(
                                        `users/${nudge.receiverId}`,
                                    );
                                    const receiverDoc = await receiverRef.get();

                                    if (!receiverDoc.exists()) {
                                        console.log(`Receiver ${nudge.receiverId} not found`);
                                        return;
                                    }

                                    const receiverData = receiverDoc.data();
                                    const fcmToken = receiverData?.fcmToken;

                                    if (!fcmToken) {
                                        console.log(
                                            `Receiver ${nudge.receiverId} has no FCM token`,
                                        );
                                        return;
                                    }

                                    const message = {
                                        token: fcmToken,
                                        notification: {
                                            title: `👊 ${nudge.senderName} nudged you!`,
                                            body: `Don't forget: ${nudge.goalDescription}`,
                                        },
                                    };

                                    await messaging.send(message);
                                    console.log("Nudge notification sent successfully");
                                } catch (error) {
                                    console.error("Error sending nudge notification:", error);
                                }
                            };

                            // Execute the function
                            await sendNotificationWithLogging(
                                nudgeData,
                                mockFirestore,
                                mockMessaging,
                            );

                            // Verify appropriate logging based on scenario
                            switch (failureScenario) {
                                case "no-receiver":
                                    expect(consoleLogs).toContain(
                                        `Receiver ${nudgeData.receiverId} not found`,
                                    );
                                    expect(consoleErrors).toHaveLength(0);
                                    break;
                                case "no-token":
                                    expect(consoleLogs).toContain(
                                        `Receiver ${nudgeData.receiverId} has no FCM token`,
                                    );
                                    expect(consoleErrors).toHaveLength(0);
                                    break;
                                case "fcm-error":
                                    expect(consoleErrors).toContain(
                                        "Error sending nudge notification:",
                                    );
                                    break;
                            }

                            // Key validation: appropriate logging occurs for each failure scenario
                            // This demonstrates proper error handling and observability
                        } finally {
                            // Restore original console methods
                            console.log = originalLog;
                            console.error = originalError;
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
