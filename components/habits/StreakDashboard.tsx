import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View, ViewStyle } from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { streakService } from "../../services/firebase/streakService";
import { CalendarDay, HabitStreak } from "../../types/habit-streaks";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";
import { Card } from "../ui/Card";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";
import { Text } from "../ui/Text";
import { StreakAnalytics } from "./StreakAnalytics";
import { StreakCalendar } from "./StreakCalendar";
import { StreakDisplay } from "./StreakDisplay";
import { StreakMilestones } from "./StreakMilestones";

export interface StreakDashboardProps {
    habitId: string;
    userId: string;
    habitName: string;
    style?: ViewStyle;
    onStreakUpdate?: (streak: HabitStreak) => void;
}

/**
 * StreakDashboard Component
 *
 * Comprehensive dashboard integrating all streak components
 * Requirements: 1.4, 2.1, 2.2, 2.3, 3.4, 4.3
 */
export function StreakDashboard({
    habitId,
    userId,
    habitName,
    style,
    onStreakUpdate,
}: StreakDashboardProps) {
    const { colors, spacing, typography } = useThemeStyles();
    const [streak, setStreak] = useState<HabitStreak | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStreakData = useCallback(
        async (isRefresh = false) => {
            try {
                if (!isRefresh) {
                    setLoading(true);
                }
                setError(null);

                // Load streak data and calendar in parallel
                const [streakData, calendar] = await Promise.all([
                    streakService.getHabitStreak(habitId, userId),
                    streakService.getHabitCalendar(
                        habitId,
                        userId,
                        90,
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                    ),
                ]);

                setStreak(streakData);
                setCalendarData(calendar);

                if (streakData && onStreakUpdate) {
                    onStreakUpdate(streakData);
                }
            } catch (err) {
                const message = getUserFriendlyErrorMessage(err);
                setError(message);
                console.error("Failed to load streak data:", err);
            } finally {
                setLoading(false);
                if (isRefresh) {
                    setRefreshing(false);
                }
            }
        },
        [habitId, userId, onStreakUpdate],
    );

    useEffect(() => {
        loadStreakData();
    }, [loadStreakData]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadStreakData(true);
    }, [loadStreakData]);

    const handleDayPress = useCallback((day: CalendarDay) => {
        // Handle day press - could show completion details or allow editing
        console.log("Day pressed:", day);
    }, []);

    if (loading) {
        return (
            <ScrollView
                style={[{ flex: 1 }, style]}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: spacing.md }}>
                    <LoadingSkeleton height={150} style={{ marginBottom: spacing.md }} />
                    <LoadingSkeleton height={200} style={{ marginBottom: spacing.md }} />
                    <LoadingSkeleton height={180} style={{ marginBottom: spacing.md }} />
                    <LoadingSkeleton height={250} style={{ marginBottom: spacing.md }} />
                </View>
            </ScrollView>
        );
    }

    if (error) {
        return (
            <ScrollView
                style={[{ flex: 1 }, style]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                <View style={{ padding: spacing.md }}>
                    <Card variant="outlined" style={{ padding: spacing.lg }}>
                        <View style={{ alignItems: "center" }}>
                            <Text
                                style={{
                                    fontSize: typography.sizes.lg,
                                    fontWeight: "600",
                                    color: colors.destructive,
                                    marginBottom: spacing.sm,
                                    textAlign: "center",
                                }}
                            >
                                Unable to Load Streak Data
                            </Text>
                            <Text
                                style={{
                                    fontSize: typography.sizes.sm,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                    marginBottom: spacing.md,
                                }}
                            >
                                {error}
                            </Text>
                            <Text
                                style={{
                                    fontSize: typography.sizes.sm,
                                    color: colors.mutedForeground,
                                    textAlign: "center",
                                }}
                            >
                                Pull down to refresh
                            </Text>
                        </View>
                    </Card>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={[{ flex: 1 }, style]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            <View style={{ padding: spacing.md }}>
                {/* Header */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.xxl,
                            fontWeight: "bold",
                            color: colors.foreground,
                            textAlign: "center",
                            marginBottom: spacing.xs,
                        }}
                    >
                        {habitName}
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        Streak Dashboard
                    </Text>
                </View>

                {/* Streak Display */}
                <StreakDisplay
                    streak={streak}
                    size="large"
                    showFreezes={true}
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Milestones */}
                <StreakMilestones
                    streak={streak}
                    showProgress={true}
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Calendar */}
                <StreakCalendar
                    calendarData={calendarData}
                    onDayPress={handleDayPress}
                    showLegend={true}
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Analytics */}
                <StreakAnalytics
                    habitId={habitId}
                    userId={userId}
                    streak={streak}
                    style={{ marginBottom: spacing.lg }}
                />

                {/* Quick Stats Summary */}
                <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.md,
                            textAlign: "center",
                        }}
                    >
                        Quick Stats
                    </Text>

                    <View style={{ gap: spacing.sm }}>
                        {streak && (
                            <>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingVertical: spacing.xs,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Milestones Achieved
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            fontWeight: "600",
                                            color: colors.foreground,
                                        }}
                                    >
                                        {streak.milestones.length}
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingVertical: spacing.xs,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Streak Freezes Used
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            fontWeight: "600",
                                            color: colors.foreground,
                                        }}
                                    >
                                        {streak.freezesUsed}
                                    </Text>
                                </View>

                                {streak.lastCompletionDate && (
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            paddingVertical: spacing.xs,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: typography.sizes.sm,
                                                color: colors.mutedForeground,
                                            }}
                                        >
                                            Last Completion
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: typography.sizes.sm,
                                                fontWeight: "600",
                                                color: colors.foreground,
                                            }}
                                        >
                                            {new Date(streak.lastCompletionDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                )}

                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingVertical: spacing.xs,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            color: colors.mutedForeground,
                                        }}
                                    >
                                        Completion Rate (90 days)
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: typography.sizes.sm,
                                            fontWeight: "600",
                                            color: getCompletionRateColor(calendarData),
                                        }}
                                    >
                                        {getCompletionRate(calendarData).toFixed(1)}%
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </Card>
            </View>
        </ScrollView>
    );

    function getCompletionRate(calendarData: CalendarDay[]): number {
        if (calendarData.length === 0) return 0;
        const completedDays = calendarData.filter(
            (day) => day.completed && day.date,
        ).length;
        const totalDays = calendarData.filter((day) => day.date).length;
        return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    }

    function getCompletionRateColor(calendarData: CalendarDay[]): string {
        const rate = getCompletionRate(calendarData);
        if (rate >= 80) return colors.success;
        if (rate >= 60) return colors.warning;
        return colors.destructive;
    }
}
