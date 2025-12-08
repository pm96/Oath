import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { GoalWithOwner } from "@/services/firebase/collections";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

interface FriendGoalItemProps {
    goal: GoalWithOwner;
    onNudge: (goalId: string, ownerId: string) => Promise<void>;
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
        const overdueDays = Math.abs(diffDays);
        return overdueDays === 0
            ? "Overdue"
            : `Overdue by ${overdueDays} day${overdueDays !== 1 ? "s" : ""}`;
    } else if (diffHours < 1) {
        return "Due in less than 1 hour";
    } else if (diffHours < 24) {
        return `Due in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else {
        return `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }
}

/**
 * FriendGoalItem component with status display and nudge button
 * Requirements: 3.3, 5.1, 6.1, 6.2, 8.1
 *
 * Displays a friend's goal with:
 * - Goal description and owner name (Requirement 3.3)
 * - Status color coding (Requirement 8.2)
 * - Conditional "Nudge Now" button for Yellow/Red goals (Requirement 5.1)
 * - Owner's shame score (Requirements 6.1, 6.2)
 * - Smooth animations (Requirement 8.1)
 */
export function FriendGoalItem({ goal, onNudge }: FriendGoalItemProps) {
    const [nudging, setNudging] = React.useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
     * Handle nudge button press
     * Requirement 5.1: Send nudge to friend with Yellow/Red goal
     */
    const handleNudge = async () => {
        setNudging(true);
        try {
            await onNudge(goal.id, goal.ownerId);
        } catch (error) {
            console.error("Failed to send nudge:", error);
        } finally {
            setNudging(false);
        }
    };

    /**
     * Requirement 5.1: Display "Nudge Now" button only for Yellow/Red goals
     */
    const shouldShowNudgeButton =
        goal.currentStatus === "Yellow" || goal.currentStatus === "Red";

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            }}
        >
            <Card className="p-4 mb-3">
                <HStack space="md" className="items-start">
                    {/* Status indicator - Requirement 8.2 */}
                    <View
                        className={`w-4 h-4 rounded-full mt-1 ${getStatusColor(goal.currentStatus)}`}
                        style={{ minWidth: 16, minHeight: 16 }}
                    />

                    <VStack space="xs" className="flex-1">
                        {/* Goal description - Requirement 3.3 */}
                        <Text className="font-semibold text-base leading-6">
                            {goal.description}
                        </Text>

                        {/* Owner name and shame score - Requirements 3.3, 6.1, 6.2 */}
                        <HStack space="xs" className="items-center">
                            <Text className="text-sm text-typography-600 leading-5">
                                {goal.ownerName}
                            </Text>
                            {goal.ownerShameScore > 0 && (
                                <>
                                    <Text className="text-sm text-typography-400">•</Text>
                                    <Text className="text-sm text-error-600 font-medium leading-5">
                                        {goal.ownerShameScore} shame{" "}
                                        {goal.ownerShameScore === 1 ? "point" : "points"}
                                    </Text>
                                </>
                            )}
                        </HStack>

                        {/* Frequency and target days */}
                        <Text className="text-sm text-typography-600 leading-5">
                            {goal.frequency === "daily"
                                ? "Daily"
                                : goal.frequency === "weekly"
                                    ? `Weekly (${goal.targetDays.join(", ")})`
                                    : `3x a week (${goal.targetDays.join(", ")})`}
                        </Text>

                        {/* Deadline */}
                        <Text
                            className={`text-sm leading-5 ${goal.currentStatus === "Red"
                                    ? "text-error-600 font-medium"
                                    : "text-typography-500"
                                }`}
                        >
                            {formatDeadline(goal.nextDeadline)}
                        </Text>

                        {/* Last completion date */}
                        {goal.latestCompletionDate && (
                            <Text className="text-xs text-typography-400 leading-4">
                                Last completed: {goal.latestCompletionDate.toLocaleDateString()}
                            </Text>
                        )}
                    </VStack>

                    {/* Nudge button - Requirement 5.1: Only show for Yellow/Red goals */}
                    {/* Requirement 8.3: Touch targets at least 44x44 pixels */}
                    {shouldShowNudgeButton && (
                        <Button
                            size="sm"
                            onPress={handleNudge}
                            disabled={nudging}
                            action={goal.currentStatus === "Red" ? "negative" : "secondary"}
                            style={{ minWidth: 44, minHeight: 44 }}
                        >
                            <ButtonText>{nudging ? "..." : "Nudge Now"}</ButtonText>
                        </Button>
                    )}
                </HStack>
            </Card>
        </Animated.View>
    );
}
