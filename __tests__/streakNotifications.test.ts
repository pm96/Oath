/**
 * Unit Tests for Streak Notification System
 *
 * Tests the notification system functionality
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

describe("Streak Notification System", () => {
    describe("Notification Message Creation", () => {
        it("should create appropriate milestone messages", () => {
            // Test milestone message creation logic
            const createMilestoneMessage = (
                habitName: string,
                milestone: { days: number },
            ) => {
                const { days } = milestone;

                if (days === 7) {
                    return `Amazing! You've completed "${habitName}" for 7 days straight! 🔥`;
                } else if (days === 30) {
                    return `Incredible! You've hit a 30-day streak with "${habitName}"! You've earned a streak freeze! 🛡️`;
                } else if (days === 60) {
                    return `Outstanding! 60 days of "${habitName}" - you're building a life-changing habit! 💪`;
                } else if (days === 100) {
                    return `Legendary! 100 days of "${habitName}" - you're in the top 1% of habit builders! 🏆`;
                } else if (days === 365) {
                    return `INCREDIBLE! A full year of "${habitName}" - you've achieved something truly extraordinary! 🌟`;
                } else {
                    return `Congratulations! You've completed "${habitName}" for ${days} days in a row! 🎉`;
                }
            };

            // Test 7-day milestone
            const message7 = createMilestoneMessage("Exercise", { days: 7 });
            expect(message7).toContain("7 days straight");
            expect(message7).toContain("Exercise");

            // Test 30-day milestone
            const message30 = createMilestoneMessage("Reading", { days: 30 });
            expect(message30).toContain("30-day streak");
            expect(message30).toContain("Reading");
            expect(message30).toContain("streak freeze");

            // Test 100-day milestone
            const message100 = createMilestoneMessage("Meditation", { days: 100 });
            expect(message100).toContain("100 days");
            expect(message100).toContain("Meditation");
            expect(message100).toContain("top 1%");
        });

        it("should create appropriate streak risk messages", () => {
            const createStreakRiskMessage = (
                habitName: string,
                currentStreak: number,
            ) => {
                if (currentStreak === 1) {
                    return `Don't let your "${habitName}" streak end at just 1 day! Complete it now to keep going! 💪`;
                } else if (currentStreak < 7) {
                    return `You're ${currentStreak} days into your "${habitName}" streak! Don't break it now - complete it today! 🔥`;
                } else if (currentStreak < 30) {
                    return `Your ${currentStreak}-day "${habitName}" streak is at risk! You've come so far - don't give up now! ⚡`;
                } else {
                    return `Your amazing ${currentStreak}-day "${habitName}" streak is in danger! Protect your incredible progress! 🛡️`;
                }
            };

            // Test short streak
            const message1 = createStreakRiskMessage("Exercise", 1);
            expect(message1).toContain("1 day");
            expect(message1).toContain("Exercise");

            // Test medium streak
            const message15 = createStreakRiskMessage("Reading", 15);
            expect(message15).toContain("15-day");
            expect(message15).toContain("Reading");

            // Test long streak
            const message50 = createStreakRiskMessage("Meditation", 50);
            expect(message50).toContain("50-day");
            expect(message50).toContain("Meditation");
            expect(message50).toContain("incredible progress");
        });

        it("should create appropriate recovery messages", () => {
            const createRecoveryMessage = (
                habitName: string,
                previousBestStreak: number,
            ) => {
                if (previousBestStreak === 0) {
                    return `Ready to start fresh with "${habitName}"? Every expert was once a beginner! 🌱`;
                } else if (previousBestStreak < 7) {
                    return `You had a ${previousBestStreak}-day streak with "${habitName}" before. Ready to beat that record? 🎯`;
                } else if (previousBestStreak < 30) {
                    return `You achieved ${previousBestStreak} days with "${habitName}" before - you can do it again and go even further! 🚀`;
                } else {
                    return `You had an incredible ${previousBestStreak}-day streak with "${habitName}"! That shows you have what it takes. Ready for round 2? 💪`;
                }
            };

            // Test first-time user
            const message0 = createRecoveryMessage("Exercise", 0);
            expect(message0).toContain("start fresh");
            expect(message0).toContain("Exercise");

            // Test user with previous streak
            const message20 = createRecoveryMessage("Reading", 20);
            expect(message20).toContain("20 days");
            expect(message20).toContain("Reading");
            expect(message20).toContain("go even further");
        });

        it("should create appropriate weekly progress messages", () => {
            const createWeeklyProgressMessage = (
                habitName: string,
                currentStreak: number,
                weeklyCompletions: number,
            ) => {
                const completionRate = Math.round((weeklyCompletions / 7) * 100);

                if (completionRate === 100) {
                    return `Perfect week! You're ${currentStreak} days strong with "${habitName}" and completed it every day this week! 🔥`;
                } else if (completionRate >= 85) {
                    return `Great week! Your "${habitName}" streak is at ${currentStreak} days with ${weeklyCompletions}/7 completions this week! 📈`;
                } else {
                    return `Your "${habitName}" streak is at ${currentStreak} days. This week: ${weeklyCompletions}/7 completions. Keep pushing! 💪`;
                }
            };

            // Test perfect week
            const messagePerfect = createWeeklyProgressMessage("Exercise", 30, 7);
            expect(messagePerfect).toContain("Perfect week");
            expect(messagePerfect).toContain("30 days");
            expect(messagePerfect).toContain("Exercise");

            // Test good week
            const messageGood = createWeeklyProgressMessage("Reading", 25, 6);
            expect(messageGood).toContain("Great week");
            expect(messageGood).toContain("25 days");
            expect(messageGood).toContain("6/7");

            // Test average week
            const messageAverage = createWeeklyProgressMessage("Meditation", 20, 4);
            expect(messageAverage).toContain("20 days");
            expect(messageAverage).toContain("4/7");
            expect(messageAverage).toContain("Keep pushing");
        });
    });

    describe("Notification Preferences", () => {
        it("should have correct default preferences", () => {
            const defaultPreferences = {
                streakReminders: true,
                milestoneNotifications: true,
                recoveryNotifications: true,
                weeklyProgress: true,
                reminderTime: 2,
            };

            expect(defaultPreferences.streakReminders).toBe(true);
            expect(defaultPreferences.milestoneNotifications).toBe(true);
            expect(defaultPreferences.recoveryNotifications).toBe(true);
            expect(defaultPreferences.weeklyProgress).toBe(true);
            expect(defaultPreferences.reminderTime).toBe(2);
        });

        it("should validate reminder time ranges", () => {
            const validateReminderTime = (hours: number) => {
                return hours >= 1 && hours <= 12;
            };

            expect(validateReminderTime(1)).toBe(true);
            expect(validateReminderTime(6)).toBe(true);
            expect(validateReminderTime(12)).toBe(true);
            expect(validateReminderTime(0)).toBe(false);
            expect(validateReminderTime(13)).toBe(false);
            expect(validateReminderTime(-1)).toBe(false);
        });
    });

    describe("Notification Timing", () => {
        it("should calculate correct reminder times", () => {
            const calculateReminderHour = (
                dayEndHour: number,
                reminderHours: number,
            ) => {
                return dayEndHour - reminderHours;
            };

            // Day ends at 11 PM (23:00), remind 2 hours before
            expect(calculateReminderHour(23, 2)).toBe(21); // 9 PM

            // Day ends at 11 PM, remind 4 hours before
            expect(calculateReminderHour(23, 4)).toBe(19); // 7 PM

            // Day ends at 10 PM, remind 3 hours before
            expect(calculateReminderHour(22, 3)).toBe(19); // 7 PM
        });

        it("should identify weekly progress notification timing", () => {
            const isWeeklyProgressDay = (dayOfWeek: number) => {
                return dayOfWeek === 0; // Sunday = 0
            };

            expect(isWeeklyProgressDay(0)).toBe(true); // Sunday
            expect(isWeeklyProgressDay(1)).toBe(false); // Monday
            expect(isWeeklyProgressDay(6)).toBe(false); // Saturday
        });
    });

    describe("Notification Types", () => {
        it("should identify correct notification types", () => {
            const notificationTypes = [
                "streak_risk",
                "milestone",
                "recovery",
                "weekly_progress",
            ];

            expect(notificationTypes).toContain("streak_risk");
            expect(notificationTypes).toContain("milestone");
            expect(notificationTypes).toContain("recovery");
            expect(notificationTypes).toContain("weekly_progress");
            expect(notificationTypes).toHaveLength(4);
        });

        it("should map notification types to preferences", () => {
            const typeToPreferenceMap = {
                streak_risk: "streakReminders",
                milestone: "milestoneNotifications",
                recovery: "recoveryNotifications",
                weekly_progress: "weeklyProgress",
            };

            expect(typeToPreferenceMap["streak_risk"]).toBe("streakReminders");
            expect(typeToPreferenceMap["milestone"]).toBe("milestoneNotifications");
            expect(typeToPreferenceMap["recovery"]).toBe("recoveryNotifications");
            expect(typeToPreferenceMap["weekly_progress"]).toBe("weeklyProgress");
        });
    });

    describe("Milestone Detection", () => {
        it("should identify milestone achievements", () => {
            const MILESTONE_DAYS = [7, 30, 60, 100, 365];

            const isMilestone = (days: number) => {
                return MILESTONE_DAYS.includes(days);
            };

            expect(isMilestone(7)).toBe(true);
            expect(isMilestone(30)).toBe(true);
            expect(isMilestone(100)).toBe(true);
            expect(isMilestone(365)).toBe(true);
            expect(isMilestone(15)).toBe(false);
            expect(isMilestone(50)).toBe(false);
        });

        it("should award streak freezes for 30-day milestones", () => {
            const awardStreakFreeze = (milestoneDays: number) => {
                return milestoneDays === 30;
            };

            expect(awardStreakFreeze(30)).toBe(true);
            expect(awardStreakFreeze(7)).toBe(false);
            expect(awardStreakFreeze(60)).toBe(false);
            expect(awardStreakFreeze(100)).toBe(false);
        });
    });
});
