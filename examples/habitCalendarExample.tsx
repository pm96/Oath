import {
    HabitCalendar,
    HabitCalendarScreen,
    HabitCalendarWidget,
} from "@/components/habits";
import { CalendarDay } from "@/types/habit-streaks";
import { formatDateToString, getUserTimezone } from "@/utils/dateUtils";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../components/ui/Button";

/**
 * Example usage of the Habit Calendar components
 * This demonstrates all the calendar visualization features
 */
export function HabitCalendarExample() {
    const [showFullScreen, setShowFullScreen] = useState(false);

    // Generate sample calendar data for demonstration
    const generateSampleCalendarData = (): CalendarDay[] => {
        const data: CalendarDay[] = [];
        const timezone = getUserTimezone();
        const today = new Date();

        // Generate 90 days of sample data
        for (let i = 89; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = formatDateToString(date, timezone);

            // Simulate completion pattern (70% completion rate with some streaks)
            const isCompleted = Math.random() > 0.3;
            const isToday = i === 0;

            // Simulate current streak (last 5 days completed)
            const isInCurrentStreak = i <= 4 && isCompleted;

            data.push({
                date: dateString,
                completed: isCompleted,
                isToday,
                isInStreak: isInCurrentStreak,
                completionTime: isCompleted
                    ? `${Math.floor(Math.random() * 12) + 8}:${Math.floor(
                        Math.random() * 60,
                    )
                        .toString()
                        .padStart(2, "0")} ${Math.random() > 0.5 ? "AM" : "PM"}`
                    : undefined,
                notes:
                    isCompleted && Math.random() > 0.7
                        ? "Great workout today!"
                        : undefined,
            });
        }

        return data;
    };

    const sampleData = generateSampleCalendarData();

    if (showFullScreen) {
        return (
            <HabitCalendarScreen
                habitId="sample-habit-id"
                userId="sample-user-id"
                habitName="Morning Exercise"
                onBack={() => setShowFullScreen(false)}
            />
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
            <View style={{ padding: 16 }}>
                <Text
                    style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        marginBottom: 16,
                        textAlign: "center",
                    }}
                >
                    Habit Calendar Examples
                </Text>

                {/* Calendar Widget Example */}
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "600",
                        marginBottom: 8,
                        marginTop: 16,
                    }}
                >
                    1. Calendar Widget (Compact)
                </Text>
                <Text
                    style={{
                        fontSize: 14,
                        color: "#666",
                        marginBottom: 12,
                    }}
                >
                    Shows the last 14 days in a compact horizontal layout
                </Text>
                <HabitCalendarWidget
                    calendarData={sampleData}
                    habitName="Morning Exercise"
                    onPress={() => setShowFullScreen(true)}
                    onDayPress={(day) => {
                        console.log("Widget day pressed:", day);
                    }}
                />

                {/* Full Calendar Example */}
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "600",
                        marginBottom: 8,
                        marginTop: 24,
                    }}
                >
                    2. Full Calendar Component
                </Text>
                <Text
                    style={{
                        fontSize: 14,
                        color: "#666",
                        marginBottom: 12,
                    }}
                >
                    Shows all 90 days in a grid layout with interactive day details
                </Text>
                <HabitCalendar
                    calendarData={sampleData}
                    habitName="Morning Exercise"
                    onDayPress={(day) => {
                        console.log("Calendar day pressed:", day);
                    }}
                />

                {/* Full Screen Example */}
                <Text
                    style={{
                        fontSize: 18,
                        fontWeight: "600",
                        marginBottom: 8,
                        marginTop: 24,
                    }}
                >
                    3. Full Screen Calendar
                </Text>
                <Text
                    style={{
                        fontSize: 14,
                        color: "#666",
                        marginBottom: 12,
                    }}
                >
                    Complete calendar screen with statistics and navigation
                </Text>
                <Button onPress={() => setShowFullScreen(true)}>
                    Open Full Screen Calendar
                </Button>

                {/* Feature Highlights */}
                <View
                    style={{
                        marginTop: 32,
                        padding: 16,
                        backgroundColor: "white",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#e0e0e0",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "600",
                            marginBottom: 12,
                        }}
                    >
                        Calendar Features Implemented:
                    </Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: "#333" }}>
                        ✅ 90-day grid display (Requirement 2.1){"\n"}✅ Green dots for
                        completed days (Requirement 2.2){"\n"}✅ Gray indicators for
                        incomplete days (Requirement 2.3){"\n"}✅ Interactive day details
                        with time and notes (Requirement 2.4){"\n"}✅ Streak period
                        highlighting with glow effect (Requirement 2.5){"\n"}✅ Responsive
                        mobile layout{"\n"}✅ Today indicator with border{"\n"}✅ Modal for
                        detailed day information{"\n"}✅ Compact widget for embedding{"\n"}
                        ✅ Statistics display{"\n"}✅ Pull-to-refresh functionality{"\n"}✅
                        Accessibility support
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}
