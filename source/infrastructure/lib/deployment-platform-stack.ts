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
import { ApplicationSetup } from './framework/application-setup';
import { BaseStack, BaseStackProps } from './framework/base-stack';
import { DashboardType } from './metrics/custom-dashboard';
import { CopyUIAssets } from './s3web/copy-ui-assets-nested-stack';
import { UIDistribution } from './s3web/ui-distribution-nested-stack';
import { DeploymentPlatformStorageSetup } from './storage/deployment-platform-storage-setup';
import { UIInfrastructureBuilder } from './ui/ui-infrastructure-builder';
import { UseCaseManagementSetup } from './use-case-management/setup';
import { generateSourceCodeMapping } from './utils/common-utils';
import {
    INTERNAL_EMAIL_DOMAIN,
    MANDATORY_EMAIL_REGEX_PATTERN,
    REST_API_NAME_ENV_VAR,
    UIAssetFolders,
    USE_CASE_UUID_ENV_VAR,
    WEB_CONFIG_PREFIX
} from './utils/constants';
import { VPCSetup } from './vpc/vpc-setup';

/**
 * The main stack creating the infrastructure
 */
export class DeploymentPlatformStack extends BaseStack {
    /**
     * Construct creating the cloudfront distribution assets in a nested stack.
     */
    public readonly uiDistribution: UIDistribution;

    /**
     * Construct creating the custom resource to copy assets in a nested stack.
     */
    public readonly copyAssetsStack: CopyUIAssets;

    /**
     * Construct managing the deployment of a nested stack with resources related to use case management.
     * Includes cognito, APIs for deployment/management of use cases, and backing lambdas.
     */
    public readonly useCaseManagementSetup: UseCaseManagementSetup;

    /**
     * Construct managing the deployment of a nested stack with resources for storing use case data.
     */
    public readonly deploymentPlatformStorageSetup: DeploymentPlatformStorageSetup;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        new cdk.CfnMapping(this, 'Solution', {
            mapping: {
                Data: {
                    SendAnonymousUsageData: 'Yes',
                    ID: props.solutionID,
                    Version: props.solutionVersion,
                    SolutionName: props.solutionName
                }
            }
        });

        new cdk.CfnMapping(this, 'FeaturesToDeploy', {
            mapping: {
                Deploy: {
                    CustomDashboard: 'Yes'
                }
            }
        });

        const adminUserEmail = new cdk.CfnParameter(this, 'AdminUserEmail', {
            type: 'String',
            description: 'Email required to create the default user for the admin platform',
            allowedPattern: MANDATORY_EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        const existingCognitoUserPoolId = new cdk.CfnParameter(this, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            default: ''
        });

        const existingUserPoolClientId = new cdk.CfnParameter(this, 'ExistingCognitoUserPoolClient', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        });

