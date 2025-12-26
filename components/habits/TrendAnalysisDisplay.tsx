import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { HabitAnalytics, TrendData } from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

interface TrendAnalysisDisplayProps {
    trends: TrendData[];
    analytics: HabitAnalytics;
    style?: ViewStyle;
}

/**
 * TrendAnalysisDisplay Component
 *
 * Analyzes and displays trend information including performance improvements,
 * patterns, and actionable insights based on completion data.
 * Requirements: 6.1, 6.5
 */
export const TrendAnalysisDisplay: React.FC<TrendAnalysisDisplayProps> = ({
    trends,
    analytics,
    style,
}) => {
    const trendAnalysis = analyzeTrends(trends);
    const performanceInsights = generatePerformanceInsights(trends, analytics);

    return (
        <Card style={StyleSheet.flatten([styles.container, style])}>
            <Text style={styles.title}>Trend Analysis</Text>

            {/* Overall Trend Direction */}
            <View style={styles.trendSection}>
                <View style={styles.trendHeader}>
                    <Text style={styles.trendIcon}>
                        {getTrendIcon(trendAnalysis.direction)}
                    </Text>
                    <View style={styles.trendInfo}>
                        <Text
                            style={StyleSheet.flatten([
                                styles.trendDirection,
                                { color: getTrendColor(trendAnalysis.direction) },
                            ])}
                        >
                            {getTrendLabel(trendAnalysis.direction)}
                        </Text>
                        <Text style={styles.trendDescription}>
                            {trendAnalysis.description}
                        </Text>
                    </View>
                </View>

                {trendAnalysis.changePercent !== 0 && (
                    <Text style={styles.trendChange}>
                        {trendAnalysis.changePercent > 0 ? "+" : ""}
                        {trendAnalysis.changePercent.toFixed(1)}% change
                    </Text>
                )}
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Performance Metrics</Text>
                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {trendAnalysis.averageRate.toFixed(1)}%
                        </Text>
                        <Text style={styles.metricLabel}>Average Rate</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {trendAnalysis.bestPeriod?.completionRate.toFixed(1) || "0"}%
                        </Text>
                        <Text style={styles.metricLabel}>Best Period</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {trendAnalysis.volatility.toFixed(1)}
                        </Text>
                        <Text style={styles.metricLabel}>Volatility</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                            {trendAnalysis.consistency.toFixed(1)}%
                        </Text>
                        <Text style={styles.metricLabel}>Stability</Text>
                    </View>
                </View>
            </View>

            {/* Performance Insights */}
            <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>Performance Insights</Text>
                <View style={styles.insightsList}>
                    {performanceInsights.map((insight, index) => (
                        <View key={index} style={styles.insightItem}>
                            <Text style={styles.insightIcon}>{insight.icon}</Text>
                            <View style={styles.insightContent}>
                                <Text style={styles.insightTitle}>{insight.title}</Text>
                                <Text style={styles.insightText}>{insight.message}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Recommendations */}
            {trendAnalysis.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                    <Text style={styles.sectionTitle}>Recommendations</Text>
                    <View style={styles.recommendationsList}>
                        {trendAnalysis.recommendations.map((recommendation, index) => (
                            <View key={index} style={styles.recommendationItem}>
                                <Text style={styles.recommendationBullet}>•</Text>
                                <Text style={styles.recommendationText}>{recommendation}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </Card>
    );
};

/**
 * Analyze trends to extract insights and patterns
 */
const analyzeTrends = (trends: TrendData[]) => {
    if (trends.length === 0) {
        return {
            direction: "stable" as const,
            description: "No trend data available",
            changePercent: 0,
            averageRate: 0,
            bestPeriod: null,
            volatility: 0,
            consistency: 0,
            recommendations: [],
        };
    }

    const rates = trends.map((t) => t.completionRate);
    const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    // Calculate trend direction
    const firstHalf = rates.slice(0, Math.ceil(rates.length / 2));
    const secondHalf = rates.slice(Math.floor(rates.length / 2));

    const firstHalfAvg =
        firstHalf.reduce((sum, rate) => sum + rate, 0) / firstHalf.length;
    const secondHalfAvg =
        secondHalf.reduce((sum, rate) => sum + rate, 0) / secondHalf.length;

    const changePercent = secondHalfAvg - firstHalfAvg;

    let direction: "improving" | "declining" | "stable";
    let description: string;

    if (changePercent > 5) {
        direction = "improving";
        description = "Your completion rate is trending upward. Great progress!";
    } else if (changePercent < -5) {
        direction = "declining";
        description =
            "Your completion rate is trending downward. Consider adjusting your approach.";
    } else {
        direction = "stable";
        description = "Your completion rate is relatively stable.";
    }

    // Find best performing period
    const bestPeriod = trends.reduce((best, current) =>
        current.completionRate > best.completionRate ? current : best,
    );

    // Calculate volatility (standard deviation)
    const variance =
        rates.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) /
        rates.length;
    const volatility = Math.sqrt(variance);

    // Calculate consistency (inverse of coefficient of variation)
    const consistency =
        averageRate > 0 ? Math.max(0, 100 - (volatility / averageRate) * 100) : 0;

    // Generate recommendations
    const recommendations = generateRecommendations(
        direction,
        averageRate,
        volatility,
        consistency,
    );

    return {
        direction,
        description,
        changePercent,
        averageRate,
        bestPeriod,
        volatility,
        consistency,
        recommendations,
    };
};

/**
 * Generate performance insights based on trends and analytics
 */
const generatePerformanceInsights = (
    trends: TrendData[],
    analytics: HabitAnalytics,
) => {
    const insights = [];

    if (trends.length === 0) {
        return [
            {
                icon: "📊",
                title: "No Data Yet",
                message: "Complete more habits to see performance insights.",
            },
        ];
    }

    // Recent performance insight
    const recentTrend = trends[trends.length - 1];
    if (recentTrend.completionRate >= 80) {
        insights.push({
            icon: "🎯",
            title: "Strong Recent Performance",
            message: `Your latest period shows ${recentTrend.completionRate.toFixed(1)}% completion rate. Excellent consistency!`,
        });
    } else if (recentTrend.completionRate >= 60) {
        insights.push({
            icon: "📈",
            title: "Moderate Recent Performance",
            message: `Your latest period shows ${recentTrend.completionRate.toFixed(1)}% completion rate. Room for improvement.`,
        });
    } else {
        insights.push({
            icon: "⚠️",
            title: "Recent Performance Needs Attention",
            message: `Your latest period shows ${recentTrend.completionRate.toFixed(1)}% completion rate. Consider adjusting your approach.`,
        });
    }

    // Streak performance insight
    if (analytics.averageStreakLength >= 7) {
        insights.push({
            icon: "🔥",
            title: "Great Streak Building",
            message: `Your average streak of ${analytics.averageStreakLength.toFixed(1)} days shows strong habit formation.`,
        });
    } else if (analytics.averageStreakLength >= 3) {
        insights.push({
            icon: "📊",
            title: "Building Momentum",
            message: `Your average streak of ${analytics.averageStreakLength.toFixed(1)} days is a good start. Keep building!`,
        });
    }

    // Best day insight
    insights.push({
        icon: "📅",
        title: "Optimal Day Pattern",
        message: `${analytics.bestDayOfWeek} is your strongest day. Consider scheduling important tasks then.`,
    });

    return insights;
};

/**
 * Generate recommendations based on trend analysis
 */
const generateRecommendations = (
    direction: "improving" | "declining" | "stable",
    averageRate: number,
    volatility: number,
    consistency: number,
): string[] => {
    const recommendations = [];

    if (direction === "declining") {
        recommendations.push(
            "Review what changed recently that might be affecting your consistency",
        );
        recommendations.push(
            "Consider reducing the habit difficulty temporarily to rebuild momentum",
        );
    } else if (direction === "improving") {
        recommendations.push(
            "Keep doing what's working! Your current approach is effective",
        );
        if (averageRate < 80) {
            recommendations.push(
                "Consider gradually increasing the challenge as you build confidence",
            );
        }
    }

    if (volatility > 20) {
        recommendations.push(
            "Focus on creating a more consistent routine to reduce variability",
        );
        recommendations.push(
            "Identify and address factors that cause irregular performance",
        );
    }

    if (averageRate < 60) {
        recommendations.push(
            "Consider making the habit smaller or easier to complete",
        );
        recommendations.push(
            "Focus on consistency over intensity in the early stages",
        );
    }

    if (consistency < 50) {
        recommendations.push(
            "Work on establishing a regular schedule for this habit",
        );
        recommendations.push(
            "Remove barriers that make the habit difficult to complete",
        );
    }

    return recommendations;
};

/**
 * Get trend icon based on direction
 */
const getTrendIcon = (
    direction: "improving" | "declining" | "stable",
): string => {
    switch (direction) {
        case "improving":
            return "📈";
        case "declining":
            return "📉";
        case "stable":
            return "➡️";
    }
};

/**
 * Get trend color based on direction
 */
const getTrendColor = (
    direction: "improving" | "declining" | "stable",
): string => {
    switch (direction) {
        case "improving":
            return "#34C759";
        case "declining":
            return "#FF3B30";
        case "stable":
            return "#007AFF";
    }
};

/**
 * Get trend label based on direction
 */
const getTrendLabel = (
    direction: "improving" | "declining" | "stable",
): string => {
    switch (direction) {
        case "improving":
            return "Improving";
        case "declining":
            return "Declining";
        case "stable":
            return "Stable";
    }
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 20,
    },
    trendSection: {
        marginBottom: 24,
    },
    trendHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    trendIcon: {
        fontSize: 24,
        marginRight: 12,
        marginTop: 2,
    },
    trendInfo: {
        flex: 1,
    },
    trendDirection: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    trendDescription: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    trendChange: {
        fontSize: 12,
        color: "#999",
        fontStyle: "italic",
        marginTop: 4,
    },
    metricsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    metricItem: {
        width: "48%",
        alignItems: "center",
        marginBottom: 12,
        padding: 12,
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#007AFF",
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 11,
        color: "#666",
        textAlign: "center",
    },
    insightsSection: {
        marginBottom: 24,
    },
    insightsList: {
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
        fontSize: 16,
        marginRight: 10,
        marginTop: 2,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    insightText: {
        fontSize: 12,
        color: "#666",
        lineHeight: 16,
    },
    recommendationsSection: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 16,
    },
    recommendationsList: {
        gap: 8,
    },
    recommendationItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    recommendationBullet: {
        fontSize: 14,
        color: "#007AFF",
        marginRight: 8,
        marginTop: 2,
    },
    recommendationText: {
        flex: 1,
        fontSize: 13,
        color: "#666",
        lineHeight: 18,
    },
});
