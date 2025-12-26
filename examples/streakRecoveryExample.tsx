import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
    StreakRecoveryBanner,
    StreakRecoveryCard,
} from "../components/habits/StreakRecoveryCard";
import { StreakRecoveryModal } from "../components/habits/StreakRecoveryModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useStreakRecovery } from "../hooks/useStreakRecovery";

/**
 * Example component demonstrating streak recovery and motivation system
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const StreakRecoveryExample: React.FC = () => {
    const [selectedHabit, setSelectedHabit] = useState({
        id: "habit_123",
        name: "Daily Exercise",
        userId: "user_456",
    });

    const {
        isLoading,
        error,
        recoveryData,
        showModal,
        activeRecoveryMessage,
        checkStreakStatus,
        showRecoveryModal,
        hideRecoveryModal,
        setRestartReminder,
        startFresh,
        viewAchievements,
        dismissRecoveryMessage,
    } = useStreakRecovery(
        selectedHabit.id,
        selectedHabit.userId,
        selectedHabit.name,
    );

    const handleHabitChange = (habitId: string, habitName: string) => {
        setSelectedHabit({
            id: habitId,
            name: habitName,
            userId: "user_456",
        });
    };

    const simulateStreakBreak = () => {
        Alert.alert(
            "Streak Broken",
            "Simulating a broken streak to demonstrate recovery system...",
            [
                {
                    text: "OK",
                    onPress: () => {
                        // In real app, this would update the streak data
                        checkStreakStatus();
                    },
                },
            ],
        );
    };

    return (
        <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 24,
                }}
            >
                Streak Recovery System Demo
            </Text>

            {/* Habit Selection */}
            <Card>
                <Text>Select Habit to Test</Text>
                <View className="space-y-2">
                    {[
                        { id: "habit_123", name: "Daily Exercise" },
                        { id: "habit_456", name: "Meditation" },
                        { id: "habit_789", name: "Reading" },
                    ].map((habit) => (
                        <Button
                            key={habit.id}
                            onPress={() => handleHabitChange(habit.id, habit.name)}
                            variant={selectedHabit.id === habit.id ? "primary" : "outline"}
                        >
                            {habit.name}
                        </Button>
                    ))}
                </View>
            </Card>

            {/* Current Status */}
            <Card>
                <Text>Current Status</Text>
                <Text className="text-gray-700 mb-2">Habit: {selectedHabit.name}</Text>
                <Text className="text-gray-700 mb-4">
                    Status:{" "}
                    {isLoading
                        ? "Checking..."
                        : activeRecoveryMessage
                            ? "Needs Recovery"
                            : "Active"}
                </Text>

                <View className="flex-row space-x-3">
                    <Button onPress={checkStreakStatus} disabled={isLoading}>
                        Check Status
                    </Button>
                    <Button onPress={simulateStreakBreak} variant="outline">
                        Simulate Break
                    </Button>
                </View>
            </Card>

            {/* Error Display */}
            {error && (
                <Card>
                    <Text>Error</Text>
                    <Text>{error}</Text>
                </Card>
            )}

            {/* Recovery Banner */}
            {activeRecoveryMessage && (
                <View className="mb-6">
                    <Text className="text-lg font-semibold mb-3">Recovery Banner</Text>
                    <StreakRecoveryBanner
                        message={activeRecoveryMessage}
                        onAction={showRecoveryModal}
                        onDismiss={dismissRecoveryMessage}
                    />
                </View>
            )}

            {/* Recovery Card */}
            {activeRecoveryMessage && (
                <View className="mb-6">
                    <Text className="text-lg font-semibold mb-3">
                        Recovery Card (Full)
                    </Text>
                    <StreakRecoveryCard
                        message={activeRecoveryMessage}
                        onAction={showRecoveryModal}
                        onDismiss={dismissRecoveryMessage}
                    />
                </View>
            )}

            {/* Recovery Card Compact */}
            {activeRecoveryMessage && (
                <View className="mb-6">
                    <Text className="text-lg font-semibold mb-3">
                        Recovery Card (Compact)
                    </Text>
                    <StreakRecoveryCard
                        message={activeRecoveryMessage}
                        onAction={showRecoveryModal}
                        onDismiss={dismissRecoveryMessage}
                        compact
                    />
                </View>
            )}

            {/* Manual Actions */}
            <Card>
                <Text>Manual Actions</Text>
                <View className="space-y-3">
                    <Button onPress={showRecoveryModal} disabled={isLoading}>
                        Show Full Recovery Modal
                    </Button>
                    <Button onPress={startFresh} variant="outline">
                        Start Fresh
                    </Button>
                    <Button onPress={viewAchievements} variant="outline">
                        View Achievements
                    </Button>
                </View>
            </Card>

            {/* Recovery Modal */}
            {recoveryData && (
                <StreakRecoveryModal
                    visible={showModal}
                    onClose={hideRecoveryModal}
                    habitName={selectedHabit.name}
                    recoveryData={recoveryData}
                    onSetReminder={setRestartReminder}
                    onStartFresh={startFresh}
                    onViewAchievements={viewAchievements}
                />
            )}

            {/* Demo Information */}
            <Card>
                <Text>Demo Information</Text>
                <Text className="text-blue-700 mb-2">
                    This demo shows the streak recovery and motivation system components:
                </Text>
                <View className="ml-4">
                    <Text className="text-blue-700">
                        • Motivational messaging for broken streaks
                    </Text>
                    <Text className="text-blue-700">
                        • Previous best streak targeting
                    </Text>
                    <Text className="text-blue-700">
                        • Achievement preservation messaging
                    </Text>
                    <Text className="text-blue-700">
                        • Guidance for multiple broken streaks
                    </Text>
                    <Text className="text-blue-700">• Restart reminder offering</Text>
                </View>
            </Card>

            {/* Requirements Coverage */}
            <Card>
                <Text>Requirements Coverage</Text>
                <View className="space-y-1">
                    <Text className="text-green-700">
                        ✅ 7.1: Motivational messaging for broken streaks
                    </Text>
                    <Text className="text-green-700">
                        ✅ 7.2: Previous best streak targeting
                    </Text>
                    <Text className="text-green-700">
                        ✅ 7.3: Achievement preservation messaging
                    </Text>
                    <Text className="text-green-700">
                        ✅ 7.4: Multiple broken streaks guidance
                    </Text>
                    <Text className="text-green-700">
                        ✅ 7.5: Restart reminder offering
                    </Text>
                </View>
            </Card>
        </ScrollView>
    );
};
