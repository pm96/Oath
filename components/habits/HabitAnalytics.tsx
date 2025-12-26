import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { analyticsService } from "../../services/firebase/analyticsService";
import {
    HabitAnalytics as IHabitAnalytics,
    TrendData,
} from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";
import { Text } from "../ui/Text";
import { ConsistencyScoreDisplay } from "./ConsistencyScoreDisplay";
import { HabitAnalyticsChart } from "./HabitAnalyticsChart";
import { TrendAnalysisDisplay } from "./TrendAnalysisDisplay";

interface HabitAnalyticsProps {
    habitId: string;
    userId: string;
    habitName?: string;
}

/**
 * HabitAnalytics Component
 *
 * Displays comprehensive analytics for a habit including completion rates,
 * trends, consistency scores, and performance insights.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export const HabitAnalytics: React.FC<HabitAnalyticsProps> = ({
    habitId,
    userId,
    habitName = "Habit",
}) => {
    const [analytics, setAnalytics] = useState<IHabitAnalytics | null>(null);
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

    if (loading) {
        return (
            <ScrollView style={styles.container}>
                <LoadingSkeleton height={200} style={styles.skeletonCard} />
                <LoadingSkeleton height={150} style={styles.skeletonCard} />
                <LoadingSkeleton height={180} style={styles.skeletonCard} />
            </ScrollView>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Card style={styles.errorCard}>
                    <Text style={styles.errorText}>Error loading analytics</Text>
                    <Text style={styles.errorDetail}>{error}</Text>
                </Card>
            </View>
        );
    }

    if (!analytics) {
        return (
            <View style={styles.container}>
                <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No analytics data available</Text>
                    <Text style={styles.emptyDetail}>
                        Complete some habits to see your analytics
                    </Text>
                </Card>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{habitName} Analytics</Text>
                <Text style={styles.subtitle}>
                    Last updated: {analytics.lastUpdated.toDate().toLocaleDateString()}
                </Text>
            </View>

            {/* Key Metrics Overview */}
            <Card style={styles.metricsCard}>
                <Text style={styles.cardTitle}>Key Metrics</Text>
                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{analytics.totalCompletions}</Text>
                        <Text style={styles.metricLabel}>Total Completions</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {analytics.completionRate30Days.toFixed(1)}%
                        </Text>
                        <Text style={styles.metricLabel}>30-Day Rate</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {analytics.averageStreakLength.toFixed(1)}
                        </Text>
                        <Text style={styles.metricLabel}>Avg Streak</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{analytics.bestDayOfWeek}</Text>
                        <Text style={styles.metricLabel}>Best Day</Text>
                    </View>
                </View>
            </Card>

            {/* Consistency Score */}
            <ConsistencyScoreDisplay
                score={analytics.consistencyScore}
                style={styles.card}
            />

            {/* Completion Trends Chart */}
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>Completion Trends</Text>
                <HabitAnalyticsChart trends={trends} height={200} />
            </Card>

            {/* Trend Analysis */}
            <TrendAnalysisDisplay
                trends={trends}
                analytics={analytics}
                style={styles.card}
            />

            {/* Performance Insights */}
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>Performance Insights</Text>
                <View style={styles.insightsContainer}>
                    {renderPerformanceInsights(analytics, trends)}
                </View>
            </Card>
        </ScrollView>
    );
};

/**
 * Render performance insights based on analytics data
 * Requirements: 6.5
 */
const renderPerformanceInsights = (
    analytics: IHabitAnalytics,
    trends: TrendData[],
): React.ReactNode[] => {
    const insights: React.ReactNode[] = [];

    // Completion rate insight
    if (analytics.completionRate30Days >= 80) {
        insights.push(
            <View key="completion-high" style={styles.insightItem}>
                <Text style={styles.insightIcon}>🎯</Text>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Excellent Consistency!</Text>
                    <Text style={styles.insightText}>
                        You&apos;re maintaining an{" "}
                        {analytics.completionRate30Days.toFixed(1)}% completion rate. Keep
                        it up!
                    </Text>
                </View>
            </View>,
        );
    } else if (analytics.completionRate30Days >= 60) {
        insights.push(
            <View key="completion-medium" style={styles.insightItem}>
                <Text style={styles.insightIcon}>📈</Text>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Good Progress</Text>
                    <Text style={styles.insightText}>
                        You&apos;re at {analytics.completionRate30Days.toFixed(1)}%. Try to
                        aim for 80% for optimal habit formation.
                    </Text>
                </View>
            </View>,
        );
    } else {
        insights.push(
            <View key="completion-low" style={styles.insightItem}>
                <Text style={styles.insightIcon}>💪</Text>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Room for Improvement</Text>
                    <Text style={styles.insightText}>
                        Focus on consistency. Small daily actions lead to big results over
                        time.
                    </Text>
                </View>
            </View>,
        );
    }

    // Best day insight
    insights.push(
        <View key="best-day" style={styles.insightItem}>
            <Text style={styles.insightIcon}>📅</Text>
            <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Your Best Day</Text>
                <Text style={styles.insightText}>
                    {analytics.bestDayOfWeek} is your most consistent day. Consider
                    scheduling important habits then.
                </Text>
            </View>
        </View>,
    );

    // Trend insight
    if (trends.length >= 2) {
        const recentTrend = trends[trends.length - 1];
        const previousTrend = trends[trends.length - 2];
        const trendChange =
            recentTrend.completionRate - previousTrend.completionRate;

        if (trendChange > 5) {
            insights.push(
                <View key="trend-up" style={styles.insightItem}>
                    <Text style={styles.insightIcon}>📊</Text>
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Improving Trend!</Text>
                        <Text style={styles.insightText}>
                            Your completion rate increased by {trendChange.toFixed(1)}%
                            recently. Great momentum!
                        </Text>
                    </View>
                </View>,
            );
        } else if (trendChange < -5) {
            insights.push(
                <View key="trend-down" style={styles.insightItem}>
                    <Text style={styles.insightIcon}>⚠️</Text>
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Declining Trend</Text>
                        <Text style={styles.insightText}>
                            Your completion rate dropped by {Math.abs(trendChange).toFixed(1)}
                            %. Consider adjusting your approach.
                        </Text>
                    </View>
                </View>,
            );
        }
    }

    // Consistency insight
    if (analytics.consistencyScore >= 80) {
        insights.push(
            <View key="consistency-high" style={styles.insightItem}>
                <Text style={styles.insightIcon}>🏆</Text>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Highly Consistent</Text>
                    <Text style={styles.insightText}>
                        Your consistency score of {analytics.consistencyScore.toFixed(1)}{" "}
                        shows excellent habit formation.
                    </Text>
                </View>
            </View>,
        );
    }

    return insights;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
    },
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    metricsCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    metricItem: {
        width: "48%",
        alignItems: "center",
        marginBottom: 16,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#007AFF",
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    insightsContainer: {
        gap: 12,
    },
    insightItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 12,
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
    },
    insightIcon: {
        fontSize: 20,
        marginRight: 12,
        marginTop: 2,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    insightText: {
        fontSize: 13,
        color: "#666",
        lineHeight: 18,
    },
    skeletonCard: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    errorCard: {
        margin: 20,
        padding: 20,
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FF3B30",
        marginBottom: 8,
    },
    errorDetail: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    emptyCard: {
        margin: 20,
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
    },
    emptyDetail: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
    },
});
