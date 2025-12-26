import { getDayName, parseDateString } from "@/utils/dateUtils";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    ScrollView,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { useThemeStyles } from "../../hooks/useTheme";
import { CalendarDay } from "../../types/habit-streaks";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { Text } from "../ui/Text";

export interface StreakCalendarProps {
    calendarData: CalendarDay[];
    habitName?: string;
    onDayPress?: (day: CalendarDay) => void;
    style?: ViewStyle;
    showLegend?: boolean;
    compact?: boolean;
}

/**
 * StreakCalendar Component
 *
 * Displays a 90-day grid calendar with completion status and streak highlighting
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function StreakCalendar({
    calendarData,
    habitName,
    onDayPress,
    style,
    showLegend = true,
    compact = false,
}: StreakCalendarProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const screenWidth = Dimensions.get("window").width;
    const calendarPadding = spacing.md * 2;
    const availableWidth = screenWidth - calendarPadding;
    const daySize = Math.floor((availableWidth - spacing.xs * 6) / 7); // 7 days per week

    // Group calendar data by weeks for display
    const weekGroups = useMemo(() => {
        const weeks: CalendarDay[][] = [];
        let currentWeek: CalendarDay[] = [];

        calendarData.forEach((day, index) => {
            const dayOfWeek = parseDateString(day.date).getDay();

            // If this is the first day and it's not Sunday, pad the beginning
            if (index === 0 && dayOfWeek !== 0) {
                for (let i = 0; i < dayOfWeek; i++) {
                    currentWeek.push({
                        date: "",
                        completed: false,
                        isToday: false,
                        isInStreak: false,
                    });
                }
            }

            currentWeek.push(day);

            // If we've reached Sunday or this is the last day, complete the week
            if (dayOfWeek === 6 || index === calendarData.length - 1) {
                // Pad the end if necessary
                while (currentWeek.length < 7) {
                    currentWeek.push({
                        date: "",
                        completed: false,
                        isToday: false,
                        isInStreak: false,
                    });
                }
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        return weeks;
    }, [calendarData]);

    const handleDayPress = (day: CalendarDay) => {
        if (!day.date) return; // Skip empty padding days

        setSelectedDay(day);
        setShowDetailModal(true);
        onDayPress?.(day);
    };

    const getDayStyles = (day: CalendarDay): ViewStyle => {
        const baseSize = compact ? daySize * 0.8 : daySize;
        const baseStyles: ViewStyle = {
            width: baseSize,
            height: baseSize,
            borderRadius: borderRadius.sm,
            alignItems: "center",
            justifyContent: "center",
            margin: spacing.xs / 2,
            borderWidth: 1,
            borderColor: "transparent",
        };

        if (!day.date) {
            // Empty padding day
            return {
                ...baseStyles,
                backgroundColor: "transparent",
            };
        }

        // Today indicator
        if (day.isToday) {
            baseStyles.borderColor = colors.primary;
            baseStyles.borderWidth = 2;
        }

        // Completion status
        if (day.completed) {
            baseStyles.backgroundColor = colors.success;
        } else {
            baseStyles.backgroundColor = colors.muted;
        }

        // Streak highlighting - Requirements: 2.5
        if (day.isInStreak && day.completed) {
            // Add a subtle glow effect for streak days
            baseStyles.shadowColor = colors.success;
            baseStyles.shadowOffset = { width: 0, height: 0 };
            baseStyles.shadowOpacity = 0.4;
            baseStyles.shadowRadius = 6;
            baseStyles.elevation = 3;
            // Add a subtle border for streak days
            baseStyles.borderWidth = 2;
            baseStyles.borderColor = colors.success;
        }

        return baseStyles;
    };

    const getDayTextStyles = (day: CalendarDay) => {
        if (!day.date) return { color: "transparent" };

        const fontSize = compact ? 10 : 12;

        return {
            fontSize,
            fontWeight: day.isToday ? ("bold" as const) : ("normal" as const),
            color: day.completed ? colors.successForeground : colors.foreground,
        };
    };

    const getDayNumber = (dateString: string): string => {
        if (!dateString) return "";
        const date = parseDateString(dateString);
        return date.getDate().toString();
    };

    const getCompletionIndicator = (day: CalendarDay) => {
        if (!day.date || !day.completed) return null;

        const indicatorSize = compact ? 4 : 6;

        return (
            <View
                style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: indicatorSize,
                    height: indicatorSize,
                    borderRadius: indicatorSize / 2,
                    backgroundColor: colors.successForeground,
                }}
            />
        );
    };

    const weekDayHeaders = compact
        ? ["S", "M", "T", "W", "T", "F", "S"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <View style={[{ padding: spacing.md }, style]}>
            <Card variant="elevated" padding={compact ? "sm" : "md"}>
                {!compact && habitName && (
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            color: colors.foreground,
                            marginBottom: spacing.md,
                            textAlign: "center",
                        }}
                    >
                        {habitName} - 90 Day Calendar
                    </Text>
                )}

                {/* Week day headers */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-around",
                        marginBottom: spacing.sm,
                    }}
                >
                    {weekDayHeaders.map((day) => (
                        <Text
                            key={day}
                            style={{
                                fontSize: compact ? 10 : 12,
                                fontWeight: "600",
                                color: colors.mutedForeground,
                                width: compact ? daySize * 0.8 : daySize,
                                textAlign: "center",
                            }}
                        >
                            {day}
                        </Text>
                    ))}
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: compact ? 200 : 400 }}
                >
                    {weekGroups.map((week, weekIndex) => (
                        <View
                            key={weekIndex}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-around",
                                marginBottom: spacing.xs,
                            }}
                        >
                            {week.map((day, dayIndex) => (
                                <TouchableOpacity
                                    key={`${weekIndex}-${dayIndex}`}
                                    style={getDayStyles(day)}
                                    onPress={() => handleDayPress(day)}
                                    disabled={!day.date}
                                    activeOpacity={0.7}
                                >
                                    <Text style={getDayTextStyles(day)}>
                                        {getDayNumber(day.date)}
                                    </Text>
                                    {getCompletionIndicator(day)}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </ScrollView>

                {/* Legend */}
                {showLegend && (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-around",
                            marginTop: spacing.md,
                            paddingTop: spacing.sm,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                        }}
                    >
                        <View style={{ alignItems: "center" }}>
                            <View
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: colors.success,
                                    marginBottom: spacing.xs / 2,
                                }}
                            />
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: colors.mutedForeground,
                                }}
                            >
                                Completed
                            </Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                            <View
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: colors.muted,
                                    marginBottom: spacing.xs / 2,
                                }}
                            />
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: colors.mutedForeground,
                                }}
                            >
                                Incomplete
                            </Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                            <View
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: colors.success,
                                    borderWidth: 2,
                                    borderColor: colors.success,
                                    shadowColor: colors.success,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    marginBottom: spacing.xs / 2,
                                }}
                            />
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: colors.mutedForeground,
                                }}
                            >
                                Streak
                            </Text>
                        </View>
                    </View>
                )}
            </Card>

            {/* Day Detail Modal */}
            <Modal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Day Details"
            >
                {selectedDay && (
                    <View style={{ padding: spacing.md }}>
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: "bold",
                                color: colors.foreground,
                                marginBottom: spacing.sm,
                            }}
                        >
                            {getDayName(selectedDay.date)} -{" "}
                            {parseDateString(selectedDay.date).toLocaleDateString()}
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
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: selectedDay.completed
                                        ? colors.success
                                        : colors.muted,
                                    marginRight: spacing.sm,
                                }}
                            />
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.foreground,
                                }}
                            >
                                {selectedDay.completed ? "Completed" : "Not Completed"}
                            </Text>
                        </View>

                        {selectedDay.isToday && (
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.primary,
                                    fontWeight: "600",
                                    marginBottom: spacing.sm,
                                }}
                            >
                                Today
                            </Text>
                        )}

                        {selectedDay.isInStreak && (
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.success,
                                    fontWeight: "600",
                                    marginBottom: spacing.sm,
                                }}
                            >
                                Part of current streak 🔥
                            </Text>
                        )}

                        {selectedDay.completionTime && (
                            <View style={{ marginBottom: spacing.sm }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: colors.foreground,
                                        marginBottom: spacing.xs / 2,
                                    }}
                                >
                                    Completed at:
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: colors.mutedForeground,
                                    }}
                                >
                                    {selectedDay.completionTime}
                                </Text>
                            </View>
                        )}

                        {selectedDay.notes && (
                            <View>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: colors.foreground,
                                        marginBottom: spacing.xs / 2,
                                    }}
                                >
                                    Notes:
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: colors.mutedForeground,
                                        fontStyle: "italic",
                                    }}
                                >
                                    {selectedDay.notes}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </Modal>
        </View>
    );
}
