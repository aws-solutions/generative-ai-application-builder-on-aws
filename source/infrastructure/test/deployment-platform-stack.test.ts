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
import * as rawCdkJson from '../cdk.json';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { DeploymentPlatformStack } from '../lib/deployment-platform-stack';
import { INTERNAL_EMAIL_DOMAIN } from '../lib/utils/constants';

describe('When deployment platform stack is created', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, jsonTemplate, stack] = buildStack();
    });

    afterAll(() => {
        delete process.env.VERSION;
    });

    it('base stack should have outputs', () => {
        template.hasOutput('CloudFrontWebUrl', {
            'Value': {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp('^WebAppNestedStackWebAppNestedStackResource(\\S+)$'),
                                Match.stringLikeRegexp(
                                    '^Outputs.DeploymentPlatformStackWebAppWebsiteUICloudFrontDistribution(\\S+)DomainName$'
                                )
                            ]
                        }
                    ]
                ]
            },
            'Condition': 'DeployWebAppUIInfrastructureCondition'
        });
        template.hasOutput('CognitoClientId', {
            'Value': {
                'Fn::If': [
                    'DeploymentDashboardCognitoResourcesGenerated',
                    {
                        'Fn::GetAtt': [
                            Match.stringLikeRegexp(
                                'UseCaseManagementSetupUseCaseManagementNestedStackUseCaseManagementNestedStackResource'
                            ),
                            'Outputs.GeneratedUserPoolClientId'
                        ]
                    },
                    {
                        'Ref': 'ExistingCognitoUserPoolClient'
                    }
                ]
            }
        });
        template.hasOutput('RestEndpointUrl', {
            'Value': {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            'Fn::GetAtt': [
                                'UseCaseManagementSetupUseCaseManagementNestedStackUseCaseManagementNestedStackResource7ED7E421',
                                'Outputs.DeploymentPlatformStackUseCaseManagementSetupUseCaseManagementRequestProcessorRestEndpointEndPointLambdaRestApiDB0E95B9Ref'
                            ]
                        },
                        '.execute-api.',
                        {
                            'Ref': 'AWS::Region'
                        },
                        '.',
                        {
                            'Ref': 'AWS::URLSuffix'
                        },
                        '/',
                        {
                            'Fn::GetAtt': [
                                'UseCaseManagementSetupUseCaseManagementNestedStackUseCaseManagementNestedStackResource7ED7E421',
                                'Outputs.DeploymentPlatformStackUseCaseManagementSetupUseCaseManagementRequestProcessorRestEndpointEndPointLambdaRestApiDeploymentStageprodFA7420DFRef'
                            ]
                        },
                        '/'
                    ]
                ]
            }
        });

        template.hasOutput('LLMConfigTableName', {
            'Value': {
                'Fn::GetAtt': [
                    Match.stringLikeRegexp(
                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource'
                    ),
                    Match.stringLikeRegexp(
                        'Outputs.DeploymentPlatformStackDeploymentPlatformStorageLLMConfigTable9EB214F1Ref'
                    )
                ]
            }
        });

        template.hasOutput('UseCasesTableName', {
            'Value': {
                'Fn::GetAtt': [
                    Match.stringLikeRegexp(
                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource'
                    ),
                    'Outputs.DeploymentPlatformStackDeploymentPlatformStorageUseCasesTable8AE1DCF5Ref'
                ]
            }
        });
    });

    describe('when nested stacks are created', () => {
        it('should create nested stack for ddb storage, and UI', () => {
            template.resourceCountIs('AWS::CloudFormation::Stack', 5);

            template.hasResource('AWS::CloudFormation::Stack', {
                Type: 'AWS::CloudFormation::Stack',
                Properties: {
                    Parameters: {
                        DefaultUserEmail: {
                            'Ref': 'AdminUserEmail'
                        },
                        ApplicationTrademarkName: 'Generative AI Application Builder on AWS',
                        WebConfigSSMKey: {
                            'Fn::Join': [
                                '',
                                [
                                    '/gaab-webconfig/',
                                    {
                                        'Ref': 'AWS::StackName'
                                    }
                                ]
                            ]
                        },
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        'referencetoDeploymentPlatformStackDeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource0080A447OutputsDeploymentPlatformStackDeploymentPlatformStorageUseCasesTable8AE1DCF5Ref':
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp(
                                        'Outputs.DeploymentPlatformStackDeploymentPlatformStorageUseCasesTable*'
                                    )
                                ]
                            },
                        'referencetoDeploymentPlatformStackDeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource0080A447OutputsDeploymentPlatformStackDeploymentPlatformStorageModelInfoStorageModelInfoStore6E739C0DRef':
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp(
                                        'Outputs.DeploymentPlatformStackDeploymentPlatformStorageModelInfoStorageModelInfoStore*'
                                    )
                                ]
                            },
                        'referencetoDeploymentPlatformStackDeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource0080A447OutputsDeploymentPlatformStackDeploymentPlatformStorageModelInfoStorageModelInfoStore6E739C0DArn':
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp(
                                        'Outputs.DeploymentPlatformStackDeploymentPlatformStorageModelInfoStorageModelInfoStore*'
                                    )
                                ]
                            }
                    },
                    TemplateURL: {
                        'Fn::Join': [
                            '',
                            [
                                'https://s3.',
                                {
                                    'Ref': 'AWS::Region'
                                },
                                '.',
                                {
                                    'Ref': 'AWS::URLSuffix'
                                },
                                '/',
                                {
                                    'Fn::Sub': Match.anyValue()
                                },
                                Match.anyValue()
                            ]
                        ]
                    }
                },
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete'
            });
        });

        it('should have a description in the nested stacks', () => {
            const deploymentPlatformStack = stack as DeploymentPlatformStack;

            expect(Template.fromStack(deploymentPlatformStack.uiDistribution).toJSON()['Description']).toEqual(
                `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${process.env.VERSION}`
            );
            expect(Template.fromStack(deploymentPlatformStack.copyAssetsStack).toJSON()['Description']).toEqual(
                `Custom resource that copies UI assets to S3 bucket - Version ${process.env.VERSION}`
            );

            expect(
                Template.fromStack(deploymentPlatformStack.useCaseManagementSetup.useCaseManagement).toJSON()[
                    'Description'
                ]
            ).toEqual(
                `Nested Stack that creates the resources for use case management (API Gateway, lambda, cognito, etc.) - Version ${process.env.VERSION}`
            );

            expect(
                Template.fromStack(
                    deploymentPlatformStack.deploymentPlatformStorageSetup.deploymentPlatformStorage
                ).toJSON()['Description']
            ).toEqual(
                `Nested Stack that creates the DynamoDB table to manage use cases - Version ${process.env.VERSION}`
            );
        });

        it('should have condition for nested template for copying UI assets', () => {
            template.hasResource('AWS::CloudFormation::Stack', {
                Type: 'AWS::CloudFormation::Stack',
                Properties: {
                    Parameters: {
                        WebConfigKey: Match.anyValue(),
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        WebS3BucketArn: {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp('^WebAppNestedStackWebAppNestedStackResource(\\S+)$'),
                                Match.stringLikeRegexp('^Outputs.DeploymentPlatformStackWebAppWebsiteBucket(\\S+)Arn')
                            ]
                        }
                    },
                    TemplateURL: Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebAppUIInfrastructureCondition'
            });
        });

        it('should have condition for nested templates for cloudfront distribution', () => {
            template.hasResource('AWS::CloudFormation::Stack', {
                Type: 'AWS::CloudFormation::Stack',
                Properties: {
                    Parameters: {
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp('^DeploymentPlatformSetupInfraSetupCustomResource(\\S+)'),
                                'Arn'
                            ]
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp('DeploymentPlatformSetupCustomResourceLambdaRole(\\S+)'),
                                'Arn'
                            ]
                        },
                        AccessLoggingBucketArn: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('^DeploymentPlatformSetupAccessLog(\\S+)'), 'Arn']
                        },
                        UseCaseUUID: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('^DeploymentPlatformSetupGenUUID(\\S+)'), 'UUID']
                        }
                    },
                    TemplateURL: Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebAppUIInfrastructureCondition'
            });
        });

        it('should have a condition for UI deployment', () => {
            template.hasCondition('DeployWebAppUIInfrastructureCondition', {
                'Fn::Equals': [
                    {
                        Ref: 'DeployUI'
                    },
                    'Yes'
                ]
            });
        });

        it('should have a condition for cloudwatch dashboard', () => {
            template.hasCondition('DeployCustomDashboard', {
                'Fn::Equals': [
                    {
                        'Fn::FindInMap': ['FeaturesToDeploy', 'Deploy', 'CustomDashboard']
                    },
                    'Yes'
                ]
            });
        });

        it('should have a condition specifying if cognito resources are created', () => {
            template.hasCondition('DeploymentDashboardCognitoResourcesGenerated', {
                'Fn::Equals': [{ 'Ref': 'ExistingCognitoUserPoolId' }, '']
            });
        });

        it('should have a condition for marking dashboard as internal', () => {
            template.hasCondition('IsInternalUserCondition', {
                'Fn::Equals': [
                    {
                        'Fn::Select': [
                            0,
                            {
                                'Fn::Split': [
                                    '.',
                                    {
                                        'Fn::Select': [
                                            1,
                                            {
                                                'Fn::Split': [
                                                    '@',
                                                    {
                                                        'Ref': 'AdminUserEmail'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    INTERNAL_EMAIL_DOMAIN
                ]
            });
        });

        it('should have a custom resource that generates UUID', () => {
            template.resourceCountIs('Custom::GenUUID', 1);
            template.hasResource('Custom::GenUUID', {
                Type: 'Custom::GenUUID',
                Properties: {
                    ServiceToken: {
                        'Fn::GetAtt': [Match.anyValue(), 'Arn']
                    },
                    'Resource': 'GEN_UUID'
                }
            });
        });
    });
});

describe('With all environment variables and context.json available', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    beforeAll(() => {
        process.env.DIST_OUTPUT_BUCKET = 'fake-artifact-bucket';
        process.env.SOLUTION_ID = 'SO0999';
        process.env.SOLUTION_NAME = 'fake-solution-name';
        process.env.VERSION = 'v9.9.9';

        [template, jsonTemplate] = buildStack();
    });

    afterAll(() => {
        delete process.env.DIST_OUTPUT_BUCKET;
        delete process.env.SOLUTION_ID;
        delete process.env.SOLUTION_NAME;
        delete process.env.VERSION;
        delete process.env.APP_NAMESPACE;
    });

    describe('When synthesizing through standard pipeline, it should generate necessary mapping', () => {
        it('has mapping for "Data"', () => {
            expect(jsonTemplate['Mappings']['Solution']['Data']['SendAnonymousUsageData']).toEqual('Yes');
            expect(jsonTemplate['Mappings']['Solution']['Data']['ID']).toEqual(process.env.SOLUTION_ID);
            expect(jsonTemplate['Mappings']['Solution']['Data']['Version']).toEqual(process.env.VERSION);
            expect(jsonTemplate['Mappings']['Solution']['Data']['SolutionName']).toEqual(process.env.SOLUTION_NAME);
        });

        it('has mapping for features to be deployed', () => {
            expect(jsonTemplate['Mappings']['FeaturesToDeploy']['Deploy']['CustomDashboard']).toEqual('Yes');
        });
    });
});

function buildStack(): [Template, { [key: string]: any }, cdk.Stack] {
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
    const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');
    process.env.VERSION = version;

    const stack = new DeploymentPlatformStack(app, 'DeploymentPlatformStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);
    jsonTemplate = template.toJSON();

    return [template, jsonTemplate, stack];
}
