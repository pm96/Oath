import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Text } from "@/components/ui/Text";
import { GoalWithOwnerAndStatus } from "@/hooks/useFriendsGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { HapticFeedback } from "@/utils/celebrations";
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, ScrollView, View } from "react-native";

interface FriendGoalDetailProps {
    goal: GoalWithOwnerAndStatus | null;
    visible: boolean;
    currentUserId: string;
    onNudge: (goalId: string, friendId: string) => Promise<void>;
    onClose: () => void;
    nudgeLoading?: boolean;
}

/**
 * Format cooldown time remaining for display
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

/**
 * Get status color based on goal status
 */
function getStatusColorFromStatus(status: {
    color: "green" | "yellow" | "red";
}): string {
    switch (status.color) {
        case "green":
            return "#22c55e"; // green-500
        case "yellow":
            return "#eab308"; // yellow-500
        case "red":
            return "#ef4444"; // red-500
        default:
            return "#6b7280"; // gray-500
    }
}

/**
 * Format frequency for display
 */
function formatFrequency(goal: GoalWithOwnerAndStatus): string {
    switch (goal.frequency) {
        case "daily":
            return "Daily";
        case "weekly":
            return `Weekly (${goal.targetDays.join(", ")})`;
        case "3x_a_week":
            return `3x a week (${goal.targetDays.join(", ")})`;
        default:
            return "Unknown frequency";
    }
}

/**
 * Format completion history for display
 */
function formatCompletionHistory(goal: GoalWithOwnerAndStatus): string {
    if (!goal.latestCompletionDate) {
        return "Never completed";
    }

    const now = new Date();
    const completion = goal.latestCompletionDate;
    const diffTime = now.getTime() - completion.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "Completed today";
    } else if (diffDays === 1) {
        return "Completed yesterday";
    } else {
        return `Last completed ${diffDays} days ago`;
    }
}

/**
 * FriendGoalDetail modal component
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * Displays detailed information about a friend's goal including:
 * - Complete goal information (description, recurrence, deadline, history) (Requirement 9.2)
 * - Friend's total shame score (Requirement 9.4)
 * - Large nudge button if goal is at-risk (Requirement 9.3)
 * - Modal close with navigation state preservation (Requirement 9.5)
 * - Proper accessibility labels and focus management (Requirements 9.4)
 */
