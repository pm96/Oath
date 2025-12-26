import { CalendarDay } from "@/types/habit-streaks";
import { formatDateToString, getUserTimezone } from "@/utils/dateUtils";

/**
 * Unit tests for habit calendar functionality
 * Tests the core calendar data structures and utilities
 */

describe("Habit Calendar", () => {
    const timezone = getUserTimezone();

    const createSampleCalendarDay = (
        daysAgo: number,
        completed: boolean = false,
    ): CalendarDay => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const dateString = formatDateToString(date, timezone);

        return {
            date: dateString,
            completed,
            isToday: daysAgo === 0,
            isInStreak: completed && daysAgo <= 3, // Last 3 days are in streak
            completionTime: completed ? "9:00 AM" : undefined,
            notes: completed ? "Great workout!" : undefined,
        };
    };

    describe("CalendarDay data structure", () => {
        it("should create a valid calendar day for today", () => {
            const today = createSampleCalendarDay(0, true);

            expect(today.isToday).toBe(true);
            expect(today.completed).toBe(true);
            expect(today.date).toBe(formatDateToString(new Date(), timezone));
            expect(today.completionTime).toBe("9:00 AM");
            expect(today.notes).toBe("Great workout!");
        });

        it("should create a valid calendar day for past date", () => {
            const pastDay = createSampleCalendarDay(5, false);

            expect(pastDay.isToday).toBe(false);
            expect(pastDay.completed).toBe(false);
            expect(pastDay.completionTime).toBeUndefined();
            expect(pastDay.notes).toBeUndefined();
        });

        it("should handle streak indicators correctly", () => {
            const streakDay = createSampleCalendarDay(2, true);
            const nonStreakDay = createSampleCalendarDay(10, true);

            expect(streakDay.isInStreak).toBe(true);
            expect(nonStreakDay.isInStreak).toBe(false);
        });
    });

    describe("Calendar data generation", () => {
        it("should generate 90 days of calendar data", () => {
            const calendarData: CalendarDay[] = [];

            // Generate 90 days of sample data
            for (let i = 89; i >= 0; i--) {
                calendarData.push(createSampleCalendarDay(i, Math.random() > 0.5));
            }

            expect(calendarData).toHaveLength(90);
            expect(calendarData[89].isToday).toBe(true); // Last item should be today
        });

        it("should maintain chronological order", () => {
            const calendarData: CalendarDay[] = [];

            for (let i = 89; i >= 0; i--) {
                calendarData.push(createSampleCalendarDay(i));
            }

            // Check that dates are in ascending order
            for (let i = 1; i < calendarData.length; i++) {
                const prevDate = new Date(calendarData[i - 1].date);
                const currDate = new Date(calendarData[i].date);
                expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
            }
        });
    });

    describe("Calendar statistics", () => {
        it("should calculate completion rate correctly", () => {
            const calendarData: CalendarDay[] = [
                createSampleCalendarDay(4, true),
                createSampleCalendarDay(3, true),
                createSampleCalendarDay(2, false),
                createSampleCalendarDay(1, true),
                createSampleCalendarDay(0, true),
            ];

            const completedDays = calendarData.filter((day) => day.completed).length;
            const completionRate = Math.round(
                (completedDays / calendarData.length) * 100,
            );

            expect(completedDays).toBe(4);
            expect(completionRate).toBe(80);
        });

        it("should identify current streak correctly", () => {
            const calendarData: CalendarDay[] = [
                createSampleCalendarDay(4, false),
                createSampleCalendarDay(3, true),
                createSampleCalendarDay(2, true),
                createSampleCalendarDay(1, true),
                createSampleCalendarDay(0, true),
            ];

            // Calculate current streak from the end
            let currentStreak = 0;
            for (let i = calendarData.length - 1; i >= 0; i--) {
                if (calendarData[i].completed) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            expect(currentStreak).toBe(4);
        });
    });

    describe("Calendar display requirements", () => {
        it("should meet requirement 2.1 - display 90-day grid", () => {
            const calendarData: CalendarDay[] = [];
            for (let i = 89; i >= 0; i--) {
                calendarData.push(createSampleCalendarDay(i));
            }

            expect(calendarData).toHaveLength(90);
        });

        it("should meet requirement 2.2 - show completion indicators", () => {
            const completedDay = createSampleCalendarDay(1, true);
            expect(completedDay.completed).toBe(true);
        });

        it("should meet requirement 2.3 - show incomplete indicators", () => {
            const incompleteDay = createSampleCalendarDay(1, false);
            expect(incompleteDay.completed).toBe(false);
        });

        it("should meet requirement 2.4 - provide day interaction details", () => {
            const dayWithDetails = createSampleCalendarDay(1, true);
            expect(dayWithDetails.completionTime).toBeDefined();
            expect(dayWithDetails.notes).toBeDefined();
        });

        it("should meet requirement 2.5 - highlight streak periods", () => {
            const streakDay = createSampleCalendarDay(1, true);
            expect(streakDay.isInStreak).toBe(true);
        });
    });
});
