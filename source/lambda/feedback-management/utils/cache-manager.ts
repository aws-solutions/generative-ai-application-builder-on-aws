// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import NodeCache from 'node-cache';
import { logger } from '../power-tools-init';
import { TIME_5_MINS, TIME_15_MINS } from './constants';

/**
 * Cache options for get operations
 */
export interface CacheOptions {
    /**
     * Force a refresh of the cached data
     */
    forceRefresh?: boolean;
    
    /**
     * Custom TTL for this specific item in milliseconds
     */
    ttl?: number;
}

/**
 * Singleton cache manager that can be shared across services
 */
export class CacheManager {
    private static instance: CacheManager;
    private cache: NodeCache;
    private lastCleanupTime: number = Date.now();
    private readonly cleanupInterval: number = TIME_15_MINS;
    private readonly keyVersions: Map<string, number> = new Map();

    private constructor() {
        // Default TTL of 5 minutes
        this.cache = new NodeCache({
            stdTTL: TIME_5_MINS / 1000, // Convert to seconds
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // Don't clone objects (better performance)
        });

        logger.debug('Cache manager initialized');
    }

    /**
     * Get the singleton instance of the cache manager
     */
    public static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Get a value from the cache
     * @param key Cache key
     * @param options Cache options including force refresh flag
     * @returns Cached value or undefined if not found
     */
    public get<T>(key: string, options?: CacheOptions): T | undefined {
        // If force refresh is requested, skip the cache lookup
        if (options?.forceRefresh) {
            logger.debug('Force refresh requested, skipping cache lookup', { key });
            return undefined;
        }
        
        return this.cache.get<T>(key);
    }

    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time to live in milliseconds (optional, uses default if not specified)
     * @returns true if successful
     */
    public set<T>(key: string, value: T, ttl?: number): boolean {
        // Increment version for this key
        const currentVersion = this.keyVersions.get(key) || 0;
        this.keyVersions.set(key, currentVersion + 1);
        
        return this.cache.set(key, value, ttl ? ttl / 1000 : TIME_5_MINS / 1000);
    }

    /**
     * Delete a value from the cache
     * @param key Cache key
     * @returns true if successful, false if key not found
     */
    public delete(key: string): boolean {
        // Update version even on delete to invalidate any code still using the old version
        const currentVersion = this.keyVersions.get(key) || 0;
        this.keyVersions.set(key, currentVersion + 1);
        
        return this.cache.del(key) > 0;
    }
    
    /**
     * Get the current version of a cached key
     * Used for conditional operations to detect if the cache was updated elsewhere
     * @param key Cache key
     * @returns Current version number, or 0 if key has never been cached
     */
    public getKeyVersion(key: string): number {
        return this.keyVersions.get(key) || 0;
    }

    /**
     * Clear the entire cache
     */
    public clear(): void {
        this.cache.flushAll();
        this.keyVersions.clear();
    }

    /**
     * Get cache statistics
     */
    public getStats(): { keys: number; hits: number; misses: number; ksize: number; vsize: number } {
        return this.cache.getStats();
    }

    /**
     * Check if a periodic cleanup should be performed
     * This can be called at the beginning of Lambda handlers to clean up old entries
     */
    public performPeriodicCleanupIfNeeded(): void {
        const now = Date.now();
        if (now - this.lastCleanupTime > this.cleanupInterval) {
            logger.debug('Performing periodic cache cleanup', {
                beforeSize: this.cache.keys().length
            });

            // The internal checkperiod will handle actual deletion of expired keys
            // This just forces a check to happen now
            this.cache.keys().forEach((key) => {
                this.cache.get(key);
            });

            this.lastCleanupTime = now;

            logger.debug('Cache cleanup completed', {
                afterSize: this.cache.keys().length,
                stats: this.getStats()
            });
        }
    }
}
