// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { DeploymentPlatformRestEndpoint } from '../../lib/api/deployment-platform-rest-endpoint';
import {
    API_GATEWAY_THROTTLING_BURST_LIMIT,
    API_GATEWAY_THROTTLING_RATE_LIMIT,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
} from '../../lib/utils/constants';

describe('When creating rest endpoints', () => {
    let template: Template;
    let jsonTemplate: any;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const testAuthorizer = new api.RequestAuthorizer(stack, 'CustomRequestAuthorizers', {
            handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        new DeploymentPlatformRestEndpoint(stack, 'TestEndpointCreation', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'MockGetRequestFunction', mockLambdaFuncProps),
            modelInfoApiLambda: new lambda.Function(stack, 'MockModelInfoFunction', mockLambdaFuncProps),
            mcpManagementAPILambda: new lambda.Function(stack, 'MockMCPManagementFunction', mockLambdaFuncProps),
            agentManagementAPILambda: new lambda.Function(stack, 'MockAgentManagementFunction', mockLambdaFuncProps),
            workflowManagementAPILambda: new lambda.Function(
                stack,
                'MockWorkflowManagementFunction',
                mockLambdaFuncProps
            ),
            tenantManagementAPILambda: new lambda.Function(stack, 'MockTenantManagementFunction', mockLambdaFuncProps),
            deploymentPlatformAuthorizer: testAuthorizer
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('should have REST APIGateway setup', () => {
        const restApiCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Description: 'API endpoint to access use case management functions',
            EndpointConfiguration: {
                Types: ['EDGE']
            },
            Name: {
                'Fn::Join': [
                    '',
                    [
                        {
                            Ref: 'AWS::StackName'
                        },
                        '-UseCaseManagementAPI'
                    ]
                ]
            }
        });

        template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
        template.hasResourceProperties('AWS::ApiGateway::Deployment', {
            RestApiId: {
                Ref: restApiCapture
            }
        });

        expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');

        const restApiDeploymentCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Stage', 1);
        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            RestApiId: {
                Ref: restApiCapture.asString()
            },
            AccessLogSetting: {
                DestinationArn: {
                    'Fn::GetAtt': Match.anyValue()
                },
                Format: '$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] "$context.httpMethod $context.resourcePath $context.protocol" $context.status $context.responseLength $context.requestId'
            },
            DeploymentId: {
                Ref: restApiDeploymentCapture
            },
            MethodSettings: [
                {
                    DataTraceEnabled: false,
                    HttpMethod: '*',
                    LoggingLevel: 'OFF',
                    ResourcePath: '/*',
                    ThrottlingBurstLimit: API_GATEWAY_THROTTLING_BURST_LIMIT,
                    ThrottlingRateLimit: API_GATEWAY_THROTTLING_RATE_LIMIT
                }
            ],
            StageName: 'prod',
            TracingEnabled: true
        });

        expect(jsonTemplate['Resources'][restApiDeploymentCapture.asString()]['Type']).toEqual(
            'AWS::ApiGateway::Deployment'
        );
    });

    it('should provide create permissions to invoke lambda functions for specific resource invocations', () => {
        const restApiCapture = new Capture();
        const restApiStageCapture = new Capture();
        const lambdaCapture = new Capture();

        template.resourceCountIs('AWS::Lambda::Permission', 51);
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        ':',
                        {
                            Ref: restApiCapture
                        },
                        '/',
                        {
                            Ref: restApiStageCapture
                        },
                        '/GET/deployments'
                    ]
                ]
            }
        });
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        ':',
                        {
                            Ref: restApiCapture
                        },
                        '/',
                        {
                            Ref: restApiStageCapture
                        },
                        '/POST/deployments'
                    ]
                ]
            }
        });
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        ':',
                        {
                            Ref: restApiCapture
                        },
                        '/',
                        {
                            Ref: restApiStageCapture
                        },
                        '/PATCH/deployments/*'
                    ]
                ]
            }
        });
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        ':',
                        {
                            Ref: restApiCapture
                        },
                        '/',
                        {
                            Ref: restApiStageCapture
                        },
                        '/DELETE/deployments/*'
                    ]
                ]
            }
        });

        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            'Ref': 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            'Ref': 'AWS::Region'
                        },
                        ':',
                        {
                            'Ref': 'AWS::AccountId'
                        },
                        ':',
                        {
                            'Ref': restApiCapture
                        },
                        '/',
                        {
                            'Ref': restApiStageCapture
                        },
                        '/GET/model-info/*/providers'
                    ]
                ]
            }
        });

        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            'Ref': 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            'Ref': 'AWS::Region'
                        },
                        ':',
                        {
                            'Ref': 'AWS::AccountId'
                        },
                        ':',
                        {
                            'Ref': restApiCapture
                        },
                        '/',
                        {
                            'Ref': restApiStageCapture
                        },
                        '/GET/model-info/*/*'
                    ]
                ]
            }
        });

        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            'Ref': 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            'Ref': 'AWS::Region'
                        },
                        ':',
                        {
                            'Ref': 'AWS::AccountId'
                        },
                        ':',
                        {
                            'Ref': restApiCapture
                        },
                        '/',
                        {
                            'Ref': restApiStageCapture
                        },
                        '/GET/model-info/*/*/*'
                    ]
                ]
            }
        });

        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [lambdaCapture, 'Arn']
            },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            'Ref': 'AWS::Partition'
                        },
                        ':execute-api:',
                        {
                            'Ref': 'AWS::Region'
                        },
                        ':',
                        {
                            'Ref': 'AWS::AccountId'
                        },
                        ':',
                        {
                            'Ref': restApiCapture
                        },
                        '/',
                        {
                            'Ref': restApiStageCapture
                        },
                        '/GET/model-info/use-case-types'
                    ]
                ]
            }
        });

        expect(jsonTemplate['Resources'][restApiStageCapture.asString()]['Type']).toEqual('AWS::ApiGateway::Stage');
        expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');
    });

    it('should have a request validator and Web Acl', () => {
        const restApiCapture = new Capture();
        template.hasResourceProperties('AWS::ApiGateway::RequestValidator', {
            RestApiId: {
                Ref: restApiCapture
            },
            Name: {
                'Fn::Join': [
                    '',
                    [
                        {
                            Ref: 'AWS::StackName'
                        },
                        '-api-request-validator'
                    ]
                ]
            },
            ValidateRequestBody: true,
            ValidateRequestParameters: true
        });
        expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');

        const webAclCapture = new Capture();
        template.resourceCountIs('AWS::WAFv2::WebACL', 1);
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            'CustomResponseBodies': {
                'HeadersNotAllowed': {
                    'Content': 'One of your injected headers is not allowed',
                    'ContentType': 'TEXT_PLAIN'
                }
            },
            'DefaultAction': {
                'Allow': {}
            },
            'Rules': [
                {
                    'Name': 'AWS-AWSManagedRulesBotControlRuleSet',
                    'OverrideAction': { 'None': {} },
                    'Priority': 0,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesBotControlRuleSet',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesBotControlRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                    'OverrideAction': { 'None': {} },
                    'Priority': 1,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesKnownBadInputsRuleSet',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesKnownBadInputsRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesCommonRuleSet',
                    'OverrideAction': { 'None': {} },
                    'Priority': 2,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesCommonRuleSet',
                            'RuleActionOverrides': [
                                {
                                    'ActionToUse': { 'Count': {} },
                                    'Name': 'SizeRestrictions_BODY'
                                }
                            ],
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWS-AWSManagedRulesCommonRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesAnonymousIpList',
                    'OverrideAction': { 'None': {} },
                    'Priority': 3,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesAnonymousIpList',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesAnonymousIpList',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesAmazonIpReputationList',
                    'OverrideAction': { 'None': {} },
                    'Priority': 4,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesAmazonIpReputationList',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesAmazonIpReputationList',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesAdminProtectionRuleSet',
                    'OverrideAction': { 'None': {} },
                    'Priority': 5,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesAdminProtectionRuleSet',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesAdminProtectionRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesSQLiRuleSet',
                    'OverrideAction': { 'None': {} },
                    'Priority': 6,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesSQLiRuleSet',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesSQLiRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Action': {
                        'Block': {
                            'CustomResponse': {
                                'CustomResponseBodyKey': 'HeadersNotAllowed',
                                'ResponseCode': 403
                            }
                        }
                    },
                    'Name': 'Custom-BlockRequestHeaders',
                    'Priority': 7,
                    'Statement': {
                        'SizeConstraintStatement': {
                            'ComparisonOperator': 'GE',
                            'FieldToMatch': {
                                'SingleHeader': { 'Name': 'x-amzn-requestid' }
                            },
                            'Size': 0,
                            'TextTransformations': [{ 'Priority': 0, 'Type': 'NONE' }]
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'Custom-BlockRequestHeaders',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Action': { 'Block': {} },
                    'Name': 'Custom-BlockOversizedBodyNotInDeploy',
                    'Priority': 8,
                    'Statement': {
                        'AndStatement': {
                            'Statements': [
                                {
                                    'LabelMatchStatement': {
                                        'Key': 'awswaf:managed:aws:core-rule-set:SizeRestrictions_Body',
                                        'Scope': 'LABEL'
                                    }
                                },
                                {
                                    'NotStatement': {
                                        'Statement': {
                                            'OrStatement': {
                                                'Statements': [
                                                    {
                                                        'RegexMatchStatement': {
                                                            'FieldToMatch': {
                                                                'UriPath': {}
                                                            },
                                                            'RegexString': '/deployments(/mcp|/agents|/workflows)?$',
                                                            'TextTransformations': [{ 'Priority': 0, 'Type': 'NONE' }]
                                                        }
                                                    },
                                                    {
                                                        'RegexMatchStatement': {
                                                            'FieldToMatch': {
                                                                'UriPath': {}
                                                            },
                                                            'RegexString':
                                                                '/deployments(/mcp|/agents|/workflows)?/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                                                            'TextTransformations': [{ 'Priority': 0, 'Type': 'NONE' }]
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'Custom-BlockOversizedBodyNotInDeploy',
                        'SampledRequestsEnabled': true
                    }
                }
            ],
            'Scope': 'REGIONAL',
            'VisibilityConfig': {
                'CloudWatchMetricsEnabled': true,
                'MetricName': 'webACL',
                'SampledRequestsEnabled': true
            }
        });

        template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1);
        template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
            ResourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':apigateway:',
                        {
                            Ref: 'AWS::Region'
                        },
                        '::/restapis/',
                        {
                            Ref: restApiCapture.asString()
                        },
                        '/stages/',
                        {
                            Ref: Match.anyValue()
                        }
                    ]
                ]
            },
            WebACLArn: {
                'Fn::GetAtt': [webAclCapture, 'Arn']
            }
        });

        expect(jsonTemplate['Resources'][webAclCapture.asString()]['Type']).toEqual('AWS::WAFv2::WebACL');
    });

    it('should create deployments path based resources', () => {
        const restApiCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Resource', 15);

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                'Fn::GetAtt': [restApiCapture, 'RootResourceId']
            },
            PathPart: 'deployments',
            RestApiId: {
                Ref: restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                Ref: Match.stringLikeRegexp('TestEndpointCreationDeploymentRestEndPointLambdaRestApideployments*')
            },
            PathPart: '{useCaseId}',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            OperationName: 'GetUseCase',
            ResourceId: {
                Ref: Match.stringLikeRegexp(
                    'TestEndpointCreationDeploymentRestEndPointLambdaRestApideploymentsuseCaseId*'
                )
            },
            AuthorizerId: {
                'Ref': 'CustomRequestAuthorizers5281AD5E'
            },
            RestApiId: {
                Ref: restApiCapture.asString()
            },
            Integration: {
                IntegrationHttpMethod: 'POST',
                PassthroughBehavior: 'NEVER',
                Type: 'AWS_PROXY',
                Uri: {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            {
                                'Ref': 'AWS::Partition'
                            },
                            ':apigateway:',
                            {
                                'Ref': 'AWS::Region'
                            },
                            ':lambda:path/2015-03-31/functions/',
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('MockGetRequestFunction*'), 'Arn']
                            },
                            '/invocations'
                        ]
                    ]
                }
            },
            RequestParameters: { 'method.request.header.authorization': true }
        });
    });

    it('should create model-info path based resources', () => {
        const restApiCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Resource', 15);

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                'Fn::GetAtt': [restApiCapture, 'RootResourceId']
            },
            PathPart: 'model-info',
            RestApiId: {
                Ref: restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Fn::GetAtt': [restApiCapture, 'RootResourceId']
            },
            'PathPart': 'model-info',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Ref': Match.stringLikeRegexp('TestEndpointCreationDeploymentRestEndPointLambdaRestApimodelinfo*')
            },
            'PathPart': 'use-case-types',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Ref': Match.stringLikeRegexp('TestEndpointCreationDeploymentRestEndPointLambdaRestApimodelinfo')
            },
            'PathPart': '{useCaseType}',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Ref': Match.stringLikeRegexp(
                    'TestEndpointCreationDeploymentRestEndPointLambdaRestApimodelinfouseCaseType'
                )
            },
            'PathPart': 'providers',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Ref': Match.stringLikeRegexp(
                    'TestEndpointCreationDeploymentRestEndPointLambdaRestApimodelinfouseCaseType'
                )
            },
            'PathPart': '{providerName}',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            'ParentId': {
                'Ref': Match.stringLikeRegexp(
                    'TestEndpointCreationDeploymentRestEndPointLambdaRestApimodelinfouseCaseTypeproviderName'
                )
            },
            'PathPart': '{modelId}',
            'RestApiId': {
                'Ref': restApiCapture
            }
        });
    });

    it('should have methods with correct parameters', () => {
        const restApiCapture = new Capture();
        const authorizerCapture = new Capture();
        const validatorCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Method', 38);

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            AuthorizationType: 'CUSTOM',
            AuthorizerId: { 'Ref': authorizerCapture },
            HttpMethod: 'GET',
            Integration: {
                'IntegrationHttpMethod': 'POST',
                'PassthroughBehavior': 'NEVER',
                'Type': 'AWS_PROXY',
                'Uri': {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            { 'Ref': 'AWS::Partition' },
                            ':apigateway:',
                            { 'Ref': 'AWS::Region' },
                            ':lambda:path/2015-03-31/functions/',
                            { 'Fn::GetAtt': [Match.stringLikeRegexp('MockGetRequestFunction*'), 'Arn'] },
                            '/invocations'
                        ]
                    ]
                }
            },
            OperationName: 'GetUseCases',
            RequestParameters: {
                'method.request.querystring.pageNumber': true,
                'method.request.querystring.searchFilter': false,
                'method.request.header.authorization': true
            },
            RequestValidatorId: {
                'Ref': validatorCapture
            },
            ResourceId: {
                'Ref': Match.stringLikeRegexp('TestEndpointCreationDeploymentRestEndPointLambdaRestApideployments*')
            },
            RestApiId: {
                'Ref': restApiCapture
            }
        });
    });

    it('should have a WebACLAssociation', () => {
        const restApiCapture = new Capture();
        const restApiDeploymentCapture = new Capture();
        template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
            ResourceArn: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':apigateway:',
                        {
                            Ref: 'AWS::Region'
                        },
                        '::/restapis/',
                        {
                            Ref: restApiCapture
                        },
                        '/stages/',
                        {
                            Ref: restApiDeploymentCapture
                        }
                    ]
                ]
            },
            WebACLArn: {
                'Fn::GetAtt': [Match.anyValue(), 'Arn']
            }
        });
    });

    it('should have error responses for bad request and bad body', () => {
        const restApiCapture = new Capture();
        template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
            ResponseParameters: {
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            ResponseTemplates: {
                'application/json':
                    '{"error":{"message":"$context.error.messageString","errors":"$context.error.validationErrorString"}}'
            },
            ResponseType: 'BAD_REQUEST_BODY',
            RestApiId: {
                Ref: restApiCapture
            },
            StatusCode: '400'
        });

        template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
            ResponseParameters: {
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            ResponseTemplates: {
                'application/json':
                    '{"error":{"message":"$context.error.messageString","errors":"$context.error.validationErrorString"}}'
            },
            ResponseType: 'BAD_REQUEST_PARAMETERS',
            RestApiId: {
                Ref: restApiCapture.asString()
            },
            StatusCode: '400'
        });

        template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
            ResponseParameters: {
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            ResponseType: 'DEFAULT_4XX',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
            ResponseParameters: {
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            ResponseType: 'DEFAULT_5XX',
            RestApiId: {
                Ref: restApiCapture.asString()
            },
            StatusCode: '400'
        });
    });

    it('should create API Gateway resources with correct configuration for model-info', () => {
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: 'model-info'
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: '{useCaseId}'
        });
    });
});

