import {
    Toast,
    ToastDescription,
    ToastTitle,
    useToast,
} from "@/components/ui/toast";

/**
 * Toast Utility
 *
 * Provides cross-platform toast notifications for user feedback
 * Requirements: 1.4, 2.1, 9.4
 *
 * Enhanced with GluestackUI Toast component for better visual feedback
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
    action?: () => void;
    actionLabel?: string;
}

// Global toast instance - will be set by ToastProvider
let globalToast: ReturnType<typeof useToast> | null = null;

/**
 * Set the global toast instance
 * This should be called from the root component
 */
export function setGlobalToast(toast: ReturnType<typeof useToast>): void {
    globalToast = toast;
}

/**
 * Show a toast notification with GluestackUI Toast
 * Requirement 9.4: Provide immediate visual feedback
 */
export function showToast(options: ToastOptions): void {
    const {
        title,
        message,
        type = ToastType.INFO,
        duration = 3000,
        action,
        actionLabel,
    } = options;

    // Get appropriate title based on type if not provided
    const toastTitle =
        title ||
        {
            [ToastType.SUCCESS]: "Success",
            [ToastType.ERROR]: "Error",
            [ToastType.WARNING]: "Warning",
            [ToastType.INFO]: "Info",
        }[type];

    // Map toast type to GluestackUI action
    const toastAction = type as "success" | "error" | "warning" | "info";

    if (globalToast) {
        globalToast.show({
            placement: "top",
            duration,
            render: ({ id }) => (
                <Toast action={toastAction} variant="solid">
                    <ToastTitle>{toastTitle}</ToastTitle>
                    <ToastDescription>{message}</ToastDescription>
                </Toast>
            ),
        });
    } else {
        // Fallback for when toast is not initialized
        console.warn("Toast not initialized. Message:", message);
    }

    if (type === ToastType.ERROR) {
        console.error(`[Toast] ${toastTitle}: ${message}`);
    }
}

/**
 * Show success toast
 * Requirement 9.4: Success feedback for friend actions
 */
export function showSuccessToast(message: string, title?: string): void {
    showToast({ message, title, type: ToastType.SUCCESS });
}

/**
 * Show error toast with optional retry action
 * Requirement 9.4: Error feedback with retry options
 */
export function showErrorToast(
    message: string,
    title?: string,
    retryAction?: () => void,
): void {
    showToast({
        message,
        title,
        type: ToastType.ERROR,
        duration: 5000, // Longer duration for errors
        action: retryAction,
        actionLabel: retryAction ? "Retry" : undefined,
    });
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
