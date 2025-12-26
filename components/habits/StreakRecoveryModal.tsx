import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
    MultipleBreakGuidance,
    RestartReminderOptions,
    StreakRecoveryMessage,
} from "../../services/firebase/streakRecoveryService";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";

interface StreakRecoveryModalProps {
    visible: boolean;
    onClose: () => void;
    habitName: string;
    recoveryData: {
        motivationalMessage: StreakRecoveryMessage;
        restartEncouragement: StreakRecoveryMessage;
        achievementPreservation: StreakRecoveryMessage;
        multipleBreakGuidance?: MultipleBreakGuidance[];
        restartReminder: StreakRecoveryMessage;
    };
    onSetReminder?: (options: RestartReminderOptions) => void;
    onStartFresh?: () => void;
    onViewAchievements?: () => void;
}

/**
 * Modal component for displaying streak recovery support
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const StreakRecoveryModal: React.FC<StreakRecoveryModalProps> = ({
    visible,
    onClose,
    habitName,
    recoveryData,
    onSetReminder,
    onStartFresh,
    onViewAchievements,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [reminderTime, setReminderTime] = useState("08:00");
    const [expandedGuidance, setExpandedGuidance] = useState<number>(-1);

    const steps = [
        "motivation",
        "encouragement",
        "preservation",
        ...(recoveryData.multipleBreakGuidance ? ["guidance"] : []),
        "reminder",
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSetReminder = () => {
        if (onSetReminder) {
            onSetReminder({
                enabled: true,
                time: reminderTime,
                timezone: "UTC", // Would get from user preferences
                message: `Time to restart your ${habitName} habit! 💪`,
            });
        }
        Alert.alert(
            "Reminder Set!",
            `I'll remind you tomorrow at ${reminderTime} to restart your ${habitName} habit.`,
        );
        onClose();
    };

    const renderMotivationalMessage = () => (
        <View style={{ padding: 24 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 16,
                }}
            >
                {recoveryData.motivationalMessage.title}
            </Text>
            <Text
                style={{
                    fontSize: 18,
                    color: "#374151",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 24,
                }}
            >
                {recoveryData.motivationalMessage.message}
            </Text>
            <Button onPress={onStartFresh || handleNext} style={{ marginBottom: 16 }}>
                <Text>{recoveryData.motivationalMessage.actionText || "Continue"}</Text>
            </Button>
        </View>
    );

    const renderRestartEncouragement = () => (
        <View style={{ padding: 24 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 16,
                }}
            >
                {recoveryData.restartEncouragement.title}
            </Text>
            <Text
                style={{
                    fontSize: 18,
                    color: "#374151",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 24,
                }}
            >
                {recoveryData.restartEncouragement.message}
            </Text>
            {recoveryData.restartEncouragement.targetStreak && (
                <View
                    style={{
                        backgroundColor: "#eff6ff",
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 24,
                    }}
                >
                    <Text
                        style={{ textAlign: "center", color: "#1e40af", fontWeight: "600" }}
                    >
                        🎯 New Target: {recoveryData.restartEncouragement.targetStreak} Days
                    </Text>
                </View>
            )}
            <Button onPress={handleNext} style={{ marginBottom: 16 }}>
                <Text>
                    {recoveryData.restartEncouragement.actionText || "Accept Challenge"}
                </Text>
            </Button>
        </View>
    );

    const renderAchievementPreservation = () => (
        <View style={{ padding: 24 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 16,
                }}
            >
                {recoveryData.achievementPreservation.title}
            </Text>
            <Text
                style={{
                    fontSize: 18,
                    color: "#374151",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 24,
                }}
            >
                {recoveryData.achievementPreservation.message}
            </Text>
            <Button
                variant="outline"
                onPress={onViewAchievements || handleNext}
                style={{ marginBottom: 16 }}
            >
                <Text>
                    {recoveryData.achievementPreservation.actionText || "Continue"}
                </Text>
            </Button>
        </View>
    );

    const renderMultipleBreakGuidance = () => (
        <ScrollView style={{ padding: 24 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 16,
                }}
            >
                Let&apos;s Try a Different Approach 🤔
            </Text>
            <Text
                style={{
                    fontSize: 18,
                    color: "#374151",
                    textAlign: "center",
                    marginBottom: 24,
                }}
            >
                I notice you&apos;ve had some challenges maintaining streaks. Here are
                some proven strategies that might help:
            </Text>

            {recoveryData.multipleBreakGuidance?.map((guidance, index) => (
                <Card key={index} style={{ marginBottom: 16, padding: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
                        {guidance.title}
                    </Text>
                    <Text style={{ color: "#374151", marginBottom: 12 }}>
                        {guidance.description}
                    </Text>

                    <TouchableOpacity
                        onPress={() =>
                            setExpandedGuidance(expandedGuidance === index ? -1 : index)
                        }
                        style={{ backgroundColor: "#f3f4f6", padding: 8, borderRadius: 4 }}
                    >
                        <Text style={{ color: "#2563eb", fontWeight: "500" }}>
                            {expandedGuidance === index ? "Hide Steps" : "Show Action Steps"}
                        </Text>
                    </TouchableOpacity>

                    {expandedGuidance === index && (
                        <View style={{ marginTop: 12 }}>
                            {guidance.actionSteps.map((step, stepIndex) => (
                                <View
                                    key={stepIndex}
                                    style={{ flexDirection: "row", marginBottom: 8 }}
                                >
                                    <Text style={{ color: "#2563eb", marginRight: 8 }}>
                                        {stepIndex + 1}.
                                    </Text>
                                    <Text style={{ flex: 1, color: "#374151" }}>{step}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Card>
            ))}

            <Button onPress={handleNext} style={{ marginTop: 16 }}>
                <Text>I&apos;ll Try These Strategies</Text>
            </Button>
        </ScrollView>
    );

    const renderRestartReminder = () => (
        <View style={{ padding: 24 }}>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: 16,
                }}
            >
                {recoveryData.restartReminder.title}
            </Text>
            <Text
                style={{
                    fontSize: 18,
                    color: "#374151",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 24,
                }}
            >
                {recoveryData.restartReminder.message}
            </Text>

            <View
                style={{
                    backgroundColor: "#f9fafb",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 24,
                }}
            >
                <Text
                    style={{ textAlign: "center", color: "#374151", marginBottom: 12 }}
                >
                    Reminder Time
                </Text>
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 8,
                    }}
                >
                    {["07:00", "08:00", "09:00", "18:00", "19:00", "20:00"].map(
                        (time) => (
                            <TouchableOpacity
                                key={time}
                                onPress={() => setReminderTime(time)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 4,
                                    backgroundColor: reminderTime === time ? "#3b82f6" : "white",
                                    borderWidth: reminderTime === time ? 0 : 1,
                                    borderColor: "#d1d5db",
                                }}
                            >
                                <Text
                                    style={{
                                        color: reminderTime === time ? "white" : "#374151",
                                    }}
                                >
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ),
                    )}
                </View>
            </View>

            <Button onPress={handleSetReminder} style={{ marginBottom: 12 }}>
                <Text>Set Reminder</Text>
            </Button>
            <Button variant="outline" onPress={onClose}>
                <Text>Skip Reminder</Text>
            </Button>
        </View>
    );

    const renderCurrentStep = () => {
        const step = steps[currentStep];

        switch (step) {
            case "motivation":
                return renderMotivationalMessage();
            case "encouragement":
                return renderRestartEncouragement();
            case "preservation":
                return renderAchievementPreservation();
            case "guidance":
                return renderMultipleBreakGuidance();
            case "reminder":
                return renderRestartReminder();
            default:
                return renderMotivationalMessage();
        }
    };

    return (
        <Modal visible={visible} onClose={onClose}>
            <View
                style={{
                    backgroundColor: "white",
                    borderRadius: 8,
                    maxHeight: "80%",
                    width: "90%",
                }}
            >
                {/* Progress indicator */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: "#e5e7eb",
                    }}
                >
                    {steps.map((_, index) => (
                        <View
                            key={index}
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                marginHorizontal: 4,
                                backgroundColor:
                                    index === currentStep
                                        ? "#3b82f6"
                                        : index < currentStep
                                            ? "#10b981"
                                            : "#d1d5db",
                            }}
                        />
                    ))}
                </View>

                {/* Content */}
                <ScrollView style={{ flex: 1 }}>{renderCurrentStep()}</ScrollView>

                {/* Navigation */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        padding: 16,
                        borderTopWidth: 1,
                        borderTopColor: "#e5e7eb",
                    }}
                >
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Button
                            variant="outline"
                            onPress={handlePrevious}
                            disabled={currentStep === 0}
                        >
                            <Text>Previous</Text>
                        </Button>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Button onPress={handleNext}>
                            <Text>{currentStep === steps.length - 1 ? "Done" : "Next"}</Text>
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