export function FriendGoalDetail({
    goal,
    visible,
    currentUserId,
    onNudge,
    onClose,
    nudgeLoading = false,
}: FriendGoalDetailProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const modalRef = useRef<View>(null);

    // Focus management for modal accessibility
    // Requirement 9.4: Implement focus management for modal navigation
    useEffect(() => {
        if (visible && goal) {
            // Announce modal opening to screen readers
            const announcement = `Goal details opened for ${goal.ownerName}'s goal: ${goal.description}`;
            // Note: AccessibilityInfo.announceForAccessibility is the correct method
            AccessibilityInfo.announceForAccessibility(announcement);

            // Set focus to modal content after a short delay
            setTimeout(() => {
                if (modalRef.current) {
                    // Focus management for React Native
                    modalRef.current.focus?.();
                }
            }, 100);
        }
    }, [visible, goal]);

    if (!goal) {
        return null;
    }

    /**
     * Handle nudge button press with haptic feedback
     * Requirement 9.3: Add large nudge button if goal is at-risk
     */
    const handleNudge = async () => {
        HapticFeedback.buttonPress();

        try {
            await onNudge(goal.id, goal.ownerId);
        } catch (error) {
            console.error("Failed to send nudge:", error);
            HapticFeedback.error();
        }
    };

    /**
     * Handle modal close with haptic feedback
     * Requirement 9.5: Modal close with navigation state preservation
     */
    const handleClose = () => {
        HapticFeedback.selection();
        onClose();
    };

    /**
     * Determine if nudge button should be shown
     * Requirement 9.3: Show nudge button if goal is at-risk
     */
    const shouldShowNudgeButton =
        goal.status.showNudge && goal.ownerId !== currentUserId;

    /**
     * Determine nudge button state
     */
    const isOnCooldown =
        !goal.canNudge && goal.cooldownRemaining && goal.cooldownRemaining > 0;
    const cooldownText = isOnCooldown
        ? formatCooldownTime(goal.cooldownRemaining!)
        : "";

    return (
        <Modal
            visible={visible}
            onClose={handleClose}
            title={`${goal.ownerName}'s Goal`}
            size="lg"
        >
            <View
                ref={modalRef}
                accessible={true}
                accessibilityRole="none"
                accessibilityLabel={`Goal details for ${goal.ownerName}: ${goal.description}`}
                accessibilityViewIsModal={true}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: spacing.xl }}
                    accessible={false} // Let child elements handle accessibility
                >
                    {/* Goal Description Section */}
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: "600",
                                color: colors.foreground,
                                lineHeight: 28,
                                marginBottom: spacing.sm,
                            }}
                            accessibilityRole="header"
                        >
                            {goal.description}
                        </Text>

                        {/* Status indicator with text */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: spacing.sm,
                                marginBottom: spacing.md,
                            }}
                        >
                            <View
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: getStatusColorFromStatus(goal.status),
                                }}
                                accessibilityLabel={`Goal status: ${goal.status.text}`}
                            />
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "500",
                                    color:
                                        goal.status.color === "red"
                                            ? colors.destructive
                                            : goal.status.color === "yellow"
                                                ? "#eab308"
                                                : colors.foreground,
                                }}
                            >
                                {goal.status.text}
                            </Text>
                        </View>
                    </View>

                    {/* Goal Details Section */}
                    <View
                        style={{
                            backgroundColor: colors.muted,
                            borderRadius: borderRadius.md,
                            padding: spacing.lg,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: colors.foreground,
                                marginBottom: spacing.md,
                            }}
                            accessibilityRole="header"
                        >
                            Goal Details
                        </Text>

                        {/* Frequency */}
                        <View style={{ marginBottom: spacing.sm }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.mutedForeground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                Frequency
                            </Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.foreground,
                                }}
                            >
                                {formatFrequency(goal)}
                            </Text>
                        </View>

                        {/* Next Deadline */}
                        <View style={{ marginBottom: spacing.sm }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.mutedForeground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                Next Deadline
                            </Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.foreground,
                                }}
                            >
                                {goal.nextDeadline.toLocaleString()}
                            </Text>
                        </View>

                        {/* Completion History */}
                        <View style={{ marginBottom: spacing.sm }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.mutedForeground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                Completion History
                            </Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.foreground,
                                }}
                            >
                                {formatCompletionHistory(goal)}
                            </Text>
                        </View>

                        {/* Created Date */}
                        <View>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.mutedForeground,
                                    marginBottom: spacing.xs,
                                }}
                            >
                                Created
                            </Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.foreground,
                                }}
                            >
                                {goal.createdAt.toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    {/* Friend's Shame Score Section */}
                    {/* Requirement 9.4: Show friend's total shame score */}
                    <View
                        style={{
                            backgroundColor: colors.muted,
                            borderRadius: borderRadius.md,
                            padding: spacing.lg,
                            marginBottom: spacing.lg,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: colors.foreground,
                                marginBottom: spacing.md,
                            }}
                            accessibilityRole="header"
                        >
                            {goal.ownerName}&apos;s Accountability
                        </Text>

                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: spacing.sm,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: "700",
                                    color:
                                        goal.ownerShameScore > 0
                                            ? colors.destructive
                                            : colors.foreground,
                                }}
                            >
                                {goal.ownerShameScore}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.mutedForeground,
                                }}
                            >
                                shame {goal.ownerShameScore === 1 ? "point" : "points"}
                            </Text>
                        </View>

                        {goal.ownerShameScore > 0 && (
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.mutedForeground,
                                    marginTop: spacing.xs,
                                }}
                            >
                                Accumulated from missed goals
                            </Text>
                        )}
                    </View>

                    {/* Nudge Button Section */}
                    {/* Requirement 9.3: Add large nudge button if goal is at-risk */}
                    {shouldShowNudgeButton && (
                        <View style={{ alignItems: "center", gap: spacing.md }}>
                            <Button
                                variant={goal.status.color === "red" ? "primary" : "secondary"}
                                size="lg"
                                onPress={handleNudge}
                                loading={nudgeLoading}
                                disabled={nudgeLoading || Boolean(isOnCooldown)}
                                style={{
                                    width: "100%",
                                    minHeight: 56,
                                    opacity: isOnCooldown ? 0.6 : 1,
                                }}
                                accessibilityLabel={
                                    isOnCooldown
                                        ? `Nudge on cooldown for ${cooldownText}`
                                        : `Send nudge to ${goal.ownerName} about this goal`
                                }
                                accessibilityHint={
                                    isOnCooldown
                                        ? "Wait for cooldown to expire before sending another nudge"
                                        : "Sends a push notification reminder about this goal"
                                }
                            >
                                {isOnCooldown
                                    ? `WAIT ${cooldownText}`
                                    : `NUDGE ${goal.ownerName.toUpperCase()}`}
                            </Button>

                            {isOnCooldown && (
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    You can send another nudge in {cooldownText}
                                </Text>
                            )}

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                    fontStyle: "italic",
                                }}
                            >
                                Nudges help friends stay accountable to their goals
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}
