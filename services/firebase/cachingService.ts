/**
 * Caching Service for Habit Tracking Performance Optimization
 *
 * Implements efficient caching strategies for streak calculations, analytics data,
 * and calendar rendering to improve performance and reduce Firebase reads.
 * Requirements: Performance and scalability
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Cache entry structure with metadata
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
    checksum: string;
    expiresAt: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of entries
    compressionEnabled: boolean;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    totalSize: number;
    hitRate: number;
}

/**
 * Caching Service Implementation
 */
export class CachingService {
    private static instance: CachingService;
    private memoryCache = new Map<string, CacheEntry<any>>();
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSize: 0,
        hitRate: 0,
    };

    // Cache configurations for different data types
    private readonly configs: Record<string, CacheConfig> = {
        streaks: {
            ttl: 5 * 60 * 1000, // 5 minutes
            maxSize: 100,
            compressionEnabled: false,
        },
        analytics: {
            ttl: 15 * 60 * 1000, // 15 minutes
            maxSize: 50,
            compressionEnabled: true,
        },
        calendar: {
            ttl: 10 * 60 * 1000, // 10 minutes
            maxSize: 200,
            compressionEnabled: true,
        },
        completions: {
            ttl: 2 * 60 * 1000, // 2 minutes
            maxSize: 500,
            compressionEnabled: false,
        },
    };

    private constructor() {
        this.initializeCache();
    }

    public static getInstance(): CachingService {
        if (!CachingService.instance) {
            CachingService.instance = new CachingService();
        }
        return CachingService.instance;
    }

    /**
     * Initialize cache system
     */
    private async initializeCache(): Promise<void> {
        try {
            // Load persistent cache from AsyncStorage
            await this.loadPersistentCache();

            // Set up periodic cleanup
            this.startPeriodicCleanup();
        } catch (error) {
            console.error("Failed to initialize cache:", error);
        }
    }

    /**
     * Get cached data with automatic expiration handling
     */
    async get<T>(
        key: string,
        type: keyof typeof this.configs,
    ): Promise<T | null> {
        try {
            // Check memory cache first
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry && !this.isExpired(memoryEntry)) {
                if (this.isValidEntry(memoryEntry)) {
                    this.stats.hits++;
                    this.updateHitRate();
                    return memoryEntry.data as T;
                } else {
                    // Invalid entry, remove it
                    this.memoryCache.delete(key);
                }
            }

            // Check persistent cache
            const persistentEntry = await this.getPersistentCache<T>(key);
            if (persistentEntry && !this.isExpired(persistentEntry)) {
                if (this.isValidEntry(persistentEntry)) {
                    // Move to memory cache for faster access
                    this.memoryCache.set(key, persistentEntry);
                    this.stats.hits++;
                    this.updateHitRate();
                    return persistentEntry.data;
                }
            }

            this.stats.misses++;
            this.updateHitRate();
            return null;
        } catch (error) {
            console.error("Cache get error:", error);
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
    }

    /**
     * Set cached data with smart invalidation
     */
    async set<T>(
        key: string,
        data: T,
        type: keyof typeof this.configs,
        dependencies?: string[],
    ): Promise<void> {
        try {
            const config = this.configs[type];
            const now = Date.now();

            const entry: CacheEntry<T> = {
                data,
                timestamp: now,
                version: 1,
                checksum: this.generateChecksum(data),
                expiresAt: now + config.ttl,
            };

            // Add to memory cache
            this.memoryCache.set(key, entry);

            // Enforce memory cache size limit
            this.enforceMemoryCacheLimit(type);

            // Persist to AsyncStorage for important data
            if (this.shouldPersist(type)) {
                await this.setPersistentCache(key, entry);
            }

            // Invalidate dependent caches
            if (dependencies) {
                await this.invalidateDependencies(dependencies);
            }

            this.stats.totalSize = this.memoryCache.size;
        } catch (error) {
            console.error("Cache set error:", error);
        }
    }

    /**
     * Invalidate cache entries by pattern or specific keys
     */
    async invalidate(pattern: string | string[]): Promise<void> {
        try {
            const patterns = Array.isArray(pattern) ? pattern : [pattern];

            for (const pat of patterns) {
                // Memory cache invalidation
                for (const key of this.memoryCache.keys()) {
                    if (this.matchesPattern(key, pat)) {
                        this.memoryCache.delete(key);
                    }
                }

                // Persistent cache invalidation
                await this.invalidatePersistentCache(pat);
            }

            this.stats.totalSize = this.memoryCache.size;
        } catch (error) {
            console.error("Cache invalidation error:", error);
        }
    }

    /**
     * Smart cache invalidation based on data relationships
     */
    async invalidateRelated(habitId: string, userId: string): Promise<void> {
        const patterns = [
            `streak:${userId}:${habitId}`,
            `analytics:${userId}:${habitId}`,
            `calendar:${userId}:${habitId}`,
            `completions:${userId}:${habitId}`,
            `user_analytics:${userId}`, // Overall user analytics
        ];

        await this.invalidate(patterns);
    }

    /**
     * Preload frequently accessed data
     */
    async preloadUserData(userId: string, habitIds: string[]): Promise<void> {
        try {
            // This would typically be called during app startup or user login
            const preloadPromises: Promise<void>[] = [];

            for (const habitId of habitIds) {
                // Preload streak data
                preloadPromises.push(
                    this.preloadIfNotCached(`streak:${userId}:${habitId}`, "streaks"),
                );

                // Preload recent analytics
                preloadPromises.push(
                    this.preloadIfNotCached(
                        `analytics:${userId}:${habitId}`,
                        "analytics",
                    ),
                );
            }

            await Promise.allSettled(preloadPromises);
        } catch (error) {
            console.error("Preload error:", error);
        }
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Clear all cache data
     */
    async clearAll(): Promise<void> {
        try {
            this.memoryCache.clear();
            await AsyncStorage.multiRemove([
                "@habit_cache_streaks",
                "@habit_cache_analytics",
                "@habit_cache_calendar",
                "@habit_cache_completions",
            ]);

            this.stats = {
                hits: 0,
                misses: 0,
                evictions: 0,
                totalSize: 0,
                hitRate: 0,
            };
        } catch (error) {
            console.error("Cache clear error:", error);
        }
    }

    // Private helper methods

    /**
     * Check if cache entry is expired
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() > entry.expiresAt;
    }

    /**
     * Validate cache entry integrity
     */
    private isValidEntry(entry: CacheEntry<any>): boolean {
        try {
            const expectedChecksum = this.generateChecksum(entry.data);
            return entry.checksum === expectedChecksum;
        } catch {
            return false;
        }
    }

    /**
     * Generate checksum for data integrity
     */
    private generateChecksum(data: any): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Enforce memory cache size limits with LRU eviction
     */
    private enforceMemoryCacheLimit(type: keyof typeof this.configs): void {
        const config = this.configs[type];

        if (this.memoryCache.size > config.maxSize) {
            // Simple LRU: remove oldest entries
            const entries = Array.from(this.memoryCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = entries.slice(0, this.memoryCache.size - config.maxSize);
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
                this.stats.evictions++;
            }
        }
    }

    /**
     * Check if data type should be persisted
     */
    private shouldPersist(type: keyof typeof this.configs): boolean {
        // Persist analytics and streaks, but not calendar data (too large)
        return type === "analytics" || type === "streaks";
    }

    /**
     * Get data from persistent cache
     */
    private async getPersistentCache<T>(
        key: string,
    ): Promise<CacheEntry<T> | null> {
        try {
            const stored = await AsyncStorage.getItem(`@habit_cache_${key}`);
            if (!stored) return null;

            return JSON.parse(stored) as CacheEntry<T>;
        } catch {
            return null;
        }
    }

    /**
     * Set data in persistent cache
     */
    private async setPersistentCache<T>(
        key: string,
        entry: CacheEntry<T>,
    ): Promise<void> {
        try {
            await AsyncStorage.setItem(`@habit_cache_${key}`, JSON.stringify(entry));
        } catch (error) {
            // Fail silently for persistent cache errors
            console.warn("Persistent cache write failed:", error);
        }
    }

    /**
     * Load persistent cache into memory
     */
    private async loadPersistentCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((key) => key.startsWith("@habit_cache_"));

            if (cacheKeys.length === 0) return;

            const entries = await AsyncStorage.multiGet(cacheKeys);

            for (const [key, value] of entries) {
                if (value) {
                    try {
                        const cacheKey = key.replace("@habit_cache_", "");
                        const entry = JSON.parse(value);

                        if (!this.isExpired(entry) && this.isValidEntry(entry)) {
                            this.memoryCache.set(cacheKey, entry);
                        }
                    } catch {
                        // Skip invalid entries
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load persistent cache:", error);
        }
    }

    /**
     * Invalidate persistent cache by pattern
     */
    private async invalidatePersistentCache(pattern: string): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const matchingKeys = keys.filter(
                (key) =>
                    key.startsWith("@habit_cache_") &&
                    this.matchesPattern(key.replace("@habit_cache_", ""), pattern),
            );

            if (matchingKeys.length > 0) {
                await AsyncStorage.multiRemove(matchingKeys);
            }
        } catch (error) {
            console.warn("Persistent cache invalidation failed:", error);
        }
    }

    /**
     * Check if key matches pattern (supports wildcards)
     */
    private matchesPattern(key: string, pattern: string): boolean {
        if (pattern === "*") return true;
        if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replace(/\*/g, ".*"));
            return regex.test(key);
        }
        return key === pattern;
    }

    /**
     * Invalidate dependent caches
     */
    private async invalidateDependencies(dependencies: string[]): Promise<void> {
        for (const dep of dependencies) {
            await this.invalidate(dep);
        }
    }

    /**
     * Preload data if not already cached
     */
    private async preloadIfNotCached(
        key: string,
        type: keyof typeof this.configs,
    ): Promise<void> {
        const cached = await this.get(key, type);
        if (!cached) {
            // This would trigger actual data loading from the service
            // Implementation depends on the specific service integration
            console.log(`Preloading ${key} of type ${type}`);
        }
    }

    /**
     * Start periodic cleanup of expired entries
     */
    private startPeriodicCleanup(): void {
        setInterval(
            () => {
                this.cleanupExpiredEntries();
            },
            5 * 60 * 1000,
        ); // Every 5 minutes
    }

    /**
     * Clean up expired entries
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.memoryCache.entries()) {
            if (this.isExpired(entry)) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.stats.evictions += cleaned;
            this.stats.totalSize = this.memoryCache.size;
        }
    }

    /**
     * Update hit rate statistics
     */
    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }
}

// Export singleton instance
export const cachingService = CachingService.getInstance();
