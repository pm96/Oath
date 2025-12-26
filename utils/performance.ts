/**
 * Performance optimization utilities
 * Requirements: 4.4 - Optimize performance for low-end devices
 */

import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Device performance tier detection
 */
export enum PerformanceTier {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

/**
 * Detect device performance tier based on available information
 */
export function getDevicePerformanceTier(): PerformanceTier {
    // On web, assume medium performance
    if (Platform.OS === "web") {
        return PerformanceTier.MEDIUM;
    }

    // Use device year as a rough indicator
    const deviceYear = Device.deviceYearClass;

    if (deviceYear && deviceYear < 2018) {
        return PerformanceTier.LOW;
    } else if (deviceYear && deviceYear < 2020) {
        return PerformanceTier.MEDIUM;
    } else {
        return PerformanceTier.HIGH;
    }
}

/**
 * Animation configuration based on device performance
 */
export function getOptimizedAnimationConfig(tier: PerformanceTier) {
    switch (tier) {
        case PerformanceTier.LOW:
            return {
                duration: {
                    fast: 100,
                    normal: 200,
                    slow: 300,
                },
                enableComplexAnimations: false,
                enableParallaxEffects: false,
                enableConfetti: false,
                maxConcurrentAnimations: 2,
            };

        case PerformanceTier.MEDIUM:
            return {
                duration: {
                    fast: 150,
                    normal: 250,
                    slow: 400,
                },
                enableComplexAnimations: true,
                enableParallaxEffects: false,
                enableConfetti: true,
                maxConcurrentAnimations: 4,
            };

        case PerformanceTier.HIGH:
        default:
            return {
                duration: {
                    fast: 150,
                    normal: 300,
                    slow: 500,
                },
                enableComplexAnimations: true,
                enableParallaxEffects: true,
                enableConfetti: true,
                maxConcurrentAnimations: 8,
            };
    }
}

/**
 * Lazy loading utilities
 */
export class LazyComponentLoader {
    private static loadedComponents = new Set<string>();

    /**
     * Mark a component as loaded to prevent duplicate loading
     */
    static markAsLoaded(componentName: string) {
        this.loadedComponents.add(componentName);
    }

    /**
     * Check if a component has been loaded
     */
    static isLoaded(componentName: string): boolean {
        return this.loadedComponents.has(componentName);
    }

    /**
     * Clear loaded components cache (useful for testing)
     */
    static clearCache() {
        this.loadedComponents.clear();
    }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
    private static imageCache = new Map<string, any>();
    private static maxCacheSize = 50;

    /**
     * Add image to cache with LRU eviction
     */
    static cacheImage(uri: string, image: any) {
        if (this.imageCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.imageCache.keys().next().value;
            if (firstKey) {
                this.imageCache.delete(firstKey);
            }
        }
        this.imageCache.set(uri, image);
    }

    /**
     * Get cached image
     */
    static getCachedImage(uri: string) {
        return this.imageCache.get(uri);
    }

    /**
     * Clear image cache
     */
    static clearImageCache() {
        this.imageCache.clear();
    }

    /**
     * Get cache size
     */
    static getCacheSize(): number {
        return this.imageCache.size;
    }
}

/**
 * FlatList optimization configurations
 */
export function getOptimizedFlatListProps(tier: PerformanceTier) {
    const baseProps = {
        removeClippedSubviews: true,
        maxToRenderPerBatch: 10,
        updateCellsBatchingPeriod: 50,
        windowSize: 10,
        getItemLayout: undefined, // Should be provided by component if possible
    };

    switch (tier) {
        case PerformanceTier.LOW:
            return {
                ...baseProps,
                initialNumToRender: 5,
                maxToRenderPerBatch: 5,
                windowSize: 5,
            };

        case PerformanceTier.MEDIUM:
            return {
                ...baseProps,
                initialNumToRender: 8,
                maxToRenderPerBatch: 8,
                windowSize: 8,
            };

        case PerformanceTier.HIGH:
        default:
            return {
                ...baseProps,
                initialNumToRender: 10,
                maxToRenderPerBatch: 10,
                windowSize: 10,
            };
    }
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | undefined;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(
            () => func(...args),
            wait,
        ) as unknown as NodeJS.Timeout;
    };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
