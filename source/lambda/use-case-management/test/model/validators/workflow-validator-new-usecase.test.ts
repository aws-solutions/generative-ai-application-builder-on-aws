// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { WorkflowUseCaseConfiguration } from '../../../model/types';
import { UseCase } from '../../../model/use-case';
import { WorkflowUseCaseValidator } from '../../../model/validators/workflow-validator';
import {
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes,
    WORKFLOW_ORCHESTRATION_PATTERNS
} from '../../../utils/constants';

describe('WorkflowUseCaseValidator - validateNewUseCase', () => {
    let validator: WorkflowUseCaseValidator;
    let ddbMockedClient: any;
    let cognitoMockClient: any;
    let cfnParameters: Map<string, string>;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        ddbMockedClient = mockClient(DynamoDBClient);
        cognitoMockClient = mockClient(CognitoIdentityProviderClient);

        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();
        validator = new WorkflowUseCaseValidator(storageMgmt, useCaseConfigManagement);

        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
    });

    beforeEach(() => {
        ddbMockedClient.reset();
        cognitoMockClient.reset();
    });

    afterAll(async () => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        ddbMockedClient.restore();
        cognitoMockClient.restore();
        jest.clearAllMocks();
    });

    const createValidConfig = (): WorkflowUseCaseConfiguration => ({
        UseCaseType: UseCaseTypes.WORKFLOW,
        WorkflowParams: {
            SystemPrompt: 'You are a workflow coordinator',
            OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
            AgentsAsToolsParams: {
                Agents: [
                    {
                        UseCaseName: 'Agent 1',
                        UseCaseType: UseCaseTypes.AGENT_BUILDER,
                        AgentBuilderParams: {
                            SystemPrompt: 'Agent 1 prompt'
                        }
                    }
                ]
            }
        },
        LlmParams: {
            ModelProvider: 'Bedrock'
        }
    } as WorkflowUseCaseConfiguration);

    const createUseCase = (config: WorkflowUseCaseConfiguration, params?: Map<string, string>): UseCase => {
        return new UseCase(
            'fake-id',
            'fake-name',
            'fake-description',
            params ?? cfnParameters,
            config,
            'fake-user-id',
            undefined,
            UseCaseTypes.WORKFLOW
        );
    };

    it('should validate a valid new workflow use case', async () => {
        const config = createValidConfig();
        const useCase = createUseCase(config);
        const result = await validator.validateNewUseCase(useCase);
        expect(result).toBeDefined();
    });

    it('should throw when OrchestrationPattern is missing', async () => {
        const config = createValidConfig();
        delete (config.WorkflowParams as any).OrchestrationPattern;
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'OrchestrationPattern is required for Workflow use cases.'
        );
    });

    it('should throw when ModelProvider is not Bedrock', async () => {
        const config = createValidConfig();
        config.LlmParams!.ModelProvider = 'SageMaker';
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Workflow use cases must use BEDROCK as the ModelProvider.'
        );
    });

    it('should throw when SystemPrompt is missing', async () => {
        const config = createValidConfig();
        delete (config.WorkflowParams as any).SystemPrompt;
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'SystemPrompt is required for Workflow use cases.'
        );
    });

    it('should throw when SystemPrompt exceeds max length', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.SystemPrompt = 'a'.repeat(60001);
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'SystemPrompt exceeds maximum length of 60000 characters.'
        );
    });

    it('should throw for unsupported orchestration pattern', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.OrchestrationPattern = 'unsupported-pattern' as any;
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Unsupported OrchestrationPattern: unsupported-pattern'
        );
    });

    it('should throw when OrchestrationPattern is empty string', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.OrchestrationPattern = '   ' as any;
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'OrchestrationPattern must be a non-empty string.'
        );
    });

    it('should throw when Agents array is empty', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.AgentsAsToolsParams!.Agents = [];
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Agents must be a non-empty array.'
        );
    });

    it('should throw when agent UseCaseName is missing', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.AgentsAsToolsParams!.Agents = [
            {
                UseCaseName: '',
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                AgentBuilderParams: { SystemPrompt: 'test' }
            } as any
        ];
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Agents[0].UseCaseName is required and must be a non-empty string.'
        );
    });

    it('should throw when agent UseCaseType is missing', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.AgentsAsToolsParams!.Agents = [
            {
                UseCaseName: 'Agent 1',
                UseCaseType: '',
                AgentBuilderParams: { SystemPrompt: 'test' }
            } as any
        ];
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Agents[0].UseCaseType is required and must be a non-empty string.'
        );
    });

    it('should throw when agent UseCaseType is not AgentBuilder', async () => {
        const config = createValidConfig();
        config.WorkflowParams!.AgentsAsToolsParams!.Agents = [
            {
                UseCaseName: 'Agent 1',
                UseCaseType: 'Text',
                AgentBuilderParams: { SystemPrompt: 'test' }
            } as any
        ];
        const useCase = createUseCase(config);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            `Agents[0].UseCaseType must be '${UseCaseTypes.AGENT_BUILDER}'`
        );
    });

    it('should validate successfully without AgentsAsToolsParams', async () => {
        const config = createValidConfig();
        delete config.WorkflowParams!.AgentsAsToolsParams;
        const useCase = createUseCase(config);
        const result = await validator.validateNewUseCase(useCase);
        expect(result).toBeDefined();
    });

    it('should handle Cognito authentication config', async () => {
        cognitoMockClient.on(DescribeUserPoolCommand).resolves({
            UserPool: {
                Domain: 'my-domain-prefix'
            }
        });

        const config = createValidConfig();
        (config as any).AuthenticationParams = {
            AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
        };

        const params = new Map<string, string>();
        params.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
        params.set(CfnParameterKeys.ExistingCognitoUserPoolId, 'us-east-1_abc123');

        const useCase = createUseCase(config, params);
        const result = await validator.validateNewUseCase(useCase);
        expect(result.cfnParameters?.get(CfnParameterKeys.CognitoDomainPrefix)).toBe('my-domain-prefix');
    });

    it('should throw when Cognito user pool ID is not provided', async () => {
        const config = createValidConfig();
        (config as any).AuthenticationParams = {
            AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
        };

        const params = new Map<string, string>();
        params.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
        // Not setting ExistingCognitoUserPoolId

        const useCase = createUseCase(config, params);
        await expect(validator.validateNewUseCase(useCase)).rejects.toThrow(
            'Undefined user pool provided for the cognito authentication provider.'
        );
    });
});
