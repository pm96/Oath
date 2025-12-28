import { StreakDashboard, EditHabitModal } from "@/components/habits";
import { Button, Container, Heading, Card, Body, Caption, HStack } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { repairHabitStreak, updateHabit } from "@/services/firebase/cloudFunctions";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Edit2, Trash2, Wrench } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";

/**
 * Habit Detail Screen with Streak Dashboard
 *
 * Demonstrates integration of streak UI components into existing habit screens
 * Requirements: 1.4, 2.1, 2.2, 2.3, 3.4, 4.3
 */
export default function HabitDetailScreen() {
    const { user } = useAuth();
    const { goals, deleteGoal } = useGoals();
    const { colors, spacing } = useThemeStyles();
    const { habitId, habitName } = useLocalSearchParams<{
        habitId: string;
        habitName: string;
    }>();

    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(false);
    const [currentStreakCount, setCurrentStreakCount] = useState<number | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Find current habit data from goals list
    const currentHabit = useMemo(() => goals.find(g => g.id === habitId), [goals, habitId]);

    const handleUpdateHabit = async (id: string, updates: any) => {
        try {
            await updateHabit({ habitId: id, updates });
            showSuccessToast("Habit updated successfully!");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to update habit");
            throw error;
        }
    };

    const handleRepair = async () => {
        if (!habitId) return;

        Alert.alert(
            "Repair Streak",
            "This will add a completion for yesterday to restore your broken streak. This is typically a Pro feature.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Repair",
                    onPress: async () => {
                        setIsRepairing(true);
                        try {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            const dateString = yesterday.toISOString().split('T')[0];

                            await repairHabitStreak({
                                habitId,
                                missedDate: dateString
                            });
                            showSuccessToast("Streak repaired! 🔥");
                            // The real-time listener in Dashboard should update the UI
                        } catch (error: any) {
                            showErrorToast(error.message || "Failed to repair streak.");
                        } finally {
                            setIsRepairing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async () => {
        if (!habitId) return;

        Alert.alert(
            "Delete Habit",
            `Are you sure you want to delete "${habitName}"? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteGoal(habitId);
                            showSuccessToast("Habit deleted successfully.");
                            router.back();
                        } catch (error) {
                            showErrorToast(
                                "Failed to delete habit. Please try again.",
                            );
                            console.error("Failed to delete habit:", error);
                        }
                    },
                },
            ],
        );
    };

    const handleDashboardLoadingChange = useCallback((loading: boolean, error: boolean) => {
        setIsDashboardLoading(loading);
        setDashboardError(error);
    }, []);

    const handleStreakUpdate = useCallback((streak: any) => {
        setCurrentStreakCount(streak?.currentStreak ?? 0);
    }, []);

    if (!habitId || !user?.uid) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
                <Container padding="lg">
                    <View
                        style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
                    >
                        <Heading size="lg" color="muted" align="center">
                            Invalid habit or user data
                        </Heading>
                        <Button
                            variant="outline"
                            onPress={() => router.back()}
                            style={{ marginTop: spacing.lg }}
                        >
                            Go Back
                        </Button>
                    </View>
                </Container>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
            {/* Header */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => router.back()}
                    style={{ marginRight: spacing.md }}
                >
                    <ArrowLeft size={20} color={colors.foreground} />
                </Button>
                <Heading size="lg" style={{ flex: 1 }}>
                    Habit Details
                </Heading>
                
                {/* Edit Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setShowEditModal(true)}
                >
                    <Edit2 size={20} color={colors.primary} />
                </Button>
            </View>

            {/* Streak Dashboard */}
            <View style={{ flex: 1 }}>
                <StreakDashboard
                    habitId={habitId}
                    userId={user.uid}
                    habitName={habitName || "Habit"}
                    onStreakUpdate={handleStreakUpdate}
                    onLoadingChange={handleDashboardLoadingChange}
                />
            </View>

            {/* Action Bar */}
            {!isDashboardLoading && !dashboardError && (
                <View style={{ padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {/* Streak Repair Promo */}
                    {currentStreakCount === 0 && (
                        <Card variant="outlined" padding="md" style={{ borderColor: colors.warning }}>
                            <HStack justify="space-between" align="center">
                                <View style={{ flex: 1 }}>
                                    <Body weight="semibold">Streak Broken?</Body>
                                    <Caption color="muted">Repair your streak and keep going!</Caption>
                                </View>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={handleRepair}
                                    loading={isRepairing}
                                    style={{ borderColor: colors.warning }}
                                >
                                    <Wrench size={16} color={colors.warning} style={{ marginRight: 4 }} />
                                    <Body size="sm" style={{ color: colors.warning }}>Repair</Body>
                                </Button>
                            </HStack>
                        </Card>
                    )}

                    <Button
                        variant="destructive"
                        onPress={handleDelete}
                    >
                        <Trash2 size={18} color={colors.destructiveForeground} style={{ marginRight: spacing.sm }} />
                        Delete Habit
                    </Button>
                </View>
            )}

            {/* Edit Modal */}
            <EditHabitModal
                visible={showEditModal}
                habit={currentHabit || null}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleUpdateHabit}
            />
        </SafeAreaView>
    );
}
