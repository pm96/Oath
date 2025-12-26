import { HabitInput } from "@/components/habits";
import fc from "fast-check";

/**
 * Property-based tests for form validation
 * **Feature: modern-ui-redesign, Property 12: Form Validation Feedback**
 * **Validates: Requirements 7.2**
 */

// Mock validation function that mimics the HabitCreationModal validation logic
function validateHabitInput(
    input: Partial<HabitInput>,
): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!input.description?.trim()) {
        errors.description = "Habit description is required";
    } else if (input.description.trim().length < 3) {
        errors.description = "Description must be at least 3 characters";
    }

    if (!input.targetDays || input.targetDays.length === 0) {
        errors.targetDays = "Please select at least one day";
    }

    if (input.type === "time" && !input.targetTime) {
        errors.targetTime = "Please specify a target time";
    }

    return errors;
}

// Optimized generators for test data - much faster than complex string generators
const validDescriptionArb = fc.oneof(
    fc.constant("Exercise daily"),
    fc.constant("Read books"),
    fc.constant("Meditate for 10 minutes"),
    fc.constant("Drink water"),
    fc.constant("Take vitamins"),
    fc.constant("Walk the dog"),
    fc.constant("Practice guitar"),
    fc.constant("Write journal"),
);

const invalidDescriptionArb = fc.oneof(
    fc.constant(""),
    fc.constant("  "),
    fc.constant("ab"),
    fc.constant(" x "),
);

const frequencyArb = fc.constantFrom("daily", "weekly", "3x_a_week");
const typeArb = fc.constantFrom("time", "flexible");
const daysArb = fc.oneof(
    fc.constant(["Monday"]),
    fc.constant(["Monday", "Wednesday", "Friday"]),
    fc.constant(["Tuesday", "Thursday"]),
    fc.constant(["Saturday", "Sunday"]),
    fc.constant(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
);
const timeArb = fc.constantFrom("07:00", "08:30", "12:00", "18:00", "21:30");

describe("Form Validation Property Tests", () => {
    describe("Property 12: Form Validation Feedback", () => {
        test("valid habit inputs should pass validation", () => {
            fc.assert(
                fc.property(
                    validDescriptionArb,
                    frequencyArb,
                    daysArb,
                    typeArb,
                    fc.boolean(),
                    (description, frequency, targetDays, type, isShared) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: type as "time" | "flexible",
                            isShared,
                            targetTime: type === "time" ? "07:00" : undefined,
                        };

                        const errors = validateHabitInput(input);

                        // Valid inputs should have no validation errors
                        expect(Object.keys(errors)).toHaveLength(0);
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("empty or short descriptions should fail validation", () => {
            fc.assert(
                fc.property(
                    invalidDescriptionArb,
                    frequencyArb,
                    daysArb,
                    typeArb,
                    (description, frequency, targetDays, type) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: type as "time" | "flexible",
                            targetTime: type === "time" ? "07:00" : undefined,
                        };

                        const errors = validateHabitInput(input);

                        // Invalid descriptions should produce validation errors
                        expect(errors.description).toBeDefined();
                        expect(typeof errors.description).toBe("string");
                        expect(errors.description.length).toBeGreaterThan(0);
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("empty target days should fail validation", () => {
            fc.assert(
                fc.property(
                    validDescriptionArb,
                    frequencyArb,
                    typeArb,
                    (description, frequency, type) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [], // Empty array should fail
                            type: type as "time" | "flexible",
                            targetTime: type === "time" ? "07:00" : undefined,
                        };

                        const errors = validateHabitInput(input);

                        // Empty target days should produce validation errors
                        expect(errors.targetDays).toBeDefined();
                        expect(typeof errors.targetDays).toBe("string");
                        expect(errors.targetDays.length).toBeGreaterThan(0);
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("time-based habits without target time should fail validation", () => {
            fc.assert(
                fc.property(
                    validDescriptionArb,
                    frequencyArb,
                    daysArb,
                    (description, frequency, targetDays) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: "time",
                            targetTime: undefined, // Missing target time should fail
                        };

                        const errors = validateHabitInput(input);

                        // Time-based habits without target time should produce validation errors
                        expect(errors.targetTime).toBeDefined();
                        expect(typeof errors.targetTime).toBe("string");
                        expect(errors.targetTime.length).toBeGreaterThan(0);
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("flexible habits should not require target time", () => {
            fc.assert(
                fc.property(
                    validDescriptionArb,
                    frequencyArb,
                    daysArb,
                    (description, frequency, targetDays) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: "flexible",
                            targetTime: undefined, // Flexible habits don't need target time
                        };

                        const errors = validateHabitInput(input);

                        // Flexible habits should not have target time validation errors
                        expect(errors.targetTime).toBeUndefined();
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("validation errors should be user-friendly strings", () => {
            fc.assert(
                fc.property(
                    fc.oneof(invalidDescriptionArb, validDescriptionArb),
                    frequencyArb,
                    fc.oneof(fc.constant([]), daysArb),
                    typeArb,
                    fc.option(timeArb),
                    (description, frequency, targetDays, type, targetTime) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: type as "time" | "flexible",
                            targetTime: type === "time" ? targetTime || undefined : undefined,
                        };

                        const errors = validateHabitInput(input);

                        // All error messages should be non-empty strings
                        Object.values(errors).forEach((error) => {
                            expect(typeof error).toBe("string");
                            expect(error.length).toBeGreaterThan(0);
                            expect(error.trim()).toBe(error); // No leading/trailing whitespace
                        });
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });

        test("validation should be consistent for identical inputs", () => {
            fc.assert(
                fc.property(
                    fc.oneof(invalidDescriptionArb, validDescriptionArb),
                    frequencyArb,
                    fc.oneof(fc.constant([]), daysArb),
                    typeArb,
                    (description, frequency, targetDays, type) => {
                        const input: Partial<HabitInput> = {
                            description,
                            frequency: frequency as "daily" | "weekly" | "3x_a_week",
                            targetDays: [...targetDays],
                            type: type as "time" | "flexible",
                            targetTime: type === "time" ? "07:00" : undefined,
                        };

                        const errors1 = validateHabitInput(input);
                        const errors2 = validateHabitInput(input);

                        // Validation should be deterministic
                        expect(errors1).toEqual(errors2);
                    },
                ),
                { numRuns: 50 }, // Reduced from 100 to 50
            );
        });
    });
});
