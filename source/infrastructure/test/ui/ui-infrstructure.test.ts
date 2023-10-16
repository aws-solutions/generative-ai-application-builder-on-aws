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
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { ApplicationSetup } from '../../lib/framework/application-setup';
import { UIInfrastructure } from '../../lib/ui/ui-infrastructure';

describe('When this construct is instantiated', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app);
        const appNamespace = stack.node.tryGetContext('solution_name');
        const applicationSetup = new ApplicationSetup(stack, 'AppSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

        new UIInfrastructure(stack, 'TestUIInfra', {
            webRuntimeConfigKey: `/${cdk.Aws.STACK_NAME}/${appNamespace}/webconfig`,
            customInfra: applicationSetup.customResourceLambda,
            accessLoggingBucket: applicationSetup.accessLoggingBucket,
            uiAssetFolder: 'ui-chat',
            deployWebApp: 'Yes'
        });

        template = Template.fromStack(stack);
    });

    it('should have a nested stack', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('should have a nested stack with 4 parameters', () => {
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
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupInfraSetupCustomResource*'), 'Arn']
                },
                CustomResourceRoleArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupCustomResourceLambdaRole*'), 'Arn']
                },
                AccessLoggingBucketArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('AppSetupAccessLog*'), 'Arn']
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
            Condition: 'DeployWebApp'
        });
    });
});
