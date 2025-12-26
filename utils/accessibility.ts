/**
 * Accessibility utilities and helpers
 * Requirements: 4.4 - Proper contrast ratios and accessibility support
 */

import { AccessibilityInfo, Platform } from "react-native";

/**
 * Color contrast calculation utilities
 */
export class ColorContrast {
    /**
     * Convert hex color to RGB
     */
    private static hexToRgb(
        hex: string,
    ): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    }

    /**
     * Calculate relative luminance of a color
     */
    private static getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    /**
     * Calculate contrast ratio between two colors
     */
    static getContrastRatio(color1: string, color2: string): number {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);

        if (!rgb1 || !rgb2) {
            return 1; // Invalid colors, return minimum contrast
        }

        const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);

        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);

        return (brightest + 0.05) / (darkest + 0.05);
    }

    /**
     * Check if contrast ratio meets WCAG AA standards
     */
    static meetsWCAGAA(
        foreground: string,
        background: string,
        isLargeText: boolean = false,
    ): boolean {
        const ratio = this.getContrastRatio(foreground, background);
        return isLargeText ? ratio >= 3 : ratio >= 4.5;
    }

    /**
     * Check if contrast ratio meets WCAG AAA standards
     */
    static meetsWCAGAAA(
        foreground: string,
        background: string,
        isLargeText: boolean = false,
    ): boolean {
        const ratio = this.getContrastRatio(foreground, background);
        return isLargeText ? ratio >= 4.5 : ratio >= 7;
    }
}

/**
 * Accessibility state management
 */
export class AccessibilityManager {
    private static isScreenReaderEnabled: boolean = false;
    private static isReduceMotionEnabled: boolean = false;
    private static isHighContrastEnabled: boolean = false;

    /**
     * Initialize accessibility state
     */
    static async initialize() {
        if (Platform.OS !== "web") {
            try {
                this.isScreenReaderEnabled =
                    await AccessibilityInfo.isScreenReaderEnabled();
                this.isReduceMotionEnabled =
                    await AccessibilityInfo.isReduceMotionEnabled();

                // Listen for changes
                AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
                    this.isScreenReaderEnabled = enabled;
                });

                AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
                    this.isReduceMotionEnabled = enabled;
                });
            } catch (error) {
                console.warn("Failed to initialize accessibility state:", error);
            }
        }
    }

    /**
     * Check if screen reader is enabled
     */
    static isScreenReaderActive(): boolean {
        return this.isScreenReaderEnabled;
    }

    /**
     * Check if reduce motion is enabled
     */
    static shouldReduceMotion(): boolean {
        return this.isReduceMotionEnabled;
    }

    /**
     * Check if high contrast is enabled
     */
    static isHighContrastActive(): boolean {
        return this.isHighContrastEnabled;
    }

    /**
     * Announce message to screen reader
     */
    static announce(message: string, options?: { queue?: boolean }) {
        if (Platform.OS !== "web") {
            AccessibilityInfo.announceForAccessibility(message);
        }
    }
}

/**
 * Accessibility label generators
 */
export class AccessibilityLabels {
    /**
     * Generate label for progress indicator
     */
    static progressLabel(
        current: number,
        total: number,
        unit: string = "items",
    ): string {
        const percentage = Math.round((current / total) * 100);
        return `Progress: ${current} of ${total} ${unit} completed, ${percentage} percent`;
    }

    /**
     * Generate label for button with state
     */
    static buttonLabel(
        text: string,
        state?: "loading" | "disabled" | "selected",
    ): string {
        let label = text;

        switch (state) {
            case "loading":
                label += ", loading";
                break;
            case "disabled":
                label += ", disabled";
                break;
            case "selected":
                label += ", selected";
                break;
        }

        return label;
    }

    /**
     * Generate label for form input with validation state
     */
    static inputLabel(
        label: string,
        value?: string,
        error?: string,
        required?: boolean,
    ): string {
        let accessibilityLabel = label;

        if (required) {
            accessibilityLabel += ", required";
        }

        if (value) {
            accessibilityLabel += `, current value: ${value}`;
        }

        if (error) {
            accessibilityLabel += `, error: ${error}`;
        }

        return accessibilityLabel;
    }

    /**
     * Generate label for list item with position
     */
    static listItemLabel(
        content: string,
        position: number,
        total: number,
        additionalInfo?: string,
    ): string {
        let label = `${content}, ${position} of ${total}`;

        if (additionalInfo) {
            label += `, ${additionalInfo}`;
        }

        return label;
    }
}

/**
 * Touch target size validation
 */
export class TouchTargetValidator {
    private static readonly MIN_TOUCH_TARGET_SIZE = 44;

    /**
     * Check if touch target meets minimum size requirements
     */
    static isValidTouchTarget(width: number, height: number): boolean {
        return (
            width >= this.MIN_TOUCH_TARGET_SIZE &&
            height >= this.MIN_TOUCH_TARGET_SIZE
        );
    }

    /**
     * Get recommended padding to meet touch target requirements
     */
    static getRecommendedPadding(
        contentWidth: number,
        contentHeight: number,
    ): { paddingHorizontal: number; paddingVertical: number } {
        const paddingHorizontal = Math.max(
            0,
            (this.MIN_TOUCH_TARGET_SIZE - contentWidth) / 2,
        );
        const paddingVertical = Math.max(
            0,
            (this.MIN_TOUCH_TARGET_SIZE - contentHeight) / 2,
        );

        return { paddingHorizontal, paddingVertical };
    }
}

/**
 * Semantic role helpers
 */
export const AccessibilityRoles = {
    button: "button" as const,
    link: "link" as const,
    text: "text" as const,
    heading: "header" as const,
    image: "image" as const,
    list: "list" as const,
    listItem: "listitem" as const,
    progressBar: "progressbar" as const,
    tab: "tab" as const,
    tabList: "tablist" as const,
    search: "search" as const,
    switch: "switch" as const,
    checkbox: "checkbox" as const,
    radio: "radio" as const,
    alert: "alert" as const,
    dialog: "dialog" as const,
    menu: "menu" as const,
    menuItem: "menuitem" as const,
} as const;

/**
 * Accessibility state helpers
 */
export const AccessibilityStates = {
    disabled: { disabled: true },
    selected: { selected: true },
    checked: { checked: true },
    expanded: { expanded: true },
    busy: { busy: true },
} as const;
