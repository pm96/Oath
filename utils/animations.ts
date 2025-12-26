/**
 * Animation configuration and utilities
 * Using react-native-reanimated for performant animations
 */

export const animationConfig = {
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
    },
    easing: {
        ease: "ease",
        easeIn: "ease-in",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
    },
    spring: {
        damping: 15,
        stiffness: 150,
        mass: 1,
    },
} as const;

export type AnimationDuration = keyof typeof animationConfig.duration;
export type AnimationEasing = keyof typeof animationConfig.easing;

/**
 * Get animation duration by key
 */
export function getAnimationDuration(key: AnimationDuration): number {
    return animationConfig.duration[key];
}

/**
 * Common animation presets
 */
export const animationPresets = {
    // Fade animations
    fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1 },
        duration: animationConfig.duration.normal,
    },
    fadeOut: {
        from: { opacity: 1 },
        to: { opacity: 0 },
        duration: animationConfig.duration.normal,
    },

    // Scale animations
    scaleIn: {
        from: { opacity: 0, transform: [{ scale: 0.8 }] },
        to: { opacity: 1, transform: [{ scale: 1 }] },
        duration: animationConfig.duration.normal,
    },
    scaleOut: {
        from: { opacity: 1, transform: [{ scale: 1 }] },
        to: { opacity: 0, transform: [{ scale: 0.8 }] },
        duration: animationConfig.duration.normal,
    },

    // Slide animations
    slideInFromRight: {
        from: { opacity: 0, transform: [{ translateX: 100 }] },
        to: { opacity: 1, transform: [{ translateX: 0 }] },
        duration: animationConfig.duration.normal,
    },
    slideInFromLeft: {
        from: { opacity: 0, transform: [{ translateX: -100 }] },
        to: { opacity: 1, transform: [{ translateX: 0 }] },
        duration: animationConfig.duration.normal,
    },
    slideInFromBottom: {
        from: { opacity: 0, transform: [{ translateY: 100 }] },
        to: { opacity: 1, transform: [{ translateY: 0 }] },
        duration: animationConfig.duration.normal,
    },

    // Button press animation
    buttonPress: {
        from: { transform: [{ scale: 1 }] },
        to: { transform: [{ scale: 0.95 }] },
        duration: animationConfig.duration.fast,
    },

    // Loading shimmer
    shimmer: {
        from: { opacity: 0.3 },
        to: { opacity: 1 },
        duration: animationConfig.duration.slow,
        repeat: true,
    },
} as const;

/**
 * Validate animation timing
 */
export function isValidAnimationDuration(duration: number): boolean {
    return duration > 0 && duration <= 2000; // Max 2 seconds
}

/**
 * Create custom animation timing
 */
export function createAnimationTiming(duration: number, easing?: string) {
    if (!isValidAnimationDuration(duration)) {
        throw new Error(
            `Invalid animation duration: ${duration}ms. Must be between 1-2000ms.`,
        );
    }

    return {
        duration,
        easing: easing || animationConfig.easing.easeInOut,
    };
}
