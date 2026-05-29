// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';
import { ValidationUtils, getCognitoDomainPrefixByUserPool } from '../../../model/validators/validation-utils';
import { UseCaseConfiguration } from '../../../model/types';
import { CHAT_PROVIDERS, KnowledgeBaseTypes } from '../../../utils/constants';

describe('ValidationUtils', () => {
    describe('checkModelInputPayloadSchema', () => {
        it('should pass when no ModelInputPayloadSchema is defined', () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {}
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkModelInputPayloadSchema(config)).not.toThrow();
        });

        it('should pass when schema has no placeholders', () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {
                        ModelInputPayloadSchema: { inputs: 'static text' }
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkModelInputPayloadSchema(config)).not.toThrow();
        });

        it('should pass when schema has reserved placeholders only', () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {
                        ModelInputPayloadSchema: { inputs: '<<prompt>>', params: { temp: '<<temperature>>' } }
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkModelInputPayloadSchema(config)).not.toThrow();
        });

        it('should pass when custom placeholders match model parameters', () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {
                        ModelInputPayloadSchema: { inputs: '<<prompt>>', params: { top_p: '<<top_p>>' } }
                    },
                    ModelParams: {
                        top_p: { Type: 'float', Value: '0.9' }
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkModelInputPayloadSchema(config)).not.toThrow();
        });

        it('should throw when custom placeholder has no matching model parameter', async () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {
                        ModelInputPayloadSchema: { inputs: '<<prompt>>', params: { top_p: '<<top_p>>' } }
                    },
                    ModelParams: {
                        temperature: { Type: 'float', Value: '0.7' }
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkModelInputPayloadSchema(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain('InvalidModelParameter: top_p is not a valid model parameter present in the Model Parameters');
            }
        });

        it('should throw when custom placeholder exists but no model parameters provided', async () => {
            const config = {
                LlmParams: {
                    SageMakerLlmParams: {
                        ModelInputPayloadSchema: { inputs: '<<custom_param>>' }
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkModelInputPayloadSchema(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain('No model parameters were provided in the useCase despite requiring parameters in the input payload schema.');
            }
        });
    });

    describe('checkPromptsAreCompatible', () => {
        it('should pass for Bedrock with valid non-RAG prompt', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Hello, how can I help you?'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptsAreCompatible(config)).not.toThrow();
        });

        it('should pass for SageMaker with valid non-RAG prompt containing required placeholders', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Given the conversation {history}, answer: {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptsAreCompatible(config)).not.toThrow();
        });

        it('should throw for SageMaker non-RAG prompt missing required placeholder', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Answer the question: {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptsAreCompatible(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Provided prompt template does not have the required placeholder '{history}'.");
            }
        });

        it('should throw when placeholder appears more than once', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: '{input} some text {history} more {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptsAreCompatible(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Placeholder '{input}' should appear only once in the prompt template.");
            }
        });

        it('should pass for Bedrock RAG prompt with context placeholder', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: true,
                    PromptParams: {
                        PromptTemplate: 'Use this context: {context} to answer.',
                        DisambiguationEnabled: false
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptsAreCompatible(config)).not.toThrow();
        });

        it('should throw for Bedrock RAG prompt missing context placeholder', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: true,
                    PromptParams: {
                        PromptTemplate: 'Answer the question.',
                        DisambiguationEnabled: false
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptsAreCompatible(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Provided prompt template does not have the required placeholder '{context}'.");
            }
        });

        it('should validate disambiguation prompt when enabled', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: true,
                    PromptParams: {
                        PromptTemplate: 'Use this context: {context} to answer.',
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: 'Given {history}, rephrase: {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptsAreCompatible(config)).not.toThrow();
        });

        it('should throw when disambiguation prompt is missing required placeholder', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: true,
                    PromptParams: {
                        PromptTemplate: 'Use this context: {context} to answer.',
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: 'Rephrase: {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptsAreCompatible(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Provided disambiguation prompt template does not have the required placeholder '{history}'.");
            }
        });

        it('should throw when disambiguation placeholder appears more than once', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: true,
                    PromptParams: {
                        PromptTemplate: 'Use this context: {context} to answer.',
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: '{input} {history} {input}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptsAreCompatible(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Placeholder '{input}' should appear only once in the disambiguation prompt template.");
            }
        });
    });

    describe('checkPromptIsEscaped', () => {
        it('should pass for prompt without curly braces', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Hello, how can I help you?'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptIsEscaped(config)).not.toThrow();
        });

        it('should pass for prompt with properly escaped curly braces', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Return JSON like this: {{"key": "value"}}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptIsEscaped(config)).not.toThrow();
        });

        it('should throw for prompt with unescaped opening curly brace', async () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: 'Return JSON like this: {"key": "value"}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkPromptIsEscaped(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain("Prompt template contains an unescaped curly brace '{'");
            }
        });

        it('should pass for SageMaker prompt with placeholders and escaped braces', () => {
            const config = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                    RAGEnabled: false,
                    PromptParams: {
                        PromptTemplate: '{input} {history} format: {{"json": true}}'
                    }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkPromptIsEscaped(config)).not.toThrow();
        });
    });

    describe('checkKnowledgeBaseTypeMatchesParams', () => {
        it('should pass when RAG is disabled', () => {
            const config = {
                LlmParams: {
                    RAGEnabled: false
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config)).not.toThrow();
        });

        it('should pass for Kendra with KendraKnowledgeBaseParams', () => {
            const config = {
                LlmParams: { RAGEnabled: true },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    KendraKnowledgeBaseParams: { KendraIndexId: 'index-123' }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config)).not.toThrow();
        });

        it('should pass for Bedrock with BedrockKnowledgeBaseParams', () => {
            const config = {
                LlmParams: { RAGEnabled: true },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
                    BedrockKnowledgeBaseParams: { BedrockKnowledgeBaseId: 'kb-123' }
                }
            } as unknown as UseCaseConfiguration;
            expect(() => ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config)).not.toThrow();
        });

        it('should throw for Kendra without KendraKnowledgeBaseParams', async () => {
            const config = {
                LlmParams: { RAGEnabled: true },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain('Provided knowledge base type Kendra requires KendraKnowledgeBaseParams to be present in KnowledgeBaseParams.');
            }
        });

        it('should throw for Bedrock without BedrockKnowledgeBaseParams', async () => {
            const config = {
                LlmParams: { RAGEnabled: true },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain('Provided knowledge base type Bedrock requires BedrockKnowledgeBaseParams to be present in KnowledgeBaseParams.');
            }
        });

        it('should throw for unsupported knowledge base type', async () => {
            const config = {
                LlmParams: { RAGEnabled: true },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Unsupported'
                }
            } as unknown as UseCaseConfiguration;
            try {
                await ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config);
                fail('Expected error to be thrown');
            } catch (error: any) {
                expect(error.message).toContain('Provided knowledge base type Unsupported is not supported.');
            }
        });
    });
});

describe('getCognitoDomainPrefixByUserPool', () => {
    let cognitoMockClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        cognitoMockClient = mockClient(CognitoIdentityProviderClient);
    });

    beforeEach(() => {
        cognitoMockClient.reset();
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        cognitoMockClient.restore();
    });

    it('should return domain prefix when user pool has a domain', async () => {
        cognitoMockClient.on(DescribeUserPoolCommand).resolves({
            UserPool: {
                Domain: 'my-app-domain'
            }
        });
        const result = await getCognitoDomainPrefixByUserPool('us-east-1_abc123');
        expect(result).toBe('my-app-domain');
    });

    it('should throw when user pool has no domain', async () => {
        cognitoMockClient.on(DescribeUserPoolCommand).resolves({
            UserPool: {}
        });
        await expect(getCognitoDomainPrefixByUserPool('us-east-1_abc123')).rejects.toThrow(
            'No domain found for this user pool.'
        );
    });

    it('should throw when Cognito API call fails', async () => {
        cognitoMockClient.on(DescribeUserPoolCommand).rejects(new Error('User pool not found'));
        await expect(getCognitoDomainPrefixByUserPool('us-east-1_invalid')).rejects.toThrow('User pool not found');
    });
});
