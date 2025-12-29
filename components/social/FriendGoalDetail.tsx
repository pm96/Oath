import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Text } from "@/components/ui/Text";
import { HStack, VStack } from "@/components/ui/Stack";
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
    onHighFive: (goalId: string) => void;
    onClose: () => void;
    nudgeLoading?: boolean;
}

function formatCooldownTime(minutes: number): string {
    if (minutes <= 0) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function getStatusColorFromStatus(status: { color: "green" | "yellow" | "red" }): string {
    switch (status.color) {
        case "green": return "#22c55e";
        case "yellow": return "#eab308";
        case "red": return "#ef4444";
        default: return "#6b7280";
    }
}

function formatFrequency(goal: GoalWithOwnerAndStatus): string {
    switch (goal.frequency) {
        case "daily": return "Daily";
        case "weekly": return `Weekly (${goal.targetDays.join(", ")})`;
        case "3x_a_week": return `3x a week (${goal.targetDays.join(", ")})`;
        default: return "Unknown";
    }
}

function formatCompletionHistory(goal: GoalWithOwnerAndStatus): string {
    if (!goal.latestCompletionDate) return "Never completed";
    const now = new Date();
    const completion = goal.latestCompletionDate;
    const diffTime = now.getTime() - completion.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Completed today";
    if (diffDays === 1) return "Completed yesterday";
    return `Last completed ${diffDays} days ago`;
}

export function FriendGoalDetail({
    goal,
    visible,
    currentUserId,
    onNudge,
    onHighFive,
    onClose,
    nudgeLoading = false,
}: FriendGoalDetailProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const modalRef = useRef<View>(null);

    useEffect(() => {
        if (visible && goal) {
            AccessibilityInfo.announceForAccessibility(`Goal details opened for ${goal.ownerName}'s goal: ${goal.description}`);
        }
    }, [visible, goal]);

    if (!goal) return null;

    const isHighFived = (goal.highFives || []).includes(currentUserId);
    const highFiveCount = (goal.highFives || []).length;

    const handleHighFive = () => {
        HapticFeedback.selection();
        onHighFive(goal.id);
    };

    const handleNudge = async () => {
        HapticFeedback.buttonPress();
        try {
            await onNudge(goal.id, goal.ownerId);
        } catch (error) {
            console.error("Failed to send nudge:", error);
            HapticFeedback.error();
        }
    };

    const shouldShowNudgeButton = goal.status.showNudge && goal.ownerId !== currentUserId;
    const isOnCooldown = !goal.canNudge && goal.cooldownRemaining && goal.cooldownRemaining > 0;
    const cooldownText = isOnCooldown ? formatCooldownTime(goal.cooldownRemaining!) : "";

    return (
        <Modal visible={visible} onClose={onClose} title={`${goal.ownerName}'s Goal`} size="lg">
            <View ref={modalRef} accessible={true} accessibilityLabel={`Goal details for ${goal.ownerName}: ${goal.description}`}>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={{ fontSize: 20, fontWeight: "600", color: colors.foreground, lineHeight: 28, marginBottom: spacing.sm }}>
                            {goal.description}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: getStatusColorFromStatus(goal.status) }} />
                            <Text style={{ fontSize: 16, fontWeight: "500", color: goal.status.color === "red" ? colors.destructive : goal.status.color === "yellow" ? "#eab308" : colors.foreground }}>
                                {goal.status.text}
                            </Text>
                        </View>
                    </View>

                    {/* High Five Section */}
                    <View style={{ backgroundColor: isHighFived ? colors.primary + '15' : colors.muted, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.lg, borderColor: isHighFived ? colors.primary : 'transparent', borderWidth: 1 }}>
                        <HStack justify="space-between" align="center">
                            <VStack spacing="xs">
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Support your friend</Text>
                                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
                                    {highFiveCount === 0 ? "Be the first to high-five!" : `${highFiveCount} high-five${highFiveCount !== 1 ? 's' : ''} received`}
                                </Text>
                            </VStack>
                            <Button variant={isHighFived ? "primary" : "outline"} size="sm" onPress={handleHighFive} style={{ borderRadius: 20, minWidth: 100 }}>
                                <HStack spacing="xs" align="center">
                                    <Text style={{ fontSize: 16 }}>✋</Text>
                                    <Text style={{ color: isHighFived ? colors.primaryForeground : colors.primary }}>
                                        {isHighFived ? "High-fived" : "High-five"}
                                    </Text>
                                </HStack>
                            </Button>
                        </HStack>
                    </View>

                    <View style={{ backgroundColor: colors.muted, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: spacing.md }}>Goal Details</Text>
                        <VStack spacing="sm">
                            <View><Text style={{ fontSize: 14, color: colors.mutedForeground }}>Frequency</Text><Text style={{ fontSize: 16, color: colors.foreground }}>{formatFrequency(goal)}</Text></View>
                            <View><Text style={{ fontSize: 14, color: colors.mutedForeground }}>Next Deadline</Text><Text style={{ fontSize: 16, color: colors.foreground }}>{goal.nextDeadline.toLocaleString()}</Text></View>
                            <View><Text style={{ fontSize: 14, color: colors.mutedForeground }}>Completion History</Text><Text style={{ fontSize: 16, color: colors.foreground }}>{formatCompletionHistory(goal)}</Text></View>
                        </VStack>
                    </View>

                    {shouldShowNudgeButton && (
                        <Button variant={goal.status.color === "red" ? "primary" : "secondary"} size="lg" onPress={handleNudge} loading={nudgeLoading} disabled={nudgeLoading || Boolean(isOnCooldown)} style={{ width: "100%", minHeight: 56 }}>
                            {isOnCooldown ? `WAIT ${cooldownText}` : `NUDGE ${goal.ownerName.toUpperCase()}`}
                        </Button>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}