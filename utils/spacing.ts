/**
 * Spacing utilities following 8px grid system
 * All spacing values are multiples of 4px (8px grid system)
 */

export const spacing = {
    xs: 4, // 4px
    sm: 8, // 8px
    md: 16, // 16px
    lg: 24, // 24px
    xl: 32, // 32px
    xxl: 40, // 40px
    xxxl: 48, // 48px
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Get spacing value by key
 */
export function getSpacing(key: SpacingKey): number {
    return spacing[key];
}

/**
 * Create custom spacing that follows the 8px grid system
 * @param multiplier - Multiplier for the base unit (4px)
 */
export function createSpacing(multiplier: number): number {
    return multiplier * 4;
}

/**
 * Validate that a spacing value follows the 8px grid system
 */
export function isValidSpacing(value: number): boolean {
    return value % 4 === 0 && value >= 0;
}

/**
 * Get the closest valid spacing value
 */
export function getClosestSpacing(value: number): number {
    return Math.round(value / 4) * 4;
}

/**
 * Spacing utilities for common layout patterns
 */
export const spacingUtils = {
    // Padding utilities
    padding: {
        xs: { padding: spacing.xs },
        sm: { padding: spacing.sm },
        md: { padding: spacing.md },
        lg: { padding: spacing.lg },
        xl: { padding: spacing.xl },
    },

    // Margin utilities
    margin: {
        xs: { margin: spacing.xs },
        sm: { margin: spacing.sm },
        md: { margin: spacing.md },
        lg: { margin: spacing.lg },
        xl: { margin: spacing.xl },
    },

    // Horizontal padding
    paddingHorizontal: {
        xs: { paddingHorizontal: spacing.xs },
        sm: { paddingHorizontal: spacing.sm },
        md: { paddingHorizontal: spacing.md },
        lg: { paddingHorizontal: spacing.lg },
        xl: { paddingHorizontal: spacing.xl },
    },

    // Vertical padding
    paddingVertical: {
        xs: { paddingVertical: spacing.xs },
        sm: { paddingVertical: spacing.sm },
        md: { paddingVertical: spacing.md },
        lg: { paddingVertical: spacing.lg },
        xl: { paddingVertical: spacing.xl },
    },

    // Horizontal margin
    marginHorizontal: {
        xs: { marginHorizontal: spacing.xs },
        sm: { marginHorizontal: spacing.sm },
        md: { marginHorizontal: spacing.md },
        lg: { marginHorizontal: spacing.lg },
        xl: { marginHorizontal: spacing.xl },
    },

    // Vertical margin
    marginVertical: {
        xs: { marginVertical: spacing.xs },
        sm: { marginVertical: spacing.sm },
        md: { marginVertical: spacing.md },
        lg: { marginVertical: spacing.lg },
        xl: { marginVertical: spacing.xl },
    },

    // Gap utilities (for flexbox)
    gap: {
        xs: { gap: spacing.xs },
        sm: { gap: spacing.sm },
        md: { gap: spacing.md },
        lg: { gap: spacing.lg },
        xl: { gap: spacing.xl },
    },
} as const;
