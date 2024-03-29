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
import * as iam from 'aws-cdk-lib/aws-iam';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { ApplicationSetup } from './framework/application-setup';
import { BaseStack, BaseStackProps } from './framework/base-stack';
import { UIAssets } from './framework/ui-asset';
import { DashboardType } from './metrics/custom-dashboard';
import { DeploymentPlatformStorageSetup } from './storage/deployment-platform-storage-setup';
import { UIInfrastructure } from './ui/ui-infrastructure';
import { UseCaseManagementSetup } from './use-case-management/setup';
import { generateSourceCodeMapping } from './utils/common-utils';
import {
    EMAIL_REGEX_PATTERN,
    INTERNAL_EMAIL_DOMAIN,
    REST_API_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    WEB_CONFIG_PREFIX,
    additionalDeploymentPlatformConfigValues
} from './utils/constants';
import { VPCSetup } from './vpc/vpc-setup';

/**
 * The main stack creating the infrastructure
 */
export class DeploymentPlatformStack extends BaseStack {
    /**
     * Construct managing the optional deployment of the UI in a nested stack.
     */
    public readonly uiInfrastructure: UIInfrastructure;

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
                    WebApp: 'Yes',
                    CustomDashboard: 'Yes'
                }
            }
        });

        const adminUserEmail = new cdk.CfnParameter(this, 'AdminUserEmail', {
            type: 'String',
            description: 'Email required to create the default user for the admin platform',
            allowedPattern: EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        const stack = cdk.Stack.of(this);
        let existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            stack.templateOptions.metadata.hasOwnProperty('AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide admin user email' },
            Parameters: [adminUserEmail.logicalId]
        });

        // internal users are identified by being of the form "X@amazon.Y"
        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(0, cdk.Fn.split('.', cdk.Fn.select(1, cdk.Fn.split('@', adminUserEmail.valueAsString)))),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        const webConfigSsmKey: string = `${WEB_CONFIG_PREFIX}/${cdk.Aws.STACK_NAME}`;
        this.useCaseManagementSetup = new UseCaseManagementSetup(this, 'UseCaseManagementSetup', {
            defaultUserEmail: adminUserEmail.valueAsString,
            applicationTrademarkName: props.applicationTrademarkName,
            webConfigSSMKey: webConfigSsmKey,
            customInfra: this.applicationSetup.customResourceLambda,
            securityGroupIds: this.transpiredSecurityGroupIds,
            privateSubnetIds: this.transpiredPrivateSubnetIds
        });

        this.deploymentPlatformStorageSetup = new DeploymentPlatformStorageSetup(this, 'DeploymentPlatformStorage', {
            deploymentApiLambda: this.useCaseManagementSetup.useCaseManagement.useCaseManagementApiLambda,
            modelInfoApiLambda: this.useCaseManagementSetup.useCaseManagement.modelInfoApiLambda,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole
        });

        this.applicationSetup.addCustomDashboard(
            {
                apiName: `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`,
                userPoolId: this.useCaseManagementSetup.useCaseManagement.userPool.userPoolId,
                userPoolClientId: this.useCaseManagementSetup.useCaseManagement.userPoolClient.ref
            },
            DashboardType.DeploymentPlatform
        );

        this.applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: this.useCaseManagementSetup.useCaseManagement.restApi.url,
                userPoolId: this.useCaseManagementSetup.useCaseManagement.userPool.userPoolId,
                userPoolClientId: this.useCaseManagementSetup.useCaseManagement.userPoolClient.ref,
                isInternalUserCondition: isInternalUserCondition,
                additionalProperties: additionalDeploymentPlatformConfigValues
            },
            webConfigSsmKey
        );

        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            REST_API_NAME_ENV_VAR,
            `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`
        );

        const uuid: string = this.applicationSetup.addUUIDGeneratorCustomResource().getAttString('UUID');
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(USE_CASE_UUID_ENV_VAR, uuid);

        this.uiInfrastructure = new UIInfrastructure(this, 'WebApp', {
            webRuntimeConfigKey: webConfigSsmKey,
            customInfra: this.applicationSetup.customResourceLambda,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            uiAssetFolder: 'ui-deployment',
            useCaseUUID: uuid
        });
        this.uiInfrastructure.nestedUIStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.webConfigCustomResource
        );
        this.uiInfrastructure.nestedUIStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiInfrastructure.nestedUIStack, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(
                this.deploymentPlatformStorageSetup.deploymentPlatformStorage,
                props.solutionName,
                props.solutionVersion
            );
        }

        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${(this.uiInfrastructure.nestedUIStack as UIAssets).cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = this.uiInfrastructure.deployWebApp;

        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            UUID: uuid,
            VPC_ENABLED: this.vpcEnabled.valueAsString,
            CREATE_VPC: this.createNewVpc.valueAsString
        });

        NagSuppressions.addResourceSuppressions(
            this.useCaseManagementSetup.useCaseManagement.userPool.node
                .tryFindChild('smsRole')
                ?.node.tryFindChild('Resource') as iam.CfnRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The role information is not available when creating the user pool',
                    appliesTo: ['Resource::*']
                }
            ],
            true
        );
    }

    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'deployment-platform',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString
        });
    }

    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        return new ApplicationSetup(this, 'DeploymentPlatformSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion
        });
    }
}
