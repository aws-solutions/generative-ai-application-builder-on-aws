#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import {
    API_GATEWAY_THROTTLING_BURST_LIMIT,
    API_GATEWAY_THROTTLING_RATE_LIMIT,
    LOG_RETENTION_PERIOD
} from '../utils/constants';
import { UseCaseDeploymentSchemas } from './model-schema';
import { uploadMcpSchemaBodySchema } from './model-schema/deployments/mcp/upload-schema-body';
import { uploadMcpSchemaResponseSchema } from './model-schema/deployments/mcp/upload-schema-response';
import { BaseRestEndpoint, BaseRestEndpointProps } from './base-rest-endpoint';
import { DeploymentRestApiHelper, DeploymentApiContext } from './deployment-platform-rest-api-helper';

export interface DeploymentPlatformRestEndpointProps extends BaseRestEndpointProps {
    /**
     * The use case management lambda function.
     */
    useCaseManagementAPILambda: lambda.Function;

    /**
     * The lambda function for retrieving model info
     */
    modelInfoApiLambda: lambda.Function;

    /**
     * The lambda function for MCP server management
     */
    mcpManagementAPILambda: lambda.Function;

    /**
     * The lambda function for agent management
     */
    agentManagementAPILambda: lambda.Function;

    /**
     * The lambda function for workflow management
     */
    workflowManagementAPILambda: lambda.Function;

    /**
     * The lambda function for platform tenant & user provisioning
     */
    tenantManagementAPILambda: lambda.Function;

    /**
     * The custom authorizer to allow admin users to access the use case management API.
     */
    deploymentPlatformAuthorizer: api.RequestAuthorizer;

}

export class DeploymentPlatformRestEndpoint extends BaseRestEndpoint {
    /**
     * ApiGatewayToLambda construct which contains the REST endpoint
     */
    private readonly lambdaRestApi: ApiGatewayToLambda;

    /**
     * The API request validator
     */
    public readonly requestValidator: api.RequestValidator;

    /**
     *  Collection of all API resources created - stored for CDK-nag AwsSolutions-COG4 security suppressions
     */
    private readonly createdResources: api.Resource[] = [];

    constructor(scope: Construct, id: string, props: DeploymentPlatformRestEndpointProps) {
        super(scope, id, props);

        this.lambdaRestApi = this.createRestApi(props);
        this.restApi = this.lambdaRestApi.apiGateway;
        this.requestValidator = this.createRequestValidator(props, this.restApi);

        this.configureWaf(this.restApi, 'DeploymentPlatformEndpointWaf');
        this.configureGatewayResponses(this.restApi);

        this.createUseCaseManagementApi(props, this.restApi);
        this.createPlatformSaasApi(props, this.restApi);
        this.createModelInfoApi(props, this.restApi);
        this.addSuppressions();
    }

    protected createRestApi(props: DeploymentPlatformRestEndpointProps): ApiGatewayToLambda {
        const restApi = new ApiGatewayToLambda(this, 'DeploymentRestEndPoint', {
            existingLambdaObj: props.useCaseManagementAPILambda,
            apiGatewayProps: {
                defaultMethodOptions: {
                    authorizationType: api.AuthorizationType.CUSTOM,
                    authorizer: props.deploymentPlatformAuthorizer,
                    handler: props.useCaseManagementAPILambda
                } as api.MethodOptions,
                description: 'API endpoint to access use case management functions',
                restApiName: `${cdk.Aws.STACK_NAME}-UseCaseManagementAPI`,
                proxy: false,
                deployOptions: {
                    accessLogFormat: api.AccessLogFormat.clf(),
                    loggingLevel: api.MethodLoggingLevel.OFF,
                    dataTraceEnabled: false,
                    metricsEnabled: true,
                    throttlingRateLimit: API_GATEWAY_THROTTLING_RATE_LIMIT,
                    throttlingBurstLimit: API_GATEWAY_THROTTLING_BURST_LIMIT
                } as api.StageOptions
            } as api.LambdaRestApiProps,
            logGroupProps: {
                retention: LOG_RETENTION_PERIOD
            }
        });
        restApi.apiGateway.node.tryRemoveChild('Endpoint');
        return restApi;
    }

