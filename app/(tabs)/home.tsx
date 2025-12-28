import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { HabitCreationModal, HabitInput } from "@/components/habits";
import {
    AnimatedView,
    Body,
    Button,
    Caption,
    Card,
    Container,
    HStack,
    Heading,
    LoadingSkeleton,
    NotificationBadge,
    PaywallModal,
    Progress,
    VStack,
} from "@/components/ui";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useCelebration } from "@/contexts/CelebrationContext";
import { useAuth } from "@/hooks/useAuth";
import { GoalWithStreak, useGoals } from "@/hooks/useGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { getNudgesCollection } from "@/services/firebase/collections";
import { GoalInput } from "@/services/firebase/goalService";
import { HapticFeedback } from "@/utils/celebrations";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router } from "expo-router";
import { onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { Bell, Check, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    RefreshControl,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

/**
 * Modern redesigned Home screen
 * Requirements: 7.1, 7.3 - Clean habit tracking interface with progress indicators
 */
export default function Home() {
    const { user } = useAuth();
    const {
        goals,
        loading,
        createGoal,
        completeGoal,
        undoGoalCompletion,
        deleteGoal,
        refresh,
    } = useGoals();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const { colors, spacing } = useThemeStyles();
    const { triggerCelebration } = useCelebration();

    const openSwipeableRowRef = useRef<Swipeable | null>(null);

    const handleOpenCreate = () => {
        // Simulated 'Pro' check.
        const isPro = false; 
        if (goals.length >= 3 && !isPro) {
            setShowPaywall(true);
        } else {
            setShowCreateForm(true);
        }
    };

    // Subscribe to unread notifications (recent nudges)
    useEffect(() => {
        if (!user?.uid) return;

        const nudgesRef = getNudgesCollection();
        const q = query(
            nudgesRef,
            where("receiverId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotificationCount(snapshot.size);
        }, (error) => {
            console.error("Error listening for nudges:", error);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // ... (rest of the component)

    // Get current date for greeting
    const getCurrentGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const confirmDeleteGoal = useCallback(
        (goal: GoalWithStreak) => {
            Alert.alert(
                "Delete Habit",
                `Are you sure you want to delete "${goal.description}"? This action cannot be undone.`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => openSwipeableRowRef.current?.close(),
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await deleteGoal(goal.id);
                                showSuccessToast("Habit deleted.");
                            } catch (error: any) {
                                showErrorToast(error.message || "Failed to delete habit.");
                            }
                        },
                    },
                ],
            );
        },
        [deleteGoal],
    );

    const getCurrentDate = () => {
        return new Date()
            .toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
            })
            .toUpperCase();
    };

    const handleCreateGoal = async (habitInput: HabitInput) => {
        try {
            // Convert HabitInput to the format expected by createGoal
            const goalInput = {
                description: habitInput.description,
                frequency: habitInput.frequency,
                targetDays: habitInput.targetDays,
                difficulty: habitInput.difficulty,
                type: habitInput.type,
                targetTime:
                    habitInput.type === "time" ? habitInput.targetTime : undefined,
                isShared: habitInput.isShared,
            } satisfies GoalInput;

            await createGoal(goalInput);
            setShowCreateForm(false);

            // Success haptic feedback
            HapticFeedback.success();
            showSuccessToast("Habit created successfully!");
        } catch (error: any) {
            HapticFeedback.error();
            showErrorToast(error.message || "Failed to create habit", "Error");
        }
    };

    const handleCompleteGoal = async (goalId: string) => {
        try {
            await completeGoal(goalId);
            triggerCelebration({ type: "goalCompletion" });
            HapticFeedback.success();
            showSuccessToast("Habit completed! 🎉");
        } catch (error: any) {
            HapticFeedback.error();
            showErrorToast(error.message || "Failed to complete habit", "Error");
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            if (refresh) {
                await refresh();
            }
        } finally {
            setRefreshing(false);
        }
    };

    // Calculate daily progress
    const today = new Date().toDateString();
    const completedGoals = goals.filter((goal) => {
        // Check if goal was completed today
        return (
            goal.latestCompletionDate &&
            new Date(goal.latestCompletionDate).toDateString() === today
        );
    }).length;
    const totalGoals = goals.length;
    const progressPercentage =
        totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const handleOpenGoalDetails = (goal: GoalWithStreak) => {
        router.push({
            pathname: "/habit-detail",
            params: { habitId: goal.id, habitName: goal.description },
        });
    };

    const handleUndoGoal = async (goalId: string) => {
        try {
            await undoGoalCompletion(goalId);
            HapticFeedback.selection();
            showSuccessToast("Marked as not done.");
        } catch (error: any) {
            HapticFeedback.error();
            showErrorToast(error.message || "Failed to undo completion", "Error");
        }
    };

    const confirmUndoGoal = (goal: GoalWithStreak) => {
        Alert.alert(
            "Mark as not done?",
            "This removes today's completion and updates your streak.",
            [
                { text: "Keep it", style: "cancel" },
                {
                    text: "Undo",
                    style: "destructive",
                    onPress: () => handleUndoGoal(goal.id),
                },
            ],
        );
    };

    const GoalCard = ({
        goal,
        index,
        onDelete,
        onComplete,
        onUndo,
        onOpenDetails,
        onSwipeableOpen,
    }: {
        goal: GoalWithStreak;
        index: number;
        onDelete: (goal: GoalWithStreak) => void;
        onComplete: (goalId: string) => void;
        onUndo: (goal: GoalWithStreak) => void;
        onOpenDetails: (goal: GoalWithStreak) => void;
        onSwipeableOpen: (ref: Swipeable) => void;
    }) => {
        const { colors, spacing } = useThemeStyles();
        const today = new Date().toDateString();
        const isCompletedToday =
            goal.latestCompletionDate &&
            new Date(goal.latestCompletionDate).toDateString() === today;
        const currentStreakCount = goal.currentStreakCount ?? 0;
        const bestStreakCount = goal.bestStreakCount ?? 0;
        const rowRef = useRef<Swipeable>(null);

        const renderRightActions = (
            progress: Animated.AnimatedInterpolation<number>,
            dragX: Animated.AnimatedInterpolation<number>,
        ) => {
            const trans = dragX.interpolate({
                inputRange: [-80, 0],
                outputRange: [0, 80],
                extrapolate: "clamp",
            });
            return (
                <TouchableOpacity
                    onPress={() => onDelete(goal)}
                    style={{ width: 80, justifyContent: "center", alignItems: "center" }}
                >
                    <Animated.View
                        style={{
                            backgroundColor: colors.destructive,
                            justifyContent: "center",
                            alignItems: "center",
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            transform: [{ translateX: trans }],
                        }}
                    >
                        <Trash2 size={24} color="white" />
                    </Animated.View>
                </TouchableOpacity>
            );
        };

        return (
            <Swipeable
                ref={rowRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={renderRightActions}
                onSwipeableOpen={() => {
                    if (rowRef.current) {
                        onSwipeableOpen(rowRef.current);
                    }
                }}
            >
                <AnimatedView
                    key={goal.id}
                    animation="slideInFromBottom"
                    delay={index * 100}
                >
                    <Card
                        style={{ marginBottom: 4 }}
                        variant="outlined"
                        padding="md"
                        onPress={() => onOpenDetails(goal)}
                        accessibilityActions={[
                            { name: 'delete', label: 'Delete habit' }
                        ]}
                        onAccessibilityAction={(event) => {
                            if (event.nativeEvent.actionName === 'delete') {
                                onDelete(goal);
                            }
                        }}
                    >
                        <HStack justify="space-between" align="center">
                            <VStack style={{ flex: 1 }} spacing="xs">
                                <Heading size="md">{goal.description}</Heading>
                                <HStack spacing="sm" align="center">
                                    {goal.type === "time" && (
                                        <Caption color="muted">
                                            ⏰ {goal.targetTime || "07:00"}
                                        </Caption>
                                    )}
                                    {goal.type === "flexible" && (
                                        <Caption color="muted">⚡ Flexible</Caption>
                                    )}
                                    {goal.isShared && (
                                        <Caption color="success">👥 Shared</Caption>
                                    )}
                                </HStack>
                                {currentStreakCount > 0 && (
                                    <Caption color="warning">
                                        {"🔥 " +
                                            currentStreakCount +
                                            " day streak" +
                                            (bestStreakCount > currentStreakCount
                                                ? " (Best: " + bestStreakCount + ")"
                                                : "")}
                                    </Caption>
                                )}
                            </VStack>

                            <VStack align="center" spacing="xs">
                                {isCompletedToday ? (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onPress={() => onUndo(goal)}
                                        accessibilityLabel={`Undo completion for ${goal.description}`}
                                        accessibilityHint="Double tap to mark this habit as not done"
                                    >
                                        <Check
                                            size={16}
                                            color={colors.primaryForeground}
                                            style={{ marginRight: spacing.xs }}
                                        />
                                        Completed
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onPress={() => onComplete(goal.id)}
                                        accessibilityLabel={`Mark ${goal.description} as done`}
                                    >
                                        Mark Done
                                    </Button>
                                )}
                            </VStack>
                        </HStack>
                    </Card>
                </AnimatedView>
            </Swipeable>
        );
    };

    const renderLoadingSkeleton = () => (
        <VStack spacing="md">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} padding="md" variant="outlined">
                    <HStack justify="space-between" align="center">
                        <VStack style={{ flex: 1 }} spacing="xs">
                            <LoadingSkeleton height={20} width="70%" />
                            <LoadingSkeleton height={14} width="40%" />
                        </VStack>
                        <LoadingSkeleton height={32} width={60} style={{ borderRadius: 16 }} />
                    </HStack>
                </Card>
            ))}
        </VStack>
    );

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.background }}
            edges={["top", "left", "right"]}
        >
            <Container padding="lg">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {/* Header with greeting */}
                    <AnimatedView animation="fadeIn">
                        <View style={{ gap: 4, marginBottom: spacing.xl }}>
                            <Caption color="muted">{getCurrentDate()}</Caption>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Heading size="xxl">
                                    {getCurrentGreeting()},{"\n"}
                                    <Heading size="xxl" color="primary">
                                        {user?.displayName?.split(" ")[0] || "Demo"}
                                    </Heading>
                                </Heading>



                                {/* Header Actions */}
                                <HStack spacing="sm">
                                    <View style={{ position: "relative" }}>
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onPress={() => setShowNotifications(true)}
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 32,
                                            }}
                                            accessibilityLabel="Notifications"
                                        >
                                            <Bell size={24} color={colors.foreground} />
                                        </Button>
                                        {notificationCount > 0 && (
                                            <NotificationBadge
                                                count={notificationCount}
                                                variant="destructive"
                                                size="sm"
                                                style={{
                                                    position: "absolute",
                                                    top: 4,
                                                    right: 4,
                                                }}
                                            />
                                        )}
                                    </View>

                                    {/* Floating Action Button */}
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onPress={handleOpenCreate}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 32,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 8,
                                        }}
                                        accessibilityLabel="Add a new habit"
                                        accessibilityHint="Opens the create habit form"
                                    >
                                        <Plus size={34} color={colors.primaryForeground} />
                                    </Button>
                                </HStack>
                            </View>
                        </View>
                    </AnimatedView>

                    {/* Daily Progress Summary */}
                    {totalGoals > 0 && (
                        <AnimatedView animation="slideInFromBottom" delay={200}>
                            <Card
                                variant="elevated"
                                padding="lg"
                                style={{
                                    marginBottom: spacing.xl,
                                    backgroundColor: colors.card,
                                }}
                            >
                                <View style={{ gap: 12 }}>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Body weight="semibold">Daily Progress</Body>
                                        <Body weight="bold" color="primary">
                                            {Math.round(progressPercentage)}%
                                        </Body>
                                    </View>
                                    <Progress
                                        value={progressPercentage}
                                        max={100}
                                        size="md"
                                        showLabel={false}
                                    />
                                    <Caption color="muted">
                                        {completedGoals} of {totalGoals} habits completed today
                                    </Caption>
                                </View>
                            </Card>
                        </AnimatedView>
                    )}

                    {/* Goals List */}
                    {loading ? (
                        renderLoadingSkeleton()
                    ) : goals.length > 0 ? (
                        <VStack spacing="md">
                            {goals.map((goal, index) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    index={index}
                                    onDelete={confirmDeleteGoal}
                                    onComplete={handleCompleteGoal}
                                    onUndo={confirmUndoGoal}
                                    onOpenDetails={handleOpenGoalDetails}
                                    onSwipeableOpen={(ref) => {
                                        if (
                                            openSwipeableRowRef.current &&
                                            ref !== openSwipeableRowRef.current
                                        ) {
                                            openSwipeableRowRef.current.close();
                                        }
                                        openSwipeableRowRef.current = ref;
                                    }}
                                />
                            ))}
                        </VStack>
                    ) : (
                        <AnimatedView animation="fadeIn" delay={300}>
                            <Card variant="outlined" padding="lg">
                                <View
                                    style={{
                                        alignItems: "center",
                                        gap: 12, // md spacing
                                    }}
                                >
                                    <Body color="muted" align="center">
                                        No habits yet. Create your first habit to get started!
                                    </Body>
                                    <Button
                                        variant="primary"
                                        onPress={handleOpenCreate}
                                    >
                                        Create Your First Habit
                                    </Button>
                                </View>
                            </Card>
                        </AnimatedView>
                    )}

                </ScrollView>
            </Container>

            {/* Create Habit Modal */}
            <HabitCreationModal
                visible={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                onSubmit={handleCreateGoal}
            />
            
            {/* Notification Inbox */}
            <NotificationInbox
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            <PaywallModal
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                onUpgrade={() => {
                    setShowPaywall(false);
                    showSuccessToast("Welcome to Pro! (Simulation)");
                }}
            />
        </SafeAreaView>
    );
}
