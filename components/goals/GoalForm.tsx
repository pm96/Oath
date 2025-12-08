import { Button, ButtonText } from "@/components/ui/button";
import {
    Checkbox,
    CheckboxIcon,
    CheckboxIndicator,
    CheckboxLabel,
} from "@/components/ui/checkbox";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
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
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
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
    const [targetDays, setTargetDays] = useState<string[]>(
        initialValues?.targetDays || [],
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
            targetDays,
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
                targetDays,
            });
            // Reset form after successful submission
            setDescription("");
            setFrequency("daily");
            setTargetDays([]);
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
            <VStack space="lg" className="p-4">
                <VStack space="sm">
                    <Text className="font-semibold">Goal Description</Text>
                    <Input>
                        <InputField
                            placeholder="e.g., Go to the gym"
                            value={description}
                            onChangeText={setDescription}
                            editable={!loading}
                        />
                    </Input>
                </VStack>

                <VStack space="sm">
                    <Text className="font-semibold">Frequency</Text>
                    <Select
                        selectedValue={frequency}
                        onValueChange={handleFrequencyChange}
                        isDisabled={loading}
                    >
                        <SelectTrigger>
                            <SelectInput placeholder="Select frequency" />
                            <SelectIcon as={ChevronDownIcon} className="mr-3" />
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

                <VStack space="sm">
                    <Text className="font-semibold">Target Days</Text>
                    <VStack space="xs">
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

                {/* Requirement 8.3: Touch targets at least 44x44 pixels */}
                <HStack space="md" className="mt-4">
                    <Button
                        onPress={handleSubmit}
                        disabled={loading}
                        className="flex-1"
                        style={{ minHeight: 44 }}
                    >
                        <ButtonText>
                            {loading
                                ? "Saving..."
                                : initialValues
                                    ? "Update Goal"
                                    : "Create Goal"}
                        </ButtonText>
                    </Button>
                    {onCancel && (
                        <Button
                            variant="outline"
                            onPress={onCancel}
                            disabled={loading}
                            className="flex-1"
                            style={{ minHeight: 44 }}
                        >
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                    )}
                </HStack>
            </VStack>
        </ScrollView>
    );
}
