#!/usr/bin/env node
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
import { Construct } from 'constructs';
import { ExistingVPCParameters } from '../vpc/exisiting-vpc-params';
import { VPCSetup } from '../vpc/vpc-setup';
import { ApplicationSetup } from './application-setup';

/**
 * Base stack properties that all stacks should supply as part of stack creation
 */
export interface BaseStackProps extends cdk.StackProps {
    /**
     * The ID associated with the solution
     */
    solutionID: string;
    /**
     * The version of the solution being deployed
     */
    solutionVersion: string;
    /**
     * registered trademark name of the solution
     */
    solutionName: string;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;
}

/**
 * Base stack class which all (root/ parent) stacks should extend
 */
export class BaseStack extends cdk.Stack {
    /**
     * Construct managing the optional deployment of a VPC in a nested stack.
     */
    public readonly vpcSetup: VPCSetup;

    /**
     * If set to 'false', the deployed use case stack will not have a VPC
     */
    public readonly vpcEnabled: cdk.CfnParameter;

    /**
     * The parameter to decide if customer will provide an existing VPC or the solution should create a new VPC
     */
    public readonly createNewVpc: cdk.CfnParameter;

    /**
     * AWS VPC IPAM Id to use for the VPC CIDR block
     */
    public readonly iPamPoolId: cdk.CfnParameter;

    /**
     * ID of an existing VPC to be used for the use case. If none is provided, a new VPC will be created.
     */
    public readonly existingVpcId: cdk.CfnParameter;

    /**
     * ID of an existing Private Subnet to be used for the use case.
     */
    public readonly existingPrivateSubnetIds: cdk.CfnParameter;

    /**
     * SecurityGroup ids configured in the VPC
     */
    public readonly existingSecurityGroupIds: cdk.CfnParameter;

    /**
     * AZs for the VPC
     */
    public readonly vpcAzs: cdk.CfnParameter;

    /**
     * condition to deploy VPC for use case stacks
     */
    protected deployVpcCondition: cdk.CfnCondition;

    /**
     * Condition to check if the stack deployment should proceed as VPC enabled
     */
    protected vpcEnabledCondition: cdk.CfnCondition;

    /**
     * condition to use AWS VPC IPAM
     */
    protected iPamPoolIdProvidedCondition: cdk.CfnCondition;

    /**
     * Rule to check for existing VPC if required parameters have been provided as CloudFormation input parameters
     */
    public readonly checkIfExistingVPCParamsAreProvided: cdk.CfnRule;

    /**
     * Rule to check if existing VPC parameters were provided as CloudFormation input parameters when we are either creating a new VPC or not using VPC
     */
    public readonly checkIfExistingVPCParamsAreProvidedWhenNotAllowed: cdk.CfnRule;

    /**
     * Rule to check if existing VPC parameters are empty, if either deployVPC is 'No', or deployVPC is 'Yes' and createNewVpc is 'Yes'
     */
    public readonly checkIfExistingVPCParamsAreEmpty: cdk.CfnRule;

    /**
     * The security group Ids finally assigned post resolving the condition
     */
    public readonly transpiredSecurityGroupIds: string;

    /**
     * The private subnet Ids finally assigned post resolving the condition
     */
    public readonly transpiredPrivateSubnetIds: string;

    /**
     * Base application resource creation through this construct
     */
    public applicationSetup: ApplicationSetup;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        const stack = cdk.Stack.of(this);

        this.vpcEnabled = new cdk.CfnParameter(this, 'VpcEnabled', {
            type: 'String',
            description: 'Should the stacks resources be deployed within a VPC',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'No'
        });

        this.createNewVpc = new cdk.CfnParameter(this, 'CreateNewVpc', {
            type: 'String',
            description: 'Select "Yes", if you would like to create a new VPC',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'No'
        });

        this.iPamPoolId = new cdk.CfnParameter(this, 'IPAMPoolId', {
            type: 'String',
            description:
                'If you would like to assign the CIDR range using AWS VPC IP Address Manager, please provide the IPAM pool Id to use',
            default: '',
            allowedPattern: '^$|^ipam-pool-([0-9a-zA-Z])+$',
            constraintDescription:
                'The provided IPAM Pool Id is not a valid format. IPAM Id should be be of the following format "^ipam-pool-([0-9a-zA-Z])+$"',
            maxLength: 50
        });

