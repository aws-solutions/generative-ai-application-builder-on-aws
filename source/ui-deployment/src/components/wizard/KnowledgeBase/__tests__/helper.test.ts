// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

//test different scores for scoreToKendraMapping function
import { scoreToKendraMapping } from '../helpers';

describe('scoreToKendraMapping', () => {
    it('should throw an exception if score is not between 0 and 1', () => {
        expect(() => scoreToKendraMapping(-0.1)).toThrow();
        expect(() => scoreToKendraMapping(1.1)).toThrow();
    });

    it('should return VERY_HIGH', () => {
        expect(scoreToKendraMapping(1)).toBe('VERY_HIGH');
    });

    it('should return HIGH', () => {
        expect(scoreToKendraMapping(0.75)).toBe('HIGH');
        expect(scoreToKendraMapping(0.99)).toBe('HIGH');
    });

    it('should return MEDIUM', () => {
        expect(scoreToKendraMapping(0.5)).toBe('MEDIUM');
        expect(scoreToKendraMapping(0.74)).toBe('MEDIUM');
    });

    it('should return LOW', () => {
        expect(scoreToKendraMapping(0.25)).toBe('LOW');
        expect(scoreToKendraMapping(0.49)).toBe('LOW');
    });

    it('should return DISABLED', () => {
        expect(scoreToKendraMapping(0)).toBe('DISABLED');
        expect(scoreToKendraMapping(0.24)).toBe('DISABLED');
    });
});