    protected createRequestValidator(props: BaseRestEndpointProps, restApi: api.IRestApi): api.RequestValidator {
        return new api.RequestValidator(this, 'RequestValidator', {
            restApi: restApi,
            requestValidatorName: `${cdk.Aws.STACK_NAME}-api-request-validator`,
            validateRequestBody: true,
            validateRequestParameters: true
        });
    }

    /**
     * Creates all API resources and methods for the use case management API
     * @param props
     * @param restApi
     */
    private createUseCaseManagementApi(props: DeploymentPlatformRestEndpointProps, restApi: api.IRestApi) {
        // Paths for the deployment api
        const deploymentsResource = restApi.root.addResource('deployments');

        this.createBaseDeploymentsAPI(deploymentsResource, props, restApi);

        // Create MCP deployments API
        this.createMCPPathAPI(deploymentsResource, props, restApi);

        // Create Agents API
        this.createAgentsPathAPI(deploymentsResource, props, restApi);

        // Create Workflows API
        this.createWorkflowsPathAPI(deploymentsResource, props, restApi);
    }

    /**
     * Creates platform SaaS endpoints:
     * - Customer portal identity: GET /portal/me
     * - Platform admin provisioning: CRUD-ish endpoints under /platform/tenants
     *
     * These are the Phase 1 primitives for tenancy and RBAC.
     */
    private createPlatformSaasApi(props: DeploymentPlatformRestEndpointProps, restApi: api.IRestApi) {
        const tenantIntegration = new api.LambdaIntegration(props.tenantManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        const ctx: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: tenantIntegration
        };

        // /portal/me (customer + admin)
        const portal = restApi.root.addResource('portal');
        const me = portal.addResource('me');
        DeploymentRestApiHelper.configureCors(me, ['GET', 'OPTIONS']);
        me.addMethod('GET', ctx.integration, DeploymentRestApiHelper.createMethodOptionsWithModels(ctx, 'GetMe'));

        // /platform/tenants (admin)
        const platform = restApi.root.addResource('platform');
        const tenants = platform.addResource('tenants');
        DeploymentRestApiHelper.configureCors(tenants, ['GET', 'POST', 'OPTIONS']);
        tenants.addMethod('GET', ctx.integration, DeploymentRestApiHelper.createMethodOptionsWithModels(ctx, 'ListTenants'));
        tenants.addMethod(
            'POST',
            ctx.integration,
            DeploymentRestApiHelper.createMethodOptionsWithModels(ctx, 'CreateTenant')
        );

        const tenant = tenants.addResource('{tenantId}');
        const tenantUsers = tenant.addResource('users');
        DeploymentRestApiHelper.configureCors(tenantUsers, ['POST', 'OPTIONS']);
        tenantUsers.addMethod(
            'POST',
            ctx.integration,
            DeploymentRestApiHelper.createMethodOptionsWithModels(ctx, 'CreateTenantUser', undefined, undefined, {
                'method.request.path.tenantId': true
            })
        );

        this.createdResources.push(portal, me, platform, tenants, tenant, tenantUsers);
    }

    /**
     * Creates the base deployments API using helper methods
     * @param deploymentsResource
     * @param props
     * @param restApi
     * @returns The deploymentResource ({useCaseId}) for reuse by other APIs
     */
    private createBaseDeploymentsAPI(
        deploymentsResource: api.Resource,
        props: DeploymentPlatformRestEndpointProps,
        restApi: api.IRestApi
    ): api.Resource {
        const useCaseManagementAPILambdaIntegration = new api.LambdaIntegration(props.useCaseManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Create /deployments and /deployments/{useCaseId} structure
        const deploymentResource = deploymentsResource.addResource('{useCaseId}');

        // Configure CORS
        DeploymentRestApiHelper.configureCors(deploymentsResource, ['POST', 'GET', 'OPTIONS']);
        DeploymentRestApiHelper.configureCors(deploymentResource, ['GET', 'PATCH', 'DELETE', 'OPTIONS']);

        const baseApiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: useCaseManagementAPILambdaIntegration
        };

        // Voice channel API (admin): POST /deployments/{useCaseId}/channels/voice
        const channelsResource = deploymentResource.addResource('channels');
        const voiceResource = channelsResource.addResource('voice');
        DeploymentRestApiHelper.configureCors(voiceResource, ['POST', 'OPTIONS']);
        voiceResource.addMethod(
            'POST',
            useCaseManagementAPILambdaIntegration,
            DeploymentRestApiHelper.createMethodOptionsWithModels(baseApiContext, 'UpsertVoiceChannel', undefined, undefined, {
                'method.request.path.useCaseId': true
            })
        );

        // Creates CRUD API endpoints: GET/POST /deployments and GET/PATCH/DELETE /deployments/{useCaseId}
        // Generates models for request/response validation and returns created resources
        const crudResources = DeploymentRestApiHelper.addCrudOperations(
            baseApiContext,
            deploymentsResource,
            deploymentResource,
            'UseCase',
            restApi,
            UseCaseDeploymentSchemas.base
        );

        this.createdResources.push(...crudResources, channelsResource, voiceResource);
        return deploymentResource;
    }

