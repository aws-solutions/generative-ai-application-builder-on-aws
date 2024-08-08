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
import * as cognito from 'aws-cdk-lib/aws-cognito';
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
        const testUserPool = new cognito.UserPool(stack, 'UserPool', {
            userPoolName: `TestPool`
        });

        const testAuthorizer = new api.RequestAuthorizer(stack, 'CustomRequestAuthorizers', {
            handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        new DeploymentPlatformRestEndpoint(stack, 'TestEndpointCreation', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'MockGetRequestFunction', mockLambdaFuncProps),
            modelInfoApiLambda: new lambda.Function(stack, 'MockModelInfoFunction', mockLambdaFuncProps),
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

        template.resourceCountIs('AWS::Lambda::Permission', 17);
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
                    'OverrideAction': {
                        'None': {}
                    },
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
                    'OverrideAction': {
                        'None': {}
                    },
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
                    'OverrideAction': {
                        'None': {}
                    },
                    'Priority': 2,
                    'Statement': {
                        'ManagedRuleGroupStatement': {
                            'Name': 'AWSManagedRulesCommonRuleSet',
                            'VendorName': 'AWS'
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'AWSManagedRulesCommonRuleSet',
                        'SampledRequestsEnabled': true
                    }
                },
                {
                    'Name': 'AWS-AWSManagedRulesAnonymousIpList',
                    'OverrideAction': {
                        'None': {}
                    },
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
                    'OverrideAction': {
                        'None': {}
                    },
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
                    'OverrideAction': {
                        'None': {}
                    },
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
                    'OverrideAction': {
                        'None': {}
                    },
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
                                'SingleHeader': {
                                    'Name': 'x-amzn-requestid'
                                }
                            },
                            'Size': 0,
                            'TextTransformations': [
                                {
                                    'Priority': 0,
                                    'Type': 'NONE'
                                }
                            ]
                        }
                    },
                    'VisibilityConfig': {
                        'CloudWatchMetricsEnabled': true,
                        'MetricName': 'Custom-BlockRequestHeaders',
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

    it('should create path based resources', () => {
        const restApiCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Resource', 8);

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
                Ref: Match.stringLikeRegexp('TestEndpointCreationEndPointLambdaRestApideployments*')
            },
            PathPart: '{useCaseId}',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            ParentId: {
                'Fn::GetAtt': [restApiCapture.asString(), 'RootResourceId']
            },
            PathPart: 'model-info',
            RestApiId: {
                Ref: restApiCapture.asString()
            }
        });
    });

    it('should have methods with correct parameters', () => {
        const restApiCapture = new Capture();
        const authorizerCapture = new Capture();
        const validatorCapture = new Capture();

        template.resourceCountIs('AWS::ApiGateway::Method', 14);

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
                'Ref': Match.stringLikeRegexp('TestEndpointCreationEndPointLambdaRestApideployments*')
            },
            RestApiId: {
                'Ref': restApiCapture
            }
        });
    });

    it('stack should publish a REST endpoint output', () => {
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

        template.hasOutput('TestEndpointCreationEndPointLambdaRestApiEndpointE2A92C44', {
            Value: {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            Ref: restApiCapture.asString()
                        },
                        '.execute-api.',
                        {
                            Ref: 'AWS::Region'
                        },
                        '.',
                        {
                            Ref: 'AWS::URLSuffix'
                        },
                        '/',
                        {
                            Ref: restApiDeploymentCapture.asString()
                        },
                        '/'
                    ]
                ]
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
});
