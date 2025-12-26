import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { GoalWithOwnerAndStatus } from "@/hooks/useFriendsGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { AccessibilityLabels, ColorContrast } from "@/utils/accessibility";
import { HapticFeedback } from "@/utils/celebrations";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated, Pressable, View } from "react-native";

interface FriendGoalItemProps {
    goal: GoalWithOwnerAndStatus;
    currentUserId: string;
    onNudge: (goalId: string, ownerId: string) => Promise<void>;
    onGoalPress?: (goalId: string, ownerId: string) => void;
    nudgeLoading?: boolean;
}

/**
 * Format cooldown time remaining for display
 */
const formatCooldownTime = (minutes: number): string => {
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
};

/**
 * Get status color based on goal status
 * Requirement 2.1, 2.2, 2.3, 2.4: Consistent color coding (Green/Yellow/Red)
 */
const getStatusColorFromStatus = (status: {
    color: "green" | "yellow" | "red";
}): string => {
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
};

/**
 * Format deadline for display using the status text from calculator
 */
const formatDeadline = (goal: GoalWithOwnerAndStatus): string => {
    return goal.status.text;
};

/**
 * FriendGoalItem component with status display and nudge button
 * Requirements: 1.2, 3.1, 3.2, 4.4, 9.1, 9.4, 12.4
 *
 * Displays a friend's goal with:
 * - Goal description and owner name (Requirement 1.2)
 * - Status color coding using traffic light system (Requirements 2.1-2.4)
 * - Conditional "NUDGE" button for Yellow/Red goals (Requirements 3.1, 3.2)
 * - Cooldown timer when nudge is rate-limited (Requirement 4.4)
 * - Tap handler for goal detail navigation (Requirement 9.1)
 * - 44x44pt minimum touch targets (Requirement 9.4)
 * - Self-nudge prevention (Requirement 12.5)
 * - Haptic feedback for nudge actions (Requirement 12.4)
 */
