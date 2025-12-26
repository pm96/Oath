/**
 * Optimized Habit Calendar with Virtualization
 *
 * High-performance calendar component with virtualization, lazy loading,
 * and smart rendering optimizations for smooth scrolling.
 * Requirements: Performance and scalability
 */

import { useThemeStyles } from "@/hooks/useTheme";
import { CalendarDay } from "@/types/habit-streaks";
import { getDayName, parseDateString } from "@/utils/dateUtils";
import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";

interface CalendarWeek {
    id: string;
    days: CalendarDay[];
    weekStartDate: string;
}

interface OptimizedHabitCalendarProps {
    calendarData: CalendarDay[];
    habitName?: string;
    onDayPress?: (day: CalendarDay) => void;
    style?: ViewStyle;
    enableVirtualization?: boolean;
    initialScrollIndex?: number;
}

/**
 * Memoized calendar day component for performance
 */
const CalendarDayItem = React.memo<{
    day: CalendarDay;
    daySize: number;
    onPress: (day: CalendarDay) => void;
    colors: any;
    spacing: any;
    borderRadius: any;
}>(({ day, daySize, onPress, colors, spacing, borderRadius }) => {
    const handlePress = useCallback(() => {
        if (day.date) {
            onPress(day);
        }
    }, [day, onPress]);

    const dayStyles = useMemo((): ViewStyle => {
        const baseStyles: ViewStyle = {
            width: daySize,
            height: daySize,
            borderRadius: borderRadius.sm,
            alignItems: "center",
            justifyContent: "center",
            margin: spacing.xs / 2,
            borderWidth: 1,
            borderColor: "transparent",
        };

        if (!day.date) {
            return {
                ...baseStyles,
                backgroundColor: "transparent",
            };
        }

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
            baseStyles.shadowColor = colors.primary;
            baseStyles.shadowOffset = { width: 0, height: 0 };
            baseStyles.shadowOpacity = 0.3;
            baseStyles.shadowRadius = 4;
            baseStyles.elevation = 2;
        }

        return baseStyles;
    }, [day, daySize, colors, spacing, borderRadius]);

    const textStyles = useMemo(
        () => ({
            fontSize: 12,
            fontWeight: day.isToday ? ("bold" as const) : ("normal" as const),
            color: day.completed ? colors.primaryForeground : colors.foreground,
        }),
        [day, colors],
    );

    const dayNumber = useMemo(() => {
        if (!day.date) return "";
        return parseDateString(day.date).getDate().toString();
    }, [day.date]);

    const completionIndicator = useMemo(() => {
        if (!day.date || !day.completed) return null;

        return (
            <View
                style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.primaryForeground,
                }}
            />
        );
    }, [day, colors]);

    if (!day.date) {
        return <View style={dayStyles} />;
    }

    return (
        <TouchableOpacity
            style={dayStyles}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Text style={textStyles}>{dayNumber}</Text>
            {completionIndicator}
        </TouchableOpacity>
    );
});

CalendarDayItem.displayName = "CalendarDayItem";

/**
 * Memoized calendar week component
 */
const CalendarWeekItem = React.memo<{
    week: CalendarWeek;
    daySize: number;
    onDayPress: (day: CalendarDay) => void;
    colors: any;
    spacing: any;
    borderRadius: any;
}>(({ week, daySize, onDayPress, colors, spacing, borderRadius }) => {
    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginBottom: spacing.xs,
                paddingHorizontal: spacing.sm,
            }}
        >
            {week.days.map((day, dayIndex) => (
                <CalendarDayItem
                    key={`${week.id}-${dayIndex}`}
                    day={day}
                    daySize={daySize}
                    onPress={onDayPress}
                    colors={colors}
                    spacing={spacing}
                    borderRadius={borderRadius}
                />
            ))}
        </View>
    );
});

CalendarWeekItem.displayName = "CalendarWeekItem";

