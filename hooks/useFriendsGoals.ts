import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GoalStatus, GoalWithOwner, User } from "../services/firebase/collections";
import {
    sendNudge,
    SendNudgeInput,
    subscribeToNudgeCooldowns,
} from "../services/firebase/nudgeService";
import {
    fetchFriendsGoalsOnce,
    getFriendsGoals,
    subscribeToUserData,
    toggleGoalHighFive,
} from "../services/firebase/socialService";
import { getUserFriendlyErrorMessage } from "../utils/errorHandling";
import { showErrorToast } from "../utils/toast";
import { calculateStatus } from "../utils/goalStatusCalculator";
import { debounce } from "../utils/performance";
import { useAuth } from "./useAuth";

/**
 * Interface combining goal data with owner information and calculated status
 * Used for displaying friends' goals with real-time status and nudge capabilities
 */
export interface GoalWithOwnerAndStatus extends GoalWithOwner {
    status: GoalStatus;
    canNudge: boolean;
    cooldownRemaining?: number; // minutes
}

/**
 * Custom hook for managing friends' goals with real-time Firestore listeners,
 * status calculation, nudge functionality, and offline state management
 * Requirements: 1.1, 1.5, 3.5, 4.1, 4.4, 6.1, 6.4, 6.5, 7.1, 7.2, 7.4
 */
