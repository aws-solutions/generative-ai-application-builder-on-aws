// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConfigMappingService } from '../../services/config-mapping-service';
import { DEFAULT_PARAMETER_MAPPING } from '../../utils/constants';

describe('ConfigMappingService', () => {
    describe('getParameterMappings', () => {
        it('should return default config when no FeedbackParams exists', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                // No FeedbackParams
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: true,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {}
            });
        });

        it('should return disabled config when feedback is disabled', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: false,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {}
            });
        });

        it('should use custom mappings when provided', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'temperature': '$.LlmParams.BedrockLlmParams.Temperature',
                        'maxTokens': '$.LlmParams.BedrockLlmParams.MaxTokens'
                    }
                }
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: true,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {
                    'temperature': '$.LlmParams.BedrockLlmParams.Temperature',
                    'maxTokens': '$.LlmParams.BedrockLlmParams.MaxTokens'
                }
            });
        });

        it('should default to enabled when FeedbackEnabled is not specified', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                FeedbackParams: {
                    // No FeedbackEnabled property
                    CustomMappings: {
                        'temperature': '$.LlmParams.BedrockLlmParams.Temperature'
                    }
                }
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: true,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {
                    'temperature': '$.LlmParams.BedrockLlmParams.Temperature'
                }
            });
        });

        it('should ignore CustomMappings if not an object', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: 'not an object'
                }
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: true,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {}
            });
        });

        it('should filter out invalid custom mappings', () => {
            const service = new ConfigMappingService();
            const useCaseConfig = {
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        validMapping: '$.LlmParams.ModelProvider',
                        invalidMapping: 123,
                        anotherValid: '$.UseCaseType'
                    }
                }
            };

            const result = service.getParameterMappings(useCaseConfig);

            expect(result).toEqual({
                enabled: true,
                parameterMappings: DEFAULT_PARAMETER_MAPPING,
                customMappings: {
                    validMapping: '$.LlmParams.ModelProvider',
                    anotherValid: '$.UseCaseType'
                }
            });
        });
    });

    describe('validateMappingPath', () => {
        it('should validate a valid path', () => {
            const service = new ConfigMappingService();
            const config = {
                level1: {
                    level2: 'value'
                }
            };

            const result = service.validateMappingPath(config, 'level1.level2');

            expect(result).toEqual({
                valid: true,
                value: 'value'
            });
        });

        it('should invalidate a non-existent path', () => {
            const service = new ConfigMappingService();
            const config = {
                level1: {
                    level2: 'value'
                }
            };

            const result = service.validateMappingPath(config, 'level1.nonexistent');

            expect(result).toEqual({
                valid: false,
                error: 'Path does not resolve to a value'
            });
        });

        it('should invalidate an empty path', () => {
            const service = new ConfigMappingService();
            const config = {
                level1: {
                    level2: 'value'
                }
            };

            const result = service.validateMappingPath(config, '');

            expect(result).toEqual({
                valid: false,
                error: 'Path must be a non-empty string'
            });
        });

        it('should handle invalid path syntax', () => {
            const service = new ConfigMappingService();
            const config = {
                level1: {
                    level2: 'value'
                }
            };

            const result = service.validateMappingPath(config, '[invalid]');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('getNestedValue', () => {
        it('should extract nested values using dot notation', () => {
            const obj = {
                level1: {
                    level2: {
                        level3: 'value'
                    }
                }
            };

            expect(ConfigMappingService.getNestedValue(obj, 'level1.level2.level3')).toBe('value');
        });

        it('should handle multiple values and return array', () => {
            const obj = {
                users: [
                    { name: 'Alice', role: 'admin' },
                    { name: 'Bob', role: 'user' },
                    { name: 'Charlie', role: 'admin' }
                ]
            };

            const admins = ConfigMappingService.getNestedValue(obj, "$.users[?(@.role=='admin')]");
            expect(Array.isArray(admins)).toBe(true);
            expect(admins.length).toBe(2);
            expect(admins[0].name).toBe('Alice');
            expect(admins[1].name).toBe('Charlie');
        });

        it('should return undefined for non-existent paths', () => {
            const obj = {
                level1: {
                    level2: 'value'
                }
            };

            expect(ConfigMappingService.getNestedValue(obj, 'level1.level2.level3')).toBeUndefined();
            expect(ConfigMappingService.getNestedValue(obj, 'nonexistent')).toBeUndefined();
        });

        it('should handle empty path', () => {
            const obj = { value: 'test' };
            expect(ConfigMappingService.getNestedValue(obj, '')).toBe(obj);
        });

        it('should handle null or undefined objects', () => {
            expect(ConfigMappingService.getNestedValue(null, 'some.path')).toBeUndefined();
            expect(ConfigMappingService.getNestedValue(undefined, 'some.path')).toBeUndefined();
        });

        it('should handle JSONPath expressions', () => {
            const obj = {
                users: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' }
                ]
            };

            expect(ConfigMappingService.getNestedValue(obj, 'users[0].name')).toBe('Alice');
            expect(ConfigMappingService.getNestedValue(obj, '$.users[1].name')).toBe('Bob');
        });

        it('should handle array filtering with JSONPath', () => {
            const obj = {
                products: [
                    { id: 1, category: 'category1', price: 100 },
                    { id: 2, category: 'category2', price: 20 },
                    { id: 3, category: 'category3', price: 200 }
                ]
            };

            // Get the first category1 product
            expect(ConfigMappingService.getNestedValue(obj, "$.products[?(@.category=='category1')]")).toEqual({
                id: 1,
                category: 'category1',
                price: 100
            });
        });

        it('should handle errors gracefully', () => {
            const obj = { value: 'test' };

            // Invalid JSONPath should return undefined, not throw
            expect(ConfigMappingService.getNestedValue(obj, '[invalid]')).toBeUndefined();
        });
    });

    describe('extractConfigAttributes', () => {
        it('should extract attributes based on parameter mappings', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0'
                    },
                    RAGEnabled: true
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Bedrock',
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'FAKE-KB-ID'
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            expect(attributes).toEqual({
                modelProvider: 'Bedrock',
                bedrockModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
                knowledgeBaseType: 'Bedrock',
                bedrockKnowledgeBaseId: 'FAKE-KB-ID',
                ragEnabled: 'true',
                useCaseType: 'Text'
            });

            expect(customAttributes).toEqual({});
        });

        it('should handle null or undefined config', () => {
            const service = new ConfigMappingService();

            const nullResult = service.extractConfigAttributes(null as any);
            expect(nullResult).toEqual({ attributes: {}, customAttributes: {} });

            const undefinedResult = service.extractConfigAttributes(undefined as any);
            expect(undefinedResult).toEqual({ attributes: {}, customAttributes: {} });
        });

        it('should return empty object when parameter mappings are disabled', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                LlmParams: {
                    ModelProvider: 'Bedrock'
                },
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            expect(attributes).toEqual({});
            expect(customAttributes).toEqual({});
        });

        it('should handle missing values in the config', () => {
            const useCaseConfig = {
                UseCaseType: 'Text'
                // Missing LlmParams
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            expect(attributes).toEqual({
                useCaseType: 'Text'
                // Other mappings should be missing
            });

            expect(customAttributes).toEqual({});
        });

        it('should handle numeric values', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                NumericValue: 42,
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'numericDimension': '$.NumericValue'
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            expect(attributes).toEqual({
                useCaseType: 'Text'
            });

            expect(customAttributes).toEqual({
                numericDimension: '42' // Should be converted to string
            });
        });

        it('should handle all value types', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                ObjectValue: { key: 'value' },
                ArrayValue: [1, 2, 3],
                BooleanValue: true,
                NullValue: null,
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'objectDimension': '$.ObjectValue',
                        'arrayDimension': '$.ArrayValue',
                        'booleanDimension': '$.BooleanValue',
                        'nullDimension': '$.NullValue'
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            expect(attributes).toEqual({
                useCaseType: 'Text'
            });

            expect(customAttributes).toEqual({
                objectDimension: JSON.stringify({ key: 'value' }),
                arrayDimension: JSON.stringify([1, 2, 3]),
                booleanDimension: 'true',
                nullDimension: 'null'
            });
        });

        it('should handle errors when processing attributes', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'errorKey': '$.ProblematicValue'
                    }
                }
            };

            // Create a problematic value that will throw when stringified
            const problematicValue = {};
            Object.defineProperty(problematicValue, 'toJSON', {
                get: () => {
                    throw new Error('JSON conversion error');
                }
            });

            // Add the problematic value to the config
            (useCaseConfig as any).ProblematicValue = problematicValue;

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            // Standard attributes should still be processed
            expect(attributes).toEqual({
                useCaseType: 'Text'
            });

            // The problematic custom attribute should be skipped
            expect(customAttributes).toEqual({});
        });

        it('should extract custom attributes from FeedbackParams.CustomMappings', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
                        Temperature: 0.7,
                        MaxTokens: 1000,
                        TopP: 0.9
                    },
                    PromptTemplate: 'You are a helpful assistant. {{input}}'
                },
                CustomField: {
                    NestedValue: 'custom-value',
                    ComplexValue: {
                        array: [1, 2, 3],
                        object: { key: 'value' }
                    }
                },
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'temperature': '$.LlmParams.BedrockLlmParams.Temperature',
                        'maxTokens': '$.LlmParams.BedrockLlmParams.MaxTokens',
                        'topP': '$.LlmParams.BedrockLlmParams.TopP',
                        'promptTemplate': '$.LlmParams.PromptTemplate',
                        'customNestedValue': '$.CustomField.NestedValue',
                        'complexValue': '$.CustomField.ComplexValue'
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            // Standard attributes
            expect(attributes).toEqual({
                useCaseType: 'Text',
                modelProvider: 'Bedrock',
                bedrockModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
                knowledgeBaseType: undefined,
                bedrockKnowledgeBaseId: undefined,
                ragEnabled: undefined
            });

            // Custom attributes
            expect(customAttributes).toEqual({
                temperature: '0.7',
                maxTokens: '1000',
                topP: '0.9',
                promptTemplate: 'You are a helpful assistant. {{input}}',
                customNestedValue: 'custom-value',
                complexValue: JSON.stringify({
                    array: [1, 2, 3],
                    object: { key: 'value' }
                })
            });
        });

        it('should handle missing custom attributes gracefully', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0'
                        // Temperature is missing
                    }
                },
                // CustomField is missing
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'temperature': '$.LlmParams.BedrockLlmParams.Temperature',
                        'customNestedValue': '$.CustomField.NestedValue'
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            // Standard attributes should be present
            expect(attributes).toEqual({
                useCaseType: 'Text',
                modelProvider: 'Bedrock',
                bedrockModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
                knowledgeBaseType: undefined,
                bedrockKnowledgeBaseId: undefined,
                ragEnabled: undefined
            });

            // Custom attributes should be empty since the paths don't exist
            expect(customAttributes).toEqual({});
        });

        it('should handle invalid custom mapping paths', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'validKey': '$.UseCaseType',
                        'invalidKey': 123 // Non-string path
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            // Standard attributes should be processed
            expect(attributes).toEqual({
                useCaseType: 'Text'
            });

            // Only valid custom mappings should be processed
            expect(customAttributes).toEqual({
                validKey: 'Text'
            });
        });

        it('should handle errors in custom mapping extraction', () => {
            const useCaseConfig = {
                UseCaseType: 'Text',
                FeedbackParams: {
                    FeedbackEnabled: true,
                    CustomMappings: {
                        'errorKey': '$..[invalid syntax]' // Invalid JSONPath syntax
                    }
                }
            };

            const service = new ConfigMappingService();
            const { attributes, customAttributes } = service.extractConfigAttributes(useCaseConfig);

            // Standard attributes should still be processed
            expect(attributes).toEqual({
                useCaseType: 'Text'
            });

            // The problematic custom attribute should be skipped
            expect(customAttributes).toEqual({});
        });
    });
});