describe('When creating rest endpoints with MCP lambda', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const testAuthorizer = new api.RequestAuthorizer(stack, 'CustomRequestAuthorizers', {
            handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        new DeploymentPlatformRestEndpoint(stack, 'TestEndpointCreation', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'MockGetRequestFunction', mockLambdaFuncProps),
            modelInfoApiLambda: new lambda.Function(stack, 'MockModelInfoFunction', mockLambdaFuncProps),
            mcpManagementAPILambda: new lambda.Function(stack, 'MockMCPFunction', mockLambdaFuncProps),
            agentManagementAPILambda: new lambda.Function(stack, 'MockAgentFunction2', mockLambdaFuncProps),
            workflowManagementAPILambda: new lambda.Function(stack, 'MockWorkflowFunction2', mockLambdaFuncProps),
            tenantManagementAPILambda: new lambda.Function(stack, 'MockTenantManagementFunction2', mockLambdaFuncProps),
            deploymentPlatformAuthorizer: testAuthorizer
        });

        template = Template.fromStack(stack);
    });

    it('should create MCP API resources when MCP lambda is provided', () => {
        const restApiCapture = new Capture();

        // Should have additional resources for MCP endpoints
        template.resourceCountIs('AWS::ApiGateway::Resource', 15); // 8 base + 3 MCP + 2 agents + 2 workflows

        // Check MCP collection resource
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                Ref: Match.stringLikeRegexp('TestEndpointCreationDeploymentRestEndPointLambdaRestApideployments*')
            },
            PathPart: 'mcp',
            RestApiId: {
                Ref: restApiCapture
            }
        });

        // Check MCP item resource
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                Ref: Match.stringLikeRegexp('.*mcp.*')
            },
            PathPart: '{useCaseId}',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });

        // Check MCP custom endpoints
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                Ref: Match.stringLikeRegexp('.*mcp.*')
            },
            PathPart: 'upload-schemas',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });
    });

    it('should create MCP CRUD methods with correct operation names', () => {
        // Check MCP collection methods
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            OperationName: 'GetMCPs'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            OperationName: 'DeployMCP'
        });

        // Check MCP item methods
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            OperationName: 'GetMCP'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'PATCH',
            OperationName: 'UpdateMCP'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'DELETE',
            OperationName: 'DeleteMCP'
        });

        // Check MCP custom endpoints
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            OperationName: 'UploadMCPSchemas'
        });
    });

    it('should create MCP upload schemas endpoint with request and response models', () => {
        // Verify request model exists
        template.hasResourceProperties('AWS::ApiGateway::Model', {
            RestApiId: {
                Ref: Match.anyValue()
            },
            Name: 'UploadMCPSchemasApiRequestModel',
            Description: 'Defines the required JSON structure for uploading MCP schemas'
        });

        // Verify response model exists
        template.hasResourceProperties('AWS::ApiGateway::Model', {
            RestApiId: {
                Ref: Match.anyValue()
            },
            Name: 'UploadMCPSchemasResponseModel',
            Description: 'Defines the response structure for MCP schema upload requests'
        });

        // Verify method uses the request model
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            OperationName: 'UploadMCPSchemas',
            RequestModels: {
                'application/json': {
                    Ref: Match.stringLikeRegexp('.*UploadMCPSchemasApiRequestModel.*')
                }
            }
        });

        // Verify method uses the response model
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            OperationName: 'UploadMCPSchemas',
            MethodResponses: [
                {
                    ResponseModels: {
                        'application/json': {
                            Ref: Match.stringLikeRegexp('.*UploadMCPSchemasResponseModel.*')
                        }
                    },
                    StatusCode: '200'
                }
            ]
        });
    });
});

