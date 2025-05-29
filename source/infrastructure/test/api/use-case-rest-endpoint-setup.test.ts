// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';
import { Match, Template, Capture } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    StackDeploymentSource,
    DynamoDBAttributes
} from '../../lib/utils/constants';
import { UseCaseRestEndpointSetup } from '../../lib/api/use-case-rest-endpoint-setup';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

describe('UseCaseRestEndpoint with existing resources', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'TestStack');

        const mockProps = {
            existingApiId: 'test-api-id',
            existingApiRootResourceId: 'test-root-resource-id',
            customResourceLambda: new lambda.Function(stack, 'MockCustomResourceLambda', {
                code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
                runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
                handler: 'index.handler'
            }),
            deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            }),
            createApiResourcesCondition: new cdk.CfnCondition(stack, 'CreateApiResourcesCondition', {
                expression: cdk.Fn.conditionEquals('true', 'false')
            }),
            privateSubnetIds: 'pid1, pid2',
            securityGroupIds: 'sid1, sid2',
            llmConfigTable: 'mock-table',
            stackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM,
            identifier: 'test-uuid'
        };

        new UseCaseRestEndpointSetup(stack, 'TestUseCaseEndpoint', mockProps);
        template = Template.fromStack(stack);
    });

    it('should create Lambda function for use case details', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Description: 'Lambda function for use case details',
            Handler: 'index.handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Timeout: 900, // 15 minutes
            TracingConfig: {
                Mode: 'Active'
            },
            Role: { 'Fn::GetAtt': [Match.stringLikeRegexp('TestUseCaseEndpointUseCaseDetailsRole'), 'Arn'] },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('TestUseCaseEndpointUseCaseDlq*'), 'Arn']
                }
            },
            VpcConfig: {
                'Fn::If': [
                    Match.stringLikeRegexp('TestUseCaseEndpointDeployVPCIfLambdaExists*'),
                    {
                        'SubnetIds': ['pid1', ' pid2'],
                        'SecurityGroupIds': ['sid1', ' sid2']
                    },
                    {
                        'Ref': 'AWS::NoValue'
                    }
                ]
            },
            Environment: {
                Variables: {
                    'LLM_CONFIG_TABLE': 'mock-table'
                }
            }
        });
    });

    it('should create API Gateway method with correct configuration', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            AuthorizationType: 'CUSTOM',
            Integration: Match.objectLike({
                Type: 'AWS_PROXY',
                IntegrationHttpMethod: 'POST'
            }),
            RequestParameters: {
                'method.request.header.authorization': true
            },
            OperationName: 'UseCaseDetails'
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: '{useCaseConfigKey}',
            ParentId: {
                'Ref': Match.stringLikeRegexp('UseCaseApidetails*')
            },
            RestApiId: {
                'Fn::If': [
                    'CreateApiResourcesCondition',
                    {
                        'Ref': Match.stringLikeRegexp(
                            'TestUseCaseEndpointUseCaseRestEndpointDeploymentRestEndPointLambdaRestApi'
                        )
                    },
                    'test-api-id'
                ]
            }
        });
    });

    it('should configure CORS for the API endpoint', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'OPTIONS',
            ResourceId: {
                Ref: Match.stringLikeRegexp('TestUseCaseEndpointUseCaseApidetailsuseCaseConfigKey')
            },
            RestApiId: {
                'Fn::If': [
                    'CreateApiResourcesCondition',
                    {
                        'Ref': Match.stringLikeRegexp(
                            'TestUseCaseEndpointUseCaseRestEndpointDeploymentRestEndPointLambdaRestApi'
                        )
                    },
                    'test-api-id'
                ]
            },
            Integration: {
                IntegrationResponses: [
                    {
                        ResponseParameters: {
                            'method.response.header.Access-Control-Allow-Headers':
                                "'Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'",
                            'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        StatusCode: '204'
                    }
                ],
                RequestTemplates: {
                    'application/json': '{ statusCode: 200 }'
                },
                Type: 'MOCK'
            },
            MethodResponses: [
                {
                    ResponseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    },
                    StatusCode: '204'
                }
            ]
        });
    });

    it('should configure proper IAM roles and policies', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com'
                        }
                    })
                ])
            })
        });
    });

    it('should configure Lambda integration', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            Integration: {
                Type: 'AWS_PROXY',
                IntegrationHttpMethod: 'POST',
                PassthroughBehavior: 'NEVER'
            }
        });
    });

    it('should configure custom authorizer', () => {
        const apiCapture = new Capture();
        template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
            AuthorizerResultTtlInSeconds: 0,
            Type: 'REQUEST',
            IdentitySource: 'method.request.header.Authorization',
            RestApiId: apiCapture,
            Name: Match.stringLikeRegexp('TestStackTestUseCaseEndpointUseCaseRestEndpointUseCaseEndpointAuthorizer*')
        });
    });
});

