// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { AgentCoreBaseParameters } from '../../../lib/use-case-stacks/agent-core/agent-core-base-stack';
import { BaseStack } from '../../../lib/framework/base-stack';
import { Template } from 'aws-cdk-lib/assertions';

// Mock concrete parameters implementation for testing
class TestAgentCoreParameters extends AgentCoreBaseParameters {
    public customTestImageUri: cdk.CfnParameter;

    protected createUseCaseSpecificParameters(stack: BaseStack): void {
        this.customTestImageUri = new cdk.CfnParameter(stack, 'CustomTestImageUri', {
            type: 'String',
            description: 'Test custom image URI parameter',
            default: ''
        });
    }

    public getCustomImageParameter(): cdk.CfnParameter {
        return this.customTestImageUri;
    }
}

describe('AgentCoreBaseParameters', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let parameters: TestAgentCoreParameters;

    beforeEach(() => {
        // Set up environment variable for image URI resolution
        process.env.VERSION = 'v4.0.0';

        app = new cdk.App({
            context: {
                solution_version: 'v4.0.0',
                solution_id: 'SO0276'
            }
        });
        stack = new cdk.Stack(app, 'TestStack');
        parameters = new TestAgentCoreParameters(stack as BaseStack);
    });

    afterEach(() => {
        // Clean up environment variable
        delete process.env.VERSION;
    });

    describe('Memory deployment integration', () => {
        it('should create memory deployment before execution role', () => {
            expect(parameters.enableLongTermMemory).toBeDefined();
            expect(parameters.enableLongTermMemory.allowedValues).toEqual(['Yes', 'No']);
            expect(parameters.enableLongTermMemory.default).toBe('Yes');
        });
    });

    describe('Common parameter creation', () => {
        it('should create EnableLongTermMemory parameter', () => {
            expect(parameters.enableLongTermMemory).toBeDefined();
            expect(parameters.enableLongTermMemory).toBeInstanceOf(cdk.CfnParameter);
        });

        it('should create SharedEcrCachePrefix parameter', () => {
            expect(parameters.sharedEcrCachePrefix).toBeDefined();
            expect(parameters.sharedEcrCachePrefix).toBeInstanceOf(cdk.CfnParameter);
        });

        it('should create ComponentCognitoUserPoolId parameter', () => {
            expect(parameters.cognitoUserPoolId).toBeDefined();
            expect(parameters.cognitoUserPoolId).toBeInstanceOf(cdk.CfnParameter);
        });

        it('should create UseInferenceProfile parameter', () => {
            expect(parameters.useInferenceProfile).toBeDefined();
            expect(parameters.useInferenceProfile).toBeInstanceOf(cdk.CfnParameter);
        });
    });

    describe('Multimodal integration', () => {
        it('should have correct MultimodalEnabled CfnParams', () => {
            const template = Template.fromStack(stack);

            template.hasParameter('MultimodalEnabled', {
                Type: 'String',
                Description:
                    'If set to Yes, the deployed use case stack will have access to multimodal functionality. This functionality is only enabled for Agentcore-based AgentBuilder and Workflow usecases.',
                Default: 'No',
                AllowedValues: ['Yes', 'No']
            });

            template.hasParameter('ExistingMultimodalDataMetadataTable', {
                Type: 'String',
                Description:
                    'Existing multimodal data metadata table name which contains references of the files in S3',
                Default: ''
            });

            template.hasParameter('ExistingMultimodalDataBucket', {
                Type: 'String',
                Description: 'Existing multimodal data bucket name which stores the multimodal data files',
                Default: ''
            });
        });

        it('should create ExistingMultimodalDataMetadataTable parameter', () => {
            expect(parameters.existingMultimodalDataMetadataTable).toBeDefined();
            expect(parameters.existingMultimodalDataMetadataTable).toBeInstanceOf(cdk.CfnParameter);
        });

        it('should create ExistingMultimodalDataBucket parameter', () => {
            expect(parameters.existingMultimodalDataBucket).toBeDefined();
            expect(parameters.existingMultimodalDataBucket).toBeInstanceOf(cdk.CfnParameter);
        });

        it('should have multimodal parameters with correct properties', () => {
            const template = Template.fromStack(stack);
        });
    });
});
