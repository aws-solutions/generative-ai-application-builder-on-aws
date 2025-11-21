// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { KnowledgeBaseStep } from '../KnowledgeBaseStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('KnowledgeBaseStep', () => {
    let knowledgeBaseStep: KnowledgeBaseStep;

    beforeEach(() => {
        knowledgeBaseStep = new KnowledgeBaseStep();
    });

    test('initializes with correct default properties', () => {
        expect(knowledgeBaseStep.id).toBe('knowledgeBase');
        expect(knowledgeBaseStep.title).toBe('Select knowledge base');
        
        // Test BaseWizardProps compliance - this will fail if BaseWizardProps changes
        validateBaseWizardProps(knowledgeBaseStep.props);
        
        expect(knowledgeBaseStep.props.inError).toBe(false);
        expect(knowledgeBaseStep.props.isRagRequired).toBeDefined();
        expect(knowledgeBaseStep.props.knowledgeBaseType).toBeDefined();
        expect(knowledgeBaseStep.props.existingKendraIndex).toBeDefined();
        expect(knowledgeBaseStep.props.kendraIndexId).toBeDefined();
        expect(knowledgeBaseStep.props.kendraIndexName).toBeDefined();
        expect(knowledgeBaseStep.props.kendraAdditionalQueryCapacity).toBeDefined();
        expect(knowledgeBaseStep.props.kendraAdditionalStorageCapacity).toBeDefined();
        expect(knowledgeBaseStep.props.kendraEdition).toBeDefined();
        expect(knowledgeBaseStep.props.maxNumDocs).toBeDefined();
        expect(knowledgeBaseStep.props.scoreThreshold).toBeDefined();
        expect(knowledgeBaseStep.props.noDocsFoundResponse).toBeUndefined();
        expect(knowledgeBaseStep.props.returnDocumentSource).toBeDefined();
        expect(knowledgeBaseStep.props.enableRoleBasedAccessControl).toBeDefined();
        expect(knowledgeBaseStep.props.queryFilter).toBeDefined();
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes, 
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(knowledgeBaseStep);
    });

    test('has correct tool content', () => {
        expect(knowledgeBaseStep.toolContent.title).toBe('Knowledge base selection');
        expect(knowledgeBaseStep.toolContent.content).toBeDefined();
        expect(knowledgeBaseStep.toolContent.links).toBeDefined();
        expect(knowledgeBaseStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof knowledgeBaseStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(knowledgeBaseStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('maps deployment info correctly for Kendra knowledge base', () => {
            const mockDeployment = {
                LlmParams: {
                    RAGEnabled: true
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Kendra',
                    NumberOfDocs: 100,
                    ReturnSourceDocs: true,
                    ScoreThreshold: 0.8,
                    KendraKnowledgeBaseParams: {
                        RoleBasedAccessControlEnabled: true,
                        AttributeFilter: { key: 'value' }
                    }
                },
                kendraIndexId: 'kendra-index-123'
            };

            knowledgeBaseStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(knowledgeBaseStep.props.isRagRequired).toBe(true);
            expect(knowledgeBaseStep.props.maxNumDocs).toBe(100);
            expect(knowledgeBaseStep.props.returnDocumentSource).toBe(true);
            expect(knowledgeBaseStep.props.kendraIndexId).toBe('kendra-index-123');
        });

        test('maps deployment info correctly for Bedrock knowledge base', () => {
            const mockDeployment = {
                LlmParams: {
                    RAGEnabled: true
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Bedrock',
                    NumberOfDocs: 50,
                    ReturnSourceDocs: true,
                    ScoreThreshold: 0.7,
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'bedrock-kb-123',
                        RetrievalFilter: {},
                        OverrideSearchType: 'HYBRID'
                    }
                }
            };

            knowledgeBaseStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(knowledgeBaseStep.props.isRagRequired).toBe(true);
            expect(knowledgeBaseStep.props.maxNumDocs).toBe(50);
        });

        test('handles deployment without RAG enabled', () => {
            const mockDeployment = {
                LlmParams: {
                    RAGEnabled: false
                }
            };

            knowledgeBaseStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(knowledgeBaseStep.props.isRagRequired).toBe(false);
        });

        test('handles empty deployment data', () => {
            // The implementation will throw an error when trying to destructure LlmParams from null
            expect(() => {
                knowledgeBaseStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();
        });

        test('handles deployment without knowledge base params', () => {
            // The implementation will throw an error when trying to access RAGEnabled on undefined LlmParams
            expect(() => {
                knowledgeBaseStep.mapStepInfoFromDeployment({}, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();
        });
    });
});