export function useFriendsGoals() {
    const { user } = useAuth();
    const [friendsGoals, setFriendsGoals] = useState<GoalWithOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [nudgeCooldowns, setNudgeCooldowns] = useState<Map<string, Date>>(
        new Map(),
    );
    const [nudgeLoading, setNudgeLoading] = useState<Set<string>>(new Set());
    const [currentUserData, setCurrentUserData] = useState<User | null>(null);

    // Add network state and offline caching - Requirement 6.5
    const [isOnline, setIsOnline] = useState(true);
    const [cachedGoals, setCachedGoals] = useState<GoalWithOwner[]>([]);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

    // Monitor network connectivity - Requirement 6.5
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const wasOffline = !isOnline;
            const isNowOnline = state.isConnected ?? true;

            setIsOnline(isNowOnline);

            // If coming back online, refresh data
            if (wasOffline && isNowOnline) {
                setLastUpdateTime(new Date());
            }
        });

        return unsubscribe;
    }, [isOnline]);

    // Real-time status recalculation timer with debouncing - Requirements 6.4, 7.4
    const debouncedStatusUpdate = useMemo(
        () => debounce(() => setLastUpdateTime(new Date()), 1000),
        [],
    );

    useEffect(() => {
        // Update status every minute to handle deadline approaches
        const interval = setInterval(() => {
            debouncedStatusUpdate();
        }, 60000); // 1 minute

        return () => {
            clearInterval(interval);
        };
    }, [debouncedStatusUpdate]);

    // Subscribe to current user's data to track friends list
    useEffect(() => {
        if (!user?.uid) {
            setFriendIds([]);
            setFriendsGoals([]);
            setCurrentUserData(null);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserData(
            user.uid,
            (data) => {
                setCurrentUserData(data);
                setFriendIds(data?.friends || []);
            },
            (err) => {
                const error =
                    err instanceof Error ? err : new Error("Failed to load user data");
                setError(error);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [user?.uid]);

    // Subscribe to friends' goals with real-time updates
    useEffect(() => {
        if (!user || friendIds.length === 0) {
            setFriendsGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Subscribe to real-time updates for friends' goals with error handling
        // Requirement 1.1: Display all goals where ownerId matches any userId in friends array
        const unsubscribe = getFriendsGoals(
            friendIds,
            (updatedGoals) => {
                setFriendsGoals(updatedGoals);
                // Cache the data for offline use - Requirement 6.5
                setCachedGoals(updatedGoals);
                setLoading(false);
                setError(null);
                setLastUpdateTime(new Date());
            },
            (err) => {
                console.error("Error loading friends goals:", err);
                setError(err);
                setLoading(false);

                // If offline, don't show error if we have cached data
                if (!isOnline && cachedGoals.length > 0) {
                    setError(null);
                    setFriendsGoals(cachedGoals);
                }
            },
        );

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
        };
    }, [user, friendIds, isOnline]);

    // Subscribe to nudge cooldowns with real-time updates
    useEffect(() => {
        if (!user) {
            setNudgeCooldowns(new Map());
            return;
        }

        // Subscribe to real-time cooldown updates
        // Requirement 4.4: Display remaining cooldown time in real-time
        const unsubscribe = subscribeToNudgeCooldowns(
            user.uid,
            (cooldowns) => {
                setNudgeCooldowns(cooldowns);
            },
            (err) => {
                console.error("Error loading nudge cooldowns:", err);
                // Don't set error state for cooldowns as it's not critical
            },
        );

        return () => {
            unsubscribe();
        };
    }, [user]);

    /**
     * Calculate status for each goal and determine nudge availability with real-time updates
     * Requirements: 6.4, 7.1, 7.2, 7.4 - Sort goals by urgency with automatic re-sorting
     * Optimized with memoization to prevent expensive recalculations
     */
    const sortedGoals = useMemo((): GoalWithOwnerAndStatus[] => {
        // Use cached data if offline, otherwise use live data
        const goalsToProcess =
            !isOnline && cachedGoals.length > 0 ? cachedGoals : friendsGoals;

        if (!goalsToProcess.length) return [];

        const goalsWithStatus = goalsToProcess.map(
            (goal): GoalWithOwnerAndStatus => {
                // Recalculate status in real-time - Requirements 6.1, 6.4
                const status = calculateStatus(goal);
                const cooldownEnd = nudgeCooldowns.get(goal.id);
                const now = new Date();

                // Check if nudge is available (no cooldown or cooldown expired)
                const canNudge =
                    status.showNudge && (!cooldownEnd || now > cooldownEnd);

                // Calculate remaining cooldown time in minutes
                let cooldownRemaining: number | undefined;
                if (cooldownEnd && now < cooldownEnd) {
                    cooldownRemaining = Math.ceil(
                        (cooldownEnd.getTime() - now.getTime()) / (1000 * 60),
                    );
                }

                return {
                    ...goal,
                    status,
                    canNudge,
                    cooldownRemaining,
                };
            },
        );

        // Sort by urgency: red (priority 1) → yellow (priority 2) → green (priority 3)
        // Secondary sort by deadline proximity (soonest first)
        // Requirement 7.4: Automatic re-sorting when statuses change
        return goalsWithStatus.sort((a, b) => {
            // First sort by status priority (1=red, 2=yellow, 3=green)
            if (a.status.priority !== b.status.priority) {
                return a.status.priority - b.status.priority;
            }

            // Then sort by deadline proximity (soonest first)
            return a.nextDeadline.getTime() - b.nextDeadline.getTime();
        });
    }, [friendsGoals, cachedGoals, nudgeCooldowns, isOnline]);

    /**
     * Send a nudge to a friend about their goal
     * Requirements: 3.5 - Display success toast, 4.1 - Enforce cooldown
     */
    const sendNudgeToFriend = useCallback(
        async (goalId: string, friendId: string): Promise<void> => {
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Find the goal to get details
            const goal = friendsGoals.find(
                (g) => g.id === goalId && g.ownerId === friendId,
            );
            if (!goal) {
                throw new Error("Goal not found");
            }

            // Check if already sending nudge for this goal
            if (nudgeLoading.has(goalId)) {
                throw new Error("Nudge already being sent");
            }

            try {
                // Add to loading set
                setNudgeLoading((prev) => new Set(prev).add(goalId));

                const nudgeInput: SendNudgeInput = {
                    senderId: user.uid,
                    senderName:
                        currentUserData?.displayName ||
                        user.displayName ||
                        user.email ||
                        "Friend",
                    receiverId: friendId,
                    goalId: goalId,
                    goalDescription: goal.description,
                };

                await sendNudge(nudgeInput);

                // Success - the real-time listener will update cooldowns automatically
            } catch (error) {
                // Re-throw with user-friendly message
                const message = getUserFriendlyErrorMessage(error);
                throw new Error(message);
            } finally {
                // Remove from loading set
                setNudgeLoading((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(goalId);
                    return newSet;
                });
            }
        },
        [user, friendsGoals, nudgeLoading],
    );

    /**
     * Check if a nudge can be sent for a specific goal
     * Requirements: 4.1 - Check cooldown status
     */
    const canNudgeGoal = useCallback(
        (goalId: string): boolean => {
            const cooldownEnd = nudgeCooldowns.get(goalId);
            if (!cooldownEnd) return true;

            const now = new Date();
            return now > cooldownEnd;
        },
        [nudgeCooldowns],
    );

    /**
     * Refresh friends' goals data
     * Requirement 11.2: Add pull-to-refresh functionality
     */
    const refresh = async () => {
        setLastUpdateTime(new Date());

        if (!user || friendIds.length === 0) {
            return;
        }

        if (!isOnline) {
            setLoading(true);
            setTimeout(() => setLoading(false), 150);
            return;
        }

        setLoading(true);
        try {
            const freshGoals = await fetchFriendsGoalsOnce(friendIds);
            setFriendsGoals(freshGoals);
        } catch (error) {
            console.error("Error refreshing friends goals:", error);
            setError(
                error instanceof Error
                    ? error
                    : new Error("Failed to refresh friends goals"),
            );
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle high-five on a friend's goal
     */
    const toggleHighFive = useCallback(
        async (goalId: string) => {
            if (!user) return;

            const goal = sortedGoals.find((g) => g.id === goalId);
            if (!goal) return;

            const isHighFived = (goal.highFives || []).includes(user.uid);

            try {
                await toggleGoalHighFive(goalId, user.uid, isHighFived);
            } catch (error) {
                console.error("Failed to toggle high-five:", error);
                showErrorToast("Failed to update high-five");
            }
        },
        [user, sortedGoals],
    );

    return {
        // Existing
        friendsGoals:
            !isOnline && cachedGoals.length > 0 ? cachedGoals : friendsGoals,
        loading,
        error,
        friendIds,
        refresh,

        // New additions
        sortedGoals,
        nudgeCooldowns,
        sendNudge: sendNudgeToFriend,
        canNudge: canNudgeGoal,
        toggleHighFive,
        nudgeLoading: Array.from(nudgeLoading), // Convert Set to Array for easier consumption

        // Offline state - Requirement 6.5
        isOnline,
        hasOfflineData: !isOnline && cachedGoals.length > 0,
        lastUpdateTime,
    };
}