        let existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            stack.templateOptions.metadata.hasOwnProperty('AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.push({
            Label: { default: 'Optional: If you would like to deploy the solution with a VPC Configuration' },
            Parameters: [this.vpcEnabled.logicalId, this.createNewVpc.logicalId, this.iPamPoolId.logicalId]
        });

        stack.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: existingParameterGroups
            }
        };

        const captureExistingVPCParamerters = new ExistingVPCParameters(this);
        this.existingVpcId = captureExistingVPCParamerters.existingVpcId;
        this.existingPrivateSubnetIds = captureExistingVPCParamerters.existingPrivateSubnetIds;
        this.existingSecurityGroupIds = captureExistingVPCParamerters.securityGroupIds;
        this.vpcAzs = captureExistingVPCParamerters.vpcAzs;

        this.initializeCfnParameters();

        // enabling or disabling VPC
        this.vpcEnabledCondition = new cdk.CfnCondition(this, 'VPCEnabledCondition', {
            expression: cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'Yes')
        });

        const createNewVPCCondition = new cdk.CfnCondition(this, 'CreateNewVPCCondition', {
            expression: cdk.Fn.conditionEquals(this.createNewVpc.valueAsString, 'Yes')
        });

        // the nested stack for VPC will only be deployed if we are deploying with VPC and the existing VPC ID is blank
        this.deployVpcCondition = new cdk.CfnCondition(this, 'DeployVPCCondition', {
            expression: cdk.Fn.conditionAnd(createNewVPCCondition, this.vpcEnabledCondition)
        });

        this.iPamPoolIdProvidedCondition = new cdk.CfnCondition(this, 'IPAMPoolIdProvidedCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.iPamPoolId.valueAsString, ''))
        });

        this.checkIfExistingVPCParamsAreProvided = new cdk.CfnRule(stack, 'CheckIfVPCParamsProvided', {
            ruleCondition: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'Yes'),
                cdk.Fn.conditionEquals(this.createNewVpc.valueAsString, 'No')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingVpcId.valueAsString, '')),
                    assertDescription: 'To use existing VPC, you must provide a value for parameter ExistingVpcId'
                },
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionContains(this.existingPrivateSubnetIds.valueAsList, '')
                    ),
                    assertDescription: 'To use existing VPC, private subnet Ids should be provided.'
                },
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionContains(this.existingSecurityGroupIds.valueAsList, '')
                    ),
                    assertDescription:
                        'To use existing VPC, SecurityGroups associated with the subnets should be provided.'
                }
            ]
        });

        this.checkIfExistingVPCParamsAreProvidedWhenNotAllowed = new cdk.CfnRule(
            stack,
            'CheckIfExistingVPCParamsAreProvidedWhenNotAllowed',
            {
                ruleCondition: cdk.Fn.conditionOr(
                    cdk.Fn.conditionAnd(
                        cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'Yes'),
                        cdk.Fn.conditionEquals(this.createNewVpc.valueAsString, 'Yes')
                    ),
                    cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'No')
                ),
                assertions: [
                    {
                        assert: cdk.Fn.conditionEquals(this.existingVpcId.valueAsString, ''),
                        assertDescription: 'When creating a new VPC, you can not provide an existing VPC ID'
                    },
                    {
                        assert: cdk.Fn.conditionContains(this.existingPrivateSubnetIds.valueAsList, ''),
                        assertDescription:
                            'If you are not using a VPC or "CreateNewVpc" is set as "Yes", you can not provide existing subnet IDs'
                    },
                    {
                        assert: cdk.Fn.conditionContains(this.vpcAzs.valueAsList, ''),
                        assertDescription:
                            'If you are not using a VPC or "CreateNewVpc" is set as "Yes", you can not provide AZs.'
                    },
                    {
                        assert: cdk.Fn.conditionContains(this.existingSecurityGroupIds.valueAsList, ''),
                        assertDescription:
                            'If you are not using a VPC or "CreateNewVpc" is set as "Yes", you can not provide SecurityGroups'
                    }
                ]
            }
        );

        new cdk.CfnRule(stack, 'CheckIfDeloyVpcNotSetIfVpcEnabledIsFalse', {
            ruleCondition: cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'No'),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.createNewVpc.valueAsString, 'No'),
                    assertDescription:
                        'Deployment is not VPC enabled, first select "VpcEnabled" to "Yes", and then select "CreateNewVpc" to "Yes" to create a new VPC'
                }
            ]
        });

        new cdk.CfnRule(stack, 'CheckIfIPAMPoolIdCanBeProvided', {
            ruleCondition: cdk.Fn.conditionOr(
                cdk.Fn.conditionAnd(
                    cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'Yes'),
                    cdk.Fn.conditionEquals(this.createNewVpc, 'No')
                ),
                cdk.Fn.conditionAnd(
                    cdk.Fn.conditionEquals(this.vpcEnabled.valueAsString, 'No'),
                    cdk.Fn.conditionEquals(this.createNewVpc, 'No')
                )
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.iPamPoolId.valueAsString, ''),
                    assertDescription:
                        'To use AWS VPC IP Address Manager, first select "VpcEnabled" to "Yes", and then select "CreateNewVpc" to "Yes"'
                }
            ]
        });

        this.applicationSetup = this.createApplicationSetup(props);
        this.vpcSetup = this.setupVPC();

        // conditionally read subnet Ids and security group Ids from either the vpc provisioned by the solution
        // or if the solution did not deploy the vpc, read it from the cfnparameters provided
        this.transpiredSecurityGroupIds = cdk.Fn.conditionIf(
            this.deployVpcCondition.logicalId,
            cdk.Fn.getAtt(this.vpcSetup.nestedVPCStack.nestedStackResource?.logicalId!, 'Outputs.SecurityGroupIds'),
            cdk.Fn.join(',', this.existingSecurityGroupIds.valueAsList)
        ) as any as string;

        this.transpiredPrivateSubnetIds = cdk.Fn.conditionIf(
            this.deployVpcCondition.logicalId,
            cdk.Fn.getAtt(this.vpcSetup.nestedVPCStack.nestedStackResource?.logicalId!, 'Outputs.PrivateSubnetIds'),
            cdk.Fn.join(',', this.existingPrivateSubnetIds.valueAsList)
        ) as any as string;

        // outputting VPC info if used
        const vpcIdOutput = new cdk.CfnOutput(stack, 'VpcId', {
            value: cdk.Fn.conditionIf(
                this.deployVpcCondition.logicalId,
                cdk.Fn.getAtt(this.vpcSetup.nestedVPCStack.nestedStackResource?.logicalId!, 'Outputs.VpcId'),
                this.existingVpcId.valueAsString
            ) as any as string,
            description: 'The ID of the VPC'
        });

        const privateSubnetIdOutput = new cdk.CfnOutput(stack, 'PrivateSubnetIds', {
            value: this.transpiredPrivateSubnetIds,
            description: 'Comma separated list of private subnet ids'
        });

        const securityGroupIdOutput = new cdk.CfnOutput(stack, 'SecurityGroupIds', {
            value: this.transpiredSecurityGroupIds,
            description: 'Security group for the lambda functions in the VPC'
        });

        const vpcAzOutput = new cdk.CfnOutput(stack, 'AvailabilityZones', {
            value: cdk.Fn.conditionIf(
                this.deployVpcCondition.logicalId,
                cdk.Fn.getAtt(
                    this.vpcSetup.nestedVPCStack.nestedStackResource?.logicalId!,
                    'Outputs.AvailabilityZones'
                ),
                cdk.Fn.join(',', this.vpcAzs.valueAsList)
            ) as any as string,
            description: 'Comma separated list of AZs in which subnets of the VPCs are created'
        });

        vpcIdOutput.condition = this.vpcEnabledCondition;
        privateSubnetIdOutput.condition = this.vpcEnabledCondition;
        securityGroupIdOutput.condition = this.vpcEnabledCondition;
        vpcAzOutput.condition = this.vpcEnabledCondition;
    }

    protected setupVPC(): VPCSetup {
        throw new Error(
            'This error occurred either because the class extending the BaseStack did not implement this method or you are trying to create an instance of BaseStack. To resolve the error make sure to extend the BaseStack or have the child class implement the "setupVPC" method'
        );
    }

    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        throw new Error(
            'This error occurred either because the class extending the BaseStack did not implement this method or you are trying to create an instance of BaseStack. To resolve the error make sure to extend the BaseStack or have the child class implement the "createApplicationSetup" method'
        );
    }

    protected initializeCfnParameters(): void {
        // empty method for any child classes to pre-initialize as part of the super call to construct
    }
}
