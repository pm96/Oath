import { Modal } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HStack, VStack } from "@/components/ui/Stack";
import { Body, Caption } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import { showErrorToast } from "@/utils/toast";
import React, { useState } from "react";
import { ScrollView } from "react-native";

export interface HabitInput {
    description: string;
    frequency: "daily" | "weekly" | "3x_a_week";
    targetDays: string[];
    isShared: boolean;
    targetTime?: string;
    type: "time" | "flexible";
    difficulty: "easy" | "medium" | "hard";
}

export interface HabitCreationModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (habit: HabitInput) => Promise<void>;
}

const DAYS_OF_WEEK = [
    { key: "Monday", label: "Mon" },
    { key: "Tuesday", label: "Tue" },
    { key: "Wednesday", label: "Wed" },
    { key: "Thursday", label: "Thu" },
    { key: "Friday", label: "Fri" },
    { key: "Saturday", label: "Sat" },
    { key: "Sunday", label: "Sun" },
];

const FREQUENCY_OPTIONS = [
    { key: "daily", label: "Daily", description: "Every day" },
    { key: "weekly", label: "Weekly", description: "Once a week" },
    { key: "3x_a_week", label: "3x a week", description: "Three times per week" },
];

const DIFFICULTY_OPTIONS = [
    {
        key: "easy",
        label: "Easy",
        description: "Simple habits (1x score)",
        multiplier: "1x",
    },
    {
        key: "medium",
        label: "Medium",
        description: "Moderate habits (1.5x score)",
        multiplier: "1.5x",
    },
    {
        key: "hard",
        label: "Hard",
        description: "Challenging habits (2x score)",
        multiplier: "2x",
    },
];

const GOAL_TYPES = [
    {
        key: "flexible",
        label: "Flexible",
        description: "Complete anytime during the day",
    },
    {
        key: "time",
        label: "Time-based",
        description: "Complete at a specific time",
    },
];

/**
 * Modern habit creation modal
 * Requirements: 7.2 - Intuitive modal interface with form validation
 */
