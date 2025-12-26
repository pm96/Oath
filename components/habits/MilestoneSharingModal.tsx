import {
    Body,
    Button,
    Card,
    Heading,
    HStack,
    Input,
    Modal,
} from "@/components/ui";
import { VStack } from "@/components/ui/Stack";
import { useStreakSocial } from "@/hooks/useStreakSocial";
import { useThemeStyles } from "@/hooks/useTheme";
import { StreakMilestone } from "@/types/habit-streaks";
import { HapticFeedback } from "@/utils/celebrations";
import { Share2, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";

export interface MilestoneSharingModalProps {
    visible: boolean;
    onClose: () => void;
    habitId: string;
    habitDescription: string;
    milestone: StreakMilestone;
    userId: string;
}

/**
 * Modal for sharing milestone achievements with friends
 * Requirements: 8.1, 8.2
 */
export function MilestoneSharingModal({
    visible,
    onClose,
    habitId,
    habitDescription,
    milestone,
    userId,
}: MilestoneSharingModalProps) {
    const { colors, spacing } = useThemeStyles();
    const { createMilestonePost, creatingPost } = useStreakSocial(userId);
    const [customMessage, setCustomMessage] = useState("");

    // Generate default message
    const defaultMessage = `🔥 Just hit a ${milestone.days}-day streak on "${habitDescription}"! ${getMilestoneEmoji(milestone.days)}`;

    /**
     * Handle sharing the milestone
     */
    const handleShare = useCallback(async () => {
        HapticFeedback.selection();

        const success = await createMilestonePost(
            habitId,
            habitDescription,
            milestone,
            customMessage.trim() || undefined,
        );

        if (success) {
            onClose();
            setCustomMessage(""); // Reset for next time
        }
    }, [
        createMilestonePost,
        habitId,
        habitDescription,
        milestone,
        customMessage,
        onClose,
    ]);

    /**
     * Handle closing the modal
     */
    const handleClose = useCallback(() => {
        HapticFeedback.selection();
        onClose();
        setCustomMessage(""); // Reset message
    }, [onClose]);

    /**
     * Get milestone badge info
     */
    const getBadgeInfo = useCallback((days: number) => {
        switch (days) {
            case 7:
                return { title: "Week Warrior", emoji: "🥉", color: "#CD7F32" };
            case 30:
                return { title: "Month Master", emoji: "🥈", color: "#C0C0C0" };
            case 60:
                return { title: "Consistency Champion", emoji: "🥇", color: "#FFD700" };
            case 100:
                return { title: "Century Achiever", emoji: "💎", color: "#B9F2FF" };
            case 365:
                return { title: "Year Legend", emoji: "👑", color: "#FFD700" };
            default:
                return { title: `${days} Day Streak`, emoji: "🏆", color: "#FFD700" };
        }
    }, []);

    const badgeInfo = getBadgeInfo(milestone.days);

    return (
        <Modal visible={visible} onClose={handleClose} size="lg">
            <VStack spacing="lg" style={{ padding: spacing.lg }}>
                {/* Header */}
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm">
                        <Share2 size={24} color={colors.primary} />
                        <Heading size="lg">Share Achievement</Heading>
                    </HStack>
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={handleClose}
                        style={{ padding: spacing.xs }}
                    >
                        <X size={20} color={colors.mutedForeground} />
                    </Button>
                </HStack>

                {/* Milestone Badge */}
                <Card
                    variant="outlined"
                    padding="lg"
                    style={{
                        backgroundColor: `${badgeInfo.color}15`,
                        borderColor: badgeInfo.color,
                    }}
                >
                    <VStack align="center" spacing="md">
                        <Body size="xl" style={{ fontSize: 48 }}>
                            {badgeInfo.emoji}
                        </Body>
                        <Heading size="lg" align="center" color="primary">
                            {badgeInfo.title}
                        </Heading>
                        <Body size="lg" align="center" weight="semibold">
                            {milestone.days} Day Streak!
                        </Body>
                        <Body align="center" color="muted">
                            {habitDescription}
                        </Body>
                    </VStack>
                </Card>

                {/* Message Input */}
                <VStack spacing="sm">
                    <Body weight="semibold">Share with your friends:</Body>
                    <Input
                        placeholder={defaultMessage}
                        value={customMessage}
                        onChangeText={setCustomMessage}
                        multiline
                        numberOfLines={3}
                        inputStyle={{
                            minHeight: 80,
                            textAlignVertical: "top",
                        }}
                    />
                    <Body size="sm" color="muted">
                        Leave blank to use the default message
                    </Body>
                </VStack>

                {/* Preview */}
                <VStack spacing="sm">
                    <Body weight="semibold">Preview:</Body>
                    <Card variant="outlined" padding="md">
                        <Body>{customMessage.trim() || defaultMessage}</Body>
                    </Card>
                </VStack>

                {/* Action Buttons */}
                <HStack spacing="md" style={{ marginTop: spacing.md }}>
                    <Button
                        variant="outline"
                        onPress={handleClose}
                        style={{ flex: 1 }}
                        disabled={creatingPost}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onPress={handleShare}
                        loading={creatingPost}
                        style={{ flex: 1 }}
                    >
                        Share Achievement
                    </Button>
                </HStack>
            </VStack>
        </Modal>
    );
}

/**
 * Get milestone emoji based on days
 */
function getMilestoneEmoji(days: number): string {
    switch (days) {
        case 7:
            return "🥉";
        case 30:
            return "🥈";
        case 60:
            return "🥇";
        case 100:
            return "💎";
        case 365:
            return "👑";
        default:
            return "🏆";
    }
}
