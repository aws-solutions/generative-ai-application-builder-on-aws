// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mapApiResponseToSelectedDeployment } from '../utils'; // Adjust the import path as needed

describe('mapApiResponseToSelectedDeployment', () => {
    // Test case for null input
    test('returns null when apiResponse is null', () => {
        const result = mapApiResponseToSelectedDeployment(null);
        expect(result).toBeNull();
    });

    // Test case for undefined input
    test('returns null when apiResponse is undefined', () => {
        const result = mapApiResponseToSelectedDeployment(undefined);
        expect(result).toBeNull();
    });

    // Test case for minimal valid input
    test('transforms minimal API response correctly', () => {
        const minimalResponse = {
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Test Use Case',
            UseCaseType: 'Chat',
            Description: 'Test Description',
            CreatedDate: '2023-01-01T00:00:00Z',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack',
            Status: 'CREATE_COMPLETE',
            ragEnabled: 'No',
            deployUI: 'Yes',
            vpcEnabled: 'No'
        };

        const result = mapApiResponseToSelectedDeployment(minimalResponse);

        expect(result).toEqual({
            useCaseUUID: '12345678',
            defaultUserEmail: 'placeholder@example.com',
            createNewVpc: 'No',
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Test Use Case',
            Name: 'Test Use Case',
            UseCaseType: 'Chat',
            Description: 'Test Description',
            CreatedDate: '2023-01-01T00:00:00Z',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack',
            status: 'CREATE_COMPLETE',
            ragEnabled: 'No',
            deployUI: 'Yes',
            vpcEnabled: 'No'
        });
    });

    // Test case for full API response
    test('transforms complete API response correctly', () => {
        const fullResponse = {
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Complete Test Case',
            UseCaseType: 'Chat',
            Description: 'Complete Test Description',
            CreatedDate: '2023-01-01T00:00:00Z',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack',
            Status: 'CREATE_COMPLETE',
            ragEnabled: 'Yes',
            deployUI: 'Yes',
            vpcEnabled: 'Yes',
            cloudwatchDashboardUrl: 'https://console.aws.amazon.com/cloudwatch/dashboard',
            cloudFrontWebUrl: 'https://d123456abcdef.cloudfront.net',
            knowledgeBaseType: 'Kendra',
            kendraIndexId: 'abcd1234-5678-efgh-ijkl-mnopqrstuvwx',
            privateSubnetIds: ['subnet-12345', 'subnet-67890'],
            securityGroupIds: ['sg-12345'],
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'abcd1234-5678-efgh-ijkl-mnopqrstuvwx'
                }
            },
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB',
                ChatHistoryLength: 10
            },
            LlmParams: {
                ModelProvider: 'Bedrock',
                RAGEnabled: true
            },
            AuthenticationParams: {
                AuthenticationProvider: 'Cognito'
            },
            FeedbackParams: {
                FeedbackEnabled: true
            }
        };

        const result = mapApiResponseToSelectedDeployment(fullResponse);

        expect(result).toEqual({
            useCaseUUID: '12345678',
            defaultUserEmail: 'placeholder@example.com',
            createNewVpc: 'No',
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Complete Test Case',
            Name: 'Complete Test Case',
            UseCaseType: 'Chat',
            Description: 'Complete Test Description',
            CreatedDate: '2023-01-01T00:00:00Z',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack',
            status: 'CREATE_COMPLETE',
            ragEnabled: 'Yes',
            deployUI: 'Yes',
            vpcEnabled: 'Yes',
            cloudwatchDashboardUrl: 'https://console.aws.amazon.com/cloudwatch/dashboard',
            cloudFrontWebUrl: 'https://d123456abcdef.cloudfront.net',
            knowledgeBaseType: 'Kendra',
            kendraIndexId: 'abcd1234-5678-efgh-ijkl-mnopqrstuvwx',
            privateSubnetIds: ['subnet-12345', 'subnet-67890'],
            securityGroupIds: ['sg-12345'],
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'abcd1234-5678-efgh-ijkl-mnopqrstuvwx'
                }
            },
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB',
                ChatHistoryLength: 10
            },
            LlmParams: {
                ModelProvider: 'Bedrock',
                RAGEnabled: true
            },
            AuthenticationParams: {
                AuthenticationProvider: 'Cognito'
            },
            FeedbackParams: {
                FeedbackEnabled: true
            }
        });
    });

    // Test case for nested Bedrock knowledge base ID
    test('extracts bedrockKnowledgeBaseId from nested structure', () => {
        const nestedResponse = {
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Nested Test Case',
            UseCaseType: 'Chat',
            Status: 'CREATE_COMPLETE',
            ragEnabled: 'Yes',
            knowledgeBaseType: 'Bedrock',
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Bedrock',
                BedrockKnowledgeBaseParams: {
                    BedrockKnowledgeBaseId: 'bedrock-kb-12345'
                }
            }
        };

        const result = mapApiResponseToSelectedDeployment(nestedResponse);

        expect(result!.bedrockKnowledgeBaseId).toBe('bedrock-kb-12345');
    });

    // Test case for direct bedrockKnowledgeBaseId (no extraction needed)
    test('uses direct bedrockKnowledgeBaseId when available', () => {
        const directResponse = {
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Direct Test Case',
            UseCaseType: 'Chat',
            Status: 'CREATE_COMPLETE',
            ragEnabled: 'Yes',
            knowledgeBaseType: 'Bedrock',
            bedrockKnowledgeBaseId: 'direct-bedrock-kb-12345',
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Bedrock',
                BedrockKnowledgeBaseParams: {
                    BedrockKnowledgeBaseId: 'nested-bedrock-kb-12345'
                }
            }
        };

        const result = mapApiResponseToSelectedDeployment(directResponse);

        expect(result!.bedrockKnowledgeBaseId).toBe('direct-bedrock-kb-12345');
    });

    test('handles FeedbackParams correctly', () => {
        const response = {
            UseCaseId: '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
            UseCaseName: 'Feedback Test Case',
            FeedbackParams: {
                FeedbackEnabled: true
            }
        };
    
        const result = mapApiResponseToSelectedDeployment(response);
    
        expect(result!.FeedbackParams).toEqual({
            FeedbackEnabled: true
        });
    });

    // Test case for empty objects
    test('handles empty objects correctly', () => {
        const emptyResponse = {};

        const result = mapApiResponseToSelectedDeployment(emptyResponse);

        expect(result).toEqual({
            useCaseUUID: '',
            defaultUserEmail: 'placeholder@example.com',
            createNewVpc: 'No'
        });
    });

    // Test case for UseCaseId without hyphens
    test('handles UseCaseId without hyphens correctly', () => {
        const response = {
            UseCaseId: '12345678abcdefghijklmnopqrstuvwx',
            UseCaseName: 'No Hyphens Test'
        };

        const result = mapApiResponseToSelectedDeployment(response);

        expect(result!.useCaseUUID).toBe('12345678');
    });
});