describe('When creating rest endpoints with Agent lambda', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const testAuthorizer = new api.RequestAuthorizer(stack, 'CustomRequestAuthorizers', {
            handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        new DeploymentPlatformRestEndpoint(stack, 'TestEndpointCreation', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'MockGetRequestFunction', mockLambdaFuncProps),
            modelInfoApiLambda: new lambda.Function(stack, 'MockModelInfoFunction', mockLambdaFuncProps),
            agentManagementAPILambda: new lambda.Function(stack, 'MockAgentFunction', mockLambdaFuncProps),
            mcpManagementAPILambda: new lambda.Function(stack, 'MockMCPFunction', mockLambdaFuncProps),
            workflowManagementAPILambda: new lambda.Function(stack, 'MockWorkflowFunction3', mockLambdaFuncProps),
            tenantManagementAPILambda: new lambda.Function(stack, 'MockTenantManagementFunction3', mockLambdaFuncProps),
            deploymentPlatformAuthorizer: testAuthorizer
        });

        template = Template.fromStack(stack);
    });

    it('should create Agent API resources when Agent lambda is provided', () => {
        // Should have additional resources for Agent endpoints
        // Base has 8 resources, agents add 2 more (agents, {agent-id}), MCP adds 3, workflows adds 2
        template.resourceCountIs('AWS::ApiGateway::Resource', 15);

        // Check Agent collection resource exists
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: 'agents'
        });

        // Check Agent item resource exists
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: '{useCaseId}'
        });
    });

    it('should create Agent CRUD methods with correct operation names', () => {
        // Check Agent collection methods
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            OperationName: 'GetAgents'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            OperationName: 'DeployAgent'
        });

        // Check Agent item methods
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            OperationName: 'GetAgent'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'PATCH',
            OperationName: 'UpdateAgent'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'DELETE',
            OperationName: 'DeleteAgent'
        });
    });
});

