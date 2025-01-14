#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { StageOptions } from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { wrapManagedRuleSet } from '@aws-solutions-constructs/core';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import {
    API_GATEWAY_THROTTLING_BURST_LIMIT,
    API_GATEWAY_THROTTLING_RATE_LIMIT,
    CUSTOM_RULE_PRIORITY,
    HEADERS_NOT_ALLOWED_KEY,
    INVALID_REQUEST_HEADER_RESPONSE_CODE,
    LOG_RETENTION_PERIOD
} from '../utils/constants';
import { deployUseCaseBodySchema } from './model-schema/deploy-usecase-body';
import { deployUseCaseResponseSchema } from './model-schema/deploy-usecase-response';
import { updateUseCaseBodySchema } from './model-schema/update-usecase-body';
import { updateUseCaseResponseSchema } from './model-schema/update-usecase-response';

export interface DeploymentPlatformRestEndpointProps {
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

export class DeploymentPlatformRestEndpoint extends Construct {
    /**
     * Lambda REST endpoint created by the construct
     */
    readonly restApi: api.LambdaRestApi;

    /**
     * The root resource interface of the API Gateway
     */
    readonly apiRootResource: api.IResource;

    /**
     * local instance of the stack used to add suppressions
     */
    private readonly stack: cdk.Stack;

    /**
     * Counter for the priority of custom WAF rules
     */
    private rulePriorityCounter: number;

    constructor(scope: Construct, id: string, props: DeploymentPlatformRestEndpointProps) {
        super(scope, id);
        this.stack = cdk.Stack.of(scope);
        this.rulePriorityCounter = CUSTOM_RULE_PRIORITY;

        const lambdaRestApi = new ApiGatewayToLambda(this, 'EndPoint', {
            existingLambdaObj: props.useCaseManagementAPILambda,
            apiGatewayProps: {
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
                } as StageOptions
            },
            logGroupProps: {
                retention: LOG_RETENTION_PERIOD
            }
        });

        const requestValidator = new api.RequestValidator(this, 'RequestValidator', {
            restApi: lambdaRestApi.apiGateway,
            requestValidatorName: `${cdk.Aws.STACK_NAME}-api-request-validator`,
            validateRequestBody: true,
            validateRequestParameters: true
        });

        this.configureGatewayResponses(lambdaRestApi.apiGateway);

        new WafwebaclToApiGateway(this, 'Endpoint', {
            existingApiGatewayInterface: lambdaRestApi.apiGateway,
            webaclProps: {
                defaultAction: { allow: {} },
                scope: 'REGIONAL',
                rules: [
                    wrapManagedRuleSet('AWSManagedRulesBotControlRuleSet', 'AWS', 0),
                    wrapManagedRuleSet('AWSManagedRulesKnownBadInputsRuleSet', 'AWS', 1),
                    this.defineAWSManagedRulesCommonRuleSetWithBodyOverride(2),
                    wrapManagedRuleSet('AWSManagedRulesAnonymousIpList', 'AWS', 3),
                    wrapManagedRuleSet('AWSManagedRulesAmazonIpReputationList', 'AWS', 4),
                    wrapManagedRuleSet('AWSManagedRulesAdminProtectionRuleSet', 'AWS', 5),
                    wrapManagedRuleSet('AWSManagedRulesSQLiRuleSet', 'AWS', 6),
                    this.defineBlockRequestHeadersRule(),
                    this.defineBlockOversizedBodyNotInDeployRule()
                ],
                customResponseBodies: {
                    [HEADERS_NOT_ALLOWED_KEY]: this.createHeadersNotAllowedResponse()
                }
            }
        });

        const apiRoot = lambdaRestApi.apiGateway.root; // root resource

        this.createUseCaseManagementApi(props, apiRoot, requestValidator, lambdaRestApi.apiGateway);
        this.createModelInfoApi(props, apiRoot, requestValidator);

        this.restApi = lambdaRestApi.apiGateway;
        this.apiRootResource = apiRoot;