        new cdk.CfnRule(this, 'CognitoUserPoolAndClientRule', {
            ruleCondition: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(existingCognitoUserPoolId.valueAsString, '')),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(existingUserPoolClientId.valueAsString, '')),
                    assertDescription:
                        'If an existing User Pool Id is provided, then an existing User Pool Client Id must also be provided.'
                }
            ]
        });

        new cdk.CfnRule(this, 'CognitoDomainNotProvidedIfPoolIsRule', {
            ruleCondition: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(existingCognitoUserPoolId.valueAsString, '')),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.stackParameters.cognitoUserPoolClientDomain.valueAsString, ''),
                    assertDescription:
                        'If an existing User Pool Id is provided, then a domain name for the User Pool Client must not be provided.'
                }
            ]
        });

        const stack = cdk.Stack.of(this);
        const existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            Object.hasOwn(stack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide admin user email' },
            Parameters: [adminUserEmail.logicalId]
        });

        /**
         * this CfnParameter is defined in the base stack. The deployment stack only adds it to a parameter group
         */
        existingParameterGroups.push({
            Label: {
                default:
                    'Optional: If you would like to provide a sub domain for the UserPoolClient configuration. If not provided, a hashed value using the AWS Account number, current region, and stack name, will be used as sub-domain name'
            },
            Parameters: [this.stackParameters.cognitoUserPoolClientDomain.logicalId]
        });

        /**
         * parameter group for bringing your own cognito user pool and client
         */
        existingParameterGroups.push({
            Label: {
                default:
                    'Optional: If you would like to provide a Cognito UserPool and UserPoolClient, you can pass their IDs here. Otherwise, a new pool and client will be created for you'
            },
            Parameters: [existingCognitoUserPoolId.logicalId, existingUserPoolClientId.logicalId]
        });

        // internal users are identified by being of the form "X@amazon.Y"
        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(0, cdk.Fn.split('.', cdk.Fn.select(1, cdk.Fn.split('@', adminUserEmail.valueAsString)))),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        const uuid: string = this.applicationSetup.addUUIDGeneratorCustomResource().getAttString('UUID');
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(USE_CASE_UUID_ENV_VAR, uuid);

        const uiInfrastructureBuilder = new UIInfrastructureBuilder({
            uiAssetFolder: UIAssetFolders.DEPLOYMENT_PLATFORM,
            deployWebApp: this.deployWebApp.valueAsString
        });

        this.uiDistribution = uiInfrastructureBuilder.createDistribution(this, 'WebApp', {
            parameters: {
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                UseCaseUUID: uuid
            },
            description: `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${props.solutionVersion}`
        });

        const webConfigSsmKey: string = `${WEB_CONFIG_PREFIX}/${cdk.Aws.STACK_NAME}`;
        this.useCaseManagementSetup = new UseCaseManagementSetup(this, 'UseCaseManagementSetup', {
            defaultUserEmail: adminUserEmail.valueAsString,
            webConfigSSMKey: webConfigSsmKey,
            customInfra: this.applicationSetup.customResourceLambda,
            securityGroupIds: this.transpiredSecurityGroupIds,
            privateSubnetIds: this.transpiredPrivateSubnetIds,
            cognitoDomainPrefix: this.stackParameters.cognitoUserPoolClientDomain.valueAsString,
            cloudFrontUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            deployWebApp: this.deployWebApp.valueAsString,
            deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            existingCognitoUserPoolId: existingCognitoUserPoolId.valueAsString,
            existingCognitoUserPoolClientId: existingUserPoolClientId.valueAsString,
            ...this.baseStackProps
        });

        this.deploymentPlatformStorageSetup = new DeploymentPlatformStorageSetup(this, 'DeploymentPlatformStorage', {
            deploymentApiLambda: this.useCaseManagementSetup.useCaseManagement.useCaseManagementApiLambda,
            modelInfoApiLambda: this.useCaseManagementSetup.useCaseManagement.modelInfoApiLambda,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });

        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            REST_API_NAME_ENV_VAR,
            `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`
        );

        const cognitoResourcesGeneratedCondition = new cdk.CfnCondition(
            this,
            'DeploymentDashboardCognitoResourcesGenerated',
            {
                expression: cdk.Fn.conditionEquals(existingCognitoUserPoolId.valueAsString, '')
            }
        );
        const userPoolId = cdk.Fn.conditionIf(
            cognitoResourcesGeneratedCondition.logicalId,
            cdk.Fn.getAtt(
                this.useCaseManagementSetup.useCaseManagement.nestedStackResource!.logicalId,
                'Outputs.GeneratedUserPoolId'
            ),
            existingCognitoUserPoolId.valueAsString
        ).toString();
        const userPoolClientId = cdk.Fn.conditionIf(
            cognitoResourcesGeneratedCondition.logicalId,
            cdk.Fn.getAtt(
                this.useCaseManagementSetup.useCaseManagement.nestedStackResource!.logicalId,
                'Outputs.GeneratedUserPoolClientId'
            ),
            existingUserPoolClientId.valueAsString
        ).toString();

        this.applicationSetup.addCustomDashboard(
            {
                apiName: `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`,
                userPoolId: userPoolId,
                userPoolClientId: userPoolClientId
            },
            DashboardType.DeploymentPlatform
        );

        this.applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: this.useCaseManagementSetup.useCaseManagement.restApi.url,
                userPoolId: userPoolId,
                userPoolClientId: userPoolClientId,
                cognitoRedirectUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
                isInternalUserCondition: isInternalUserCondition,
                deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition
            },
            webConfigSsmKey
        );
        this.applicationSetup.webConfigCustomResource.node.addDependency(this.useCaseManagementSetup.useCaseManagement);

        this.copyAssetsStack = uiInfrastructureBuilder.createUIAssetsCustomResource(this, 'CopyUICustomResource', {
            parameters: {
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                WebConfigKey: webConfigSsmKey,
                WebS3BucketArn: this.uiDistribution.websiteBucket.bucketArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn
            },
            description: `Custom resource that copies UI assets to S3 bucket - Version ${props.solutionVersion}`
        });

        this.uiDistribution.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        this.copyAssetsStack.node.defaultChild?.node.addDependency(this.applicationSetup.webConfigCustomResource);
        this.copyAssetsStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.copyAssetsStack, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(
                this.deploymentPlatformStorageSetup.deploymentPlatformStorage,
                props.solutionName,
                props.solutionVersion
            );
        }

        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${this.uiDistribution.cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        new cdk.CfnOutput(cdk.Stack.of(this), 'CognitoClientId', {
            value: userPoolClientId
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'RestEndpointUrl', {
            value: this.useCaseManagementSetup.useCaseManagement.restApi.url
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'LLMConfigTableName', {
            value: this.deploymentPlatformStorageSetup.deploymentPlatformStorage.useCaseConfigTable.tableName
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'UseCasesTableName', {
            value: this.deploymentPlatformStorageSetup.deploymentPlatformStorage.useCasesTable.tableName
        });

        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            UUID: uuid,
            VPC_ENABLED: this.vpcEnabled.valueAsString,
            CREATE_VPC: this.createNewVpc.valueAsString
        });
    }

    protected setupVPC(): VPCSetup {
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
        return new ApplicationSetup(this, 'DeploymentPlatformSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion
        });
    }
}