describe('When creating rest endpoints with Workflow lambda', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const testAuthorizer = new api.RequestAuthorizer(stack, 'CustomRequestAuthorizers', {
            handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        new DeploymentPlatformRestEndpoint(stack, 'TestEndpointCreation', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'MockGetRequestFunction', mockLambdaFuncProps),
            modelInfoApiLambda: new lambda.Function(stack, 'MockModelInfoFunction', mockLambdaFuncProps),
            mcpManagementAPILambda: new lambda.Function(stack, 'MockMCPFunction', mockLambdaFuncProps),
            agentManagementAPILambda: new lambda.Function(stack, 'MockAgentFunction', mockLambdaFuncProps),
            workflowManagementAPILambda: new lambda.Function(stack, 'MockWorkflowFunction', mockLambdaFuncProps),
            tenantManagementAPILambda: new lambda.Function(stack, 'MockTenantManagementFunction4', mockLambdaFuncProps),
            deploymentPlatformAuthorizer: testAuthorizer
        });

        template = Template.fromStack(stack);
    });

    it('should create Workflow API resources when Workflow lambda is provided', () => {
        const restApiCapture = new Capture();

        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: {
                'Fn::Join': [
                    '',
                    [
                        {
                            Ref: 'AWS::StackName'
                        },
                        '-UseCaseManagementAPI'
                    ]
                ]
            }
        });

        // Check workflows collection resource
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: 'workflows',
            RestApiId: {
                Ref: restApiCapture
            }
        });

        // Check workflow item resource
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: '{useCaseId}',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });

        // Check that CRUD methods are created for workflows
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            ResourceId: {
                Ref: Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'GET',
            ResourceId: {
                Ref: Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'PATCH',
            ResourceId: {
                Ref: Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'DELETE',
            ResourceId: {
                Ref: Match.anyValue()
            }
        });
    });
});
