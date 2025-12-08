import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Goal } from "@/services/firebase/collections";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

interface GoalItemProps {
    goal: Goal;
    onComplete: (goalId: string) => Promise<void>;
    showOwner?: boolean;
    ownerName?: string;
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
}: GoalItemProps) {
    const [loading, setLoading] = React.useState(false);
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
     * Handle goal completion
     * Requirement 2.5: Mark goal as complete
     */
    const handleComplete = async () => {
        setLoading(true);
        try {
            await onComplete(goal.id);
        } catch (error) {
            console.error("Failed to complete goal:", error);
        } finally {
            setLoading(false);
        }
    };

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
                        {/* Goal description */}
                        <Text className="font-semibold text-base leading-6">
                            {goal.description}
                        </Text>

                        {/* Owner name if showing friends' goals */}
                        {showOwner && ownerName && (
                            <Text className="text-sm text-typography-500 leading-5">
                                {ownerName}
                            </Text>
                        )}

                        {/* Frequency and target days */}
                        <Text className="text-sm text-typography-600 leading-5">
                            {goal.frequency === "daily"
                                ? "Daily"
                                : goal.frequency === "weekly"
                                    ? `Weekly (${goal.targetDays.join(", ")})`
                                    : `3x a week (${goal.targetDays.join(", ")})`}
                        </Text>

                        {/* Deadline */}
                        <Text className="text-sm text-typography-500 leading-5">
                            {formatDeadline(goal.nextDeadline)}
                        </Text>

                        {/* Last completion date */}
                        {goal.latestCompletionDate && (
                            <Text className="text-xs text-typography-400 leading-4">
                                Last completed: {goal.latestCompletionDate.toLocaleDateString()}
                            </Text>
                        )}
                    </VStack>

                    {/* Completion button - only show for own goals */}
                    {/* Requirement 8.3: Touch targets at least 44x44 pixels */}
                    {!showOwner && (
                        <Button
                            size="sm"
                            onPress={handleComplete}
                            disabled={loading}
                            action={goal.currentStatus === "Green" ? "positive" : "primary"}
                            style={{ minWidth: 44, minHeight: 44 }}
                        >
                            <ButtonText>
                                {loading
                                    ? "..."
                                    : goal.currentStatus === "Green"
                                        ? "✓"
                                        : "Complete"}
                            </ButtonText>
                        </Button>
                    )}
                </HStack>
            </Card>
        </Animated.View>
    );
}
