// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MultimodalCache } from '../../utils/multimodal-cache';
import { MULTIMODAL_CACHE_TTL_MS } from '../../utils/constants';

// Mock power tools
jest.mock('../../power-tools-init', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('MultimodalCache', () => {
    beforeEach(() => {
        MultimodalCache.clear(); // Clear cache before each test
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    describe('set and get operations', () => {
        it('should store and retrieve cached values', () => {
            const useCaseId = 'test-use-case-123';

            MultimodalCache.set(useCaseId, true);
            const result = MultimodalCache.get(useCaseId);

            expect(result).toBe(true);
        });

        it('should store and retrieve false values', () => {
            const useCaseId = 'test-use-case-123';

            MultimodalCache.set(useCaseId, false);
            const result = MultimodalCache.get(useCaseId);

            expect(result).toBe(false);
        });

        it('should return undefined for non-existent keys', () => {
            const result = MultimodalCache.get('non-existent-key');
            expect(result).toBeUndefined();
        });

        it('should handle multiple use case IDs', () => {
            MultimodalCache.set('use-case-1', true);
            MultimodalCache.set('use-case-2', false);
            MultimodalCache.set('use-case-3', true);

            expect(MultimodalCache.get('use-case-1')).toBe(true);
            expect(MultimodalCache.get('use-case-2')).toBe(false);
            expect(MultimodalCache.get('use-case-3')).toBe(true);
        });
    });

    describe('TTL expiration', () => {
        it('should return undefined for expired entries', () => {
            const useCaseId = 'test-use-case-123';

            // Mock Date.now to simulate time passing
            const originalDateNow = Date.now;
            const startTime = 1000000;
            Date.now = jest.fn(() => startTime);

            MultimodalCache.set(useCaseId, true);

            // Advance time beyond TTL
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS + 1000);

            const result = MultimodalCache.get(useCaseId);
            expect(result).toBeUndefined();

            // Restore original Date.now
            Date.now = originalDateNow;
        });

        it('should return cached value within TTL', () => {
            const useCaseId = 'test-use-case-123';

            // Mock Date.now to control time
            const originalDateNow = Date.now;
            const startTime = 1000000;
            Date.now = jest.fn(() => startTime);

            MultimodalCache.set(useCaseId, true);

            // Advance time but stay within TTL
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS - 1000);

            const result = MultimodalCache.get(useCaseId);
            expect(result).toBe(true);

            // Restore original Date.now
            Date.now = originalDateNow;
        });

        it('should automatically remove expired entries on get', () => {
            const useCaseId = 'test-use-case-123';

            // Mock Date.now to simulate time passing
            const originalDateNow = Date.now;
            const startTime = 1000000;
            Date.now = jest.fn(() => startTime);

            MultimodalCache.set(useCaseId, true);

            // Verify entry exists
            expect(MultimodalCache.getStats().size).toBe(1);

            // Advance time beyond TTL
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS + 1000);

            // Get should return undefined and remove expired entry
            const result = MultimodalCache.get(useCaseId);
            expect(result).toBeUndefined();
            expect(MultimodalCache.getStats().size).toBe(0);

            // Restore original Date.now
            Date.now = originalDateNow;
        });
    });

    describe('cleanupExpiredEntries', () => {
        it('should remove expired entries', () => {
            const originalDateNow = Date.now;
            const startTime = 1000000;
            Date.now = jest.fn(() => startTime);

            // Add multiple entries
            MultimodalCache.set('use-case-1', true);
            MultimodalCache.set('use-case-2', false);
            MultimodalCache.set('use-case-3', true);

            expect(MultimodalCache.getStats().size).toBe(3);

            // Advance time beyond TTL
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS + 1000);

            // Cleanup should remove all expired entries
            MultimodalCache.cleanupExpiredEntries();
            expect(MultimodalCache.getStats().size).toBe(0);

            // Restore original Date.now
            Date.now = originalDateNow;
        });

        it('should keep non-expired entries', () => {
            const originalDateNow = Date.now;
            const startTime = 1000000;
            Date.now = jest.fn(() => startTime);

            // Add entry
            MultimodalCache.set('use-case-1', true);

            // Advance time but stay within TTL
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS - 1000);

            // Add another entry (this one is newer)
            MultimodalCache.set('use-case-2', false);

            // Advance time to expire first entry but not second
            Date.now = jest.fn(() => startTime + MULTIMODAL_CACHE_TTL_MS + 500);

            MultimodalCache.cleanupExpiredEntries();

            // Only the newer entry should remain
            expect(MultimodalCache.getStats().size).toBe(1);
            expect(MultimodalCache.get('use-case-1')).toBeUndefined();
            expect(MultimodalCache.get('use-case-2')).toBe(false);

            // Restore original Date.now
            Date.now = originalDateNow;
        });

        it('should handle empty cache gracefully', () => {
            expect(() => MultimodalCache.cleanupExpiredEntries()).not.toThrow();
            expect(MultimodalCache.getStats().size).toBe(0);
        });
    });

    describe('clear', () => {
        it('should remove all entries', () => {
            MultimodalCache.set('use-case-1', true);
            MultimodalCache.set('use-case-2', false);
            MultimodalCache.set('use-case-3', true);

            expect(MultimodalCache.getStats().size).toBe(3);

            MultimodalCache.clear();

            expect(MultimodalCache.getStats().size).toBe(0);
            expect(MultimodalCache.get('use-case-1')).toBeUndefined();
            expect(MultimodalCache.get('use-case-2')).toBeUndefined();
            expect(MultimodalCache.get('use-case-3')).toBeUndefined();
        });

        it('should handle empty cache gracefully', () => {
            expect(() => MultimodalCache.clear()).not.toThrow();
            expect(MultimodalCache.getStats().size).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', () => {
            const stats = MultimodalCache.getStats();
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('keys');
            expect(Array.isArray(stats.keys)).toBe(true);
            expect(stats.size).toBe(0);
        });

        it('should return correct size and keys', () => {
            MultimodalCache.set('use-case-1', true);
            MultimodalCache.set('use-case-2', false);

            const stats = MultimodalCache.getStats();
            expect(stats.size).toBe(2);
            expect(stats.keys).toContain('use-case-1');
            expect(stats.keys).toContain('use-case-2');
        });
    });
});