export function OptimizedHabitCalendar({
    calendarData,
    habitName = "Habit",
    onDayPress,
    style,
    enableVirtualization = true,
    initialScrollIndex,
}: OptimizedHabitCalendarProps) {
    const { colors, spacing, borderRadius } = useThemeStyles();
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const screenWidth = Dimensions.get("window").width;
    const calendarPadding = spacing.md * 2;
    const availableWidth = screenWidth - calendarPadding;
    const daySize = Math.floor((availableWidth - spacing.xs * 6) / 7);

    // Get performance tier for optimization
    const performanceTier = getDevicePerformanceTier();
    const flatListProps = getOptimizedFlatListProps(performanceTier);

    // Group calendar data by weeks with memoization
    const weekGroups = useMemo((): CalendarWeek[] => {
        const weeks: CalendarWeek[] = [];
        let currentWeek: CalendarDay[] = [];
        let weekIndex = 0;

        calendarData.forEach((day, index) => {
            const dayOfWeek = day.date ? parseDateString(day.date).getDay() : 0;

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

                weeks.push({
                    id: `week-${weekIndex}`,
                    days: [...currentWeek],
                    weekStartDate: currentWeek.find((d) => d.date)?.date || "",
                });

                currentWeek = [];
                weekIndex++;
            }
        });

        return weeks;
    }, [calendarData]);

    // Optimized day press handler
    const handleDayPress = useCallback(
        (day: CalendarDay) => {
            setSelectedDay(day);
            setShowDetailModal(true);
            onDayPress?.(day);
        },
        [onDayPress],
    );

    // Optimized week renderer
    const renderWeek: ListRenderItem<CalendarWeek> = useCallback(
        ({ item: week }) => (
            <CalendarWeekItem
                week={week}
                daySize={daySize}
                onDayPress={handleDayPress}
                colors={colors}
                spacing={spacing}
                borderRadius={borderRadius}
            />
        ),
        [daySize, handleDayPress, colors, spacing, borderRadius],
    );

    // Get item layout for better performance
    const getItemLayout = useCallback(
        (data: any, index: number) => ({
            length: daySize + spacing.xs,
            offset: (daySize + spacing.xs) * index,
            index,
        }),
        [daySize, spacing],
    );

    // Key extractor
    const keyExtractor = useCallback((item: CalendarWeek) => item.id, []);

    // Week day headers
    const weekDayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Scroll to current week on mount
    useEffect(() => {
        if (initialScrollIndex !== undefined && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: initialScrollIndex,
                    animated: true,
                    viewPosition: 0.5,
                });
            }, 100);
        }
    }, [initialScrollIndex]);

    // Find current week index for auto-scroll
    const currentWeekIndex = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        return weekGroups.findIndex((week) =>
            week.days.some((day) => day.date === today),
        );
    }, [weekGroups]);

    return (
        <View style={[{ padding: spacing.md }, style]}>
            <Card variant="elevated" padding="md">
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: colors.foreground,
                        marginBottom: spacing.md,
                        textAlign: "center",
                    }}
                >
                    {habitName} - Calendar
                </Text>

                {/* Week day headers */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-around",
                        marginBottom: spacing.sm,
                        paddingHorizontal: spacing.sm,
                    }}
                >
                    {weekDayHeaders.map((day) => (
                        <Text
                            key={day}
                            style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: colors.mutedForeground,
                                width: daySize,
                                textAlign: "center",
                            }}
                        >
                            {day}
                        </Text>
                    ))}
                </View>

                {/* Virtualized calendar */}
                {enableVirtualization ? (
                    <FlatList
                        ref={flatListRef}
                        data={weekGroups}
                        renderItem={renderWeek}
                        keyExtractor={keyExtractor}
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 400 }}
                        initialScrollIndex={
                            currentWeekIndex > 0 ? currentWeekIndex : undefined
                        }
                        {...flatListProps}
                        getItemLayout={getItemLayout}
                    />
                ) : (
                    // Non-virtualized fallback for small datasets
                    <View style={{ maxHeight: 400 }}>
                        {weekGroups.map((week) => (
                            <CalendarWeekItem
                                key={week.id}
                                week={week}
                                daySize={daySize}
                                onDayPress={handleDayPress}
                                colors={colors}
                                spacing={spacing}
                                borderRadius={borderRadius}
                            />
                        ))}
                    </View>
                )}

                {/* Legend */}
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
                                backgroundColor: colors.primary,
                                marginBottom: spacing.xs / 2,
                            }}
                        />
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
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
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                            Incomplete
                        </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                        <View
                            style={{
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: colors.primary,
                                borderWidth: 2,
                                borderColor: colors.primary,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 2,
                                marginBottom: spacing.xs / 2,
                            }}
                        />
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                            Streak
                        </Text>
                    </View>
                </View>
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
                                        ? colors.primary
                                        : colors.muted,
                                    marginRight: spacing.sm,
                                }}
                            />
                            <Text style={{ fontSize: 16, color: colors.foreground }}>
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
                                    color: colors.primary,
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
