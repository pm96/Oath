/**
 * Property-Based Tests for Nudge Service
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";
import {
    canSendNudge,
    getNudgeCooldowns,
    getRemainingCooldownMinutes,
    sendNudge,
    SendNudgeInput,
} from "../services/firebase/nudgeService";

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

describe("Nudge Service Property-Based Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * **Feature: social-nudging-feed, Property 9: Nudge document creation completeness**
     * **Validates: Requirements 3.3, 8.1**
     */
    describe("Property 9: Nudge document creation completeness", () => {
        it("should create nudge documents with all required fields", async () => {
            const mockAddDoc = require("firebase/firestore").addDoc as jest.Mock;
            mockAddDoc.mockResolvedValue({ id: "test-nudge-id" });

            // Mock empty cooldowns (no existing nudges)
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;
            mockGetDocs.mockResolvedValue({ docs: [] });

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                    }),
                    async (input: SendNudgeInput) => {
                        // Ensure sender and receiver are different
                        fc.pre(input.senderId !== input.receiverId);

                        await sendNudge(input);

                        // Verify addDoc was called with correct structure
                        expect(mockAddDoc).toHaveBeenCalledWith(
                            expect.anything(), // collection reference
                            expect.objectContaining({
                                senderId: input.senderId,
                                senderName: input.senderName,
                                receiverId: input.receiverId,
                                goalId: input.goalId,
                                goalDescription: input.goalDescription,
                                timestamp: expect.anything(),
                                cooldownUntil: expect.anything(),
                                createdAt: expect.anything(),
                            }),
                        );

                        // Verify all required fields are present
                        const callArgs =
                            mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];
                        const nudgeData = callArgs[1];

                        expect(nudgeData).toHaveProperty("senderId");
                        expect(nudgeData).toHaveProperty("senderName");
                        expect(nudgeData).toHaveProperty("receiverId");
                        expect(nudgeData).toHaveProperty("goalId");
                        expect(nudgeData).toHaveProperty("goalDescription");
                        expect(nudgeData).toHaveProperty("timestamp");
                        expect(nudgeData).toHaveProperty("cooldownUntil");
                        expect(nudgeData).toHaveProperty("createdAt");

                        // Verify field values match input
                        expect(nudgeData.senderId).toBe(input.senderId);
                        expect(nudgeData.senderName).toBe(input.senderName);
                        expect(nudgeData.receiverId).toBe(input.receiverId);
                        expect(nudgeData.goalId).toBe(input.goalId);
                        expect(nudgeData.goalDescription).toBe(input.goalDescription);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should reject nudge creation with missing required fields", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.option(fc.string(), { nil: "" }),
                        senderName: fc.option(fc.string(), { nil: "" }),
                        receiverId: fc.option(fc.string(), { nil: "" }),
                        goalId: fc.option(fc.string(), { nil: "" }),
                        goalDescription: fc.option(fc.string(), { nil: "" }),
                    }),
                    async (input: any) => {
                        // Only test cases where at least one required field is missing
                        const hasAllFields =
                            input.senderId &&
                            input.senderName &&
                            input.receiverId &&
                            input.goalId &&
                            input.goalDescription &&
                            input.senderId !== input.receiverId;

                        fc.pre(!hasAllFields);

                        await expect(sendNudge(input)).rejects.toThrow();
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should prevent self-nudging", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                    }),
                    async ({ userId, senderName, goalId, goalDescription }) => {
                        const input: SendNudgeInput = {
                            senderId: userId,
                            senderName,
                            receiverId: userId, // Same as sender
                            goalId,
                            goalDescription,
                        };

                        await expect(sendNudge(input)).rejects.toThrow(
                            "Cannot nudge yourself",
                        );
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 12: Nudge cooldown enforcement**
     * **Validates: Requirements 4.1, 4.2**
     */
    describe("Property 12: Nudge cooldown enforcement", () => {
        it("should enforce 1-hour cooldown period", async () => {
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        minutesAgo: fc.integer({ min: 1, max: 59 }), // Within 1 hour
                    }),
                    async ({ userId, goalId, minutesAgo }) => {
                        const now = new Date();
                        const nudgeTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
                        const cooldownEnd = new Date(nudgeTime.getTime() + 60 * 60 * 1000); // 1 hour later

                        // Mock existing nudge within cooldown
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

                        const cooldowns = await getNudgeCooldowns(userId);
                        const canNudge = await canSendNudge(userId, goalId);
                        const remainingMinutes = await getRemainingCooldownMinutes(
                            userId,
                            goalId,
                        );

                        // Should have cooldown for this goal
                        expect(cooldowns.has(goalId)).toBe(true);
                        expect(canNudge).toBe(false);
                        expect(remainingMinutes).toBeGreaterThan(0);
                        expect(remainingMinutes).toBeLessThanOrEqual(60);
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should allow nudging after cooldown expires", async () => {
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        hoursAgo: fc.integer({ min: 2, max: 24 }), // More than 1 hour ago
                    }),
                    async ({ userId, goalId, hoursAgo }) => {
                        const now = new Date();
                        const nudgeTime = new Date(
                            now.getTime() - hoursAgo * 60 * 60 * 1000,
                        );
                        const cooldownEnd = new Date(nudgeTime.getTime() + 60 * 60 * 1000); // 1 hour later (expired)

                        // Mock expired cooldown (should not be returned by query)
                        mockGetDocs.mockResolvedValue({ docs: [] });

                        const cooldowns = await getNudgeCooldowns(userId);
                        const canNudge = await canSendNudge(userId, goalId);
                        const remainingMinutes = await getRemainingCooldownMinutes(
                            userId,
                            goalId,
                        );

                        // Should not have active cooldown for this goal
                        expect(cooldowns.has(goalId)).toBe(false);
                        expect(canNudge).toBe(true);
                        expect(remainingMinutes).toBe(0);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * **Feature: social-nudging-feed, Property 13: Rapid nudge prevention**
     * **Validates: Requirements 4.3**
     */
    describe("Property 13: Rapid nudge prevention", () => {
        it("should prevent rapid nudging with appropriate error message", async () => {
            const mockAddDoc = require("firebase/firestore").addDoc as jest.Mock;
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        minutesAgo: fc.integer({ min: 1, max: 59 }), // Within cooldown
                    }),
                    async (input) => {
                        // Ensure sender and receiver are different
                        fc.pre(input.senderId !== input.receiverId);

                        const now = new Date();
                        const nudgeTime = new Date(
                            now.getTime() - input.minutesAgo * 60 * 1000,
                        );
                        const cooldownEnd = new Date(nudgeTime.getTime() + 60 * 60 * 1000);

                        // Mock existing nudge within cooldown
                        mockGetDocs.mockResolvedValue({
                            docs: [
                                {
                                    data: () => ({
                                        goalId: input.goalId,
                                        cooldownUntil: {
                                            toDate: () => cooldownEnd,
                                        },
                                    }),
                                },
                            ],
                        });

                        const nudgeInput: SendNudgeInput = {
                            senderId: input.senderId,
                            senderName: input.senderName,
                            receiverId: input.receiverId,
                            goalId: input.goalId,
                            goalDescription: input.goalDescription,
                        };

                        await expect(sendNudge(nudgeInput)).rejects.toThrow(
                            /Already nudged - wait \d+m/,
                        );

                        // Verify addDoc was not called due to cooldown
                        expect(mockAddDoc).not.toHaveBeenCalled();
                    },
                ),
                { numRuns: 20 },
            );
        });

        it("should show correct remaining time in error message", async () => {
            const mockGetDocs = require("firebase/firestore").getDocs as jest.Mock;

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        senderId: fc.string({ minLength: 1, maxLength: 50 }),
                        senderName: fc.string({ minLength: 1, maxLength: 100 }),
                        receiverId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalId: fc.string({ minLength: 1, maxLength: 50 }),
                        goalDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        minutesRemaining: fc.integer({ min: 1, max: 60 }),
                    }),
                    async (input) => {
                        // Ensure sender and receiver are different
                        fc.pre(input.senderId !== input.receiverId);

                        const now = new Date();
                        const cooldownEnd = new Date(
                            now.getTime() + input.minutesRemaining * 60 * 1000,
                        );

                        // Mock existing nudge with specific remaining time
                        mockGetDocs.mockResolvedValue({
                            docs: [
                                {
                                    data: () => ({
                                        goalId: input.goalId,
                                        cooldownUntil: {
                                            toDate: () => cooldownEnd,
                                        },
                                    }),
                                },
                            ],
                        });

                        const nudgeInput: SendNudgeInput = {
                            senderId: input.senderId,
                            senderName: input.senderName,
                            receiverId: input.receiverId,
                            goalId: input.goalId,
                            goalDescription: input.goalDescription,
                        };

                        try {
                            await sendNudge(nudgeInput);
                            fail("Expected error to be thrown");
                        } catch (error: any) {
                            expect(error.message).toMatch(/Already nudged - wait \d+m/);

                            // Extract the number from the error message
                            const match = error.message.match(/wait (\d+)m/);
                            if (match) {
                                const errorMinutes = parseInt(match[1]);
                                // Should be close to the expected remaining time (within 1 minute due to timing)
                                expect(
                                    Math.abs(errorMinutes - input.minutesRemaining),
                                ).toBeLessThanOrEqual(1);
                            }
                        }
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
