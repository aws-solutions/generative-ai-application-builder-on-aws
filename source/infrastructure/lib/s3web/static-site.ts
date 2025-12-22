#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_nag from '../utils/cfn-guard-suppressions';

/**
 * Interface that defines properties required for the Static Website
 */
export interface StaticWebsiteProps {
    /**
     * The access logging bucket to use for S3 bucket website. The same bucket will also be used for CloudFront logging
     * with a different prefix
     */
    accessLoggingBucket: s3.IBucket;

    /**
     * Arn of the custom resource lambda function to be used to pass as service token
     */
    customResourceLambdaArn: string;

    /**
     * Arn of the custom resource role to add `s3:PutBucketPublicAccessBlock` policy to the logging bucket
     */
    customResourceRoleArn: string;

    /**
     * 8 character UUID to be appended to cloudfront resources related to logging and OAC.
     * For use case deployments, should be the UseCaseUUID. For the deployment platform, should be generated.
     */
    cloudFrontUUID: string;

    /**
     * Optional overrides for the CloudFront distribution properties (e.g., custom domain + certificate).
     */
    cloudFrontDistributionProps?: Partial<cloudfront.DistributionProps>;
}

export class StaticWebsite extends Construct {
    /**
     * The static website bucket created by the construct
     */
    public readonly webS3Bucket: s3.Bucket;

    /**
     * The cloudfront (CDN) distribution created by this construct
     */
    public readonly cloudfrontDistribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
        super(scope, id);

        const cloudFrontLogsLoggingPrefix = 'cloudfrontlogs-logging';