describe('Invalid inputs when UseCaseRestEndpoint is created with new resources', () => {
    it('should throw when userPoolId is not provided for new resource creation', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'TestStack');

        expect(() => {
            new UseCaseRestEndpointSetup(stack, 'TestUseCaseEndpoint', {
                userPoolClientId: 'test-user-pool-client-id',
                cognitoGroupPolicyTable: new dynamodb.Table(stack, 'CognitoGroupPolicyStore', {
                    encryption: dynamodb.TableEncryption.AWS_MANAGED,
                    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
                    partitionKey: {
                        name: DynamoDBAttributes.COGNITO_TABLE_PARTITION_KEY,
                        type: dynamodb.AttributeType.STRING
                    },
                    removalPolicy: cdk.RemovalPolicy.DESTROY
                }),
                customResourceLambda: new lambda.Function(stack, 'MockCustomResourceLambda', {
                    code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
                    runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
                    handler: 'index.handler'
                }),
                deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                    expression: cdk.Fn.conditionEquals('true', 'true')
                }),
                createApiResourcesCondition: new cdk.CfnCondition(stack, 'CreateApiResourcesCondition', {
                    expression: cdk.Fn.conditionEquals('true', 'true')
                }),
                privateSubnetIds: 'pid1, pid2',
                securityGroupIds: 'sid1, sid2',
                llmConfigTable: 'mock-table',
                stackDeploymentSource: StackDeploymentSource.STANDALONE_USE_CASE
            });
        }).toThrow(
            'Either of (Userpool ID, Userpool Client ID, Userpool Group name and Cognito group policy table) are required to create the authorizer for the new API or (Existing API ID and Existing Root Resource ID) must be provided.'
        );
    });

    it('should throw when Root Resource ID is not provided for new resource creation', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'TestStack');

        expect(() => {
            new UseCaseRestEndpointSetup(stack, 'TestUseCaseEndpoint', {
                existingApiId: 'test-api-id',
                customResourceLambda: new lambda.Function(stack, 'MockCustomResourceLambda', {
                    code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
                    runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
                    handler: 'index.handler'
                }),
                deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                    expression: cdk.Fn.conditionEquals('true', 'true')
                }),
                createApiResourcesCondition: new cdk.CfnCondition(stack, 'CreateApiResourcesCondition', {
                    expression: cdk.Fn.conditionEquals('true', 'false')
                }),
                privateSubnetIds: 'pid1, pid2',
                securityGroupIds: 'sid1, sid2',
                llmConfigTable: 'mock-table',
                stackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM
            });
        }).toThrow(
            'Either of (Userpool ID, Userpool Client ID, Userpool Group name and Cognito group policy table) are required to create the authorizer for the new API or (Existing API ID and Existing Root Resource ID) must be provided.'
        );
    });
});

