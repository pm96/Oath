import { Alert, Platform } from "react-native";

/**
 * Toast Utility
 *
 * Provides cross-platform toast notifications for user feedback
 * Requirements: 1.4, 2.1
 */

export enum ToastType {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
}

interface ToastOptions {
    title?: string;
    message: string;
    type?: ToastType;
    duration?: number;
}

/**
 * Show a toast notification
 * Falls back to Alert on platforms without native toast support
 */
export function showToast(options: ToastOptions): void {
    const { title, message, type = ToastType.INFO } = options;

    // Get appropriate title based on type if not provided
    const toastTitle =
        title ||
        {
            [ToastType.SUCCESS]: "Success",
            [ToastType.ERROR]: "Error",
            [ToastType.WARNING]: "Warning",
            [ToastType.INFO]: "Info",
        }[type];

    // For now, use Alert as a fallback
    // In a production app, you might want to use a library like react-native-toast-message
    if (Platform.OS === "web") {
        // For web, we could use a custom toast component
        console.log(`[${toastTitle}] ${message}`);
        Alert.alert(toastTitle, message);
    } else {
        Alert.alert(toastTitle, message);
    }
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, title?: string): void {
    showToast({ message, title, type: ToastType.SUCCESS });
}

/**
 * Show error toast
 */
export function showErrorToast(message: string, title?: string): void {
    showToast({ message, title, type: ToastType.ERROR });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string, title?: string): void {
    showToast({ message, title, type: ToastType.WARNING });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string, title?: string): void {
    showToast({ message, title, type: ToastType.INFO });
}
