// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { hasDuplicateAttrItems, isAttrItemsValid, isSecurityGroupValid, isSubnetIdValid } from '../helpers';

describe('VPC Config Helpers', () => {
    describe('hasDuplicateAttrItems', () => {
        test('should return false for empty array', () => {
            expect(hasDuplicateAttrItems([])).toBe(false);
        });

        test('should return false for array with single item', () => {
            expect(hasDuplicateAttrItems([{ key: 'subnet-12345678' }])).toBe(false);
        });

        test('should return false for array with unique items', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: 'subnet-87654321' },
                { key: 'subnet-abcdefgh' }
            ];
            expect(hasDuplicateAttrItems(items)).toBe(false);
        });

        test('should return true for array with duplicate items', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: 'subnet-87654321' },
                { key: 'subnet-12345678' }
            ];
            expect(hasDuplicateAttrItems(items)).toBe(true);
        });

        test('should handle items without keys', () => {
            const items = [
                { key: 'subnet-12345678' },
                {},
                { key: 'subnet-87654321' }
            ];
            expect(hasDuplicateAttrItems(items)).toBe(false);
        });

        test('should handle items with empty keys', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: '' },
                { key: 'subnet-87654321' }
            ];
            expect(hasDuplicateAttrItems(items)).toBe(false);
        });

        test('should handle duplicate empty keys', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: '' },
                { key: '' }
            ];
            expect(hasDuplicateAttrItems(items)).toBe(false);
        });
    });

    describe('isAttrItemsValid with subnet validation', () => {
        test('should return false for empty array', () => {
            expect(isAttrItemsValid([], isSubnetIdValid)).toBe(false);
        });

        test('should return true for valid subnet IDs', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: 'subnet-87654321' }
            ];
            expect(isAttrItemsValid(items, isSubnetIdValid)).toBe(true);
        });

        test('should return false if any subnet ID is invalid', () => {
            const items = [
                { key: 'subnet-12345678' },
                { key: 'invalid-subnet' }
            ];
            expect(isAttrItemsValid(items, isSubnetIdValid)).toBe(false);
        });
    });

    describe('isAttrItemsValid with security group validation', () => {
        test('should return false for empty array', () => {
            expect(isAttrItemsValid([], isSecurityGroupValid)).toBe(false);
        });

        test('should return true for valid security group IDs', () => {
            const items = [
                { key: 'sg-12345678' },
                { key: 'sg-87654321' }
            ];
            expect(isAttrItemsValid(items, isSecurityGroupValid)).toBe(true);
        });

        test('should return false if any security group ID is invalid', () => {
            const items = [
                { key: 'sg-12345678' },
                { key: 'invalid-sg' }
            ];
            expect(isAttrItemsValid(items, isSecurityGroupValid)).toBe(false);
        });
    });
});