export function HabitCreationModal({
    visible,
    onClose,
    onSubmit,
}: HabitCreationModalProps) {
    const [loading, setLoading] = useState(false);

    // Form state
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "3x_a_week">(
        "daily",
    );
    const [targetDays, setTargetDays] = useState<string[]>(
        DAYS_OF_WEEK.map((d) => d.key),
    );
    const [isShared, setIsShared] = useState(true);
    const [type, setType] = useState<"time" | "flexible">("flexible");
    const [targetTime, setTargetTime] = useState("07:00");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
        "medium",
    );

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!description.trim()) {
            newErrors.description = "Habit description is required";
        } else if (description.trim().length < 3) {
            newErrors.description = "Description must be at least 3 characters";
        }

        if (targetDays.length === 0) {
            newErrors.targetDays = "Please select at least one day";
        }

        if (type === "time" && !targetTime) {
            newErrors.targetTime = "Please specify a target time";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFrequencyChange = (
        newFrequency: "daily" | "weekly" | "3x_a_week",
    ) => {
        setFrequency(newFrequency);

        // Auto-select appropriate days
        if (newFrequency === "daily") {
            setTargetDays(DAYS_OF_WEEK.map((d) => d.key));
        } else if (newFrequency === "weekly") {
            setTargetDays(["Monday"]);
        } else if (newFrequency === "3x_a_week") {
            setTargetDays(["Monday", "Wednesday", "Friday"]);
        }
    };

    const toggleDay = (day: string) => {
        if (targetDays.includes(day)) {
            setTargetDays(targetDays.filter((d) => d !== day));
        } else {
            setTargetDays([...targetDays, day]);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showErrorToast("Please fix the errors below", "Validation Error");
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                description: description.trim(),
                frequency,
                targetDays,
                isShared,
                type,
                targetTime: type === "time" ? targetTime : undefined,
                difficulty,
            });

            // Reset form
            setDescription("");
            setFrequency("daily");
            setTargetDays(DAYS_OF_WEEK.map((d) => d.key));
            setIsShared(true);
            setType("flexible");
            setTargetTime("07:00");
            setDifficulty("medium");
            setErrors({});

            onClose();
        } catch (error: any) {
            showErrorToast(error.message || "Failed to create habit", "Error");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const { colors } = useThemeStyles();

    const difficultyTextColor = (selected: boolean) =>
        selected ? colors.background : colors.foreground;

    return (
        <Modal
            visible={visible}
            onClose={handleClose}
            title="Create New Habit"
            size="lg"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <VStack spacing="xl" style={{ padding: 20 }}>
                    {/* Habit Description */}
                    <VStack spacing="sm">
                        <Body weight="semibold">What habit do you want to build?</Body>
                        <Input
                            placeholder="e.g., Go to the gym, Read for 30 minutes..."
                            value={description}
                            onChangeText={setDescription}
                            error={errors.description}
                            editable={!loading}
                        />
                        {errors.description && (
                            <Caption color="destructive">{errors.description}</Caption>
                        )}
                    </VStack>

                    {/* Frequency Selection */}
                    <VStack spacing="sm">
                        <Body weight="semibold">How often?</Body>
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {FREQUENCY_OPTIONS.map((freq) => (
                                <Button
                                    key={freq.key}
                                    variant={frequency === freq.key ? "primary" : "outline"}
                                    size="sm"
                                    onPress={() =>
                                        handleFrequencyChange(freq.key as typeof frequency)
                                    }
                                    disabled={loading}
                                    style={{ marginBottom: 8 }}
                                >
                                    {freq.label}
                                </Button>
                            ))}
                        </HStack>
                    </VStack>

                    {/* Goal Type Selection */}
                    <VStack spacing="sm">
                        <Body weight="semibold">How should this habit behave?</Body>
                        <Caption color="muted">
                            Time-based habits help you plan for a specific moment in the day.
                        </Caption>
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {GOAL_TYPES.map((goalType) => (
                                <Button
                                    key={goalType.key}
                                    variant={type === goalType.key ? "primary" : "outline"}
                                    size="sm"
                                    onPress={() => setType(goalType.key as typeof type)}
                                    disabled={loading}
                                    style={{ marginBottom: 8 }}
                                >
                                    {goalType.label}
                                </Button>
                            ))}
                        </HStack>
                    </VStack>

                    {/* Target Time Input */}
                    {type === "time" && (
                        <VStack spacing="sm">
                            <Body weight="semibold">Target time</Body>
                            <Caption color="muted">
                                Use 24-hour format (e.g., 07:00, 18:30)
                            </Caption>
                            <Input
                                placeholder="07:00"
                                value={targetTime}
                                onChangeText={setTargetTime}
                                keyboardType="numbers-and-punctuation"
                                autoCapitalize="none"
                                editable={!loading}
                                error={errors.targetTime}
                            />
                            {errors.targetTime && (
                                <Caption color="destructive">{errors.targetTime}</Caption>
                            )}
                        </VStack>
                    )}

                    {/* Difficulty Selection */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Difficulty Level</Body>
                        <Caption color="muted">
                            Harder habits earn more points when completed
                        </Caption>
                        <VStack spacing="xs">
                            {DIFFICULTY_OPTIONS.map((diff) => {
                                const isSelected = difficulty === diff.key;
                                return (
                                    <Button
                                        key={diff.key}
                                        variant={isSelected ? "primary" : "outline"}
                                        size="md"
                                        onPress={() =>
                                            setDifficulty(diff.key as typeof difficulty)
                                        }
                                        disabled={loading}
                                        style={{
                                            justifyContent: "flex-start",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                        }}
                                    >
                                        <HStack
                                            spacing="sm"
                                            style={{ alignItems: "center", flex: 1 }}
                                        >
                                            <VStack
                                                spacing="xs"
                                                style={{ flex: 1, alignItems: "flex-start" }}
                                            >
                                                <HStack
                                                    spacing="sm"
                                                    style={{ alignItems: "center" }}
                                                >
                                                    <Body
                                                        weight="semibold"
                                                        style={{ color: difficultyTextColor(isSelected) }}
                                                    >
                                                        {diff.label}
                                                    </Body>
                                                    <Caption
                                                        style={{
                                                            color: difficultyTextColor(isSelected),
                                                            backgroundColor: isSelected
                                                                ? "rgba(255,255,255,0.2)"
                                                                : "rgba(0,0,0,0.08)",
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            borderRadius: 4,
                                                            fontSize: 10,
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        {diff.multiplier}
                                                    </Caption>
                                                </HStack>
                                                <Caption
                                                    style={{
                                                        textAlign: "left",
                                                        color: difficultyTextColor(isSelected),
                                                    }}
                                                >
                                                    {diff.description}
                                                </Caption>
                                            </VStack>
                                        </HStack>
                                    </Button>
                                );
                            })}
                        </VStack>
                    </VStack>

                    {/* Target Days */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Which days?</Body>
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {DAYS_OF_WEEK.map((day) => (
                                <Button
                                    key={day.key}
                                    variant={targetDays.includes(day.key) ? "primary" : "outline"}
                                    size="sm"
                                    onPress={() => toggleDay(day.key)}
                                    disabled={loading}
                                    style={{ marginBottom: 8, minWidth: 45 }}
                                >
                                    {day.label}
                                </Button>
                            ))}
                        </HStack>
                        {errors.targetDays && (
                            <Caption color="destructive">{errors.targetDays}</Caption>
                        )}
                    </VStack>

                    {/* Sharing Toggle */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Share with friends</Body>
                        <Caption color="muted">
                            Shared habits appear in your friends feed for accountability.
                        </Caption>
                        <HStack spacing="sm">
                            <Button
                                variant={isShared ? "primary" : "outline"}
                                size="sm"
                                onPress={() => setIsShared(true)}
                                disabled={loading}
                            >
                                Share
                            </Button>
                            <Button
                                variant={!isShared ? "primary" : "outline"}
                                size="sm"
                                onPress={() => setIsShared(false)}
                                disabled={loading}
                            >
                                Keep Private
                            </Button>
                        </HStack>
                    </VStack>

                    {/* Action Buttons */}
                    <HStack spacing="md">
                        <Button
                            variant="outline"
                            onPress={handleClose}
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onPress={handleSubmit}
                            disabled={loading}
                            loading={loading}
                            style={{ flex: 1 }}
                        >
                            Create Habit
                        </Button>
                    </HStack>
                </VStack>
            </ScrollView>
        </Modal>
    );
}
