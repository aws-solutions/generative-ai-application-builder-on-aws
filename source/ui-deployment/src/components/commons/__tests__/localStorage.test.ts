// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { save, load, remove } from '../localStorage';

describe('localStorage utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('save', () => {
        test('saves a string value as JSON', () => {
            save('key1', 'hello');
            expect(localStorage.getItem('key1')).toBe('"hello"');
        });

        test('saves an object value as JSON', () => {
            save('key2', { a: 1, b: 'test' });
            expect(localStorage.getItem('key2')).toBe('{"a":1,"b":"test"}');
        });

        test('saves an array value as JSON', () => {
            save('key3', [1, 2, 3]);
            expect(localStorage.getItem('key3')).toBe('[1,2,3]');
        });

        test('saves null as JSON', () => {
            save('key4', null);
            expect(localStorage.getItem('key4')).toBe('null');
        });
    });

    describe('load', () => {
        test('loads and parses a stored JSON string', () => {
            localStorage.setItem('key1', '"hello"');
            expect(load('key1')).toBe('hello');
        });

        test('loads and parses a stored JSON object', () => {
            localStorage.setItem('key2', '{"a":1}');
            expect(load('key2')).toEqual({ a: 1 });
        });

        test('returns null for non-existent key', () => {
            expect(load('nonexistent')).toBeNull();
        });

        test('returns undefined and logs warning for invalid JSON', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            localStorage.setItem('badKey', 'not valid json{{{');
            const result = load('badKey');
            expect(result).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('The badKey value that is stored in localStorage is incorrect')
            );
            warnSpy.mockRestore();
        });
    });

    describe('remove', () => {
        test('removes a key from localStorage', () => {
            localStorage.setItem('key1', '"value"');
            remove('key1');
            expect(localStorage.getItem('key1')).toBeNull();
        });
    });
});
