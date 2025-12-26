import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { HabitStreak, MILESTONE_DAYS } from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

export interface StreakMilestonesProps {
    streak: HabitStreak | null;
    habitName?: string;
    style?: ViewStyle;
    showProgress?: boolean;
    compact?: boolean;
}

/**
 * StreakMilestones Component
 *
 * Displays milestone badges with achievement dates and progress indicators
 * Requirements: 3.4 - Milestone badge display with dates achieved
 */
export function StreakMilestones({
    streak,
    habitName,
    style,
    showProgress = true,
    compact = false,
}: StreakMilestonesProps) {
    const { colors, spacing, borderRadius, typography } = useThemeStyles();

    const getMilestoneBadgeType = (
        days: number,
    ): "bronze" | "silver" | "gold" | "platinum" | "diamond" => {
        if (days >= 365) return "diamond";
        if (days >= 100) return "platinum";
        if (days >= 60) return "gold";
        if (days >= 30) return "silver";
        return "bronze";
    };

    const getBadgeColor = (
        type: "bronze" | "silver" | "gold" | "platinum" | "diamond",
    ): string => {
        switch (type) {
            case "bronze":
                return "#CD7F32";
            case "silver":
                return "#C0C0C0";
            case "gold":
                return "#FFD700";
            case "platinum":
                return "#E5E4E2";
            case "diamond":
                return "#B9F2FF";
            default:
                return colors.muted;
        }
    };

    const getMilestoneEmoji = (days: number): string => {
        if (days >= 365) return "💎";
        if (days >= 100) return "🏆";
        if (days >= 60) return "🥇";
        if (days >= 30) return "🥈";
        if (days >= 7) return "🥉";
        return "🎯";
    };

    const getNextMilestone = (currentStreak: number): number | null => {
        for (const milestone of MILESTONE_DAYS) {
            if (currentStreak < milestone) {
                return milestone;
            }
        }
        return null;
    };

    const getMilestoneProgress = (
        currentStreak: number,
        targetMilestone: number,
    ) => {
        const progress = Math.min(currentStreak / targetMilestone, 1);
        return {
            progress,
            percentage: Math.round(progress * 100),
            remaining: Math.max(targetMilestone - currentStreak, 0),
        };
    };

    if (!streak) {
        return (
            <Card variant="outlined" style={{ padding: spacing.md, ...style }}>
                <View style={{ alignItems: "center" }}>
                    {habitName && (
                        <Text
                            style={{
                                fontSize: compact ? typography.sizes.md : typography.sizes.lg,
                                fontWeight: "600",
                                color: colors.foreground,
                                marginBottom: spacing.sm,
                                textAlign: "center",
                            }}
                        >
                            {habitName} Milestones
                        </Text>
                    )}
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        No milestone data available
                    </Text>
                </View>
            </Card>
        );
    }

    const achievedMilestones = streak.milestones.sort((a, b) => a.days - b.days);
    const nextMilestone = getNextMilestone(streak.currentStreak);
    const nextProgress = nextMilestone
        ? getMilestoneProgress(streak.currentStreak, nextMilestone)
        : null;

    return (
        <Card
            variant="elevated"
            style={{ padding: compact ? spacing.sm : spacing.md, ...style }}
        >
            {habitName && (
                <Text
                    style={{
                        fontSize: compact ? typography.sizes.md : typography.sizes.lg,
                        fontWeight: "600",
                        color: colors.foreground,
                        marginBottom: spacing.md,
                        textAlign: "center",
                    }}
                >
                    {habitName} Milestones
                </Text>
            )}

            {/* Achieved Milestones */}
            {achievedMilestones.length > 0 ? (
                <View>
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Achieved Milestones
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: spacing.xs }}
                    >
                        {achievedMilestones.map((milestone) => {
                            const badgeType = getMilestoneBadgeType(milestone.days);
                            const badgeColor = getBadgeColor(badgeType);
                            const emoji = getMilestoneEmoji(milestone.days);

                            return (
                                <View
                                    key={milestone.days}
                                    style={{
                                        alignItems: "center",
                                        marginHorizontal: spacing.sm,
                                        minWidth: compact ? 60 : 80,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: compact ? 50 : 60,
                                            height: compact ? 50 : 60,
                                            borderRadius: compact ? 25 : 30,
                                            backgroundColor: badgeColor,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginBottom: spacing.xs,
                                            shadowColor: badgeColor,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                            elevation: 3,
                                        }}
                                    >
                                        <Text style={{ fontSize: compact ? 20 : 24 }}>{emoji}</Text>
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: compact ? 12 : 14,
                                            fontWeight: "bold",
                                            color: colors.foreground,
                                            textAlign: "center",
                                        }}
                                    >
                                        {milestone.days} Days
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: compact ? 10 : 12,
                                            color: colors.mutedForeground,
                                            textAlign: "center",
                                        }}
                                    >
                                        {milestone.achievedAt.toDate().toLocaleDateString()}
                                    </Text>
                                    {!milestone.celebrated && (
                                        <View
                                            style={{
                                                backgroundColor: colors.warning,
                                                borderRadius: borderRadius.sm,
                                                paddingHorizontal: spacing.xs,
                                                paddingVertical: 2,
                                                marginTop: spacing.xs / 2,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 8,
                                                    color: colors.warningForeground,
                                                    fontWeight: "600",
                                                }}
                                            >
                                                NEW!
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : (
                <View style={{ alignItems: "center", marginBottom: spacing.md }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        No milestones achieved yet
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.sizes.xs,
                            color: colors.mutedForeground,
                            textAlign: "center",
                            marginTop: spacing.xs / 2,
                        }}
                    >
                        Keep building your streak to earn badges!
                    </Text>
                </View>
            )}

            {/* Next Milestone Progress */}
            {showProgress && nextMilestone && nextProgress && (
                <View
                    style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Next Milestone
                    </Text>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: spacing.sm,
                        }}
                    >
                        <View
                            style={{
                                width: compact ? 30 : 40,
                                height: compact ? 30 : 40,
                                borderRadius: compact ? 15 : 20,
                                backgroundColor: colors.muted,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: spacing.sm,
                            }}
                        >
                            <Text style={{ fontSize: compact ? 16 : 20 }}>
                                {getMilestoneEmoji(nextMilestone)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    fontSize: compact ? 12 : 14,
                                    fontWeight: "600",
                                    color: colors.foreground,
                                }}
                            >
                                {nextMilestone} Day Milestone
                            </Text>
                            <Text
                                style={{
                                    fontSize: compact ? 10 : 12,
                                    color: colors.mutedForeground,
                                }}
                            >
                                {nextProgress.remaining} days remaining
                            </Text>
                        </View>
                        <Text
                            style={{
                                fontSize: compact ? 12 : 14,
                                fontWeight: "bold",
                                color: colors.primary,
                            }}
                        >
                            {nextProgress.percentage}%
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View
                        style={{
                            height: compact ? 6 : 8,
                            backgroundColor: colors.muted,
                            borderRadius: compact ? 3 : 4,
                            overflow: "hidden",
                        }}
                    >
                        <View
                            style={{
                                height: "100%",
                                width: `${nextProgress.percentage}%`,
                                backgroundColor: colors.primary,
                                borderRadius: compact ? 3 : 4,
                            }}
                        />
                    </View>
                </View>
            )}

            {/* All Milestones Overview */}
            {!compact && (
                <View
                    style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Milestone Targets
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                        }}
                    >
                        {MILESTONE_DAYS.map((days) => {
                            const isAchieved = achievedMilestones.some(
                                (m) => m.days === days,
                            );
                            const isCurrent = nextMilestone === days;

                            return (
                                <View
                                    key={days}
                                    style={{
                                        alignItems: "center",
                                        width: "18%",
                                        marginBottom: spacing.sm,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: isAchieved
                                                ? getBadgeColor(getMilestoneBadgeType(days))
                                                : isCurrent
                                                    ? colors.primary
                                                    : colors.muted,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginBottom: spacing.xs / 2,
                                        }}
                                    >
                                        {isAchieved ? (
                                            <Text style={{ fontSize: 12 }}>✓</Text>
                                        ) : isCurrent ? (
                                            <Text style={{ fontSize: 12 }}>🎯</Text>
                                        ) : (
                                            <Text style={{ fontSize: 12 }}>○</Text>
                                        )}
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: isAchieved
                                                ? colors.foreground
                                                : colors.mutedForeground,
                                            fontWeight: isAchieved ? "600" : "normal",
                                            textAlign: "center",
                                        }}
                                    >
                                        {days}d
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </Card>
    );
}
