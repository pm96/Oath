import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/Stack";
import { Text } from "@/components/ui/Text";
import { GoalWithStreak } from "@/hooks/useGoals";
import { HapticFeedback, createSuccessAnimation } from "@/utils/celebrations";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    GestureResponderEvent,
    TouchableOpacity,
    View,
} from "react-native";

interface GoalItemProps {
    goal: GoalWithStreak;
    onComplete: (goalId: string) => Promise<void>;
    showOwner?: boolean;
    ownerName?: string;
    onCelebrate?: () => void; // Callback to trigger celebration
}

/**
 * Get status color based on goal status
 * Requirement 8.2: Consistent color coding (Green/Yellow/Red)
 */
function getStatusColor(status: "Green" | "Yellow" | "Red"): string {
    switch (status) {
        case "Green":
            return "bg-success-500";
        case "Yellow":
            return "bg-warning-500";
        case "Red":
            return "bg-error-500";
        default:
            return "bg-background-300";
    }
}

/**
 * Format deadline for display
 */
function formatDeadline(deadline: Date): string {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
        return "Overdue";
    } else if (diffHours < 1) {
        return "Due in less than 1 hour";
    } else if (diffHours < 24) {
        return `Due in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else {
        return `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }
}

/**
 * GoalItem component with completion button and status display
 * Requirements: 2.5, 8.2, 8.1
 *
 * Includes smooth fade-in animation for better UX
 */
export function GoalItem({
    goal,
    onComplete,
    showOwner,
    ownerName,
    onCelebrate,
}: GoalItemProps) {
    const [loading, setLoading] = React.useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const successAnim = useRef(new Animated.Value(1)).current;

    /**
     * Fade-in animation on mount
     * Requirement 8.1: Implement smooth transitions and animations
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
     * Handle navigation to habit detail screen
     */
    const handleNavigateToDetail = () => {
        router.push({
            pathname: "/habit-detail",
            params: {
                habitId: goal.id,
                habitName: goal.description,
            },
        });
    };

    /**
     * Handle goal completion with celebration
     * Requirements: 3.2, 7.4 - Success animations and haptic feedback
     */
    const handleComplete = async () => {
        setLoading(true);
        try {
            // Trigger success animation
            createSuccessAnimation(successAnim).start();

            // Haptic feedback for success
            HapticFeedback.success();

            await onComplete(goal.id);

            // Trigger celebration callback if provided
            if (onCelebrate) {
                setTimeout(() => {
                    onCelebrate();
                }, 200);
            }
        } catch (error) {
            console.error("Failed to complete goal:", error);
            // Error haptic feedback
            HapticFeedback.error();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [
                    { scale: scaleAnim },
                    { scale: successAnim }, // Add success animation scale
                ],
            }}
        >
            <TouchableOpacity onPress={handleNavigateToDetail} activeOpacity={0.7}>
                <Card>
                    <HStack space="md">
                        {/* Status indicator - Requirement 8.2 */}
                        <View
                            className={`w-4 h-4 rounded-full mt-1 ${getStatusColor(goal.currentStatus)}`}
                            style={{ minWidth: 16, minHeight: 16 }}
                        />

                        <VStack spacing="xs">
                            {/* Goal description */}
                            <Text>{goal.description}</Text>

                            {/* Owner name if showing friends' goals */}
                            {showOwner && ownerName && <Text>{ownerName}</Text>}

                            {/* Frequency and target days */}
                            <Text>
                                {goal.frequency === "daily"
                                    ? "Daily"
                                    : goal.frequency === "weekly"
                                        ? `Weekly (${goal.targetDays.join(", ")})`
                                        : `3x a week (${goal.targetDays.join(", ")})`}
                            </Text>

                            {/* Deadline */}
                            <Text>{formatDeadline(goal.nextDeadline)}</Text>

                            {/* Last completion date */}
                            {goal.latestCompletionDate && (
                                <Text>
                                    Last completed:{" "}
                                    {goal.latestCompletionDate.toLocaleDateString()}
                                </Text>
                            )}

                            {/* Streak information */}
                            {goal.currentStreakCount !== undefined &&
                                goal.currentStreakCount > 0 && (
                                    <HStack space="sm">
                                        <Text>🔥 {goal.currentStreakCount} day streak</Text>
                                        {goal.bestStreakCount !== undefined &&
                                            goal.bestStreakCount > goal.currentStreakCount && (
                                                <Text>(Best: {goal.bestStreakCount})</Text>
                                            )}
                                    </HStack>
                                )}

                            {/* Difficulty indicator */}
                            <HStack space="sm">
                                <Text>
                                    Difficulty:{" "}
                                    {goal.difficulty === "easy"
                                        ? "Easy (1x)"
                                        : goal.difficulty === "medium"
                                            ? "Medium (1.5x)"
                                            : "Hard (2x)"}
                                </Text>
                            </HStack>
                        </VStack>

                        {/* Completion button - only show for own goals */}
                        {/* Requirement 8.3: Touch targets at least 44x44 pixels */}
                        {!showOwner && (
                            <Button
                                size="sm"
                                onPress={(e?: GestureResponderEvent) => {
                                    if (e) {
                                        e.stopPropagation();
                                    }
                                    handleComplete();
                                }}
                                disabled={loading}
                                style={{ minWidth: 44, minHeight: 44 }}
                            >
                                {loading
                                    ? "..."
                                    : goal.currentStatus === "Green"
                                        ? "✓"
                                        : "Complete"}
                            </Button>
                        )}
                    </HStack>
                </Card>
            </TouchableOpacity>
        </Animated.View>
    );
}
