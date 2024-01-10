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
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StaticWebsite } from '../s3web/static-site';
import { AppAssetBundler } from '../utils/asset-bundling';
import { getResourceProperties } from '../utils/common-utils';

/**
 * Construct to build and copy the UI application in the S3 website bucket using a custom resource
 */
export abstract class UIAssets extends cdk.NestedStack {
    /**
     * The bucket in which the website will be hosted
     */
    public websiteBucket: s3.Bucket;

    /**
     * The CloudFront distribution for the website
     */
    public cloudFrontDistribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        const webRuntimeConfigKey = new cdk.CfnParameter(cdk.Stack.of(this), 'WebConfigKey', {
            type: 'String',
            allowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            description:
                'Key of the Web Configuration in Parameter Store containing all the required parameters for the runtime config of the web UI'
        });

        const accessLoggingBucket = new cdk.CfnParameter(cdk.Stack.of(this), 'AccessLoggingBucketArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            description: 'Arn of the S3 bucket to use for access logging.'
        });

        const customResourceLambdaArn = new cdk.CfnParameter(cdk.Stack.of(this), 'CustomResourceLambdaArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
            description: 'Arn of the Lambda function to use for custom resource implementation.'
        });

        const customResourceRoleArn = new cdk.CfnParameter(cdk.Stack.of(this), 'CustomResourceRoleArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$',
            description: 'Arn of the IAM role to use for custom resource implementation.'
        });

        const staticWebsite = new StaticWebsite(this, 'Website', {
            accessLoggingBucket: s3.Bucket.fromBucketArn(
                this,
                'AccessLoggingBucket',
                accessLoggingBucket.valueAsString
            ),
            customResourceLambdaArn: customResourceLambdaArn.valueAsString,
            customResourceRoleArn: customResourceRoleArn.valueAsString,
            cloudFrontUUID: this.getUUID()
        });
        this.websiteBucket = staticWebsite.webS3Bucket;
        this.cloudFrontDistribution = staticWebsite.cloudfrontDistribution;

        const uiAssetPath = path.join(__dirname, '../../../', this.getUIAssetFolder());
        const uiAssets = new s3_asset.Asset(this, 'UI', {
            path: uiAssetPath,
            ...AppAssetBundler.assetOptionsFactory.assetOptions('Reactjs').options(uiAssetPath)
        });

        const customResourceRole = iam.Role.fromRoleArn(
            scope,
            `AssetReadRole${uuidv4().substring(0, 4)}`,
            customResourceRoleArn.valueAsString
        );

        const customResourceWebsiteBucketPolicy = new iam.Policy(this, 'CustomResourceWebBucketPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        's3:GetObject*',
                        's3:GetBucket*',
                        's3:List*',
                        's3:DeleteObject*',
                        's3:PutObject',
                        's3:PutObjectLegalHold',
                        's3:PutObjectRetention',
                        's3:PutObjectTagging',
                        's3:PutObjectVersionTagging',
                        's3:Abort*'
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: [this.websiteBucket.bucketArn, `${this.websiteBucket.bucketArn}/*`]
                })
            ]
        });
        customResourceWebsiteBucketPolicy.node.addDependency(staticWebsite.webS3Bucket);
        customResourceWebsiteBucketPolicy.attachToRole(customResourceRole);

        const ssmParameterPolicy = new iam.Policy(this, 'SSMAccessPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['ssm:GetParameter'],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${webRuntimeConfigKey.valueAsString}`
                    ]
                })
            ]
        });
        ssmParameterPolicy.attachToRole(customResourceRole);

        const copyWebUICustomResource = new cdk.CustomResource(this, 'CopyUI', {
            resourceType: 'Custom::CopyWebUI',
            serviceToken: customResourceLambdaArn.valueAsString,
            properties: {
                ...getResourceProperties(this, uiAssets, undefined, customResourceRole),
                Resource: 'COPY_WEB_UI',
                DESTINATION_BUCKET_NAME: staticWebsite.webS3Bucket.bucketName,
                WEBSITE_CONFIG_PARAM_KEY: webRuntimeConfigKey.valueAsString
            }
        });
        copyWebUICustomResource.node.tryFindChild('Default')?.node.addDependency(customResourceWebsiteBucketPolicy);
        copyWebUICustomResource.node.tryFindChild('Default')?.node.addDependency(ssmParameterPolicy);

        NagSuppressions.addResourceSuppressions(customResourceWebsiteBucketPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'These permissions are required to read and write into the S3 bucket. The use of wildcard is within the specific Actions for S3',
                appliesTo: [
                    'Action::s3:Abort*',
                    'Action::s3:DeleteObject*',
                    'Action::s3:GetBucket*',
                    'Action::s3:GetObject*',
                    'Action::s3:List*',
                    'Resource::<WebsiteBucket4326D7C2.Arn>/*'
                ]
            }
        ]);
    }

    public abstract getUIAssetFolder(): string;

    public getUUID(): string {
        const useCaseUUID = new cdk.CfnParameter(cdk.Stack.of(this), 'UseCaseUUID', {
            type: 'String',
            description: 'UUID to identify this deployed use case within an application',
            allowedPattern: '^[0-9a-fA-F]+$',
            constraintDescription: 'Please provide an 8 character long UUID'
        }).valueAsString;

        return useCaseUUID;
    }
}
