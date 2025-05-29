// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CROSS_REGION_INFERENCE, INFERENCE_PROFILE, MODEL_PROVIDER_NAME_MAP } from '../../steps-config';
import {
    isValidInteger,
    isValidFloat,
    isValidBoolean,
    validateList,
    validateDictionary,
    isModelParametersValid,
    formatModelNamesList
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

describe('formatModelNamesList', () => {
    test('should handle Bedrock model names with DisplayName and Description', () => {
        const modelData = {
            '1': {
                ModelName: 'ai21.j2-ultra',
                DisplayName: 'J2 Ultra',
                Description: 'AI21 J2 Ultra model'
            },
            '2': {
                ModelName: 'anthropic.claude-v2',
                DisplayName: 'Claude v2',
                Description: 'Anthropic Claude v2 model'
            }
        };

        const result = formatModelNamesList(modelData, MODEL_PROVIDER_NAME_MAP.Bedrock);

        expect(result.some((group) => group.label === CROSS_REGION_INFERENCE)).toBeFalsy();
        expect(result).toHaveLength(2);
        
        // Check that ai21 group contains the correct option
        const ai21Group = result.find(group => group.label === 'Ai21');
        expect(ai21Group).toBeDefined();
        expect(ai21Group?.options).toContainEqual({
            label: 'J2 Ultra',
            value: 'ai21.j2-ultra',
            description: 'AI21 J2 Ultra model'
        });
        
        // Check that anthropic group contains the correct option
        const anthropicGroup = result.find(group => group.label === 'Anthropic');
        expect(anthropicGroup).toBeDefined();
        expect(anthropicGroup?.options).toContainEqual({
            label: 'Claude v2',
            value: 'anthropic.claude-v2',
            description: 'Anthropic Claude v2 model'
        });
    });

    test('should handle Bedrock model names without DisplayName', () => {
        const modelData = {
            '1': {
                ModelName: 'ai21.j2-ultra',
                Description: 'AI21 J2 Ultra model'
            },
            '2': {
                ModelName: 'anthropic.claude-v2'
            }
        };

        const result = formatModelNamesList(modelData, MODEL_PROVIDER_NAME_MAP.Bedrock);

        // Check that ai21 group uses ModelName as fallback for label
        const ai21Group = result.find(group => group.label === 'Ai21');
        expect(ai21Group?.options).toContainEqual({
            label: 'ai21.j2-ultra',
            value: 'ai21.j2-ultra',
            description: 'AI21 J2 Ultra model'
        });
        
        // Check that anthropic group uses ModelName as fallback for label and empty string for description
        const anthropicGroup = result.find(group => group.label === 'Anthropic');
        expect(anthropicGroup?.options).toContainEqual({
            label: 'anthropic.claude-v2',
            value: 'anthropic.claude-v2',
            description: ''
        });
    });

    test('should handle non-Bedrock model names with DisplayName and Description', () => {
        const modelData = {
            '1': {
                ModelName: 'model1',
                DisplayName: 'Model One',
                Description: 'First model'
            },
            '2': {
                ModelName: 'model2',
                DisplayName: 'Model Two',
                Description: 'Second model'
            }
        };
        
        const result = formatModelNamesList(modelData, MODEL_PROVIDER_NAME_MAP.SageMaker);

        expect(result).toEqual([
            { label: 'Model One', value: 'model1', description: 'First model' },
            { label: 'Model Two', value: 'model2', description: 'Second model' }
        ]);
    });

    test('should handle empty model data object', () => {
        const modelData = {};

        const bedrockResult = formatModelNamesList(modelData, MODEL_PROVIDER_NAME_MAP.Bedrock);
        expect(bedrockResult).toEqual([]);

        const nonBedrockResult = formatModelNamesList(modelData, MODEL_PROVIDER_NAME_MAP.SageMaker);
        expect(nonBedrockResult).toEqual([]);
    });
    
    test('should handle null or undefined model data', () => {
        const bedrockResultNull = formatModelNamesList(null, MODEL_PROVIDER_NAME_MAP.Bedrock);
        expect(bedrockResultNull).toEqual([]);
        
        const bedrockResultUndefined = formatModelNamesList(undefined, MODEL_PROVIDER_NAME_MAP.Bedrock);
        expect(bedrockResultUndefined).toEqual([]);
    });
});