    /**
     * Creates /deployments/mcp API for MCP server management
     */
    private createMCPPathAPI(
        deploymentsResource: api.Resource,
        props: DeploymentPlatformRestEndpointProps,
        restApi: api.IRestApi
    ): void {
        const mcpIntegration = new api.LambdaIntegration(props.mcpManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Create /deployments/mcp and /deployments/mcp/{useCaseId}
        const { collectionResource, itemResource } = DeploymentRestApiHelper.createResourceStructure(
            deploymentsResource,
            'mcp',
            'useCaseId'
        );

        const mcpApiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: mcpIntegration
        };

        // Add CRUD operations for MCP and collect resources
        const crudResources = DeploymentRestApiHelper.addCrudOperations(
            mcpApiContext,
            collectionResource,
            itemResource,
            'MCP',
            restApi,
            UseCaseDeploymentSchemas.mcp
        );

        this.createdResources.push(...crudResources);

        // Add collection-level custom endpoints and collect resources
        const uploadSchemasRequestModel = DeploymentRestApiHelper.createModel(
            mcpApiContext,
            this.restApi,
            'UploadMCPSchemasApiRequest',
            'Defines the required JSON structure for uploading MCP schemas',
            uploadMcpSchemaBodySchema
        );

        const uploadSchemasResponseModel = DeploymentRestApiHelper.createModel(
            mcpApiContext,
            this.restApi,
            'UploadMCPSchemasResponse',
            'Defines the response structure for MCP schema upload requests',
            uploadMcpSchemaResponseSchema
        );

        // Create upload schemas resource with helper method for consistent validation
        const uploadSchemasResource = collectionResource.addResource('upload-schemas');
        DeploymentRestApiHelper.configureCors(uploadSchemasResource, ['POST', 'OPTIONS']);

        const uploadMethodOptions = DeploymentRestApiHelper.createMethodOptionsWithModels(
            mcpApiContext,
            'UploadMCPSchemas',
            uploadSchemasRequestModel,
            uploadSchemasResponseModel
        );

        uploadSchemasResource.addMethod('POST', mcpApiContext.integration, uploadMethodOptions);

        this.createdResources.push(uploadSchemasResource);
    }

    /**
     * Creates /deployments/agents API for agent management
     */
    private createAgentsPathAPI(
        deploymentsResource: api.Resource,
        props: DeploymentPlatformRestEndpointProps,
        restApi: api.IRestApi
    ): void {
        const agentIntegration = new api.LambdaIntegration(props.agentManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Create /deployments/agents and /deployments/agents/{agent-id}
        const { collectionResource, itemResource } = DeploymentRestApiHelper.createResourceStructure(
            deploymentsResource,
            'agents',
            'useCaseId'
        );

        const agentApiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: agentIntegration
        };

        // Add CRUD operations for Agents and collect resources
        const crudResources = DeploymentRestApiHelper.addCrudOperations(
            agentApiContext,
            collectionResource,
            itemResource,
            'Agent',
            restApi,
            UseCaseDeploymentSchemas.agent
        );

        this.createdResources.push(...crudResources);
    }

