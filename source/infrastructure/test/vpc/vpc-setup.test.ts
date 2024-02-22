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
import { VPCSetup } from '../../lib/vpc/vpc-setup';

describe('When knew VPC is to be created', () => {
    let template: Template;
    let vpcSetup: VPCSetup;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app);
        const applicationSetup = new ApplicationSetup(stack, 'TestApplicationSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        vpcSetup = new VPCSetup(stack, 'TestVPCSetup', {
            stackType: 'bedrock-use-case',
            deployVpcCondition: new cdk.CfnCondition(stack, 'DeployVpcCondition', {
                expression: cdk.Fn.conditionEquals(
                    {
                        'Ref': 'ExistingVpcId'
                    },
                    ''
                )
            }),
            iPamPoolId: new cdk.CfnParameter(stack, 'IPAMPoolId', {
                type: 'String',
                description:
                    'If you would like to assign the CIDR range using AWS VPC IP Address Manager, please provide the IPAM ID to use',
                default: '',
                allowedPattern: '^$|^ipam-[0-9a-zA-Z]+$',
                constraintDescription:
                    'The provided IPAM Pool Id is not a valid format. IPAM Id should be be of the following format "^ipam-[0-9a-zA-Z]+$"'
            }).valueAsString,
            customResourceLambdaArn: applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: applicationSetup.customResourceLambda.role!.roleArn
        });

        template = Template.fromStack(stack);
    });

    it('should have a nested stack', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('should have a nested stack with 2 parameters', () => {
        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            TemplateURL: Match.anyValue()
        });
    });

    it('should create VPC nested template', () => {
        template.hasResource('AWS::CloudFormation::Stack', {
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: 'DeployVpcCondition',
            Properties: {
                TemplateURL: {
                    'Fn::Join': [
                        '',
                        [
                            'https://s3.',
                            {
                                Ref: 'AWS::Region'
                            },
                            '.',
                            {
                                Ref: 'AWS::URLSuffix'
                            },
                            '/',
                            {
                                'Fn::Sub': 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}'
                            },
                            Match.stringLikeRegexp('^[\\S+]*.json$')
                        ]
                    ]
                }
            }
        });
    });

    it('has conditions for the CFN parameters', () => {
        template.hasCondition('DeployVpcCondition', {
            'Fn::Equals': [
                {
                    Ref: 'ExistingVpcId'
                },
                ''
            ]
        });
    });
});

describe('When using an existing VPC', () => {
    let template: Template;
    let vpcSetup: VPCSetup;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app);
        const applicationSetup = new ApplicationSetup(stack, 'TestApplicationSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        vpcSetup = new VPCSetup(stack, 'TestVPCSetup', {
            stackType: 'external-use-case',
            deployVpcCondition: new cdk.CfnCondition(stack, 'DeployVpcCondition', {
                expression: cdk.Fn.conditionEquals(
                    {
                        'Ref': 'ExistingVpcId'
                    },
                    ''
                )
            }),
            iPamPoolId: 'ipam-fakeid',
            customResourceLambdaArn: applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: applicationSetup.customResourceLambda.role!.roleArn
        });

        template = Template.fromStack(stack);
    });

    it('should have a nested stack', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('should have a nested stack with 2 parameters', () => {
        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            TemplateURL: Match.anyValue()
        });
    });

    it('should create VPC nested template', () => {
        template.hasResource('AWS::CloudFormation::Stack', {
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: 'DeployVpcCondition',
            Properties: {
                TemplateURL: {
                    'Fn::Join': [
                        '',
                        [
                            'https://s3.',
                            {
                                Ref: 'AWS::Region'
                            },
                            '.',
                            {
                                Ref: 'AWS::URLSuffix'
                            },
                            '/',
                            {
                                'Fn::Sub': 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}'
                            },
                            Match.stringLikeRegexp('^[\\S+]*.json$')
                        ]
                    ]
                }
            }
        });
    });

    it('has conditions for the CFN parameters', () => {
        template.hasCondition('DeployVpcCondition', {
            'Fn::Equals': [
                {
                    Ref: 'ExistingVpcId'
                },
                ''
            ]
        });
    });
});
