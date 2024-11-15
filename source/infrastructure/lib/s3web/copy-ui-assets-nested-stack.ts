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
 **********************************************************************************************************************/
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import { NagSuppressions } from 'cdk-nag';
import * as path from 'path';

import { Construct } from 'constructs';
import { v4 as uuidv4 } from 'uuid';
import { BaseNestedStack } from '../framework/base-nested-stack';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import { REACTJS_ASSET_BUNDLER } from '../framework/bundler/constants';
import { getResourceProperties } from '../utils/common-utils';

/**
 * CDK NestedStack that copies UI assets to an S3 bucket
 * and configures the necessary IAM policies.
 */
export abstract class CopyUIAssets extends BaseNestedStack {
    /**
     * The bucket in which the website will be hosted
     */
    public websiteBucket: s3.IBucket;

    /**
     * Constructs a new instance of the CopyUIAssets class.
     *
     * @param scope - the parent construct scope
     * @param id - the construct ID
     * @param props - the construct properties
     */
    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        const webRuntimeConfigKey = new cdk.CfnParameter(cdk.Stack.of(this), 'WebConfigKey', {
            type: 'String',
            allowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            description:
                'Key of the Web Configuration in Parameter Store containing all the required parameters for the runtime config of the web UI'
        });

        // create cdk cfn parameter for web s3 bucket arn and then create a bucket object from it
        const webS3BucketArn = new cdk.CfnParameter(cdk.Stack.of(this), 'WebS3BucketArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            description: 'Arn of the S3 bucket to be used for hosting the website'
        });
        this.websiteBucket = s3.Bucket.fromBucketArn(this, 'WebAssetsBucket', webS3BucketArn.valueAsString);

        const useCaseConfigTableName = new cdk.CfnParameter(cdk.Stack.of(this), 'UseCaseConfigTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description: 'DynamoDB table name for the table which contains LLM configuration for this use case.'
        });

        const useCaseConfigRecordKey = new cdk.CfnParameter(cdk.Stack.of(this), 'UseCaseConfigRecordKey', {
            type: 'String',
            maxLength: 2048,
            default: '',
            description:
                'Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key" attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required. Consult the implementation guide for more details.'
        });

        // condition applying to use cases
        const isUseCaseConfigNotEmpty = new cdk.CfnCondition(this, 'isUseCaseConfigNotEmpty', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionAnd(
                    cdk.Fn.conditionEquals(useCaseConfigRecordKey.valueAsString, ''),
                    cdk.Fn.conditionEquals(useCaseConfigTableName.valueAsString, '')
                )
            )
        });

        // condition applying to deployment dashboard
        const isUseCaseConfigEmpty = new cdk.CfnCondition(this, 'isUseCaseConfigEmpty', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(useCaseConfigRecordKey.valueAsString, ''),
                cdk.Fn.conditionEquals(useCaseConfigTableName.valueAsString, '')
            )
        });

        const uiAssetPath = path.join(__dirname, '../../../', this.getUIAssetFolder());
        const uiAssets = new s3_asset.Asset(this, 'UI', {
            path: uiAssetPath,
            ...ApplicationAssetBundler.assetBundlerFactory()
                .assetOptions(REACTJS_ASSET_BUNDLER)
                .options(this, uiAssetPath)
        });

        const customResourceRole = iam.Role.fromRoleArn(
            scope,
            `AssetReadRole${uuidv4().substring(0, 4)}`,
            this.customResourceLambdaRoleArn
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
                }),
                // this permission is required during delete operation the above policy has changed
                // and the old bucket is no longer in the policy resources.
                new iam.PolicyStatement({
                    actions: ['s3:ListBucketVersions', 's3:DeleteObject'],
                    effect: iam.Effect.ALLOW,
                    resources: ['*']
                })
            ]
        });

        // this dependency setting can be done in the orchestration section of the par5ent stack
        customResourceWebsiteBucketPolicy.node.addDependency(this.websiteBucket);
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

        const ddbReadPolicy = new iam.Policy(this, 'UseCaseConfigDDBReadAccessPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['dynamodb:GetItem'],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCaseConfigTableName.valueAsString}`
                    ]
                })
            ]
        });
        ddbReadPolicy.node.addDependency(isUseCaseConfigNotEmpty);
        ddbReadPolicy.attachToRole(customResourceRole);

        // this custom resource definition is for copying use case UIs. Hence it has additional resource properties required by a use case
        const resourceProperties = getResourceProperties(this, uiAssets, undefined, customResourceRole);
        const copyUseCaseWebUICustomResource = new cdk.CustomResource(this, 'CopyUseCaseUI', {
            resourceType: 'Custom::CopyWebUI',
            serviceToken: this.customResourceLambdaArn,
            properties: {
                ...resourceProperties,
                Resource: 'COPY_WEB_UI',
                DESTINATION_BUCKET_NAME: this.websiteBucket.bucketName,
                WEBSITE_CONFIG_PARAM_KEY: webRuntimeConfigKey.valueAsString,
                USE_CASE_CONFIG_TABLE_NAME: useCaseConfigTableName.valueAsString,
                USE_CASE_CONFIG_RECORD_KEY: useCaseConfigRecordKey.valueAsString
            }
        });
        (copyUseCaseWebUICustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            isUseCaseConfigNotEmpty;

        copyUseCaseWebUICustomResource.node
            .tryFindChild('Default')
            ?.node.addDependency(customResourceWebsiteBucketPolicy);
        copyUseCaseWebUICustomResource.node.tryFindChild('Default')?.node.addDependency(ssmParameterPolicy);
        copyUseCaseWebUICustomResource.node.tryFindChild('Default')?.node.addDependency(ddbReadPolicy);

        const copyDasbboardWebUICustomResource = new cdk.CustomResource(this, 'CopyDashboardUI', {
            resourceType: 'Custom::CopyWebUI',
            serviceToken: this.customResourceLambdaArn,
            properties: {
                ...resourceProperties,
                Resource: 'COPY_WEB_UI',
                DESTINATION_BUCKET_NAME: this.websiteBucket.bucketName,
                WEBSITE_CONFIG_PARAM_KEY: webRuntimeConfigKey.valueAsString
            }
        });
        (copyDasbboardWebUICustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            isUseCaseConfigEmpty;

        copyDasbboardWebUICustomResource.node
            .tryFindChild('Default')
            ?.node.addDependency(customResourceWebsiteBucketPolicy);
        copyDasbboardWebUICustomResource.node.tryFindChild('Default')?.node.addDependency(ssmParameterPolicy);

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
                    'Resource::<WebS3BucketArn>/*',
                    'Resource::*'
                ]
            }
        ]);
    }

    public abstract getUIAssetFolder(): string;
}
