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

    describe('when nested stacks are created', () => {
        it('should create nested stack for ddb storage, and UI', () => {
            template.resourceCountIs('AWS::CloudFormation::Stack', 4);

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
                        referencetoDeploymentPlatformStackDeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource0080A447OutputsDeploymentPlatformStackDeploymentPlatformStorageUseCasesTable8AE1DCF5Arn:
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
                        referencetoDeploymentPlatformStackDeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource0080A447OutputsDeploymentPlatformStackDeploymentPlatformStorageUseCasesTable8AE1DCF5Ref:
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'DeploymentPlatformStorageDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp(
                                        'Outputs.DeploymentPlatformStackDeploymentPlatformStorageUseCasesTable*'
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

            expect(
                Template.fromStack(deploymentPlatformStack.uiInfrastructure.nestedUIStack).toJSON()['Description']
            ).toEqual(
                'Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution'
            );

            expect(
                Template.fromStack(deploymentPlatformStack.useCaseManagementSetup.useCaseManagement).toJSON()[
                    'Description'
                ]
            ).toEqual(
                'Nested Stack that creates the resources for use case management (API Gateway, lambda, cognito, etc.)'
            );

            expect(
                Template.fromStack(
                    deploymentPlatformStack.deploymentPlatformStorageSetup.deploymentPlatformStorage
                ).toJSON()['Description']
            ).toEqual('Nested Stack that creates the DynamoDB table to manage use cases');
        });

        it('should have condition for nested templates', () => {
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
                        AccessLoggingBucketArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        }
                    },
                    TemplateURL: Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebApp'
            });
        });

        it('should have a condition for UI deployment', () => {
            template.hasCondition('DeployWebApp', {
                'Fn::Equals': [
                    {
                        'Fn::FindInMap': ['FeaturesToDeploy', 'Deploy', 'WebApp']
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
            expect(jsonTemplate['Mappings']['FeaturesToDeploy']['Deploy']['WebApp']).toEqual('Yes');
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
