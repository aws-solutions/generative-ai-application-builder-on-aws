// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CacheManager } from '../../utils/cache-manager';
import { TIME_5_MINS, TIME_15_MINS } from '../../utils/constants';

// Mock the logger to prevent console output during tests
jest.mock('../../power-tools-init', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    tracer: {
        captureMethod: jest.fn().mockImplementation((name, fn) => fn)
    },
    metrics: {
        addMetric: jest.fn(),
        addDimension: jest.fn()
    }
}));

describe('CacheManager', () => {
    let cacheManager: CacheManager;
    
    beforeEach(() => {
        // Reset the singleton instance before each test
        // This is a hack to access the private static instance
        (CacheManager as any).instance = undefined;
        cacheManager = CacheManager.getInstance();
        
        // Mock Date.now for consistent testing
        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('getInstance', () => {
        it('should return the same instance when called multiple times', () => {
            const instance1 = CacheManager.getInstance();
            const instance2 = CacheManager.getInstance();
            
            expect(instance1).toBe(instance2);
        });
    });
    
    describe('get and set', () => {
        it('should store and retrieve values', () => {
            const key = 'test-key';
            const value = { name: 'test-value' };
            
            cacheManager.set(key, value);
            const retrieved = cacheManager.get(key);
            
            expect(retrieved).toEqual(value);
        });
        
        it('should return undefined for non-existent keys', () => {
            const result = cacheManager.get('non-existent-key');
            expect(result).toBeUndefined();
        });
        
        it('should respect forceRefresh option', () => {
            const key = 'test-key';
            const value = { name: 'test-value' };
            
            cacheManager.set(key, value);
            
            // Normal get should return the value
            expect(cacheManager.get(key)).toEqual(value);
            
            // Force refresh should return undefined
            expect(cacheManager.get(key, { forceRefresh: true })).toBeUndefined();
        });
        
        it('should respect custom TTL', () => {
            // Mock the internal NodeCache get/set methods to verify TTL
            const mockSet = jest.spyOn(cacheManager['cache'], 'set');
            
            cacheManager.set('key1', 'value1'); // Default TTL
            cacheManager.set('key2', 'value2', 10000); // Custom TTL (10 seconds)
            
            // Default TTL should be 5 minutes (in seconds)
            expect(mockSet).toHaveBeenNthCalledWith(1, 'key1', 'value1', TIME_5_MINS / 1000);
            
            // Custom TTL should be 10 seconds
            expect(mockSet).toHaveBeenNthCalledWith(2, 'key2', 'value2', 10);
        });
    });
    
    describe('delete', () => {
        it('should delete a value from the cache', () => {
            cacheManager.set('key-to-delete', 'value');
            expect(cacheManager.get('key-to-delete')).toBe('value');
            
            const result = cacheManager.delete('key-to-delete');
            expect(result).toBe(true);
            expect(cacheManager.get('key-to-delete')).toBeUndefined();
        });
        
        it('should return false when deleting non-existent key', () => {
            const result = cacheManager.delete('non-existent-key');
            expect(result).toBe(false);
        });
        
        it('should increment key version when deleting', () => {
            cacheManager.set('key-to-delete', 'value');
            const initialVersion = cacheManager.getKeyVersion('key-to-delete');
            
            cacheManager.delete('key-to-delete');
            const newVersion = cacheManager.getKeyVersion('key-to-delete');
            
            expect(newVersion).toBe(initialVersion + 1);
        });
    });
    
    describe('clear', () => {
        it('should clear all values from the cache', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');
            
            cacheManager.clear();
            
            expect(cacheManager.get('key1')).toBeUndefined();
            expect(cacheManager.get('key2')).toBeUndefined();
        });
        
        it('should clear key versions when clearing cache', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');
            
            // Verify versions exist
            expect(cacheManager.getKeyVersion('key1')).toBe(1);
            expect(cacheManager.getKeyVersion('key2')).toBe(1);
            
            cacheManager.clear();
            
            // After clear, versions should be reset
            expect(cacheManager.getKeyVersion('key1')).toBe(0);
            expect(cacheManager.getKeyVersion('key2')).toBe(0);
        });
    });
    
    describe('getStats', () => {
        it('should return cache statistics', () => {
            const stats = cacheManager.getStats();
            
            expect(stats).toHaveProperty('keys');
            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('ksize');
            expect(stats).toHaveProperty('vsize');
        });
    });
    
    describe('getKeyVersion', () => {
        it('should return 0 for non-existent keys', () => {
            expect(cacheManager.getKeyVersion('non-existent-key')).toBe(0);
        });
        
        it('should increment version when setting a value', () => {
            const key = 'versioned-key';
            
            // Initial version should be 0
            expect(cacheManager.getKeyVersion(key)).toBe(0);
            
            // First set should make version 1
            cacheManager.set(key, 'value1');
            expect(cacheManager.getKeyVersion(key)).toBe(1);
            
            // Second set should make version 2
            cacheManager.set(key, 'value2');
            expect(cacheManager.getKeyVersion(key)).toBe(2);
        });
    });
    
    describe('performPeriodicCleanupIfNeeded', () => {
        it('should not perform cleanup if interval has not elapsed', () => {
            // Set the last cleanup time to current mocked time
            (cacheManager as any).lastCleanupTime = Date.now();
            
            const keySpy = jest.spyOn(cacheManager['cache'], 'keys');
            
            cacheManager.performPeriodicCleanupIfNeeded();
            
            // Should not call keys() if cleanup is not needed
            expect(keySpy).not.toHaveBeenCalled();
        });
        
        it('should perform cleanup if interval has elapsed', () => {
            // Set the last cleanup time to be older than the cleanup interval
            const oldTime = Date.now() - TIME_15_MINS - 1000;
            (cacheManager as any).lastCleanupTime = oldTime;
            
            const keySpy = jest.spyOn(cacheManager['cache'], 'keys').mockReturnValue(['key1', 'key2']);
            const getSpy = jest.spyOn(cacheManager['cache'], 'get');
            
            cacheManager.performPeriodicCleanupIfNeeded();
            
            // Should call keys() and get() for each key to trigger TTL check
            expect(keySpy).toHaveBeenCalled();
            expect(getSpy).toHaveBeenCalledTimes(2);
            
            // Last cleanup time should be updated
            expect((cacheManager as any).lastCleanupTime).toBe(Date.now());
        });
    });
});
