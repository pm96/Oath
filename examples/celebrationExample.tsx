/**
 * Example demonstrating the celebration system
 * Requirements: 3.1, 3.2 - Celebration animations and feedback
 */

import { CelebrationSettings } from "@/components/habits/CelebrationSettings";
import {
    StreakCelebrationView,
    StreakCelebrationViewRef,
} from "@/components/habits/StreakCelebrationView";
import { useCelebrationEffects } from "@/hooks/useCelebrations";
import { useTheme } from "@/hooks/useTheme";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Example component showing celebration system usage
 */
export function CelebrationExample() {
    const { theme } = useTheme();
    const celebrationRef = useRef<StreakCelebrationViewRef>(null);
    const { celebrateGoalCompletion, celebrateStreakMilestone } =
        useCelebrationEffects();
    const [showSettings, setShowSettings] = useState(false);

    const handleGoalCompletion = async () => {
        // Trigger goal completion celebration
        await celebrateGoalCompletion();
        celebrationRef.current?.celebrateCompletion();
    };

    const handleMilestone = async (days: number) => {
        // Trigger milestone celebration
        await celebrateStreakMilestone(days);
        celebrationRef.current?.celebrateMilestone(days);
    };

    const handleDaily = () => {
        // Trigger daily completion
        celebrationRef.current?.celebrateDaily();
    };

    return (
        <View
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
                Celebration System Demo
            </Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.primary }]}
                    onPress={handleGoalCompletion}
                >
                    <Text
                        style={[
                            styles.buttonText,
                            { color: theme.colors.primaryForeground },
                        ]}
                    >
                        Goal Completion
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleMilestone(7)}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                        7-Day Milestone
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.warning }]}
                    onPress={() => handleMilestone(30)}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                        30-Day Milestone
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.accent }]}
                    onPress={() => handleMilestone(100)}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                        100-Day Milestone
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.secondary }]}
                    onPress={handleDaily}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                        Daily Complete
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.muted }]}
                    onPress={() => setShowSettings(!showSettings)}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.foreground }]}>
                        {showSettings ? "Hide" : "Show"} Settings
                    </Text>
                </TouchableOpacity>
            </View>

            {showSettings && <CelebrationSettings />}

            {/* Celebration Layer */}
            <StreakCelebrationView
                ref={celebrationRef}
                style={styles.celebrationLayer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        position: "relative",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 30,
    },
    buttonContainer: {
        gap: 15,
        marginBottom: 20,
    },
    button: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    celebrationLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
    },
});

export default CelebrationExample;
