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
 **********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { ApplicationSetup } from '../../lib/framework/application-setup';
import { UIInfrastructureBuilder } from '../../lib/ui/ui-infrastructure-builder';
import { UIAssetFolders } from '../../lib/utils/constants';

describe('UIInfrastructureBuilder constructor', () => {
    it('sets properties from props for chat ui', () => {
        const props = {
            uiAssetFolder: UIAssetFolders.CHAT,
            deployWebApp: 'Yes'
        };

        const builder = new UIInfrastructureBuilder(props);

        expect(builder.uiAssetFolder).toEqual('ui-chat');
        expect(builder.deployWebApp).toEqual('Yes');
    });

    it('sets properties from props for deployment ui', () => {
        const props = {
            uiAssetFolder: UIAssetFolders.DEPLOYMENT_PLATFORM,
            deployWebApp: 'Yes'
        };

        const builder = new UIInfrastructureBuilder(props);

        expect(builder.uiAssetFolder).toEqual('ui-deployment');
        expect(builder.deployWebApp).toEqual('Yes');
    });
});

describe('UIInfrastructureBuilder build', () => {
    let template: Template;
    let stack: cdk.Stack;
    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        stack = new cdk.Stack(app);
        const appNamespace = stack.node.tryGetContext('solution_name');
        const applicationSetup = new ApplicationSetup(stack, 'AppSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

        const props = {
            uiAssetFolder: UIAssetFolders.CHAT,
            deployWebApp: 'Yes'
        };

        const builder = new UIInfrastructureBuilder(props);

        const uiDistribution = builder.createDistribution(stack, 'TestUIInfraStack', {
            parameters: {
                CustomResourceLambdaArn: applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: applicationSetup.accessLoggingBucket.bucketArn
            }
        });

        builder.createUIAssetsCustomResource(stack, 'TestUIAssetsStack', {
            parameters: {
                CustomResourceLambdaArn: applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: applicationSetup.customResourceLambda.role!.roleArn,
                WebConfigKey: `/${cdk.Aws.STACK_NAME}/${appNamespace}/webconfig`,
                WebS3BucketArn: uiDistribution.websiteBucket.bucketArn
            }
        } as any);

        template = Template.fromStack(stack);
    });

    it('should have two nested stacks', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 2);
    });

    it('should have two nested stacks with the correct parameters passed from one to another', () => {
        const capture = new Capture();

        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            TemplateURL: Match.anyValue(),
            Parameters: {
                CustomResourceLambdaArn: {
                    'Fn::GetAtt': [capture, 'Arn']
                },
                CustomResourceRoleArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupCustomResourceLambdaRole*'), 'Arn']
                },
                AccessLoggingBucketArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupAccessLog*'), 'Arn']
                }
            }
        });

        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            TemplateURL: Match.anyValue(),
            Parameters: {
                WebConfigKey: {
                    'Fn::Join': [
                        '',
                        [
                            '/',
                            {
                                Ref: 'AWS::StackName'
                            },
                            '/generative-ai-application-builder-on-aws/webconfig'
                        ]
                    ]
                },
                CustomResourceLambdaArn: {
                    'Fn::GetAtt': [capture.asString(), 'Arn']
                },
                CustomResourceRoleArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupCustomResourceLambdaRole*'), 'Arn']
                },
                WebS3BucketArn: {
                    'Fn::GetAtt': [Match.anyValue(), Match.stringLikeRegexp('Outputs.*')]
                }
            }
        });
    });

    it('should have condition attached to nested stack for deployment', () => {
        template.hasResource('AWS::CloudFormation::Stack', {
            Type: 'AWS::CloudFormation::Stack',
            Properties: Match.anyValue(),
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: 'DeployWebAppUIInfrastructureCondition'
        });
    });
});
