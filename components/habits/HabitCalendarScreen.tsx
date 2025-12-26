import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import {
    useCalendarStats,
    useHabitCalendar,
} from "../../hooks/useHabitCalendar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { HabitCalendar } from "./HabitCalendar";

export interface HabitCalendarScreenProps {
    habitId: string;
    userId: string;
    habitName: string;
    onBack?: () => void;
}

export function HabitCalendarScreen({
    habitId,
    userId,
    habitName,
    onBack,
}: HabitCalendarScreenProps) {
    const { colors, spacing } = useThemeStyles();
    const { calendarData, loading, error, refreshCalendar } = useHabitCalendar({
        habitId,
        userId,
        days: 90,
        autoRefresh: true,
    });

    const stats = useCalendarStats(calendarData);

    if (loading && calendarData.length === 0) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                    style={{
                        marginTop: spacing.md,
                        fontSize: 16,
                        color: colors.mutedForeground,
                    }}
                >
                    Loading calendar...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    padding: spacing.lg,
                }}
            >
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: colors.destructive,
                        marginBottom: spacing.md,
                        textAlign: "center",
                    }}
                >
                    Error Loading Calendar
                </Text>
                <Text
                    style={{
                        fontSize: 14,
                        color: colors.mutedForeground,
                        marginBottom: spacing.lg,
                        textAlign: "center",
                    }}
                >
                    {error}
                </Text>
                <Button onPress={refreshCalendar}>Try Again</Button>
            </View>
        );
    }

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={refreshCalendar}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View
                    style={{
                        padding: spacing.lg,
                        paddingBottom: spacing.md,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: spacing.md,
                        }}
                    >
                        {onBack && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onPress={onBack}
                                style={{ marginRight: spacing.sm }}
                            >
                                ← Back
                            </Button>
                        )}
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: "bold",
                                color: colors.foreground,
                                flex: 1,
                            }}
                        >
                            {habitName}
                        </Text>
                    </View>

                    {/* Statistics Cards */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginBottom: spacing.md,
                        }}
                    >
                        <View style={{ width: "50%", paddingRight: spacing.xs }}>
                            <Card variant="outlined" padding="sm">
                                <Text
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        color: colors.primary,
                                        textAlign: "center",
                                    }}
                                >
                                    {stats.currentStreak}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    Current Streak
                                </Text>
                            </Card>
                        </View>
                        <View style={{ width: "50%", paddingLeft: spacing.xs }}>
                            <Card variant="outlined" padding="sm">
                                <Text
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        color: colors.primary,
                                        textAlign: "center",
                                    }}
                                >
                                    {stats.longestStreak}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    Best Streak
                                </Text>
                            </Card>
                        </View>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                        }}
                    >
                        <View style={{ width: "50%", paddingRight: spacing.xs }}>
                            <Card variant="outlined" padding="sm">
                                <Text
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        color: colors.primary,
                                        textAlign: "center",
                                    }}
                                >
                                    {stats.completionRate}%
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    Completion Rate
                                </Text>
                            </Card>
                        </View>
                        <View style={{ width: "50%", paddingLeft: spacing.xs }}>
                            <Card variant="outlined" padding="sm">
                                <Text
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        color: colors.primary,
                                        textAlign: "center",
                                    }}
                                >
                                    {stats.completedDays}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.mutedForeground,
                                        textAlign: "center",
                                    }}
                                >
                                    Days Completed
                                </Text>
                            </Card>
                        </View>
                    </View>
                </View>

                {/* Calendar Component */}
                <HabitCalendar
                    calendarData={calendarData}
                    habitName={habitName}
                    onDayPress={(day) => {
                        console.log("Day pressed:", day);
                        // Handle day press - could show more details, allow editing, etc.
                    }}
                />

                {/* Additional Information */}
                <View style={{ padding: spacing.lg }}>
                    <Card variant="outlined" padding="md">
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "bold",
                                color: colors.foreground,
                                marginBottom: spacing.sm,
                            }}
                        >
                            Calendar Guide
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: colors.mutedForeground,
                                lineHeight: 20,
                            }}
                        >
                            • Green dots indicate completed days{"\n"}• Gray dots show
                            incomplete days{"\n"}• Glowing dots are part of your current
                            streak{"\n"}• Tap any day to see completion details{"\n"}• Days
                            with a border indicate today
                        </Text>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}
