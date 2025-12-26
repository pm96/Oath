import { Button } from "@/components/ui/Button";
import {
    Checkbox,
    CheckboxIcon,
    CheckboxIndicator,
    CheckboxLabel,
} from "@/components/ui/checkbox";
import { HStack } from "@/components/ui/hstack";
import { Input } from "@/components/ui/Input";
import {
    Select,
    SelectBackdrop,
    SelectContent,
    SelectDragIndicator,
    SelectDragIndicatorWrapper,
    SelectIcon,
    SelectInput,
    SelectItem,
    SelectPortal,
    SelectTrigger,
} from "@/components/ui/select";
import { VStack } from "@/components/ui/Stack";
import { Text } from "@/components/ui/Text";
import { GoalInput } from "@/services/firebase/goalService";
import { validateGoalInput } from "@/utils/errorHandling";
import { showErrorToast } from "@/utils/toast";
import { CheckIcon, ChevronDownIcon } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView } from "react-native";

interface GoalFormProps {
    onSubmit: (goal: GoalInput) => Promise<void>;
    onCancel?: () => void;
    initialValues?: Partial<GoalInput>;
}

const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

/**
 * GoalForm component for creating/editing goals
 * Requirements: 2.1, 2.2
 */
export function GoalForm({ onSubmit, onCancel, initialValues }: GoalFormProps) {
    const [description, setDescription] = useState(
        initialValues?.description || "",
    );
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "3x_a_week">(
        initialValues?.frequency || "daily",
    );
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
        initialValues?.difficulty || "medium",
    );
    const [targetDays, setTargetDays] = useState<string[]>(
        initialValues?.targetDays || [],
    );
    const [type, setType] = useState<"time" | "flexible">(
        initialValues?.type || "flexible",
    );
    const [targetTime, setTargetTime] = useState<string>(
        initialValues?.targetTime || "07:00",
    );
    const [isShared, setIsShared] = useState<boolean>(
        initialValues?.isShared ?? true,
    );
    const [loading, setLoading] = useState(false);

    /**
     * Validate form inputs using centralized validation
     * Requirement 2.1: Validate goal data before submission
     */
    const validateForm = (): string | null => {
        return validateGoalInput({
            description,
            frequency,
            difficulty,
            targetDays,
            type,
            targetTime: type === "time" ? targetTime : undefined,
            isShared,
        });
    };

    /**
     * Handle form submission
     * Requirement 2.1: Create goal with description, frequency, and target days
     * Includes validation and user-friendly error messages
     */
    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            showErrorToast(validationError, "Validation Error");
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                description: description.trim(),
                frequency,
                difficulty,
                targetDays,
                type,
                targetTime: type === "time" ? targetTime : undefined,
                isShared,
            });
            // Reset form after successful submission
            setDescription("");
            setFrequency("daily");
            setDifficulty("medium");
            setTargetDays([]);
            setType("flexible");
            setTargetTime("07:00");
            setIsShared(true);
        } catch (error: any) {
            showErrorToast(error.message || "Failed to save goal", "Error");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle day selection
     */
    const toggleDay = (day: string) => {
        if (targetDays.includes(day)) {
            setTargetDays(targetDays.filter((d) => d !== day));
        } else {
            setTargetDays([...targetDays, day]);
        }
    };

    /**
     * Handle frequency change and auto-select days
     */
    const handleFrequencyChange = (value: string) => {
        const newFrequency = value as "daily" | "weekly" | "3x_a_week";
        setFrequency(newFrequency);

        // Auto-select appropriate days based on frequency
        if (newFrequency === "daily") {
            setTargetDays(DAYS_OF_WEEK);
        } else if (newFrequency === "weekly") {
            setTargetDays(["Monday"]);
        } else if (newFrequency === "3x_a_week") {
            setTargetDays(["Monday", "Wednesday", "Friday"]);
        }
    };

    return (
        <ScrollView>
            <VStack spacing="lg">
                <VStack spacing="sm">
                    <Text>Goal Description</Text>
                    <Input
                        placeholder="e.g., Go to the gym"
                        value={description}
                        onChangeText={setDescription}
                        editable={!loading}
                    />
                </VStack>

                <VStack spacing="sm">
                    <Text>Frequency</Text>
                    <Select
                        selectedValue={frequency}
                        onValueChange={handleFrequencyChange}
                        isDisabled={loading}
                    >
                        <SelectTrigger>
                            <SelectInput placeholder="Select frequency" />
                            <SelectIcon as={ChevronDownIcon} />
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent>
                                <SelectDragIndicatorWrapper>
                                    <SelectDragIndicator />
                                </SelectDragIndicatorWrapper>
                                <SelectItem label="Daily" value="daily" />
                                <SelectItem label="Weekly" value="weekly" />
                                <SelectItem label="3x a week" value="3x_a_week" />
                            </SelectContent>
                        </SelectPortal>
                    </Select>
                </VStack>

                <VStack spacing="sm">
                    <Text>Habit Type</Text>
                    <Select
                        selectedValue={type}
                        onValueChange={(value) =>
                            setType((value as "time" | "flexible") || "flexible")
                        }
                        isDisabled={loading}
                    >
                        <SelectTrigger>
                            <SelectInput placeholder="Select type" />
                            <SelectIcon as={ChevronDownIcon} />
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent>
                                <SelectDragIndicatorWrapper>
                                    <SelectDragIndicator />
                                </SelectDragIndicatorWrapper>
                                <SelectItem label="Flexible" value="flexible" />
                                <SelectItem label="Time-based" value="time" />
                            </SelectContent>
                        </SelectPortal>
                    </Select>
                </VStack>

                {type === "time" && (
                    <VStack spacing="sm">
                        <Text>Target Time (HH:MM)</Text>
                        <Input
                            placeholder="07:00"
                            value={targetTime}
                            onChangeText={setTargetTime}
                            editable={!loading}
                            keyboardType="numbers-and-punctuation"
                        />
                    </VStack>
                )}

                <VStack spacing="sm">
                    <Text>Difficulty</Text>
                    <Select
                        selectedValue={difficulty}
                        onValueChange={(value) =>
                            setDifficulty(value as "easy" | "medium" | "hard")
                        }
                        isDisabled={loading}
                    >
                        <SelectTrigger>
                            <SelectInput placeholder="Select difficulty" />
                            <SelectIcon as={ChevronDownIcon} />
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent>
                                <SelectDragIndicatorWrapper>
                                    <SelectDragIndicator />
                                </SelectDragIndicatorWrapper>
                                <SelectItem label="Easy" value="easy" />
                                <SelectItem label="Medium" value="medium" />
                                <SelectItem label="Hard" value="hard" />
                            </SelectContent>
                        </SelectPortal>
                    </Select>
                </VStack>

                <VStack spacing="sm">
                    <Text>Target Days</Text>
                    <VStack spacing="xs">
                        {DAYS_OF_WEEK.map((day) => (
                            <Checkbox
                                key={day}
                                value={day}
                                isChecked={targetDays.includes(day)}
                                onChange={() => toggleDay(day)}
                                isDisabled={loading}
                            >
                                <CheckboxIndicator>
                                    <CheckboxIcon as={CheckIcon} />
                                </CheckboxIndicator>
                                <CheckboxLabel>{day}</CheckboxLabel>
                            </Checkbox>
                        ))}
                    </VStack>
                </VStack>

                <Checkbox
                    value="isShared"
                    isChecked={isShared}
                    onChange={(checked) => setIsShared(Boolean(checked))}
                    isDisabled={loading}
                >
                    <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon} />
                    </CheckboxIndicator>
                    <CheckboxLabel>Share habit with friends</CheckboxLabel>
                </Checkbox>

                {/* Requirement 8.3: Touch targets at least 44x44 pixels */}
                <HStack space="md">
                    <Button
                        onPress={handleSubmit}
                        disabled={loading}
                        style={{ minHeight: 44 }}
                    >
                        {loading
                            ? "Saving..."
                            : initialValues
                                ? "Update Goal"
                                : "Create Goal"}
                    </Button>
                    {onCancel && (
                        <Button
                            variant="outline"
                            onPress={onCancel}
                            disabled={loading}
                            style={{ minHeight: 44 }}
                        >
                            Cancel
                        </Button>
                    )}
                </HStack>
            </VStack>
        </ScrollView>
    );
}
