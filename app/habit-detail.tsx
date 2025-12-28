import { StreakDashboard } from "@/components/habits";
import { Button, Container, Heading } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { useThemeStyles } from "@/hooks/useTheme";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
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
    const { deleteGoal } = useGoals();
    const { colors, spacing } = useThemeStyles();
    const { habitId, habitName } = useLocalSearchParams<{
        habitId: string;
        habitName: string;
    }>();

    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(false);

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

    if (!habitId || !user?.uid) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
            </View>

            {/* Streak Dashboard */}
            <View style={{ flex: 1 }}>
                <StreakDashboard
                    habitId={habitId}
                    userId={user.uid}
                    habitName={habitName || "Habit"}
                    onStreakUpdate={(streak) => {
                        console.log("Streak updated:", streak);
                    }}
                    onLoadingChange={handleDashboardLoadingChange}
                />
            </View>
            {!isDashboardLoading && !dashboardError && (
                <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Button
                        variant="destructive"
                        onPress={handleDelete}
                    >
                        <Trash2 size={18} color={colors.destructiveForeground} style={{ marginRight: spacing.sm }} />
                        Delete Habit
                    </Button>
                </View>
            )}
        </SafeAreaView>
    );
}
