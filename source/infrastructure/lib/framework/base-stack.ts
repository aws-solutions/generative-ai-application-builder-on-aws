#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as log from 'npmlog';
import { ExistingVPCParameters } from '../vpc/exisiting-vpc-params';
import { VPCSetup } from '../vpc/vpc-setup';
import { ApplicationSetup } from './application-setup';

export class BaseParameters {
    /**
     * Unique UUID for this deployed use case within an application. Provided by the deployment platform if in use.
     */
    public useCaseUUID: cdk.CfnParameter;

    /**
     * First 8 characters of the useCaseUUID.
     */
    public useCaseShortId: string;

    /**
     * Name of the table that stores the configuration for a use case.
     */
    public useCaseConfigTableName: cdk.CfnParameter;

    /**
     * Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key"
     * attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in
     * use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required.
     * Consult the implementation guide for more details.
     */
    public useCaseConfigRecordKey: cdk.CfnParameter;

    /**
     * UserPoolId of an existing cognito user pool which this use case will be authenticated with.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public existingCognitoUserPoolId: cdk.CfnParameter;

    /**
     * Cfn parameter for existing user pool client Id (App Client Id)
     */
    public existingUserPoolClientId: cdk.CfnParameter;

    /**
     * Optional parameter to specify domain when deploying the template. If not provided the template will generate
     * a random domain prefix using a hashing strategy using AWS account number, region, and stack name.
     */
    public cognitoUserPoolClientDomain: cdk.CfnParameter;

    protected cfnStack: cdk.Stack;

    constructor(stack: cdk.Stack) {
        this.cfnStack = cdk.Stack.of(stack);

        this.setupUseCaseConfigTableParams(stack);
        this.setupCognitoUserPoolParams(stack);
        this.setupUUIDParams(stack);
        this.setupCognitoUserPoolClientDomainParams(stack);
    }

    protected setupUseCaseConfigTableParams(stack: cdk.Stack): void {
        this.useCaseConfigTableName = new cdk.CfnParameter(stack, 'UseCaseConfigTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^[a-zA-Z0-9_.-]{3,255}$',
            description: 'DynamoDB table name for the table which contains the configuration for this use case.',
            constraintDescription:
                'This parameter is required. The stack will read the configuration from this table to configure the resources during deployment'
        });