describe('Valid inputs when UseCaseRestEndpoint is created with new resources', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        stack = new cdk.Stack(app, 'TestStack');

        const crLambda = new lambda.Function(stack, 'customResourceLambda', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        const cognitoPolicyTable = new dynamodb.Table(stack, 'CognitoGroupPolicyStore', {
            partitionKey: {
                name: DynamoDBAttributes.COGNITO_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            }
        });

        const mockProps = {
            existingRequestAuthorizerLambdaArn: 'arn:aws:lambda:us-east-1:1234567890:function:NeverDeployLambda-api-id',
            existingRequestValidatorId: 'test-validator-id',
            userPoolId: 'test-user-pool-id',
            userPoolClientId: 'test-user-pool-client-id',
            cognitoGroupPolicyTable: cognitoPolicyTable,
            userPoolGroupName: 'test-user-pool-group-name',
            customResourceLambda: crLambda,
            deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            }),
            createApiResourcesCondition: new cdk.CfnCondition(stack, 'CreateApiResourcesCondition', {
                expression: cdk.Fn.conditionEquals('true', 'false')
            }),
            privateSubnetIds: 'pid1, pid2',
            securityGroupIds: 'sid1, sid2',
            llmConfigTable: 'mock-table',
            stackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM,
            identifier: 'test-uuid'
        };

        new UseCaseRestEndpointSetup(stack, 'TestUseCaseEndpoint', mockProps);
        template = Template.fromStack(stack);
    });

    it('should create Lambda function for use case details', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Description: 'Lambda function for use case details',
            Handler: 'index.handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Timeout: 900, // 15 minutes
            TracingConfig: {
                Mode: 'Active'
            },
            Role: { 'Fn::GetAtt': [Match.stringLikeRegexp('TestUseCaseEndpointUseCaseDetailsRole'), 'Arn'] },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('TestUseCaseEndpointUseCaseDlq*'), 'Arn']
                }
            },
            VpcConfig: {
                'Fn::If': [
                    Match.stringLikeRegexp('TestUseCaseEndpointDeployVPCIfLambdaExists'),
                    {
                        'SubnetIds': ['pid1', ' pid2'],
                        'SecurityGroupIds': ['sid1', ' sid2']
                    },
                    {
                        'Ref': 'AWS::NoValue'
                    }
                ]
            }
        });
    });

    it('should create API Gateway method with correct configuration', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            AuthorizationType: 'CUSTOM',
            Integration: Match.objectLike({
                Type: 'AWS_PROXY',
                IntegrationHttpMethod: 'POST'
            }),
            RequestParameters: {
                'method.request.header.authorization': true
            },
            OperationName: 'UseCaseDetails'
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: '{useCaseConfigKey}',
            ParentId: {
                'Ref': Match.stringLikeRegexp('UseCaseApidetails*')
            },
            RestApiId: {
                'Fn::If': [
                    'CreateApiResourcesCondition',
                    {
                        'Ref': Match.stringLikeRegexp(
                            'estUseCaseEndpointUseCaseRestEndpointDeploymentRestEndPointLambdaRestApi'
                        )
                    },
                    ''
                ]
            }
        });
    });

    it('should configure CORS for the API endpoint', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'OPTIONS',
            ResourceId: {
                Ref: Match.stringLikeRegexp('TestUseCaseEndpointUseCaseApidetailsuseCaseConfigKey')
            },
            RestApiId: {
                'Fn::If': [
                    'CreateApiResourcesCondition',
                    {
                        'Ref': Match.stringLikeRegexp(
                            'TestUseCaseEndpointUseCaseRestEndpointDeploymentRestEndPointLambdaRestApi'
                        )
                    },
                    ''
                ]
            },
            Integration: {
                IntegrationResponses: [
                    {
                        ResponseParameters: {
                            'method.response.header.Access-Control-Allow-Headers':
                                "'Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'",
                            'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        StatusCode: '204'
                    }
                ],
                RequestTemplates: {
                    'application/json': '{ statusCode: 200 }'
                },
                Type: 'MOCK'
            },
            MethodResponses: [
                {
                    ResponseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    },
                    StatusCode: '204'
                }
            ]
        });
    });

    it('should configure proper IAM roles and policies', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com'
                        }
                    })
                ])
            })
        });
    });

    it('should configure Lambda integration', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            Integration: {
                Type: 'AWS_PROXY',
                IntegrationHttpMethod: 'POST',
                PassthroughBehavior: 'NEVER'
            }
        });
    });

    it('should configure custom authorizer', () => {
        const apiCapture = new Capture();
        template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
            AuthorizerResultTtlInSeconds: 0,
            Type: 'REQUEST',
            IdentitySource: 'method.request.header.Authorization',
            RestApiId: apiCapture,
            Name: Match.stringLikeRegexp('TestStackTestUseCaseEndpointUseCaseRestEndpointUseCaseEndpointAuthorizer*')
        });
    });
});