        this.webS3Bucket = new s3.Bucket(this, 'Bucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            serverAccessLogsBucket: props.accessLoggingBucket,
            serverAccessLogsPrefix: 'webappbucket/'
        });
        this.webS3Bucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        const bucketPolicyForLambda = new iam.Policy(this, 'LambdaBucketResourcePolicy', {
            document: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['s3:PutBucketPolicy', 's3:GetBucketPolicy', 's3:PutBucketPublicAccessBlock'],
                        resources: [props.accessLoggingBucket.bucketArn]
                    })
                ]
            })
        });

        bucketPolicyForLambda.attachToRole(
            iam.Role.fromRoleArn(this, 'BucketPolicyLambdaRole', props.customResourceRoleArn)
        );

        const cloudfrontToS3 = new CloudFrontToS3(this, 'UI', {
            existingBucketObj: this.webS3Bucket,
            cloudFrontDistributionProps: {
                enableLogging: true,
                errorResponses: [
                    { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
                    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' }
                ],
                logFilePrefix: 'cloudfront/',
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
                defaultRootObject: 'login.html',
                ...(props.cloudFrontDistributionProps ?? {})
            },
            cloudFrontLoggingBucketProps: {
                encryption: s3.BucketEncryption.S3_MANAGED,
                publicReadAccess: false,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                enforceSSL: true,
                versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
                serverAccessLogsBucket: props.accessLoggingBucket,
                serverAccessLogsPrefix: 'cloudfrontlogs-logging/'
            },
            responseHeadersPolicyProps: {
                responseHeadersPolicyName: `RespPolicy-${cdk.Aws.REGION}-${cdk.Aws.STACK_NAME}`,
                securityHeadersBehavior: {
                    contentSecurityPolicy: {
                        contentSecurityPolicy: `default-src 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; worker-src 'self' blob:; frame-ancestors 'none'; connect-src 'self' wss: https://*.amazonaws.com https://*.amazoncognito.com; font-src data:; upgrade-insecure-requests`,
                        override: true
                    },
                    frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
                    referrerPolicy: {
                        referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER,
                        override: true
                    },
                    xssProtection: {
                        protection: true,
                        modeBlock: true,
                        override: true
                    },
                    strictTransportSecurity: {
                        accessControlMaxAge: cdk.Duration.seconds(47304000),
                        includeSubdomains: true,
                        override: true
                    },
                    contentTypeOptions: { override: true }
                }
            },
            insertHttpSecurityHeaders: false
        });
        cloudfrontToS3.s3Bucket?.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
        this.webS3Bucket.policy?.node.addDependency(cloudfrontToS3.cloudFrontWebDistribution);
        
        cloudfrontToS3.cloudFrontLoggingBucket?.node
            .tryFindChild('Policy')
            ?.node.tryFindChild('Resource')
            ?.node?.addDependency(cloudfrontToS3.cloudFrontLoggingBucket);
        cloudfrontToS3.cloudFrontLoggingBucket?.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        const bucketPolicyUpdateCustomResource = new cdk.CustomResource(this, 'UpdateBucketPolicy', {
            resourceType: 'Custom::UpdateBucketPolicy',
            serviceToken: props.customResourceLambdaArn,
            properties: {
                Resource: 'UPDATE_BUCKET_POLICY',
                SOURCE_BUCKET_NAME: this.webS3Bucket.bucketName,
                LOGGING_BUCKET_NAME: props.accessLoggingBucket.bucketName,
                SOURCE_PREFIX: 'webappbucket'
            }
        });
        bucketPolicyUpdateCustomResource.node.addDependency(bucketPolicyForLambda);
        bucketPolicyUpdateCustomResource.node.addDependency(this.webS3Bucket.policy!);
        bucketPolicyUpdateCustomResource.node.addDependency(cloudfrontToS3.cloudFrontWebDistribution);

        const cloudFrontLoggingUpdateBucketPolicyCustomResource = new cdk.CustomResource(
            this,
            'CloudFrontLoggingUpdateBucketPolicy',
            {
                resourceType: 'Custom::UpdateBucketPolicy',
                serviceToken: props.customResourceLambdaArn,
                properties: {
                    Resource: 'UPDATE_BUCKET_POLICY',
                    SOURCE_BUCKET_NAME: cloudfrontToS3.cloudFrontLoggingBucket?.bucketName,
                    LOGGING_BUCKET_NAME: props.accessLoggingBucket.bucketName,
                    SOURCE_PREFIX: cloudFrontLogsLoggingPrefix
                }
            }
        );
        cloudFrontLoggingUpdateBucketPolicyCustomResource.node.addDependency(bucketPolicyUpdateCustomResource);
        cloudFrontLoggingUpdateBucketPolicyCustomResource.node.addDependency(
            cloudfrontToS3.cloudFrontLoggingBucket!.policy!
        );
        cloudFrontLoggingUpdateBucketPolicyCustomResource.node.addDependency(cloudfrontToS3.cloudFrontWebDistribution);

        this.cloudfrontDistribution = cloudfrontToS3.cloudFrontWebDistribution;

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'WebUrl', { // NOSONAR - Typescript construct instantiation
            value: `https://${this.cloudfrontDistribution.domainName}`
        });

        NagSuppressions.addResourceSuppressions(this.cloudfrontDistribution, [
            {
                id: 'AwsSolutions-CFR2',
                reason: 'WebACLv2 is only supported in us-east-1. Putting a WAF for a CloudFront distribution in this template restricts deployments to us-east-1 region only'
            }
        ]);

        NagSuppressions.addResourceSuppressions(
            cloudfrontToS3.node.tryFindChild('CloudfrontLoggingBucket')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-S1',
                    reason: 'This is a logging bucket for cloudfront, hence no server access logs have been setup'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(this.cloudfrontDistribution, [
            {
                id: 'AwsSolutions-CFR1',
                reason: 'No requirement for Geo restrictions'
            },
            {
                id: 'AwsSolutions-CFR4',
                reason: 'Because the domain name is unknown for this solution, a default CDN distribution is used. Hence TLSv2 cannot be enforced'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.cloudfrontDistribution, [
            {
                id: 'AwsSolutions-CFR7',
                reason: 'The distribution is configured with origin access identity'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.webS3Bucket, [
            {
                id: 'F14',
                reason: '"AccessControl" is legacy as per following documentation - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-s3-bucket.html#cfn-s3-bucket-accesscontrol'
            }
        ]);
    }
}
