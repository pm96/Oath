import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { TrendData } from "../../types/habit-streaks";
import { Text } from "../ui/Text";

interface HabitAnalyticsChartProps {
    trends: TrendData[];
    height?: number;
    showLabels?: boolean;
}

/**
 * HabitAnalyticsChart Component
 *
 * A simple chart component for displaying completion rate trends.
 * Uses basic React Native components to create a visual representation.
 * Requirements: 6.1, 6.5
 */
export const HabitAnalyticsChart: React.FC<HabitAnalyticsChartProps> = ({
    trends,
    height = 200,
    showLabels = true,
}) => {
    const { colors, spacing } = useThemeStyles();
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - 80; // Account for margins and padding
    const chartHeight = height - 60; // Account for labels

    if (trends.length === 0) {
        return (
            <View style={[styles.container, { height, backgroundColor: colors.card }]}>
                <View style={styles.emptyState}>
                    <Text style={StyleSheet.flatten([styles.emptyText, { color: colors.mutedForeground }])}>No trend data available</Text>
                </View>
            </View>
        );
    }

    // Calculate chart dimensions and data points
    const maxRate = Math.max(...trends.map((t) => t.completionRate), 100);
    const minRate = Math.min(...trends.map((t) => t.completionRate), 0);
    const rateRange = maxRate - minRate || 1;

    const dataPoints = trends.map((trend, index) => {
        const x = (index / (trends.length - 1)) * chartWidth;
        const y =
            chartHeight -
            ((trend.completionRate - minRate) / rateRange) * chartHeight;
        return { x, y, trend };
    });

    /**
     * Get color for data point based on completion rate
     */
    const getPointColor = (completionRate: number): string => {
        if (completionRate >= 80) return colors.success;
        if (completionRate >= 60) return colors.warning;
        if (completionRate >= 40) return colors.warning;
        return colors.destructive;
    };

    /**
     * Render grid lines for the chart
     */
    const renderGridLines = (
        width: number,
        height: number,
        maxRate: number,
        minRate: number,
    ): React.ReactNode => {
        const gridLines = [];
        const numLines = 4;

        // Horizontal grid lines
        for (let i = 0; i <= numLines; i++) {
            const y = (i / numLines) * height;
            gridLines.push(
                <View
                    key={`h-${i}`}
                    style={[
                        styles.gridLine,
                        {
                            top: y,
                            width: width,
                            height: 1,
                            backgroundColor: colors.border,
                        },
                    ]}
                />,
            );
        }

        // Vertical grid lines
        const numVerticalLines = Math.min(5, Math.floor(width / 60));
        for (let i = 0; i <= numVerticalLines; i++) {
            const x = (i / numVerticalLines) * width;
            gridLines.push(
                <View
                    key={`v-${i}`}
                    style={[
                        styles.gridLine,
                        {
                            left: x,
                            width: 1,
                            height: height,
                            backgroundColor: colors.border,
                        },
                    ]}
                />,
            );
        }

        return gridLines;
    };

    /**
     * Render the trend line connecting data points
     */
    const renderTrendLine = (
        dataPoints: { x: number; y: number; trend: TrendData }[],
    ): React.ReactNode => {
        if (dataPoints.length < 2) return null;

        const lineSegments = [];

        for (let i = 0; i < dataPoints.length - 1; i++) {
            const start = dataPoints[i];
            const end = dataPoints[i + 1];

            const length = Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
            );

            const angle =
                Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

            lineSegments.push(
                <View
                    key={i}
                    style={[
                        styles.lineSegment,
                        {
                            left: start.x,
                            top: start.y,
                            width: length,
                            transform: [{ rotate: `${angle}deg` }],
                            backgroundColor: colors.primary,
                        },
                    ]}
                />,
            );
        }

        return lineSegments;
    };

    return (
        <View style={[styles.container, { height, backgroundColor: colors.card }]}>
            {/* Chart Area */}
            <View
                style={[styles.chartArea, { width: chartWidth, height: chartHeight, backgroundColor: colors.muted + '10' }]}
            >
                {/* Grid Lines */}
                {renderGridLines(chartWidth, chartHeight, maxRate, minRate)}

                {/* Trend Line */}
                <View style={styles.lineContainer}>{renderTrendLine(dataPoints)}</View>

                {/* Data Points */}
                {dataPoints.map((point, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dataPoint,
                            {
                                left: point.x - 4,
                                top: point.y - 4,
                                backgroundColor: getPointColor(point.trend.completionRate),
                                borderColor: colors.card,
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Y-Axis Labels */}
            <View style={styles.yAxisLabels}>
                <Text style={StyleSheet.flatten([styles.axisLabel, { color: colors.mutedForeground }])}>{maxRate.toFixed(0)}%</Text>
                <Text style={StyleSheet.flatten([styles.axisLabel, { color: colors.mutedForeground }])}>
                    {((maxRate + minRate) / 2).toFixed(0)}%
                </Text>
                <Text style={StyleSheet.flatten([styles.axisLabel, { color: colors.mutedForeground }])}>{minRate.toFixed(0)}%</Text>
            </View>

            {/* X-Axis Labels */}
            {showLabels && (
                <View style={[styles.xAxisLabels, { width: chartWidth }]}>
                    {trends.map((trend, index) => {
                        // Show only first, middle, and last labels to avoid crowding
                        const shouldShow =
                            index === 0 ||
                            index === Math.floor(trends.length / 2) ||
                            index === trends.length - 1;

                        if (!shouldShow) return null;

                        const x = (index / (trends.length - 1)) * chartWidth;
                        return (
                            <Text
                                key={index}
                                style={StyleSheet.flatten([
                                    styles.xAxisLabel,
                                    {
                                        left: x - 30, // Center the label
                                        color: colors.mutedForeground,
                                    }
                                ])}
                            >
                                {formatPeriodLabel(trend.period)}
                            </Text>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

/**
 * Format period label for display
 */
const formatPeriodLabel = (period: string): string => {
    // Extract meaningful part of the period string
    if (period.includes("Week of")) {
        return period.replace("Week of ", "");
    }

    if (period.includes(" - ")) {
        const parts = period.split(" - ");
        return parts[1] || period;
    }

    // For date strings, show just month/day
    if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(period);
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    return period;
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    chartArea: {
        position: "relative",
        borderRadius: 8,
        padding: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
    },
    gridLine: {
        position: "absolute",
    },
    lineContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    lineSegment: {
        position: "absolute",
        height: 2,
        transformOrigin: "left center",
    },
    dataPoint: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    yAxisLabels: {
        position: "absolute",
        left: -40,
        top: 8,
        height: "100%",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    axisLabel: {
        fontSize: 10,
        textAlign: "right",
        width: 35,
    },
    xAxisLabels: {
        position: "relative",
        height: 30,
        marginTop: 8,
    },
    xAxisLabel: {
        position: "absolute",
        fontSize: 10,
        textAlign: "center",
        width: 60,
    },
});