        this.useCaseConfigRecordKey = new cdk.CfnParameter(stack, 'UseCaseConfigRecordKey', {
            type: 'String',
            maxLength: 2048,
            description:
                'Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key" attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required. Consult the implementation guide for more details.'
        });
    }

    protected setupCognitoUserPoolParams(stack: cdk.Stack): void {
        this.existingCognitoUserPoolId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'Optional - UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            default: ''
        });

        this.existingUserPoolClientId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClient', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        });
    }
    protected setupUUIDParams(stack: cdk.Stack): void {
        this.useCaseUUID = new cdk.CfnParameter(stack, 'UseCaseUUID', {
            type: 'String',
            description:
                'UUID to identify this deployed use case within an application. Please provide a 36 character long UUIDv4. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern:
                '^[0-9a-fA-F]{8}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            minLength: 8,
            maxLength: 36,
            constraintDescription:
                'Using digits and the letters A through F, please provide a 8 character id or a 36 character long UUIDv4.'
        });

        this.useCaseShortId = cdk.Fn.select(0, cdk.Fn.split('-', this.useCaseUUID.valueAsString));
    }

    protected setupCognitoUserPoolClientDomainParams(stack: cdk.Stack): void {
        this.cognitoUserPoolClientDomain = new cdk.CfnParameter(stack, 'CognitoDomainPrefix', {
            type: 'String',
            description:
                'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
            default: '',
            allowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
            constraintDescription:
                'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
            maxLength: 63
        });
    }

    protected withAdditionalCfnParameters(stack: BaseStack): any {
        logWarningForEmptyImplementation();
    }
}

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
    public vpcSetup: VPCSetup;

    /**
     * If set to 'false', the deployed use case stack will not have a VPC
     */
    public vpcEnabled: cdk.CfnParameter;

    /**
     * The parameter to decide if customer will provide an existing VPC or the solution should create a new VPC
     */
    public createNewVpc: cdk.CfnParameter;

    /**
     * AWS VPC IPAM Id to use for the VPC CIDR block
     */
    public iPamPoolId: cdk.CfnParameter;

    /**
     * ID of an existing VPC to be used for the use case. If none is provided, a new VPC will be created.
     */
    public existingVpcId: cdk.CfnParameter;

    /**
     * ID of an existing Private Subnet to be used for the use case.
     */
    public existingPrivateSubnetIds: cdk.CfnParameter;

    /**
     * SecurityGroup ids configured in the VPC
     */
    public existingSecurityGroupIds: cdk.CfnParameter;

    /**
     * AZs for the VPC
     */
    public vpcAzs: cdk.CfnParameter;

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
     * condition to deploy WebApp
     */
    public deployWebApp: cdk.CfnParameter;

    /**
     * Rule to check for existing VPC if required parameters have been provided as CloudFormation input parameters
     */
    public checkIfExistingVPCParamsAreProvided: cdk.CfnRule;

    /**
     * Rule to check if existing VPC parameters were provided as CloudFormation input parameters when we are either creating a new VPC or not using VPC
     */
    public checkIfExistingVPCParamsAreProvidedWhenNotAllowed: cdk.CfnRule;

    /**
     * Rule to check if existing VPC parameters are empty, if either deployVPC is 'No', or deployVPC is 'Yes' and createNewVpc is 'Yes'
     */
    public checkIfExistingVPCParamsAreEmpty: cdk.CfnRule;

    /**
     * The security group Ids finally assigned post resolving the condition
     */
    public transpiredSecurityGroupIds: string;

    /**
     * The private subnet Ids finally assigned post resolving the condition
     */
    public transpiredPrivateSubnetIds: string;

    /**
     * core properties associated with stack
     */
    protected readonly baseStackProps: BaseStackProps;

    /**
     * Base application resource creation through this construct
     */
    public applicationSetup: ApplicationSetup;

    protected stackParameters: any;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.baseStackProps = {
            applicationTrademarkName: props.applicationTrademarkName,
            solutionID: props.solutionID,
            solutionName: props.solutionName,
            solutionVersion: props.solutionVersion
        };

        this.initializeCfnParameters();
        this.applicationSetup = this.createApplicationSetup(props);

        // Initialize base stack features if enabled
        this.initializeBaseStackParameters();
        this.setupBaseStackResources(props);
    }

    /**
     * Initialize base stack parameters (VPC, deployment, etc.)
     */
    protected initializeBaseStackParameters(): void {
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

        const existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            Object.hasOwn(stack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.push({
            Label: { default: 'Optional: If you would like to deploy the solution with a VPC Configuration' },
            Parameters: [this.vpcEnabled.logicalId, this.createNewVpc.logicalId, this.iPamPoolId.logicalId]
        });

        this.deployWebApp = new cdk.CfnParameter(this, 'DeployUI', {
            type: 'String',
            description:
                'Please select the option to deploy the front end UI for this deployment. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            default: 'Yes'
        });

        existingParameterGroups.push({
            Label: { default: 'Optional: If you would like to deploy the solution with a Web Application' },
            Parameters: [this.deployWebApp.logicalId]
        });

        stack.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: existingParameterGroups
            }
        };
    }

    /**
     * Setup base stack resources (VPC setup, application setup, etc.)
     */
    protected setupBaseStackResources(props: BaseStackProps): void {
        const stack = cdk.Stack.of(this);

        const captureExistingVPCParamerters = new ExistingVPCParameters(this);
        this.existingVpcId = captureExistingVPCParamerters.existingVpcId;
        this.existingPrivateSubnetIds = captureExistingVPCParamerters.existingPrivateSubnetIds;
        this.existingSecurityGroupIds = captureExistingVPCParamerters.securityGroupIds;
        this.vpcAzs = captureExistingVPCParamerters.vpcAzs;

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

    /**
     * Any sub-class stacks can add resources required for their case
     */
    protected withAdditionalResourceSetup(props: BaseStackProps): any {
        logWarningForEmptyImplementation();
    }

    protected initializeCfnParameters(): void {
        this.stackParameters = new BaseParameters(this);
    }
}
function logWarningForEmptyImplementation() {
    log.prefixStyle.bold = true;
    log.prefixStyle.fg = 'blue';
    log.enableColor();

    log.log('WARN', 'This is the base stack', 'No implementation in this method');
}
