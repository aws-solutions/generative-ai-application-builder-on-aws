// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApplicationSetup } from '../../lib/framework/application-setup';
import { BaseStack, BaseStackProps } from '../../lib/framework/base-stack';
import { VPCSetup } from '../../lib/vpc/vpc-setup';

class InvalidTestStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }
}

class ValidTestStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    setupVPC() {
        return new VPCSetup(this, 'VPC', {
            stackType: 'deployment-platform',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });
    }

    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        return new ApplicationSetup(this, 'ApplicationSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion
        });
    }
}

describe('When extending BaseStack', () => {
    describe('if vpcSetup method implementation is not provided', () => {
        it('should throw an error', () => {
            const app = new cdk.App();
            try {
                const testStack = new InvalidTestStack(app, 'TestStack', {
                    solutionID: 'SO0000',
                    solutionName: 'test-solution',
                    solutionVersion: 'v9.9.9',
                    applicationTrademarkName: 'test-trademark'
                });
            } catch (error: any) {
                expect(error.message).toContain(
                    'This error occurred either because the class extending the BaseStack did not implement this method or you are trying to create an instance of BaseStack. To resolve the error make sure to extend the BaseStack or have the child class implement the "createApplicationSetup" method'
                );
            }
        });
    });

    describe('When a valid stack is instantiated', () => {
        let template: Template;
        beforeAll(() => {
            const app = new cdk.App();
            const stack = new ValidTestStack(app, 'TestStack', {
                solutionID: 'XXXXXX',
                solutionName: 'test-solution',
                solutionVersion: 'v9.9.9',
                applicationTrademarkName: 'test-trademark'
            });

            template = Template.fromStack(stack);
        });

        describe('if the vpcSetup method is implemented', () => {
            it('should create cloudformation parameters and parameter group for VPC configuration', () => {
                template.hasParameter('VpcEnabled', {
                    Type: 'String',
                    Default: 'No',
                    AllowedValues: ['Yes', 'No'],
                    AllowedPattern: '^Yes|No$',
                    Description: 'Should the stacks resources be deployed within a VPC'
                });

                template.hasParameter('CreateNewVpc', {
                    Type: 'String',
                    Default: 'No',
                    AllowedPattern: '^Yes|No$',
                    AllowedValues: ['Yes', 'No'],
                    Description: 'Select "Yes", if you would like to create a new VPC'
                });

                template.hasParameter('IPAMPoolId', {
                    Type: 'String',
                    Default: '',
                    AllowedPattern: '^$|^ipam-pool-([0-9a-zA-Z])+$',
                    ConstraintDescription:
                        'The provided IPAM Pool Id is not a valid format. IPAM Id should be be of the following format "^ipam-pool-([0-9a-zA-Z])+$"',
                    Description:
                        'If you would like to assign the CIDR range using AWS VPC IP Address Manager, please provide the IPAM pool Id to use'
                });

                expect(
                    template.toJSON()['Metadata']['AWS::CloudFormation::Interface']['ParameterGroups']
                ).toStrictEqual([
                    {
                        Label: {
                            default: 'Optional: If you would like to deploy the solution with a VPC Configuration'
                        },
                        Parameters: ['VpcEnabled', 'CreateNewVpc', 'IPAMPoolId']
                    },
                    {
                        Label: {
                            default: 'Optional: If you would like to deploy the solution with a Web Application'
                        },
                        Parameters: ['DeployUI']
                    },
                    {
                        Label: {
                            default:
                                'Optional: Existing VPC configuration to use, if you would like to deploy the solution in a VPC and with your existing VPC configuration.'
                        },
                        Parameters: ['ExistingVpcId', 'ExistingPrivateSubnetIds', 'ExistingSecurityGroupIds', 'VpcAzs']
                    }
                ]);

                template.hasCondition('VPCEnabledCondition', {
                    'Fn::Equals': [
                        {
                            Ref: 'VpcEnabled'
                        },
                        'Yes'
                    ]
                });

                template.hasCondition('CreateNewVPCCondition', {
                    'Fn::Equals': [
                        {
                            'Ref': 'CreateNewVpc'
                        },
                        'Yes'
                    ]
                });

                template.hasCondition('DeployVPCCondition', {
                    'Fn::And': [
                        {
                            Condition: 'CreateNewVPCCondition'
                        },
                        {
                            Condition: 'VPCEnabledCondition'
                        }
                    ]
                });

                template.hasCondition('IPAMPoolIdProvidedCondition', {
                    'Fn::Not': [
                        {
                            'Fn::Equals': [
                                {
                                    Ref: 'IPAMPoolId'
                                },
                                ''
                            ]
                        }
                    ]
                });
            });

            it('should have exported output values', () => {
                template.hasOutput('VpcId', {
                    Description: 'The ID of the VPC',
                    Value: Match.anyValue()
                });

                template.hasOutput('PrivateSubnetIds', {
                    Description: 'Comma separated list of private subnet ids',
                    Value: Match.anyValue()
                });

                template.hasOutput('SecurityGroupIds', {
                    Description: 'Security group for the lambda functions in the VPC',
                    Value: Match.anyValue()
                });

                template.hasOutput('AvailabilityZones', {
                    Value: Match.anyValue(),
                    Description: 'Comma separated list of AZs in which subnets of the VPCs are created'
                });
            });
        });
        describe('With user pool client configuration', () => {
            it('should have a parameter for user pool id', () => {
                template.hasParameter('CognitoDomainPrefix', {
                    Type: 'String',
                    Description:
                        'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
                    Default: '',
                    AllowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
                    ConstraintDescription:
                        'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
                    MaxLength: 63
                });
            });
        });
    });
});
