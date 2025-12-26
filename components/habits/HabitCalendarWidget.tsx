import { useThemeStyles } from "@/hooks/useTheme";
import { CalendarDay } from "@/types/habit-streaks";
import { parseDateString } from "@/utils/dateUtils";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Card } from "../ui/Card";

export interface HabitCalendarWidgetProps {
    calendarData: CalendarDay[];
    habitName?: string;
    onPress?: () => void;
    onDayPress?: (day: CalendarDay) => void;
    style?: ViewStyle;
    showTitle?: boolean;
    daysToShow?: number;
}

/**
 * Compact calendar widget for embedding in other screens
 * Shows the last N days in a horizontal scrollable view
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
export function HabitCalendarWidget({
    calendarData,
    habitName,
    onPress,
    onDayPress,
    style,
    showTitle = true,
    daysToShow = 14,
}: HabitCalendarWidgetProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();

    // Get the most recent days for the widget
    const recentDays = useMemo(() => {
        return calendarData.slice(-daysToShow);
    }, [calendarData, daysToShow]);

    const daySize = 32;

    const getDayStyles = (day: CalendarDay): ViewStyle => {
        const baseStyles: ViewStyle = {
            width: daySize,
            height: daySize,
            borderRadius: borderRadius.sm,
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: spacing.xs / 2,
            borderWidth: 1,
            borderColor: "transparent",
        };

        if (day.isToday) {
            baseStyles.borderColor = colors.primary;
            baseStyles.borderWidth = 2;
        }

        if (day.completed) {
            baseStyles.backgroundColor = colors.primary;
        } else {
            baseStyles.backgroundColor = colors.muted;
        }

        if (day.isInStreak && day.completed) {
            // Add a subtle glow effect for streak days
            baseStyles.shadowColor = colors.primary;
            baseStyles.shadowOffset = { width: 0, height: 0 };
            baseStyles.shadowOpacity = 0.2;
            baseStyles.shadowRadius = 2;
            baseStyles.elevation = 1;
        }

        return baseStyles;
    };

    const getDayTextStyles = (day: CalendarDay) => {
        return {
            fontSize: 10,
            fontWeight: day.isToday ? ("bold" as const) : ("normal" as const),
            color: day.completed ? colors.primaryForeground : colors.foreground,
        };
    };

    const getDayNumber = (dateString: string): string => {
        const date = parseDateString(dateString);
        return date.getDate().toString();
    };

    const handleDayPress = (day: CalendarDay) => {
        onDayPress?.(day);
    };

    const completedCount = recentDays.filter((day) => day.completed).length;
    const completionRate = Math.round((completedCount / recentDays.length) * 100);

    return (
        <Card variant="outlined" padding="md" style={style} onPress={onPress}>
            {showTitle && (
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: colors.foreground,
                        }}
                    >
                        {habitName || "Habit Calendar"}
                    </Text>
                    <Text
                        style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                        }}
                    >
                        {completionRate}% ({completedCount}/{recentDays.length})
                    </Text>
                </View>
            )}

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {recentDays.map((day, index) => (
                    <TouchableOpacity
                        key={`${day.date}-${index}`}
                        style={getDayStyles(day)}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={0.7}
                    >
                        <Text style={getDayTextStyles(day)}>{getDayNumber(day.date)}</Text>
                        {day.completed && (
                            <View
                                style={{
                                    position: "absolute",
                                    top: 1,
                                    right: 1,
                                    width: 4,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: colors.primaryForeground,
                                }}
                            />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {onPress && (
                <TouchableOpacity
                    style={{
                        marginTop: spacing.sm,
                        alignItems: "center",
                    }}
                    onPress={onPress}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: colors.primary,
                            fontWeight: "600",
                        }}
                    >
                        View Full Calendar →
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
}
