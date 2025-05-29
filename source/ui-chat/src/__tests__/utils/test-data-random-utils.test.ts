// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
    blindText,
    randomWord,
    randomAlias,
    randomSentence,
    randomInteger,
    randomDigit,
    shuffle
} from './test-data-random-utils';

describe('test-data-random-utils', () => {
    describe('blindText', () => {
        it('should generate text with specified number of words', () => {
            const wordCount = 5;
            const result = blindText(wordCount);
            expect(result.split(' ')).toHaveLength(wordCount);
        });

        it('should generate different text each time', () => {
            const text1 = blindText(3);
            const text2 = blindText(3);
            expect(text1).not.toBe(text2);
        });
    });

    describe('randomWord', () => {
        it('should generate word within default length constraints', () => {
            const word = randomWord();
            expect(word.length).toBeGreaterThanOrEqual(5);
            expect(word.length).toBeLessThanOrEqual(10);
        });

        it('should generate word with custom length constraints', () => {
            const word = randomWord(3, 4);
            expect(word.length).toBeGreaterThanOrEqual(3);
            expect(word.length).toBeLessThanOrEqual(4);
        });

        it('should start with uppercase letter', () => {
            const word = randomWord();
            expect(word[0]).toBe(word[0].toUpperCase());
        });
    });

    describe('randomAlias', () => {
        it('should generate lowercase alias ending with @', () => {
            const alias = randomAlias();
            expect(alias).toMatch(/^[a-z]+@$/);
        });
    });

    describe('randomSentence', () => {
        it('should generate sentence with default word count range', () => {
            const sentence = randomSentence();
            const wordCount = sentence.split(' ').length;
            expect(wordCount).toBeGreaterThanOrEqual(1);
            expect(wordCount).toBeLessThanOrEqual(5);
        });

        it('should generate sentence with custom word count range', () => {
            const sentence = randomSentence(2, 3);
            const wordCount = sentence.split(' ').length;
            expect(wordCount).toBeGreaterThanOrEqual(2);
            expect(wordCount).toBeLessThanOrEqual(3);
        });
    });

    describe('randomInteger', () => {
        it('should generate number within range', () => {
            const max = 10;
            const result = randomInteger(max);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(max);
        });

        it('should return 0 when max is 1', () => {
            const result = randomInteger(1);
            expect(result).toBe(0);
        });
    });

    describe('randomDigit', () => {
        it('should generate digit with default max', () => {
            const digit = randomDigit();
            expect(digit).toBeGreaterThanOrEqual(0);
            expect(digit).toBeLessThan(10);
        });

        it('should generate digit with custom max', () => {
            const max = 5;
            const digit = randomDigit(max);
            expect(digit).toBeGreaterThanOrEqual(0);
            expect(digit).toBeLessThan(max);
        });
    });

    describe('shuffle', () => {
        it('should return array with same length', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle([...array]);
            expect(shuffled).toHaveLength(array.length);
        });

        it('should contain all original elements', () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffle([...array]);
            expect(shuffled).toEqual(expect.arrayContaining(array));
        });

        it('should work with empty array', () => {
            const empty: number[] = [];
            const shuffled = shuffle(empty);
            expect(shuffled).toHaveLength(0);
        });

        it('should work with single element array', () => {
            const single = [1];
            const shuffled = shuffle([...single]);
            expect(shuffled).toEqual(single);
        });
    });
});
