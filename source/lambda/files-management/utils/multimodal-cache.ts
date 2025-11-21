// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { logger } from '../power-tools-init';
import { MULTIMODAL_CACHE_TTL_MS } from './constants';

interface CacheEntry {
    enabled: boolean;
    timestamp: number;
}

/**
 * Simple in-memory cache for multimodal validation results
 * Using Map for simplicity since this lambda doesn't need the advanced features of node-cache
 */
class MultimodalCache {
    private static cache = new Map<string, CacheEntry>();

    /**
     * Get a cached multimodal validation result
     * @param useCaseId - The use case ID to check
     * @returns boolean if cached and valid, undefined if not cached or expired
     */
    public static get(useCaseId: string): boolean | undefined {
        const cachedEntry = this.cache.get(useCaseId);

        if (cachedEntry && Date.now() - cachedEntry.timestamp < MULTIMODAL_CACHE_TTL_MS) {
            logger.debug(`Multimodal capability retrieved from cache for useCaseId: ${useCaseId}`);
            return cachedEntry.enabled;
        }

        // Entry is expired or doesn't exist
        if (cachedEntry) {
            this.cache.delete(useCaseId);
            logger.debug(`Expired cache entry removed for useCaseId: ${useCaseId}`);
        }

        return undefined;
    }

    /**
     * Set a multimodal validation result in cache
     * @param useCaseId - The use case ID
     * @param enabled - Whether multimodal is enabled
     */
    public static set(useCaseId: string, enabled: boolean): void {
        this.cache.set(useCaseId, { enabled, timestamp: Date.now() });
        logger.debug(`Multimodal capability cached for useCaseId: ${useCaseId}, enabled: ${enabled}`);
    }

    /**
     * Clean up expired entries from the cache
     * Called periodically to prevent memory leaks
     */
    public static cleanupExpiredEntries(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= MULTIMODAL_CACHE_TTL_MS) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach((key) => this.cache.delete(key));

        if (expiredKeys.length > 0) {
            logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
    }

    /**
     * Clear all cache entries
     */
    public static clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    public static getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export { MultimodalCache };
