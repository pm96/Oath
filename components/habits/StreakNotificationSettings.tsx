import {
    Body,
    Button,
    Caption,
    Card,
    Heading,
    HStack,
    LoadingSkeleton,
} from "@/components/ui";
import { VStack } from "@/components/ui/Stack";
import { useStreakNotifications } from "@/hooks/useStreakNotifications";
import { useThemeStyles } from "@/hooks/useTheme";
import { NotificationPreferences } from "@/services/firebase/streakNotificationService";
import { HapticFeedback } from "@/utils/celebrations";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import {
    Bell,
    BellOff,
    Calendar,
    Clock,
    Heart,
    Shield,
    TrendingUp,
} from "lucide-react-native";
import React, { useCallback } from "react";
import { Switch, View } from "react-native";

export interface StreakNotificationSettingsProps {
    onClose?: () => void;
}

/**
 * Streak Notification Settings Component
 *
 * Allows users to configure their streak notification preferences
 * Requirements: 11.5
 */
export function StreakNotificationSettings({
    onClose,
}: StreakNotificationSettingsProps) {
    const { colors, spacing } = useThemeStyles();
    const {
        preferences,
        loading,
        error,
        toggleNotificationType,
        updateReminderTime,
    } = useStreakNotifications();

    // Handle toggle notification type
    const handleToggle = useCallback(
        async (type: keyof NotificationPreferences, enabled: boolean) => {
            if (!preferences) return;

            try {
                HapticFeedback.selection();
                const success = await toggleNotificationType(type, enabled);

                if (success) {
                    showSuccessToast(
                        `${getNotificationTypeLabel(type)} ${enabled ? "enabled" : "disabled"}`,
                        "Notification preferences updated",
                    );
                } else {
                    showErrorToast(
                        "Failed to update notification preferences",
                        "Please try again",
                    );
                }
            } catch (err) {
                console.error("Error toggling notification:", err);
                showErrorToast(
                    "Failed to update notification preferences",
                    "Please try again",
                );
            }
        },
        [preferences, toggleNotificationType],
    );

    // Handle reminder time change
    const handleReminderTimeChange = useCallback(
        async (hours: number) => {
            try {
                HapticFeedback.selection();
                const success = await updateReminderTime(hours);

                if (success) {
                    showSuccessToast(
                        `Reminder time set to ${hours} hours before day end`,
                        "Notification preferences updated",
                    );
                } else {
                    showErrorToast("Failed to update reminder time", "Please try again");
                }
            } catch (err) {
                console.error("Error updating reminder time:", err);
                showErrorToast("Failed to update reminder time", "Please try again");
            }
        },
        [updateReminderTime],
    );

    // Loading state
    if (loading) {
        return (
            <VStack spacing="md" style={{ padding: spacing.lg }}>
                <HStack align="center" justify="space-between">
                    <Heading size="md">Notification Settings</Heading>
                    {onClose && (
                        <Button variant="ghost" size="sm" onPress={onClose}>
                            Done
                        </Button>
                    )}
                </HStack>

                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} variant="outlined" padding="md">
                        <HStack align="center" justify="space-between">
                            <HStack align="center" spacing="sm">
                                <LoadingSkeleton width={24} height={24} borderRadius={12} />
                                <VStack spacing="xs">
                                    <LoadingSkeleton height={16} width="60%" />
                                    <LoadingSkeleton height={12} width="80%" />
                                </VStack>
                            </HStack>
                            <LoadingSkeleton width={50} height={30} borderRadius={15} />
                        </HStack>
                    </Card>
                ))}
            </VStack>
        );
    }

    // Error state
    if (error) {
        return (
            <VStack spacing="md" style={{ padding: spacing.lg }}>
                <HStack align="center" justify="space-between">
                    <Heading size="md">Notification Settings</Heading>
                    {onClose && (
                        <Button variant="ghost" size="sm" onPress={onClose}>
                            Done
                        </Button>
                    )}
                </HStack>

                <Card variant="outlined" padding="lg">
                    <VStack align="center" spacing="md">
                        <BellOff size={48} color={colors.mutedForeground} />
                        <Body color="destructive" align="center">
                            Failed to load notification settings
                        </Body>
                        <Caption color="muted" align="center">
                            {error}
                        </Caption>
                    </VStack>
                </Card>
            </VStack>
        );
    }

    if (!preferences) {
        return null;
    }

    return (
        <VStack spacing="md" style={{ padding: spacing.lg }}>
            {/* Header */}
            <HStack align="center" justify="space-between">
                <Heading size="md">Notification Settings</Heading>
                {onClose && (
                    <Button variant="ghost" size="sm" onPress={onClose}>
                        Done
                    </Button>
                )}
            </HStack>

            <Caption color="muted">
                Customize when and how you receive streak notifications
            </Caption>

            {/* Streak Reminders */}
            <Card variant="outlined" padding="md">
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm" style={{ flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: `${colors.primary}20`,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Bell size={20} color={colors.primary} />
                        </View>
                        <VStack style={{ flex: 1 }} spacing="xs">
                            <Body weight="semibold">Streak Risk Reminders</Body>
                            <Caption color="muted">
                                Get reminded when you haven&apos;t completed a habit and risk
                                breaking your streak
                            </Caption>
                        </VStack>
                    </HStack>
                    <Switch
                        value={preferences.streakReminders}
                        onValueChange={(enabled) =>
                            handleToggle("streakReminders", enabled)
                        }
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor={colors.background}
                    />
                </HStack>
            </Card>

            {/* Reminder Time Setting */}
            {preferences.streakReminders && (
                <Card variant="outlined" padding="md">
                    <VStack spacing="sm">
                        <HStack align="center" spacing="sm">
                            <Clock size={20} color={colors.mutedForeground} />
                            <Body weight="semibold">Reminder Time</Body>
                        </HStack>
                        <Caption color="muted">
                            How many hours before day end should we remind you?
                        </Caption>

                        <HStack spacing="sm" style={{ flexWrap: "wrap" }}>
                            {[1, 2, 3, 4, 6].map((hours) => (
                                <Button
                                    key={hours}
                                    variant={
                                        preferences.reminderTime === hours ? "primary" : "outline"
                                    }
                                    size="sm"
                                    onPress={() => handleReminderTimeChange(hours)}
                                    style={{ minWidth: 60 }}
                                >
                                    <Caption
                                        color={
                                            preferences.reminderTime === hours
                                                ? "primary"
                                                : "foreground"
                                        }
                                        weight="medium"
                                    >
                                        {hours}h
                                    </Caption>
                                </Button>
                            ))}
                        </HStack>
                    </VStack>
                </Card>
            )}

            {/* Milestone Notifications */}
            <Card variant="outlined" padding="md">
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm" style={{ flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#FFD70020",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Heart size={20} color="#FFD700" />
                        </View>
                        <VStack style={{ flex: 1 }} spacing="xs">
                            <Body weight="semibold">Milestone Celebrations</Body>
                            <Caption color="muted">
                                Get celebrated when you reach streak milestones (7, 30, 100+
                                days)
                            </Caption>
                        </VStack>
                    </HStack>
                    <Switch
                        value={preferences.milestoneNotifications}
                        onValueChange={(enabled) =>
                            handleToggle("milestoneNotifications", enabled)
                        }
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor={colors.background}
                    />
                </HStack>
            </Card>

            {/* Recovery Notifications */}
            <Card variant="outlined" padding="md">
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm" style={{ flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#FF6B6B20",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Shield size={20} color="#FF6B6B" />
                        </View>
                        <VStack style={{ flex: 1 }} spacing="xs">
                            <Body weight="semibold">Recovery Motivation</Body>
                            <Caption color="muted">
                                Get encouraging messages when you break a streak to help you
                                restart
                            </Caption>
                        </VStack>
                    </HStack>
                    <Switch
                        value={preferences.recoveryNotifications}
                        onValueChange={(enabled) =>
                            handleToggle("recoveryNotifications", enabled)
                        }
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor={colors.background}
                    />
                </HStack>
            </Card>

            {/* Weekly Progress */}
            <Card variant="outlined" padding="md">
                <HStack align="center" justify="space-between">
                    <HStack align="center" spacing="sm" style={{ flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#10B98120",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <TrendingUp size={20} color="#10B981" />
                        </View>
                        <VStack style={{ flex: 1 }} spacing="xs">
                            <Body weight="semibold">Weekly Progress Updates</Body>
                            <Caption color="muted">
                                Get weekly summaries of your long streaks (14+ days) every
                                Sunday
                            </Caption>
                        </VStack>
                    </HStack>
                    <Switch
                        value={preferences.weeklyProgress}
                        onValueChange={(enabled) => handleToggle("weeklyProgress", enabled)}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor={colors.background}
                    />
                </HStack>
            </Card>

            {/* Info Card */}
            <Card
                variant="outlined"
                padding="md"
                style={{ backgroundColor: `${colors.primary}05` }}
            >
                <VStack spacing="sm">
                    <HStack align="center" spacing="sm">
                        <Calendar size={16} color={colors.primary} />
                        <Caption color="primary" weight="semibold">
                            About Streak Notifications
                        </Caption>
                    </HStack>
                    <Caption color="muted">
                        Notifications help you stay consistent with your habits. You can
                        always change these settings later in your profile.
                    </Caption>
                </VStack>
            </Card>
        </VStack>
    );
}

// Helper function to get notification type labels
function getNotificationTypeLabel(type: string): string {
    switch (type) {
        case "streakReminders":
            return "Streak reminders";
        case "milestoneNotifications":
            return "Milestone celebrations";
        case "recoveryNotifications":
            return "Recovery motivation";
        case "weeklyProgress":
            return "Weekly progress updates";
        default:
            return "Notifications";
    }
}
