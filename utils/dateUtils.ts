import { Timestamp } from "firebase/firestore";

/**
 * Date utility functions for habit tracking with timezone awareness
 */

/**
 * Get the current date in YYYY-MM-DD format for a specific timezone
 */
export const getCurrentDateString = (timezone: string = "UTC"): string => {
    const now = new Date();
    return formatDateToString(now, timezone);
};

/**
 * Format a Date object to YYYY-MM-DD string in a specific timezone
 */
export const formatDateToString = (
    date: Date,
    timezone: string = "UTC",
): string => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return formatter.format(date);
};

/**
 * Parse a YYYY-MM-DD string to a Date object
 */
export const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Get the user's current timezone
 */
export const getUserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Check if a timestamp is within the current day in a specific timezone
 */
export const isTimestampInCurrentDay = (
    timestamp: Timestamp,
    timezone: string,
): boolean => {
    const timestampDate = timestamp.toDate();
    const currentDateString = getCurrentDateString(timezone);
    const timestampDateString = formatDateToString(timestampDate, timezone);

    return currentDateString === timestampDateString;
};

/**
 * Check if two dates are consecutive days
 */
export const areConsecutiveDays = (date1: string, date2: string): boolean => {
    const d1 = parseDateString(date1);
    const d2 = parseDateString(date2);

    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays === 1;
};

/**
 * Get the difference in days between two date strings
 */
export const getDaysDifference = (
    startDate: string,
    endDate: string,
): number => {
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate an array of date strings for a given range
 */
export const generateDateRange = (
    startDate: string,
    endDate: string,
): string[] => {
    const dates: string[] = [];
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);

    const current = new Date(start);
    while (current <= end) {
        dates.push(formatDateToString(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
};

/**
 * Get the date string for N days ago from today
 */
export const getDateNDaysAgo = (
    days: number,
    timezone: string = "UTC",
): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDateToString(date, timezone);
};

/**
 * Get the date string for N days from today
 */
export const getDateNDaysFromNow = (
    days: number,
    timezone: string = "UTC",
): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return formatDateToString(date, timezone);
};

/**
 * Check if a date string represents today in a specific timezone
 */
export const isToday = (dateString: string, timezone: string): boolean => {
    const today = getCurrentDateString(timezone);
    return dateString === today;
};

/**
 * Get the day of the week for a date string (0 = Sunday, 6 = Saturday)
 */
export const getDayOfWeek = (dateString: string): number => {
    const date = parseDateString(dateString);
    return date.getDay();
};

/**
 * Get the day name for a date string
 */
export const getDayName = (dateString: string): string => {
    const date = parseDateString(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
};

/**
 * Validate if a string is in YYYY-MM-DD format
 */
export const isValidDateString = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false;
    }

    const [year, month, day] = dateString.split("-").map(Number);

    // Check basic ranges
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Create date and check if it matches the input (handles invalid dates like Feb 30)
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

/**
 * Get the start and end dates for a calendar view (90 days)
 */
export const getCalendarDateRange = (
    timezone: string = "UTC",
): { start: string; end: string } => {
    const end = getCurrentDateString(timezone);
    const start = getDateNDaysAgo(89, timezone); // 90 days total including today

    return { start, end };
};

/**
 * Convert Firestore Timestamp to date string in timezone
 */
export const timestampToDateString = (
    timestamp: Timestamp,
    timezone: string,
): string => {
    return formatDateToString(timestamp.toDate(), timezone);
};

/**
 * Create a Firestore Timestamp from a date string and time
 */
export const createTimestampFromDateTime = (
    dateString: string,
    timeString: string,
    timezone: string,
): Timestamp => {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hours, minutes] = timeString.split(":").map(Number);

    // Create date in the specified timezone
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(hours, minutes, 0, 0);

    return Timestamp.fromDate(date);
};

/**
 * Get the time remaining until end of day in a timezone (in hours)
 */
export const getHoursUntilEndOfDay = (timezone: string): number => {
    const now = new Date();
    const endOfDay = new Date();

    // Set to end of day in the specified timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
    });

    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = endOfDay.getTime() - now.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
};
