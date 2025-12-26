/**
 * Lazy Loading Service for Historical Data
 */

import { CalendarDay } from "../../types/habit-streaks";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";
import { optimizedStreakService } from "./optimizedStreakService";

interface LoadingState {
    isLoading: boolean;
    loadedRanges: {
        startDate: string;
        endDate: string;
        dataType: string;
    }[];
    totalItems: number;
    loadedItems: number;
    error?: string;
}

export class LazyLoadingService {
    private static instance: LazyLoadingService;
    private loadingStates = new Map<string, LoadingState>();

    private constructor() { }

    public static getInstance(): LazyLoadingService {
        if (!LazyLoadingService.instance) {
            LazyLoadingService.instance = new LazyLoadingService();
        }
        return LazyLoadingService.instance;
    }

    async loadCalendarData(
        habitId: string,
        userId: string,
        totalDays: number = 90,
    ): Promise<CalendarDay[]> {
        const stateKey = `calendar:${userId}:${habitId}`;

        try {
            this.updateLoadingState(stateKey, {
                isLoading: true,
                loadedRanges: [],
                totalItems: totalDays,
                loadedItems: 0,
            });

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const calendarData = await optimizedStreakService.getHabitCalendar(
                habitId,
                userId,
                totalDays,
                timezone,
            );

            this.updateLoadingState(stateKey, {
                isLoading: false,
                totalItems: totalDays,
                loadedItems: calendarData.length,
            });

            return calendarData;
        } catch (error) {
            const message = getUserFriendlyErrorMessage(error);
            this.updateLoadingState(stateKey, {
                isLoading: false,
                loadedRanges: [],
                totalItems: totalDays,
                loadedItems: 0,
                error: message,
            });
            throw new Error(`Failed to load calendar data: ${message}`);
        }
    }

    getLoadingState(key: string): LoadingState {
        return (
            this.loadingStates.get(key) || {
                isLoading: false,
                loadedRanges: [],
                totalItems: 0,
                loadedItems: 0,
            }
        );
    }

    clearLoadingStates(): void {
        this.loadingStates.clear();
    }

    private updateLoadingState(
        key: string,
        updates: Partial<LoadingState>,
    ): void {
        const currentState = this.getLoadingState(key);
        const newState = { ...currentState, ...updates };
        this.loadingStates.set(key, newState);
    }
}

export const lazyLoadingService = LazyLoadingService.getInstance();
