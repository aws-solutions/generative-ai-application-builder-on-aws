// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template, Capture } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    API_GATEWAY_THROTTLING_RATE_LIMIT,
    API_GATEWAY_THROTTLING_BURST_LIMIT,
    USER_POOL_ID_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    DynamoDBAttributes
} from '../../lib/utils/constants';
import { UseCaseRestEndpoint } from '../../lib/api/use-case-rest-endpoint';

describe('NewUseCaseRestEndpointDeployment', () => {
    let stack: cdk.Stack;
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    beforeAll(() => {
        stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const mockUseCaseDetailsLambda = new lambda.Function(stack, 'MockUseCaseDetailsLambda', mockLambdaFuncProps);
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const cognitoPolicyTable = new dynamodb.Table(stack, 'CognitoGroupPolicyStore', {
            partitionKey: {
                name: DynamoDBAttributes.COGNITO_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            }
        });

        new UseCaseRestEndpoint(stack, 'TestUseCaseEndpoint', {
            useCaseDetailsLambda: mockUseCaseDetailsLambda,
            userPoolId: 'test-userpool-id',
            userPoolClientId: 'test-userpool-client-id',
            userPoolGroupName: 'test-userpool-group-name',
            cognitoGroupPolicyTable: cognitoPolicyTable,
            customResourceLambda: crLambda,
            deployVPCCondition: new cdk.CfnCondition(stack, 'MockVPCCondition', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            }),
            privateSubnetIds: 'pid1, pid2',
            securityGroupIds: 'sid1, sid2'
        });
        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('should have REST APIGateway setup with restAPI, deployment and stage', () => {
        const restApiCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
        template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
        template.resourceCountIs('AWS::ApiGateway::Stage', 1);

        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Description: 'API endpoint to access use case related resources',
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
                        '-UseCasesAPI'
                    ]
                ]
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Deployment', {
            RestApiId: {
                Ref: restApiCapture
            }
        });

        const restApiDeploymentCapture = new Capture();

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
    });

    it('should have a rest authorizer lambda function', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'rest-authorizer.handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.toString(),
            Description: 'Authorizes REST API requests based on Cognito user pool groups',
            Timeout: 900,
            Environment: {
                'Variables': {
                    [USER_POOL_ID_ENV_VAR]: 'test-userpool-id',
                    [CLIENT_ID_ENV_VAR]: 'test-userpool-client-id',
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Ref': 'CognitoGroupPolicyStoreC4543773'
                    }
                }
            },
            VpcConfig: {
                'Fn::If': [
                    'MockVPCCondition',
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

    it('should have a mock method', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            AuthorizationType: 'CUSTOM',
            AuthorizerId: {
                Ref: Match.stringLikeRegexp('TestUseCaseEndpointUseCaseEndpointAuthorizer')
            },
            HttpMethod: 'GET',
            Integration: {
                IntegrationResponses: [
                    {
                        ResponseParameters: {
                            'method.response.header.Content-Type': "'application/json'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        StatusCode: '400'
                    }
                ],
                PassthroughBehavior: 'NEVER',
                Type: 'MOCK'
            },
            MethodResponses: [
                {
                    'ResponseParameters': {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Access-Control-Allow-Origin': true
                    },
                    'StatusCode': '400'
                }
            ],
            OperationName: 'UseCaseMockMethod',
            RequestParameters: {
                'method.request.header.authorization': true
            },
            ResourceId: {
                'Fn::GetAtt': [
                    Match.stringLikeRegexp('TestUseCaseEndpointDeploymentRestEndPointLambdaRestApi'),
                    'RootResourceId'
                ]
            },
            RestApiId: {
                'Ref': Match.stringLikeRegexp('TestUseCaseEndpointDeploymentRestEndPointLambdaRest')
            }
        });
    });

    it('should provide permissions for rest authorizer', () => {
        template.resourceCountIs('AWS::Lambda::Permission', 2);
        template.hasResourceProperties('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            FunctionName: {
                'Fn::GetAtt': [Match.stringLikeRegexp('TestUseCaseEndpointUseCaseEndpointAuthorizerLambda'), 'Arn']
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
                            'Ref': Match.stringLikeRegexp('TestUseCaseEndpointDeploymentRestEndPointLambdaRestApi')
                        },
                        '/authorizers/',
                        {
                            'Ref': Match.stringLikeRegexp('TestUseCaseEndpointUseCaseEndpointAuthorizer')
                        }
                    ]
                ]
            }
        });
    });

    it('should have a request validator', () => {
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
    });

    it('should have a WebACL', () => {
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
    });

    it('should have a WebACLAssociation', () => {
        template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1);
        template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
            ResourceArn: {
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
                        '::/restapis/',
                        {
                            'Ref': Match.stringLikeRegexp('TestUseCaseEndpointDeploymentRestEndPointLambdaRestApi')
                        },
                        '/stages/',
                        {
                            'Ref': Match.stringLikeRegexp(
                                'TestUseCaseEndpointDeploymentRestEndPointLambdaRestApiDeploymentStageprod'
                            )
                        }
                    ]
                ]
            },
            WebACLArn: {
                'Fn::GetAtt': [
                    Match.stringLikeRegexp('TestUseCaseEndpointUseCaseEndpointWafUseCaseEndpointWafWebACL'),
                    'Arn'
                ]
            }
        });
    });
});
