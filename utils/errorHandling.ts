/**
 * Error Handling Utilities
 *
 * Provides utilities for network error detection, retry logic, and error classification
 * Requirements: 1.4, 2.1
 */

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
    if (!error) return false;

    // Firebase network errors
    if (
        error.code === "unavailable" ||
        error.code === "auth/network-request-failed"
    ) {
        return true;
    }

    // Generic network errors
    const message = error.message?.toLowerCase() || "";
    return (
        message.includes("network") ||
        message.includes("offline") ||
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("fetch failed")
    );
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
    try {
        // Try to fetch a small resource to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("https://www.google.com/favicon.ico", {
            method: "HEAD",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
    shouldRetry?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: isNetworkError,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
): Promise<T> {
    const { maxAttempts, delayMs, backoffMultiplier, shouldRetry } = {
        ...DEFAULT_RETRY_CONFIG,
        ...config,
    };

    let lastError: any;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if this is the last attempt
            if (attempt === maxAttempts) {
                break;
            }

            // Check if we should retry this error
            if (shouldRetry && !shouldRetry(error)) {
                throw error;
            }

            // Wait before retrying with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
            currentDelay *= backoffMultiplier;
        }
    }

    throw lastError;
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
    NETWORK = "NETWORK",
    AUTHENTICATION = "AUTHENTICATION",
    PERMISSION = "PERMISSION",
    VALIDATION = "VALIDATION",
    NOT_FOUND = "NOT_FOUND",
    UNKNOWN = "UNKNOWN",
}

/**
 * Classify an error into a type
 */
export function classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const code = error.code || "";
    const message = error.message?.toLowerCase() || "";

    // Network errors
    if (isNetworkError(error)) {
        return ErrorType.NETWORK;
    }

    // Authentication errors
    if (
        code.startsWith("auth/") ||
        message.includes("authentication") ||
        message.includes("unauthorized")
    ) {
        return ErrorType.AUTHENTICATION;
    }

    // Permission errors
    if (
        code === "permission-denied" ||
        message.includes("permission") ||
        message.includes("forbidden")
    ) {
        return ErrorType.PERMISSION;
    }

    // Validation errors
    if (
        message.includes("invalid") ||
        message.includes("validation") ||
        message.includes("required")
    ) {
        return ErrorType.VALIDATION;
    }

    // Not found errors
    if (code === "not-found" || message.includes("not found")) {
        return ErrorType.NOT_FOUND;
    }

    return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: any): string {
    const errorType = classifyError(error);

    switch (errorType) {
        case ErrorType.NETWORK:
            return "Network error. Please check your internet connection and try again.";
        case ErrorType.AUTHENTICATION:
            return error.message || "Authentication failed. Please sign in again.";
        case ErrorType.PERMISSION:
            return "You don't have permission to perform this action.";
        case ErrorType.VALIDATION:
            return (
                error.message || "Invalid input. Please check your data and try again."
            );
        case ErrorType.NOT_FOUND:
            return "The requested resource was not found.";
        default:
            return error.message || "An unexpected error occurred. Please try again.";
    }
}

/**
 * Validate goal input
 * Requirement 2.1: Implement validation for empty/invalid goal inputs
 */
export function validateGoalInput(input: {
    description: string;
    frequency: string;
    targetDays: string[];
}): string | null {
    // Check description
    if (!input.description || !input.description.trim()) {
        return "Goal description is required";
    }

    if (input.description.trim().length < 3) {
        return "Goal description must be at least 3 characters";
    }

    if (input.description.trim().length > 200) {
        return "Goal description must be less than 200 characters";
    }

    // Check frequency
    const validFrequencies = ["daily", "weekly", "3x_a_week"];
    if (!validFrequencies.includes(input.frequency)) {
        return "Invalid frequency. Must be daily, weekly, or 3x_a_week";
    }

    // Check target days
    if (!input.targetDays || input.targetDays.length === 0) {
        return "At least one target day is required";
    }

    const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];

    for (const day of input.targetDays) {
        if (!validDays.includes(day)) {
            return `Invalid day: ${day}`;
        }
    }

    // Frequency-specific validation
    if (input.frequency === "weekly" && input.targetDays.length !== 1) {
        return "Weekly goals must have exactly one target day";
    }

    if (input.frequency === "3x_a_week" && input.targetDays.length !== 3) {
        return "3x a week goals must have exactly three target days";
    }

    return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
    if (!email || !email.trim()) {
        return "Email is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return "Please enter a valid email address";
    }

    return null;
}

/**
 * Validate password
 */
export function validatePassword(password: string): string | null {
    if (!password) {
        return "Password is required";
    }

    if (password.length < 6) {
        return "Password must be at least 6 characters";
    }

    return null;
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string): string | null {
    if (!displayName || !displayName.trim()) {
        return "Display name is required";
    }

    if (displayName.trim().length < 2) {
        return "Display name must be at least 2 characters";
    }

    if (displayName.trim().length > 50) {
        return "Display name must be less than 50 characters";
    }

    return null;
}
