import React, { useRef } from "react";
import { View, ViewStyle } from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { HabitStreak } from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

export interface StreakDisplayProps {
    streak: HabitStreak | null;
    habitName?: string;
    showFreezes?: boolean;
    style?: ViewStyle;
    size?: "compact" | "default" | "large";
    enableCelebrations?: boolean;
    onStreakUpdate?: (newStreak: number, oldStreak: number) => void;
}

/**
 * StreakDisplay Component
 *
 * Displays current and best streak indicators with fire emoji indicators
 * Requirements: 1.4 - Streak display completeness
 */
export function StreakDisplay({
    streak,
    habitName,
    showFreezes = true,
    style,
    size = "default",
    enableCelebrations = true,
    onStreakUpdate,
}: StreakDisplayProps) {
    const { colors, spacing, typography } = useThemeStyles();

    const getSizeStyles = () => {
        switch (size) {
            case "compact":
                return {
                    padding: spacing.sm,
                    streakNumberSize: typography.sizes.lg,
                    streakLabelSize: typography.sizes.xs,
                    titleSize: typography.sizes.sm,
                };
            case "large":
                return {
                    padding: spacing.lg,
                    streakNumberSize: typography.sizes.xxl,
                    streakLabelSize: typography.sizes.md,
                    titleSize: typography.sizes.xl,
                };
            default:
                return {
                    padding: spacing.md,
                    streakNumberSize: typography.sizes.xl,
                    streakLabelSize: typography.sizes.sm,
                    titleSize: typography.sizes.lg,
                };
        }
    };

    const sizeStyles = getSizeStyles();

    if (!streak) {
        return (
            <Card
                variant="outlined"
                style={{ padding: sizeStyles.padding, ...style }}
            >
                <View style={{ alignItems: "center" }}>
                    {habitName && (
                        <Text
                            style={{
                                fontSize: sizeStyles.titleSize,
                                fontWeight: "600",
                                color: colors.foreground,
                                marginBottom: spacing.sm,
                                textAlign: "center",
                            }}
                        >
                            {habitName}
                        </Text>
                    )}
                    <Text
                        style={{
                            fontSize: sizeStyles.streakLabelSize,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        No streak data available
                    </Text>
                </View>
            </Card>
        );
    }

    const getStreakEmoji = (streakLength: number): string => {
        if (streakLength === 0) return "⭕";
        if (streakLength < 7) return "🔥";
        if (streakLength < 30) return "🔥🔥";
        if (streakLength < 100) return "🔥🔥🔥";
        return "🔥🔥🔥🔥";
    };

    const getStreakColor = (streakLength: number): string => {
        if (streakLength === 0) return colors.mutedForeground;
        if (streakLength < 7) return colors.warning;
        if (streakLength < 30) return colors.primary;
        return colors.success;
    };

    return (
        <View style={{ ...style, position: "relative" }}>
            <Card variant="elevated" style={{ padding: sizeStyles.padding }}>
                {habitName && (
                    <Text
                        style={{
                            fontSize: sizeStyles.titleSize,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.md,
                            textAlign: "center",
                        }}
                    >
                        {habitName}
                    </Text>
                )}

                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-around",
                        alignItems: "center",
                    }}
                >
                    {/* Current Streak */}
                    <View style={{ alignItems: "center", flex: 1 }}>
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: spacing.xs,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: sizeStyles.streakNumberSize,
                                    fontWeight: "bold",
                                    color: getStreakColor(streak.currentStreak),
                                    marginRight: spacing.xs,
                                }}
                            >
                                {streak.currentStreak}
                            </Text>
                            <Text style={{ fontSize: sizeStyles.streakNumberSize }}>
                                {getStreakEmoji(streak.currentStreak)}
                            </Text>
                        </View>
                        <Text
                            style={{
                                fontSize: sizeStyles.streakLabelSize,
                                color: colors.mutedForeground,
                                fontWeight: "500",
                                textAlign: "center",
                            }}
                        >
                            Current Streak
                        </Text>
                        {streak.currentStreak > 0 && (
                            <Text
                                style={{
                                    fontSize: sizeStyles.streakLabelSize - 2,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                    marginTop: spacing.xs / 2,
                                }}
                            >
                                {streak.currentStreak === 1
                                    ? "1 day"
                                    : `${streak.currentStreak} days`}
                            </Text>
                        )}
                    </View>

                    {/* Divider */}
                    <View
                        style={{
                            width: 1,
                            height: sizeStyles.streakNumberSize + spacing.md,
                            backgroundColor: colors.border,
                            marginHorizontal: spacing.sm,
                        }}
                    />

                    {/* Best Streak */}
                    <View style={{ alignItems: "center", flex: 1 }}>
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: spacing.xs,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: sizeStyles.streakNumberSize,
                                    fontWeight: "bold",
                                    color: getStreakColor(streak.bestStreak),
                                    marginRight: spacing.xs,
                                }}
                            >
                                {streak.bestStreak}
                            </Text>
                            <Text style={{ fontSize: sizeStyles.streakNumberSize }}>
                                {streak.bestStreak > 0 ? "🏆" : "⭕"}
                            </Text>
                        </View>
                        <Text
                            style={{
                                fontSize: sizeStyles.streakLabelSize,
                                color: colors.mutedForeground,
                                fontWeight: "500",
                                textAlign: "center",
                            }}
                        >
                            Best Streak
                        </Text>
                        {streak.bestStreak > 0 && (
                            <Text
                                style={{
                                    fontSize: sizeStyles.streakLabelSize - 2,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                    marginTop: spacing.xs / 2,
                                }}
                            >
                                {streak.bestStreak === 1
                                    ? "1 day"
                                    : `${streak.bestStreak} days`}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Streak Freezes */}
                {showFreezes &&
                    (streak.freezesAvailable > 0 || streak.freezesUsed > 0) && (
                        <View
                            style={{
                                marginTop: spacing.md,
                                paddingTop: spacing.sm,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <View style={{ alignItems: "center" }}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: spacing.xs / 2,
                                    }}
                                >
                                    <Text style={{ fontSize: sizeStyles.streakLabelSize + 2 }}>
                                        🛡️
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: sizeStyles.streakLabelSize,
                                            fontWeight: "600",
                                            color: colors.primary,
                                            marginLeft: spacing.xs,
                                        }}
                                    >
                                        {streak.freezesAvailable}
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        fontSize: sizeStyles.streakLabelSize - 2,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    Streak Freezes
                                </Text>
                            </View>
                        </View>
                    )}

                {/* Active Freeze Indicator */}
                {streak.currentStreak > 0 && streak.freezesAvailable > 0 && (
                    <View
                        style={{
                            position: "absolute",
                            top: spacing.sm,
                            right: spacing.sm,
                            backgroundColor: colors.primary,
                            borderRadius: spacing.sm,
                            paddingHorizontal: spacing.xs,
                            paddingVertical: spacing.xs / 2,
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 12 }}>🛡️</Text>
                        <Text
                            style={{
                                fontSize: 10,
                                color: colors.primaryForeground,
                                fontWeight: "600",
                                marginLeft: 2,
                            }}
                        >
                            Protected
                        </Text>
                    </View>
                )}
            </Card>
        </View>
    );
}
