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
import { deployUseCaseBodySchema } from './model-schema/deploy-usecase-body';
import { deployUseCaseResponseSchema } from './model-schema/deploy-usecase-response';
import { updateUseCaseBodySchema } from './model-schema/update-usecase-body';
import { updateUseCaseResponseSchema } from './model-schema/update-usecase-response';
import { BaseRestEndpoint, BaseRestEndpointProps } from './base-rest-endpoint';

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

    constructor(scope: Construct, id: string, props: DeploymentPlatformRestEndpointProps) {
        super(scope, id, props);

        this.lambdaRestApi = this.createRestApi(props);
        this.restApi = this.lambdaRestApi.apiGateway;
        this.requestValidator = this.createRequestValidator(props, this.restApi);

        this.configureWaf(this.restApi, 'DeploymentPlatformEndpointWaf');
        this.configureGatewayResponses(this.restApi);

        this.createUseCaseManagementApi(props, this.restApi);
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
        restApi.apiGateway.node.tryRemoveChild("Endpoint");
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
     * @param apiRoot
     * @param restApi
     */
    private createUseCaseManagementApi(props: DeploymentPlatformRestEndpointProps, restApi: api.IRestApi) {
        const useCaseManagementAPILambdaIntegration = new api.LambdaIntegration(props.useCaseManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Paths for the deployment api
        const deploymentsResource = restApi.root.addResource('deployments'); // for getting and creating deployments
        const deploymentResource = deploymentsResource.addResource('{useCaseId}'); // for updating/deleting specific a specific deployment

        deploymentsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['POST', 'GET', 'OPTIONS']
        });

        // Listing info about existing use cases
        deploymentsResource.addMethod('GET', useCaseManagementAPILambdaIntegration, {
            operationName: 'GetUseCases',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.querystring.pageNumber': true,
                'method.request.querystring.searchFilter': false,
                'method.request.header.authorization': true
            }
        });

        // Deploying a new use case
        deploymentsResource.addMethod('POST', useCaseManagementAPILambdaIntegration, {
            operationName: 'DeployUseCase',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            },
            requestModels: {
                'application/json': new api.Model(this, 'DeployUseCaseApiBodyModel', {
                    restApi: restApi,
                    contentType: 'application/json',
                    description: 'Defines the required JSON structure of the POST request to deploy a use case',
                    modelName: 'DeployUseCaseApiBodyModel',
                    schema: deployUseCaseBodySchema
                })
            },
            methodResponses: [
                {
                    responseModels: {
                        'application/json': new api.Model(this, 'DeployUseCaseResponseModel', {
                            restApi: restApi,
                            contentType: 'application/json',
                            description: 'Response model to describe response of deploying a use case',
                            modelName: 'DeployUseCaseResponseModel',
                            schema: deployUseCaseResponseSchema
                        })
                    },
                    statusCode: '200'
                }
            ]
        });

        deploymentResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'PATCH', 'DELETE', 'OPTIONS']
        });

        //  Updating an existing use case deployment (i.e. changing its configuration)
        deploymentResource.addMethod('PATCH', useCaseManagementAPILambdaIntegration, {
            operationName: 'UpdateUseCase',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            },
            requestModels: {
                'application/json': new api.Model(this, 'UpdateUseCaseApiBodyModel', {
                    restApi: restApi,
                    contentType: 'application/json',
                    description: 'Defines the required JSON structure of the PUT request to update a use case',
                    modelName: 'UpdateUseCaseApiBodyModel',
                    schema: updateUseCaseBodySchema
                })
            },
            methodResponses: [
                {
                    responseModels: {
                        'application/json': new api.Model(this, 'UpdateUseCaseResponseModel', {
                            restApi: restApi,
                            contentType: 'application/json',
                            description: 'Response model to describe response of updating a use case',
                            modelName: 'UpdateUseCaseResponseModel',
                            schema: updateUseCaseResponseSchema
                        })
                    },
                    statusCode: '200'
                }
            ]
        });

        // deleting (destroying) a deployed use case
        deploymentResource.addMethod('DELETE', useCaseManagementAPILambdaIntegration, {
            operationName: 'DeleteUseCase',
            authorizer: props.deploymentPlatformAuthorizer,
            requestValidator: this.requestValidator,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.querystring.permanent': false,
                'method.request.header.authorization': true
            }
        });

        // Getting information on a deployed use case
        deploymentResource.addMethod('GET', useCaseManagementAPILambdaIntegration, {
            operationName: 'GetUseCase',
            authorizer: props.deploymentPlatformAuthorizer,
            requestValidator: this.requestValidator,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });
    }

    /**
     * Creates all API resources and methods for the use case management API
     * @param props
     * @param restApi
     */
    private createModelInfoApi(props: DeploymentPlatformRestEndpointProps, restApi: api.IRestApi) {
        const modelInfoLambdaIntegration = new api.LambdaIntegration(props.modelInfoApiLambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });
        const modelInfoResource = restApi.root.addResource('model-info');

        // Listing the available use case types
        const useCaseTypesResource = modelInfoResource.addResource('use-case-types');

        useCaseTypesResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'OPTIONS']
        });

        useCaseTypesResource.addMethod('GET', modelInfoLambdaIntegration, {
            operationName: 'GetUseCaseTypes',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });

        // Listing available model providers for a given use case
        const modelInfoByUseCaseResource = modelInfoResource.addResource('{useCaseType}');
        const providersResource = modelInfoByUseCaseResource.addResource('providers');

        providersResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'OPTIONS']
        });

        providersResource.addMethod('GET', modelInfoLambdaIntegration, {
            operationName: 'GetModelProviders',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });

        // Getting available models for a given provider/use case
        const modelsResource = modelInfoByUseCaseResource.addResource('{providerName}');

        modelsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'OPTIONS']
        });

        modelsResource.addMethod('GET', modelInfoLambdaIntegration, {
            operationName: 'GetModels',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });

        // Getting model info for a given use case/provider/model
        const specificModelInfoResource = modelsResource.addResource('{modelId}');

        specificModelInfoResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'OPTIONS']
        });

        specificModelInfoResource.addMethod('GET', modelInfoLambdaIntegration, {
            operationName: 'GetModelInfo',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: this.requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });
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

        const resourcePathsToSuppress = [
            'deployments',
            'deployments/{useCaseId}',
            'model-info',
            'model-info/use-case-types',
            'model-info/{useCaseType}/providers',
            'model-info/{useCaseType}/{providerName}',
            'model-info/{useCaseType}/{providerName}/{modelId}'
        ];
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
                                reason: 'A Custom authorizer must be used in order to authenticate using Cognito user groups'
                            }
                        ],
                        false
                    );
                } catch (error) {}
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
