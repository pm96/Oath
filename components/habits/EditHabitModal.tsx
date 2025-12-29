import { Modal } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HStack, VStack } from "@/components/ui/Stack";
import { Body, Caption } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import { Goal } from "@/services/firebase/collections";
import { showErrorToast } from "@/utils/toast";
import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";

export interface EditHabitModalProps {
    visible: boolean;
    habit: Goal | null;
    onClose: () => void;
    onSubmit: (habitId: string, updates: any) => Promise<void>;
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
    { key: "easy", label: "Easy", multiplier: "1x" },
    { key: "medium", label: "Medium", multiplier: "1.5x" },
    { key: "hard", label: "Hard", multiplier: "2x" },
];

export function EditHabitModal({
    visible,
    habit,
    onClose,
    onSubmit,
}: EditHabitModalProps) {
    const [loading, setLoading] = useState(false);
    const { colors, spacing } = useThemeStyles();

    // Form state
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "3x_a_week">("daily");
    const [targetDays, setTargetDays] = useState<string[]>([]);
    const [isShared, setIsShared] = useState(true);
    const [type, setType] = useState<"time" | "flexible">("flexible");
    const [targetTime, setTargetTime] = useState("07:00");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

    useEffect(() => {
        if (habit) {
            setDescription(habit.description);
            setFrequency(habit.frequency);
            setTargetDays(habit.targetDays);
            setIsShared(habit.isShared);
            setType(habit.type);
            setTargetTime(habit.targetTime || "07:00");
            setDifficulty(habit.difficulty || "medium");
        }
    }, [habit, visible]);

    const toggleDay = (day: string) => {
        if (targetDays.includes(day)) {
            setTargetDays(targetDays.filter((d) => d !== day));
        } else {
            setTargetDays([...targetDays, day]);
        }
    };

    const handleSubmit = async () => {
        if (!habit) return;
        setLoading(true);
        try {
            await onSubmit(habit.id, {
                description: description.trim(),
                frequency,
                targetDays,
                isShared,
                type,
                targetTime: type === "time" ? targetTime : null,
                difficulty,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            onClose();
        } catch (error: any) {
            showErrorToast(error.message || "Failed to update habit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Edit Habit" size="lg">
            <ScrollView showsVerticalScrollIndicator={false}>
                <VStack spacing="xl" style={{ padding: 20 }}>
                    {/* Description */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Description</Body>
                        <Input 
                            placeholder="Habit description"
                            value={description} 
                            onChangeText={setDescription} 
                            editable={!loading} 
                        />
                    </VStack>

                    {/* Frequency */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Frequency</Body>
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {FREQUENCY_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.key}
                                    variant={frequency === opt.key ? "primary" : "outline"}
                                    size="sm"
                                    onPress={() => setFrequency(opt.key as any)}
                                    style={{ marginBottom: 8 }}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>
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
                                    style={{ marginBottom: 8, minWidth: 45 }}
                                >
                                    {day.label}
                                </Button>
                            ))}
                        </HStack>
                    </VStack>

                    {/* Difficulty */}
                    <VStack spacing="sm">
                        <Body weight="semibold">Difficulty Level</Body>
                        <HStack spacing="xs" style={{ flexWrap: "wrap" }}>
                            {DIFFICULTY_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.key}
                                    variant={difficulty === opt.key ? "primary" : "outline"}
                                    size="sm"
                                    onPress={() => setDifficulty(opt.key as any)}
                                    style={{ marginBottom: 8 }}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>
                    </VStack>

                    {/* Action Buttons */}
                    <HStack spacing="md" style={{ marginTop: spacing.md }}>
                        <Button 
                            variant="outline" 
                            onPress={onClose} 
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            onPress={handleSubmit} 
                            loading={loading} 
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            Save Changes
                        </Button>
                    </HStack>
                </VStack>
            </ScrollView>
        </Modal>
    );
}
