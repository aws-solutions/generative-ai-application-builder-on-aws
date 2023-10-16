#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { LambdaRestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
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

    constructor(scope: Construct, id: string, props: DeploymentPlatformRestEndpointProps) {
        super(scope, id);
        this.stack = cdk.Stack.of(scope);

        const lambdaRestApi = new ApiGatewayToLambda(this, 'EndPoint', {
            existingLambdaObj: props.useCaseManagementAPILambda,
            apiGatewayProps: {
                description: 'API endpoint to access use case management functions',
                restApiName: `${cdk.Aws.STACK_NAME}-UseCaseManagementAPI`,
                proxy: false,
                deployOptions: {
                    loggingLevel: api.MethodLoggingLevel.INFO,
                    dataTraceEnabled: false,
                    metricsEnabled: true
                }
            } as LambdaRestApiProps
        });

        const requestValidator = new api.RequestValidator(this, 'RequestValidator', {
            restApi: lambdaRestApi.apiGateway,
            requestValidatorName: `${cdk.Aws.STACK_NAME}-api-request-validator`,
            validateRequestBody: true,
            validateRequestParameters: true
        });

        // configure all 4XX and 5XX responses to have CORS headers
        new api.GatewayResponse(this, 'BadRequestDefaultResponse', {
            restApi: lambdaRestApi.apiGateway,
            type: api.ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        });

        new api.GatewayResponse(this, 'InternalServerErrorDefaultResponse', {
            restApi: lambdaRestApi.apiGateway,
            type: api.ResponseType.DEFAULT_5XX,
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        });

        // templates provide useful info about requests which fail validation
        new api.GatewayResponse(this, 'BadRequestBodyResponse', {
            restApi: lambdaRestApi.apiGateway,
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
            restApi: lambdaRestApi.apiGateway,
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

        new WafwebaclToApiGateway(this, 'Endpoint', {
            existingApiGatewayInterface: lambdaRestApi.apiGateway
        });

        const apiRoot = lambdaRestApi.apiGateway.root; // root resource

        const useCaseManagementAPILambdaIntegration = new api.LambdaIntegration(props.useCaseManagementAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        // Paths for the deployment api
        const deploymentsResource = apiRoot.addResource('deployments'); // for getting and creating deployments
        const deploymentResource = deploymentsResource.addResource('{useCaseId}'); // for updating/deleting specific a specific deployment

        deploymentsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['*'],
            allowMethods: ['POST', 'GET', 'OPTIONS']
        });

        // Listing info about existing use cases
        deploymentsResource.addMethod('GET', useCaseManagementAPILambdaIntegration, {
            operationName: 'GetUseCases',
            authorizer: props.deploymentPlatformAuthorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: requestValidator,
            requestParameters: {
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
                    restApi: lambdaRestApi.apiGateway,
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
                            restApi: lambdaRestApi.apiGateway,
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
            allowHeaders: ['*'],
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
                    restApi: lambdaRestApi.apiGateway,
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
                            restApi: lambdaRestApi.apiGateway,
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

        this.restApi = lambdaRestApi.apiGateway;
        this.apiRootResource = apiRoot;

        NagSuppressions.addResourceSuppressions(lambdaRestApi.apiGatewayCloudWatchRole!, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission generated by the ApiGatewayToLambda construct to allow CloudWatch Logs to be used',
                appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*']
            }
        ]);

        const resourcePathsToSuppress = ['deployments', 'deployments/{useCaseId}'];
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
    }
}