        NagSuppressions.addResourceSuppressions(lambdaRestApi.apiGatewayCloudWatchRole!, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission generated by the ApiGatewayToLambda construct to allow CloudWatch Logs to be used',
                appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*']
            }
        ]);

        NagSuppressions.addResourceSuppressions(lambdaRestApi.apiGateway.deploymentStage, [
            {
                id: 'AwsSolutions-APIG6',
                reason: 'Turning off execution logs as recommended best practice in the ApiGateway service documentation'
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
                        `${lambdaRestApi.apiGateway.root}/${_path}/${_operation}/Resource`,
                        [
                            {
                                id: 'AwsSolutions-APIG4',
                                reason: 'The API Gateway method cannot use auth as the server has to respond to the OPTIONS request for cors reasons'
                            },
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

        cfn_nag.addCfnSuppressRules(lambdaRestApi.apiGateway, [
            {
                id: 'W87',
                reason: 'Since caching is not enabled, cache encryption is also not enabled'
            }
        ]);

        cfn_nag.addCfnSuppressRules(lambdaRestApi.apiGateway.deploymentStage, [
            {
                id: 'W87',
                reason: "Caching is not configured for this endpoint, hence CacheEncryption configurations don't apply"
            }
        ]);

        cfn_nag.addCfnSuppressRules(lambdaRestApi.apiGatewayCloudWatchRole?.node.defaultChild as cdk.CfnResource, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);
    }

    /**
     * Configure all 4XX and 5XX responses to have CORS headers
     * @param restApi
     */
    private configureGatewayResponses(restApi: api.RestApi) {
        new api.GatewayResponse(this, 'BadRequestDefaultResponse', {
            restApi: restApi,
            type: api.ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        });

        new api.GatewayResponse(this, 'InternalServerErrorDefaultResponse', {
            restApi: restApi,
            type: api.ResponseType.DEFAULT_5XX,
            statusCode: '400',
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        });

        // templates provide useful info about requests which fail validation
        new api.GatewayResponse(this, 'BadRequestBodyResponse', {
            restApi: restApi,
            type: api.ResponseType.BAD_REQUEST_BODY,
            statusCode: '400',
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            templates: {
                'application/json':
                    '{"error":{"message":"$context.error.messageString","errors":"$context.error.validationErrorString"}}'
            }
        });

        new api.GatewayResponse(this, 'BadRequestParametersResponse', {
            restApi: restApi,
            type: api.ResponseType.BAD_REQUEST_PARAMETERS,
            statusCode: '400',
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            templates: {
                'application/json':
                    '{"error":{"message":"$context.error.messageString","errors":"$context.error.validationErrorString"}}'
            }
        });
    }

    /**
     * Creates all API resources and methods for the use case management API
     * @param props
     * @param apiRoot
     * @param requestValidator
     * @param restApi
     */
    private createUseCaseManagementApi(
        props: DeploymentPlatformRestEndpointProps,
        apiRoot: cdk.aws_apigateway.IResource,
        requestValidator: cdk.aws_apigateway.RequestValidator,
        restApi: api.RestApi
    ) {
        const useCaseManagementAPILambdaIntegration = new api.LambdaIntegration(props.useCaseManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Paths for the deployment api
        const deploymentsResource = apiRoot.addResource('deployments'); // for getting and creating deployments
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
            requestValidator: requestValidator,
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
            requestValidator: requestValidator,
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
            allowMethods: ['PATCH', 'DELETE', 'OPTIONS']
        });

        //  Updating an existing use case deployment (i.e. changing its configuration)
        deploymentResource.addMethod('PATCH', useCaseManagementAPILambdaIntegration, {
            operationName: 'UpdateUseCase',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: requestValidator,
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
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.querystring.permanent': false,
                'method.request.header.authorization': true
            }
        });
    }

    /**
     * Creates all API resources and methods for the use case management API
     * @param props
     * @param apiRoot
     * @param requestValidator
     * @param restApi
     */
    private createModelInfoApi(
        props: DeploymentPlatformRestEndpointProps,
        apiRoot: cdk.aws_apigateway.IResource,
        requestValidator: cdk.aws_apigateway.RequestValidator
    ) {
        const modelInfoLambdaIntegration = new api.LambdaIntegration(props.modelInfoApiLambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });
        const modelInfoResource = apiRoot.addResource('model-info');

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
            requestValidator: requestValidator,
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
            requestValidator: requestValidator,
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
            requestValidator: requestValidator,
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
            requestValidator: requestValidator,
            requestParameters: {
                'method.request.header.authorization': true
            }
        });
    }

    /**
     * Define WAF rule for blocking any request that contains the `X-Amzn-Requestid` header
     * @returns WAF rule
     */
    private defineBlockRequestHeadersRule(): CfnWebACL.RuleProperty {
        return {
            priority: this.getCustomRulePriority(),
            name: 'Custom-BlockRequestHeaders',
            action: {
                block: {
                    customResponse: {
                        responseCode: INVALID_REQUEST_HEADER_RESPONSE_CODE,
                        customResponseBodyKey: HEADERS_NOT_ALLOWED_KEY
                    }
                }
            },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'Custom-BlockRequestHeaders',
                sampledRequestsEnabled: true
            },
            statement: {
                sizeConstraintStatement: {
                    fieldToMatch: {
                        singleHeader: {
                            'Name': 'x-amzn-requestid'
                        }
                    },
                    comparisonOperator: 'GE',
                    size: 0,
                    textTransformations: [
                        {
                            type: 'NONE',
                            priority: 0
                        }
                    ]
                }
            }
        };
    }

    private createHeadersNotAllowedResponse(): CfnWebACL.CustomResponseBodyProperty {
        return {
            content: 'One of your injected headers is not allowed',
            contentType: 'TEXT_PLAIN'
        };
    }

    /**
     * Define WAF rule which enforces the SizeRestrictions_Body rule from the core rule set for URIs not in the /deployments path
     * @returns WAF rule
     */
    private defineBlockOversizedBodyNotInDeployRule(): CfnWebACL.RuleProperty {
        return {
            priority: this.getCustomRulePriority(),
            name: 'Custom-BlockOversizedBodyNotInDeploy',
            action: {
                block: {}
            },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'Custom-BlockOversizedBodyNotInDeploy',
                sampledRequestsEnabled: true
            },
            statement: {
                andStatement: {
                    statements: [
                        {
                            labelMatchStatement: {
                                scope: 'LABEL',
                                key: 'awswaf:managed:aws:core-rule-set:SizeRestrictions_Body'
                            }
                        },
                        {
                            notStatement: {
                                statement: {
                                    byteMatchStatement: {
                                        searchString: '/deployments',
                                        fieldToMatch: {
                                            uriPath: {}
                                        },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'NONE'
                                            }
                                        ],
                                        positionalConstraint: 'ENDS_WITH'
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };
    }

    /**
     * Defines a WAF rule which enforces the AWSManagedRulesCommonRuleSet, with an override to only count the SizeRestrictions_BODY.
     * @param priority The priority of the rule
     * @returns The WAF rule
     */
    private defineAWSManagedRulesCommonRuleSetWithBodyOverride(priority: number): CfnWebACL.RuleProperty {
        return {
            name: 'AWS-AWSManagedRulesCommonRuleSet',
            priority: priority,
            statement: {
                managedRuleGroupStatement: {
                    vendorName: 'AWS',
                    name: 'AWSManagedRulesCommonRuleSet',
                    ruleActionOverrides: [
                        {
                            name: 'SizeRestrictions_BODY',
                            actionToUse: {
                                count: {}
                            }
                        }
                    ]
                }
            },
            overrideAction: {
                none: {}
            },
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'AWS-AWSManagedRulesCommonRuleSet'
            }
        };
    }

    /**
     * Gets a unique priority for a custom rule, incrementing an internal counter
     * @returns A unique priority for each custom rule
     */
    private getCustomRulePriority(): number {
        return this.rulePriorityCounter++;
    }
}