export const FriendGoalItem = React.memo<FriendGoalItemProps>(
    ({ goal, currentUserId, onNudge, onGoalPress, nudgeLoading = false }) => {
        const fadeAnim = useRef(new Animated.Value(0)).current;
        const scaleAnim = useRef(new Animated.Value(0.95)).current;
        const cooldownPulseAnim = useRef(new Animated.Value(1)).current;
        const successFlashAnim = useRef(new Animated.Value(0)).current;
        const { colors, spacing } = useThemeStyles();

        // Real-time cooldown countdown state
        const [realTimeCooldown, setRealTimeCooldown] = useState<
            number | undefined
        >(goal.cooldownRemaining);

        /**
         * Memoized status color calculation to prevent re-computation
         * Requirement 11.4: Optimize expensive calculations
         * Enhanced with accessibility color contrast validation
         */
        const statusColor = useMemo(() => {
            const color = getStatusColorFromStatus(goal.status);

            // Validate color contrast for accessibility
            const backgroundColor = colors.background;
            const contrastRatio = ColorContrast.getContrastRatio(
                color,
                backgroundColor,
            );

            if (!ColorContrast.meetsWCAGAA(color, backgroundColor)) {
                console.warn(
                    `Status indicator color contrast may not meet WCAG AA standards: ${contrastRatio.toFixed(2)}:1`,
                );
            }

            return color;
        }, [goal.status, colors.background]);

        /**
         * Memoized deadline text to prevent re-computation
         * Requirement 11.4: Optimize expensive calculations
         */
        const deadlineText = useMemo(() => formatDeadline(goal), [goal]);

        /**
         * Memoized frequency text to prevent re-computation
         * Requirement 11.4: Optimize expensive calculations
         */
        const frequencyText = useMemo(() => {
            switch (goal.frequency) {
                case "daily":
                    return "Daily";
                case "weekly":
                    return `Weekly (${goal.targetDays.join(", ")})`;
                case "3x_a_week":
                    return `3x a week (${goal.targetDays.join(", ")})`;
                default:
                    return goal.frequency;
            }
        }, [goal.frequency, goal.targetDays]);

        /**
         * Memoized nudge button visibility logic
         * Requirements: 3.1, 3.2, 12.5 - Show nudge button for at-risk goals, hide for own goals
         */
        const shouldShowNudgeButton = useMemo(
            () => goal.status.showNudge && goal.ownerId !== currentUserId,
            [goal.status.showNudge, goal.ownerId, currentUserId],
        );

        /**
         * Enhanced accessibility label for the goal item
         * Requirements: 9.3, 9.4 - Proper accessibility labels and focus management
         */
        const accessibilityLabel = useMemo(() => {
            const statusText = goal.status.text;
            const ownerInfo =
                goal.ownerShameScore > 0
                    ? `${goal.ownerName}, ${goal.ownerShameScore} shame ${goal.ownerShameScore === 1 ? "point" : "points"}`
                    : goal.ownerName;

            return AccessibilityLabels.listItemLabel(
                `${goal.description} by ${ownerInfo}`,
                1, // Position would be dynamic in a real list
                1, // Total would be dynamic in a real list
                `Status: ${statusText}, Frequency: ${frequencyText}`,
            );
        }, [
            goal.description,
            goal.ownerName,
            goal.ownerShameScore,
            goal.status.text,
            frequencyText,
        ]);

        /**
         * Enhanced accessibility hint for the goal item
         */
        const accessibilityHint = useMemo(() => {
            return "Double tap to view goal details and additional options";
        }, []);

        /**
         * Memoized cooldown state calculations
         * Requirement 4.4: Show cooldown timer when nudge is rate-limited
         */
        const cooldownState = useMemo(() => {
            const isOnCooldown =
                !goal.canNudge && realTimeCooldown && realTimeCooldown > 0;
            const cooldownText = isOnCooldown
                ? formatCooldownTime(realTimeCooldown!)
                : "";
            return { isOnCooldown, cooldownText };
        }, [goal.canNudge, realTimeCooldown]);

        /**
         * Fade-in animation on mount
         * Requirement 11.3: Smooth transitions and animations
         */
        useEffect(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }, [fadeAnim, scaleAnim]);

        /**
         * Real-time cooldown countdown with visual feedback
         * Requirement 4.4: Display remaining cooldown time in real-time
         */
        useEffect(() => {
            if (!goal.cooldownRemaining || goal.cooldownRemaining <= 0) {
                setRealTimeCooldown(undefined);
                return;
            }

            setRealTimeCooldown(goal.cooldownRemaining);

            // Start pulse animation for cooldown
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(cooldownPulseAnim, {
                        toValue: 0.8,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cooldownPulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            );
            pulseAnimation.start();

            // Update countdown every minute
            const interval = setInterval(() => {
                setRealTimeCooldown((prev: number | undefined) => {
                    if (!prev || prev <= 1) {
                        pulseAnimation.stop();
                        cooldownPulseAnim.setValue(1);
                        return undefined;
                    }
                    return prev - 1;
                });
            }, 60000); // Update every minute

            return () => {
                clearInterval(interval);
                pulseAnimation.stop();
                cooldownPulseAnim.setValue(1);
            };
        }, [goal.cooldownRemaining, cooldownPulseAnim]);

        /**
         * Handle nudge button press with haptic feedback and visual feedback
         * Requirements: 3.1, 3.2, 12.4 - Send nudge with haptic feedback
         * Optimized with useCallback to prevent re-renders
         */
        const handleNudge = useCallback(async () => {
            // Add haptic feedback for nudge action
            HapticFeedback.buttonPress();

            try {
                await onNudge(goal.id, goal.ownerId);

                // Success animation - brief flash effect
                Animated.sequence([
                    Animated.timing(successFlashAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(successFlashAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            } catch (error) {
                console.error("Failed to send nudge:", error);
                // Add error haptic feedback
                HapticFeedback.error();
            }
        }, [onNudge, goal.id, goal.ownerId, successFlashAnim]);

        /**
         * Handle goal press for navigation to detail view
         * Requirement 9.1: Navigate to goal detail view when tapped
         * Optimized with useCallback to prevent re-renders
         */
        const handleGoalPress = useCallback(() => {
            HapticFeedback.selection();
            onGoalPress?.(goal.id, goal.ownerId);
        }, [onGoalPress, goal.id, goal.ownerId]);

        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                <Pressable
                    onPress={handleGoalPress}
                    style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                    })}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint={accessibilityHint}
                    accessibilityState={{
                        disabled: false,
                        busy: nudgeLoading,
                    }}
                >
                    <Card
                        variant="outlined"
                        padding="md"
                        style={{ marginBottom: spacing.sm, position: "relative" }}
                    >
                        {/* Success flash overlay */}
                        <Animated.View
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: colors.primary,
                                opacity: successFlashAnim,
                                borderRadius: 8,
                                zIndex: 1,
                            }}
                            pointerEvents="none"
                        />

                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                gap: spacing.md,
                            }}
                        >
                            {/* Status indicator - Requirements 2.1-2.4 */}
                            <View
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: statusColor,
                                    marginTop: 2,
                                }}
                                accessible={true}
                                accessibilityRole="image"
                                accessibilityLabel={`Goal status: ${goal.status.text}`}
                                accessibilityHint="Visual indicator of goal deadline status"
                            />

                            <View style={{ flex: 1, gap: spacing.xs }}>
                                {/* Goal description - Requirement 1.2 */}
                                <Text
                                    style={{
                                        fontWeight: "600",
                                        fontSize: 16,
                                        lineHeight: 24,
                                        color: colors.foreground,
                                    }}
                                >
                                    {goal.description}
                                </Text>

                                {/* Owner name and shame score - Requirements 1.2, 9.4 */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: spacing.xs,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        {goal.ownerName}
                                    </Text>
                                    {goal.ownerShameScore > 0 && (
                                        <>
                                            <Text
                                                style={{ fontSize: 14, color: colors.mutedForeground }}
                                            >
                                                •
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    color: colors.destructive,
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {goal.ownerShameScore} shame{" "}
                                                {goal.ownerShameScore === 1 ? "point" : "points"}
                                            </Text>
                                        </>
                                    )}
                                </View>

                                {/* Frequency and target days */}
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: colors.mutedForeground,
                                    }}
                                >
                                    {frequencyText}
                                </Text>

                                {/* Status text with deadline - Requirements 2.1-2.4 */}
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color:
                                            goal.status.color === "red"
                                                ? colors.destructive
                                                : goal.status.color === "yellow"
                                                    ? "#eab308" // yellow-500
                                                    : colors.mutedForeground,
                                        fontWeight: goal.status.color === "red" ? "500" : "400",
                                    }}
                                >
                                    {deadlineText}
                                </Text>

                                {/* Last completion date */}
                                {goal.latestCompletionDate && (
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Last completed:{" "}
                                        {goal.latestCompletionDate.toLocaleDateString()}
                                    </Text>
                                )}
                            </View>

                            {/* Nudge button - Requirements 3.1, 3.2, 4.4, 9.4, 12.5 */}
                            {shouldShowNudgeButton && (
                                <View style={{ alignItems: "center", gap: spacing.xs }}>
                                    <Button
                                        variant={
                                            goal.status.color === "red" ? "primary" : "secondary"
                                        }
                                        size="sm"
                                        onPress={handleNudge}
                                        loading={nudgeLoading}
                                        disabled={
                                            nudgeLoading || Boolean(cooldownState.isOnCooldown)
                                        }
                                        style={{
                                            minWidth: 44,
                                            minHeight: 44,
                                            opacity: cooldownState.isOnCooldown ? 0.6 : 1,
                                        }}
                                        accessibilityLabel={
                                            cooldownState.isOnCooldown
                                                ? AccessibilityLabels.buttonLabel(
                                                    "Nudge on cooldown",
                                                    "disabled",
                                                )
                                                : AccessibilityLabels.buttonLabel(
                                                    `Send nudge to ${goal.ownerName}`,
                                                    nudgeLoading ? "loading" : undefined,
                                                )
                                        }
                                        accessibilityHint={
                                            cooldownState.isOnCooldown
                                                ? `Wait ${cooldownState.cooldownText} before sending another nudge`
                                                : "Sends a push notification reminder to your friend"
                                        }
                                    >
                                        {cooldownState.isOnCooldown ? "WAIT" : "NUDGE"}
                                    </Button>

                                    {/* Cooldown timer - Requirement 4.4 */}
                                    {cooldownState.isOnCooldown && cooldownState.cooldownText && (
                                        <Animated.View
                                            style={{
                                                transform: [{ scale: cooldownPulseAnim }],
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: colors.mutedForeground,
                                                    textAlign: "center",
                                                    fontWeight: "500",
                                                }}
                                                accessible={true}
                                                accessibilityRole="text"
                                                accessibilityLabel={`Cooldown remaining: ${cooldownState.cooldownText}`}
                                                accessibilityLiveRegion="polite"
                                            >
                                                {cooldownState.cooldownText}
                                            </Text>
                                        </Animated.View>
                                    )}
                                </View>
                            )}
                        </View>
                    </Card>
                </Pressable>
            </Animated.View>
        );
    },
);

FriendGoalItem.displayName = "FriendGoalItem";
