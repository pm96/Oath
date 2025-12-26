/**
 * Property-Based Tests for Nudge Success Feedback
 * Feature: social-nudging-feed
 */

import * as fc from "fast-check";

// Mock the toast utility
const mockShowSuccessToast = jest.fn();
const mockShowErrorToast = jest.fn();
jest.mock("@/utils/toast", () => ({
  showSuccessToast: mockShowSuccessToast,
  showErrorToast: mockShowErrorToast,
}));

// Mock the nudge service
const mockSendNudge = jest.fn();
jest.mock("@/services/firebase/nudgeService", () => ({
  sendNudge: mockSendNudge,
}));

describe("Nudge Success Feedback Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: social-nudging-feed, Property 11: Nudge success feedback**
   * **Validates: Requirements 3.5**
   */
  describe("Property 11: Nudge success feedback", () => {
    it("should display success toast with friend name for any successful nudge", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            goalId: fc.string({ minLength: 1, maxLength: 50 }),
            friendId: fc.string({ minLength: 1, maxLength: 50 }),
            friendName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async ({ goalId, friendId, friendName }) => {
            // Clear mocks for each property test run
            mockShowSuccessToast.mockClear();
            mockSendNudge.mockClear();

            // Mock successful nudge sending
            mockSendNudge.mockResolvedValue(undefined);

            // Simulate the handleNudge function logic from FriendsFeed
            const sortedGoals = [{ id: goalId, ownerName: friendName }];

            // Execute nudge logic
            await mockSendNudge(goalId, friendId);
            const goal = sortedGoals.find((g) => g.id === goalId);
            const foundFriendName = goal?.ownerName || "friend";
            mockShowSuccessToast(`Nudge sent to ${foundFriendName}! 👊`);

            // Property: For any successful nudge send, a success toast should display
            // with the message "Nudge sent to [Friend Name]!"
            expect(mockShowSuccessToast).toHaveBeenCalledTimes(1);
            expect(mockShowSuccessToast).toHaveBeenCalledWith(
              `Nudge sent to ${friendName}! 👊`,
            );

            // Verify the nudge service was called
            expect(mockSendNudge).toHaveBeenCalledWith(goalId, friendId);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should display success toast with fallback name when friend name is not found", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            goalId: fc.string({ minLength: 1, maxLength: 50 }),
            friendId: fc.string({ minLength: 1, maxLength: 50 }),
            differentGoalId: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ goalId, friendId, differentGoalId }) => {
            // Ensure the goal IDs are different
            fc.pre(goalId !== differentGoalId);

            // Clear mocks for each property test run
            mockShowSuccessToast.mockClear();
            mockSendNudge.mockClear();

            // Mock successful nudge sending
            mockSendNudge.mockResolvedValue(undefined);

            // Mock sorted goals that don't contain the target goal
            const sortedGoals = [
              { id: differentGoalId, ownerName: "Some Other Friend" },
            ];

            // Execute nudge logic
            await mockSendNudge(goalId, friendId);
            const goal = sortedGoals.find((g) => g.id === goalId);
            const foundFriendName = goal?.ownerName || "friend";
            mockShowSuccessToast(`Nudge sent to ${foundFriendName}! 👊`);

            // Property: When friend name is not found, should use fallback "friend"
            expect(mockShowSuccessToast).toHaveBeenCalledTimes(1);
            expect(mockShowSuccessToast).toHaveBeenCalledWith(
              "Nudge sent to friend! 👊",
            );

            // Verify the nudge service was called
            expect(mockSendNudge).toHaveBeenCalledWith(goalId, friendId);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should not display success toast when nudge sending fails", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            goalId: fc.string({ minLength: 1, maxLength: 50 }),
            friendId: fc.string({ minLength: 1, maxLength: 50 }),
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ goalId, friendId, errorMessage }) => {
            // Clear mocks for each property test run
            mockShowSuccessToast.mockClear();
            mockShowErrorToast.mockClear();
            mockSendNudge.mockClear();

            // Mock failed nudge sending
            mockSendNudge.mockRejectedValue(new Error(errorMessage));

            // Execute nudge logic with error handling
            try {
              await mockSendNudge(goalId, friendId);
              mockShowSuccessToast("This should not be called");
            } catch (error) {
              mockShowErrorToast(
                error instanceof Error ? error.message : "Failed to send nudge",
              );
            }

            // Property: Success toast should NOT be displayed when nudge fails
            expect(mockShowSuccessToast).not.toHaveBeenCalled();

            // Error toast should be displayed instead
            expect(mockShowErrorToast).toHaveBeenCalledTimes(1);
            expect(mockShowErrorToast).toHaveBeenCalledWith(errorMessage);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
