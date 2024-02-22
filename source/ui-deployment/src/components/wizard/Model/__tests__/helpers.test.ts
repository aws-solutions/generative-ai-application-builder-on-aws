/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import {
    isValidInteger,
    isValidFloat,
    isValidBoolean,
    validateList,
    validateDictionary,
    isModelParametersValid
} from '../helpers';

describe('When validating model parameters', () => {
    describe('It should validate integer strings', () => {
        const mockModelParamIntegerAttribute = (val: string) => {
            return {
                key: 'k',
                value: val,
                type: { label: 'integer', value: 'integer' }
            };
        };

        test('It should return true for valid integer strings', () => {
            expect(isValidInteger(mockModelParamIntegerAttribute('1'))).toBeTruthy();
            expect(isValidInteger(mockModelParamIntegerAttribute('-1'))).toBeTruthy();
            expect(isValidInteger(mockModelParamIntegerAttribute('1.0'))).toBeTruthy();
            expect(isValidInteger(mockModelParamIntegerAttribute('fake-string'))).toBeFalsy();
        });
    });

    describe('It should validate float strings', () => {
        const mockModelParamFloatAttribute = (val: string) => {
            return {
                key: 'k',
                value: val,
                type: { label: 'float', value: 'float' }
            };
        };
        test('It should return true for valid float strings', () => {
            expect(isValidFloat(mockModelParamFloatAttribute('1'))).toBeTruthy();
            expect(isValidFloat(mockModelParamFloatAttribute('-1'))).toBeTruthy();
            expect(isValidFloat(mockModelParamFloatAttribute('1.0'))).toBeTruthy();
            expect(isValidFloat(mockModelParamFloatAttribute('fake-string'))).toBeFalsy();
        });
    });

    describe('It should validate boolean strings', () => {
        const mockModelParamBooleanAttribute = (val: string) => {
            return {
                key: 'k',
                value: val,
                type: { label: 'boolean', value: 'boolean' }
            };
        };
        test('It should return true for valid boolean strings', () => {
            expect(isValidBoolean(mockModelParamBooleanAttribute('true'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('TRUE'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('false'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('yes'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('no'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('No'))).toBeTruthy();
            expect(isValidBoolean(mockModelParamBooleanAttribute('1'))).toBeFalsy();
        });
    });

    describe('It should validate list strings', () => {
        const mockModelParamListAttribute = (val: string) => {
            return {
                key: 'k',
                value: val,
                type: { label: 'list', value: 'list' }
            };
        };
        test('It should return true for valid list strings', () => {
            expect(validateList(mockModelParamListAttribute('["a","b","c"]'))).toBeTruthy();
            expect(validateList(mockModelParamListAttribute('"a","b","c"'))).toBeTruthy();
            expect(validateList(mockModelParamListAttribute('["a","b","1"]'))).toBeTruthy();
            expect(validateList(mockModelParamListAttribute("['a','b']"))).toBeFalsy();
            expect(validateList(mockModelParamListAttribute('["a","b",'))).toBeFalsy();
        });
    });

    describe('It should validate dictionary strings', () => {
        const mockModelParamDictionaryAttribute = (val: string) => {
            return {
                key: 'k',
                value: val,
                type: { label: 'dictionary', value: 'dictionary' }
            };
        };

        test('It should return true for valid dictionary strings', () => {
            expect(validateDictionary(mockModelParamDictionaryAttribute('{"a":"b","c":"d"}'))).toBeTruthy();
            expect(validateDictionary(mockModelParamDictionaryAttribute('{a:"b","c":"d"}'))).toBeFalsy();
        });
    });

    describe('It should validate model parameters', () => {
        test('It should return true for valid model parameters', () => {
            expect(
                isModelParametersValid([
                    {
                        key: 'a',
                        value: '1',
                        type: { label: 'integer', value: 'integer' }
                    },
                    {
                        key: 'b',
                        value: '1.0',
                        type: { label: 'float', value: 'float' }
                    },
                    {
                        key: 'c',
                        value: 'yes',
                        type: { label: 'boolean', value: 'boolean' }
                    },
                    {
                        key: 'd',
                        value: 'fake-string',
                        type: { label: 'string', value: 'string' }
                    },
                    {
                        key: 'e',
                        value: '["a","b"]',
                        type: { label: 'list', value: 'list' }
                    },
                    {
                        key: 'f',
                        value: '{"a":"b","c":"d"}',
                        type: { label: 'dictionary', value: 'dictionary' }
                    }
                ])
            ).toBeTruthy();
        });

        test('It should return false if a model parameter is invalid', () => {
            expect(
                isModelParametersValid([
                    {
                        key: 'a',
                        value: '1',
                        type: { label: 'integer', value: 'integer' }
                    },
                    {
                        key: 'b',
                        value: 'fake-string',
                        type: { label: 'float', value: 'float' }
                    }
                ])
            ).toBeFalsy();
        });
    });
});