describe('CreateApiRoutesCondition tests', () => {
    let app: cdk.App;
    let stack: cdk.Stack;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
    });

    it('should add condition when UseCaseRestEndpoint is created', () => {
        const createApiResourcesCondition = new cdk.CfnCondition(stack, 'CreateApiResourcesCondition', {
            expression: cdk.Fn.conditionEquals('true', 'false')
        });
        const crLambda = new lambda.Function(stack, 'customResourceLambda', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        const cognitoPolicyTable = new dynamodb.Table(stack, 'CognitoGroupPolicyStore', {
            partitionKey: {
                name: DynamoDBAttributes.COGNITO_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            }
        });

        const mockProps = {
            existingRequestAuthorizerLambdaArn: 'arn:aws:lambda:us-east-1:1234567890:function:NeverDeployLambda-api-id',
            existingRequestValidatorId: 'test-validator-id',
            userPoolId: 'test-user-pool-id',
            userPoolClientId: 'test-user-pool-client-id',
            cognitoGroupPolicyTable: cognitoPolicyTable,
            userPoolGroupName: 'test-user-pool-group-name',
            customResourceLambda: crLambda,
            deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            }),
            createApiResourcesCondition: new cdk.CfnCondition(stack, 'CreateApiResourcesConditions', {
                expression: cdk.Fn.conditionEquals('true', 'false')
            }),
            privateSubnetIds: 'pid1, pid2',
            securityGroupIds: 'sid1, sid2',
            llmConfigTable: 'mock-table',
            stackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM,
            identifier: 'test-uuid'
        };

        new UseCaseRestEndpointSetup(stack, 'TestUseCaseEndpoint', mockProps);

        const template = Template.fromStack(stack);

        template.hasCondition('TestUseCaseEndpointCreateApiRoutesCondition610A5E1F', {
            'Fn::Or': [
                { 'Fn::Equals': ['DeploymentPlatform', 'DeploymentPlatform'] },
                {
                    'Condition': 'CreateApiResourcesConditions'
                }
            ]
        });

        template.hasCondition('TestUseCaseEndpointDeployVPCIfLambdaExists63B80E49', {
            'Fn::And': [
                {
                    'Condition': 'MockVPCCondition'
                },
                {
                    'Condition': 'TestUseCaseEndpointCreateApiRoutesCondition610A5E1F'
                }
            ]
        });

        // UsecaseDetails role
        template.hasResource('AWS::Lambda::Function', {
            Properties: Match.anyValue(),
            Condition: Match.stringLikeRegexp('CreateApiRoutesCondition*')
        });

        // Usecase details lambda
        template.hasResource('AWS::IAM::Role', {
            Properties: Match.anyValue(),
            Condition: Match.stringLikeRegexp('CreateApiRoutesCondition*')
        });

        // Usecase details method
        template.hasResource('AWS::ApiGateway::Method', {
            Properties: Match.anyValue(),
            Condition: Match.stringLikeRegexp('CreateApiRoutesCondition*')
        });
    });
});
