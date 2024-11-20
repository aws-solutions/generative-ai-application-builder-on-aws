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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseStackProps } from '../framework/base-stack';
import { UseCaseManagement } from './management-stack';

export interface UseCaseManagementProps extends BaseStackProps {
    /**
     * Default user email address used to create a cognito user in the user pool.
     */
    defaultUserEmail: string;

    /**
     * Key for SSM parameter store containing list of use stack template file names
     */
    webConfigSSMKey: string;

    /**
     * Custom lambda function to be passed as service token  for the custom infra setup
     */
    customInfra: lambda.Function;

    /**
     * Security group ids of the VPC to be passed to the nested stack as comma separated string
     */
    securityGroupIds?: string;

    /**
     * subnet ids in which lambda functions are to be deployed as comma separated string
     */
    privateSubnetIds?: string;

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: string;

    /**
     * CloudFront url of the UI application
     */
    cloudFrontUrl: string;

    /**
     * Whether to deploy the web app or not
     */
    deployWebApp: string;

    /**
     * condition to decide if web application will be deployed
     */
    deployWebAppCondition: cdk.CfnCondition;

    /**
     * access logging bucket for the nested stack
     */
    accessLoggingBucket: s3.Bucket;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: string;

    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     */
    existingCognitoUserPoolClientId: string;
}

/**
 * This Construct sets up the nested stack managing the API and backing lambdas for use case management.
 * Also includes configuration of cognito user pool and authorizer.
 */
export class UseCaseManagementSetup extends Construct {
    /**
     * The instance of Construct passed to it the constructor to be used when infrastructure provisioning is
     * done outside the constructor through methods
     */
    private scope: Construct;

    /**
     * Nested Stack that creates the resources for use case management (API Gateway, lambda, cognito, etc.)
     */
    public readonly useCaseManagement: UseCaseManagement;

    constructor(scope: Construct, id: string, props: UseCaseManagementProps) {
        super(scope, id);
        this.scope = scope;

        this.useCaseManagement = new UseCaseManagement(this, 'UseCaseManagement', {
            parameters: {
                DefaultUserEmail: props.defaultUserEmail,
                ApplicationTrademarkName: props.applicationTrademarkName,
                WebConfigSSMKey: props.webConfigSSMKey,
                CustomResourceLambdaArn: props.customInfra.functionArn,
                CustomResourceRoleArn: props.customInfra.role!.roleArn,
                ExistingSecurityGroupIds: props.securityGroupIds!,
                ExistingPrivateSubnetIds: props.privateSubnetIds!,
                CognitoDomainPrefix: props.cognitoDomainPrefix,
                CloudFrontUrl: props.cloudFrontUrl,
                DeployUI: props.deployWebApp,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn,
                ExistingCognitoUserPoolId: props.existingCognitoUserPoolId,
                ExistingCognitoUserPoolClientId: props.existingCognitoUserPoolClientId
            },
            description: `Nested Stack that creates the resources for use case management (API Gateway, lambda, cognito, etc.) - Version ${props.solutionVersion}`
        });
    }
}
