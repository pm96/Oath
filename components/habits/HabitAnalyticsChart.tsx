import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
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
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - 80; // Account for margins and padding
    const chartHeight = height - 60; // Account for labels

    if (trends.length === 0) {
        return (
            <View style={[styles.container, { height }]}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No trend data available</Text>
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

    return (
        <View style={[styles.container, { height }]}>
            {/* Chart Area */}
            <View
                style={[styles.chartArea, { width: chartWidth, height: chartHeight }]}
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
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Y-Axis Labels */}
            <View style={styles.yAxisLabels}>
                <Text style={styles.axisLabel}>{maxRate.toFixed(0)}%</Text>
                <Text style={styles.axisLabel}>
                    {((maxRate + minRate) / 2).toFixed(0)}%
                </Text>
                <Text style={styles.axisLabel}>{minRate.toFixed(0)}%</Text>
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
                                style={{
                                    ...styles.xAxisLabel,
                                    left: x - 30, // Center the label
                                }}
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
 * Get color for data point based on completion rate
 */
const getPointColor = (completionRate: number): string => {
    if (completionRate >= 80) return "#34C759"; // Green
    if (completionRate >= 60) return "#FF9500"; // Orange
    if (completionRate >= 40) return "#FFCC00"; // Yellow
    return "#FF3B30"; // Red
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
                    },
                ]}
            />,
        );
    }

    return lineSegments;
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
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return period;
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: "#fff",
    },
    chartArea: {
        position: "relative",
        backgroundColor: "#fafafa",
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
        color: "#999",
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "#e0e0e0",
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
        backgroundColor: "#007AFF",
        transformOrigin: "left center",
    },
    dataPoint: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "#fff",
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
        color: "#666",
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
        color: "#666",
        textAlign: "center",
        width: 60,
    },
});