    /**
     * Creates /deployments/workflows API for workflow management
     */
    private createWorkflowsPathAPI(
        deploymentsResource: api.Resource,
        props: DeploymentPlatformRestEndpointProps,
        restApi: api.IRestApi
    ): void {
        const workflowIntegration = new api.LambdaIntegration(props.workflowManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Create /deployments/workflows and /deployments/workflows/{workflow-id}
        const { collectionResource, itemResource } = DeploymentRestApiHelper.createResourceStructure(
            deploymentsResource,
            'workflows',
            'useCaseId'
        );

        const workflowApiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: workflowIntegration
        };

        // Add CRUD operations for Workflows and collect resources
        const crudResources = DeploymentRestApiHelper.addCrudOperations(
            workflowApiContext,
            collectionResource,
            itemResource,
            'Workflow',
            restApi,
            UseCaseDeploymentSchemas.workflow
        );

        this.createdResources.push(...crudResources);
    }

    /**
     * Creates all API resources and methods for the model info API
     * @param props
     * @param restApi
     */
    private createModelInfoApi(props: DeploymentPlatformRestEndpointProps, restApi: api.IRestApi) {
        const modelInfoLambdaIntegration = new api.LambdaIntegration(props.modelInfoApiLambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        const modelInfoApiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: this.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: modelInfoLambdaIntegration
        };

        const modelInfoResource = restApi.root.addResource('model-info');

        // Listing the available use case types
        const useCaseTypesResource = modelInfoResource.addResource('use-case-types');
        DeploymentRestApiHelper.addCustomEndpoint(modelInfoApiContext, useCaseTypesResource, 'GET', 'GetUseCaseTypes');

        // Listing available model providers for a given use case
        const modelInfoByUseCaseResource = modelInfoResource.addResource('{useCaseType}');
        const providersResource = modelInfoByUseCaseResource.addResource('providers');
        DeploymentRestApiHelper.addCustomEndpoint(modelInfoApiContext, providersResource, 'GET', 'GetModelProviders');

        // Getting available models for a given provider/use case
        const modelsResource = modelInfoByUseCaseResource.addResource('{providerName}');
        DeploymentRestApiHelper.addCustomEndpoint(modelInfoApiContext, modelsResource, 'GET', 'GetModels');

        // Getting model info for a given use case/provider/model
        const specificModelInfoResource = modelsResource.addResource('{modelId}');
        DeploymentRestApiHelper.addCustomEndpoint(
            modelInfoApiContext,
            specificModelInfoResource,
            'GET',
            'GetModelInfo'
        );

        // Collect model info resources for suppressions
        this.createdResources.push(
            modelInfoResource,
            useCaseTypesResource,
            modelInfoByUseCaseResource,
            providersResource,
            modelsResource,
            specificModelInfoResource
        );
    }

    protected addSuppressions(): void {
        NagSuppressions.addResourceSuppressions(this.restApi.deploymentStage, [
            {
                id: 'AwsSolutions-APIG6',
                reason: 'Turning off execution logs as recommended best practice in the ApiGateway service documentation'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.lambdaRestApi.apiGatewayCloudWatchRole!, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission generated by the ApiGatewayToLambda construct to allow CloudWatch Logs to be used',
                appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*']
            }
        ]);

        // Extract resource paths from all created resources
        const resourcePathsToSuppress = DeploymentRestApiHelper.collectResourcePaths(this.createdResources);

        const operationsToSuppress = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'];
        resourcePathsToSuppress.forEach((_path) => {
            operationsToSuppress.forEach((_operation) => {
                try {
                    NagSuppressions.addResourceSuppressionsByPath(
                        cdk.Stack.of(this),
                        `${this.restApi.root}/${_path}/${_operation}/Resource`,
                        [
                            {
                                id: 'AwsSolutions-COG4',
                                reason: 'The API uses a custom authorizer instead of Cognito user pool authorizer for authentication'
                            }
                        ],
                        false
                    );
                } catch (error) {
                    // Ignore if resource doesn't exist
                }
            });
        });

        cfn_nag.addCfnSuppressRules(this.restApi.node.defaultChild as api.CfnResource, [
            {
                id: 'W87',
                reason: 'Since caching is not enabled, cache encryption is also not enabled'
            }
        ]);
        cfn_nag.addCfnSuppressRules(this.restApi.deploymentStage, [
            {
                id: 'W87',
                reason: "Caching is not configured for this endpoint, hence CacheEncryption configurations don't apply"
            }
        ]);
    }
}
