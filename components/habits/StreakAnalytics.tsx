import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { analyticsService } from "../../services/firebase/analyticsService";
import {
    HabitAnalytics,
    HabitStreak,
    TrendData,
} from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";
import { Text } from "../ui/Text";
import { ConsistencyScoreDisplay } from "./ConsistencyScoreDisplay";
import { HabitAnalyticsChart } from "./HabitAnalyticsChart";
import { TrendAnalysisDisplay } from "./TrendAnalysisDisplay";

export interface StreakAnalyticsProps {
    habitId: string;
    userId: string;
    habitName?: string;
    streak?: HabitStreak | null;
    style?: ViewStyle;
    compact?: boolean;
}

/**
 * StreakAnalytics Component
 *
 * Displays comprehensive analytics with charts and trends for habit streaks
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function StreakAnalytics({
    habitId,
    userId,
    habitName,
    streak,
    style,
    compact = false,
}: StreakAnalyticsProps) {
    const { colors, spacing, typography } = useThemeStyles();
    const [analytics, setAnalytics] = useState<HabitAnalytics | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Load analytics and trends in parallel
            const [analyticsData, trendsData] = await Promise.all([
                analyticsService.calculateHabitAnalytics(habitId, userId),
                analyticsService.getCompletionTrends(habitId, userId, "month"),
            ]);

            setAnalytics(analyticsData);
            setTrends(trendsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, [habitId, userId]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const getCompletionRateColor = (rate: number): string => {
        if (rate >= 80) return colors.success;
        if (rate >= 60) return colors.warning;
        return colors.destructive;
    };

    if (loading) {
        return (
            <View style={style}>
                <LoadingSkeleton height={compact ? 150 : 200} />
                {!compact && (
                    <>
                        <LoadingSkeleton height={120} style={{ marginTop: spacing.md }} />
                        <LoadingSkeleton height={180} style={{ marginTop: spacing.md }} />
                    </>
                )}
            </View>
        );
    }

    if (error) {
        return (
            <Card variant="outlined" style={style}>
                <View style={{ alignItems: "center", padding: spacing.md }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.md,
                            fontWeight: "600",
                            color: colors.destructive,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Error loading analytics
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        {error}
                    </Text>
                </View>
            </Card>
        );
    }

    if (!analytics) {
        return (
            <Card variant="outlined" style={style}>
                <View style={{ alignItems: "center", padding: spacing.md }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.md,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        No analytics data available
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                            marginTop: spacing.xs,
                        }}
                    >
                        Complete some habits to see your analytics
                    </Text>
                </View>
            </Card>
        );
    }

    const renderKeyMetrics = () => (
        <Card variant="elevated" style={{ marginBottom: spacing.md }}>
            <Text
                style={{
                    fontSize: compact ? typography.sizes.md : typography.sizes.lg,
                    fontWeight: "600",
                    color: colors.foreground,
                    marginBottom: spacing.md,
                    textAlign: "center",
                }}
            >
                {habitName ? `${habitName} Analytics` : "Habit Analytics"}
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                }}
            >
                <View
                    style={{
                        width: "48%",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.lg : typography.sizes.xl,
                            fontWeight: "bold",
                            color: colors.primary,
                        }}
                    >
                        {analytics.totalCompletions}
                    </Text>
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        Total Completions
                    </Text>
                </View>

                <View
                    style={{
                        width: "48%",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.lg : typography.sizes.xl,
                            fontWeight: "bold",
                            color: getCompletionRateColor(analytics.completionRate30Days),
                        }}
                    >
                        {analytics.completionRate30Days.toFixed(1)}%
                    </Text>
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        30-Day Rate
                    </Text>
                </View>

                <View
                    style={{
                        width: "48%",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.lg : typography.sizes.xl,
                            fontWeight: "bold",
                            color: colors.success,
                        }}
                    >
                        {analytics.averageStreakLength.toFixed(1)}
                    </Text>
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        Avg Streak
                    </Text>
                </View>

                <View
                    style={{
                        width: "48%",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.lg : typography.sizes.xl,
                            fontWeight: "bold",
                            color: colors.info,
                        }}
                    >
                        {analytics.bestDayOfWeek}
                    </Text>
                    <Text
                        style={{
                            fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                            color: colors.mutedForeground,
                            textAlign: "center",
                        }}
                    >
                        Best Day
                    </Text>
                </View>
            </View>

            {/* Current vs Best Streak Comparison */}
            {streak && (
                <View
                    style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        flexDirection: "row",
                        justifyContent: "space-around",
                    }}
                >
                    <View style={{ alignItems: "center" }}>
                        <Text
                            style={{
                                fontSize: compact ? typography.sizes.md : typography.sizes.lg,
                                fontWeight: "bold",
                                color: colors.warning,
                            }}
                        >
                            {streak.currentStreak}
                        </Text>
                        <Text
                            style={{
                                fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                                color: colors.mutedForeground,
                            }}
                        >
                            Current Streak
                        </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                        <Text
                            style={{
                                fontSize: compact ? typography.sizes.md : typography.sizes.lg,
                                fontWeight: "bold",
                                color: colors.success,
                            }}
                        >
                            {streak.bestStreak}
                        </Text>
                        <Text
                            style={{
                                fontSize: compact ? typography.sizes.xs : typography.sizes.sm,
                                color: colors.mutedForeground,
                            }}
                        >
                            Best Streak
                        </Text>
                    </View>
                </View>
            )}
        </Card>
    );

    if (compact) {
        return (
            <View style={style}>
                {renderKeyMetrics()}
                <ConsistencyScoreDisplay score={analytics.consistencyScore} />
            </View>
        );
    }

    return (
        <ScrollView style={style} showsVerticalScrollIndicator={false}>
            <View style={{ padding: spacing.md }}>
                {renderKeyMetrics()}

                {/* Consistency Score */}
                <ConsistencyScoreDisplay
                    score={analytics.consistencyScore}
                    style={{ marginBottom: spacing.md }}
                />

                {/* Completion Trends Chart */}
                <Card variant="elevated" style={{ marginBottom: spacing.md }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.md,
                        }}
                    >
                        Completion Trends
                    </Text>
                    <HabitAnalyticsChart trends={trends} height={200} />
                </Card>

                {/* Trend Analysis */}
                <TrendAnalysisDisplay
                    trends={trends}
                    analytics={analytics}
                    style={{ marginBottom: spacing.md }}
                />

                {/* Performance Insights */}
                <Card variant="elevated" style={{ marginBottom: spacing.md }}>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: "600",
                            color: colors.foreground,
                            marginBottom: spacing.md,
                        }}
                    >
                        Performance Insights
                    </Text>
                    <View style={{ gap: spacing.sm }}>
                        {/* Simple insights without complex styling */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                padding: 12,
                                backgroundColor: "rgba(0,0,0,0.02)",
                                borderRadius: 8,
                            }}
                        >
                            <Text style={{ fontSize: 20, marginRight: 12, marginTop: 2 }}>
                                📊
                            </Text>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: colors.foreground,
                                        marginBottom: 4,
                                    }}
                                >
                                    Analytics Summary
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        lineHeight: 18,
                                        color: colors.mutedForeground,
                                    }}
                                >
                                    {analytics.bestDayOfWeek} is your most consistent day with a{" "}
                                    {analytics.completionRate30Days.toFixed(1)}% completion rate.
                                </Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </View>
        </ScrollView>
    );
}
