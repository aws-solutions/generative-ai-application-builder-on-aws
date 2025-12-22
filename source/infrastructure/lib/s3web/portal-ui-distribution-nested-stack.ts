// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import { StaticWebsite } from './static-site';

export interface PortalUIDistributionProps extends cdk.NestedStackProps {
    portalDomainName: string;
    portalCertificate: acm.ICertificate;
}

/**
 * Nested stack for the customer portal UI distribution (S3 + CloudFront) with a custom domain.
 */
export class PortalUIDistribution extends BaseNestedStack {
    public websiteBucket: s3.Bucket;
    public cloudFrontDistribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: PortalUIDistributionProps) {
        super(scope, id, props);

        const staticWebsite = new StaticWebsite(this, 'Website', {
            accessLoggingBucket: s3.Bucket.fromBucketArn(this, 'AccessLoggingBucket', this.accessLoggingBucket),
            customResourceLambdaArn: this.customResourceLambdaArn,
            customResourceRoleArn: this.customResourceLambdaRoleArn,
            cloudFrontUUID: this.getUUID(),
            cloudFrontDistributionProps: {
                domainNames: [props.portalDomainName],
                certificate: props.portalCertificate,
                // CloudFront requires SNI for custom certs; default is fine, but set explicitly.
                sslSupportMethod: cloudfront.SSLMethod.SNI
            }
        });

        this.websiteBucket = staticWebsite.webS3Bucket;
        this.cloudFrontDistribution = staticWebsite.cloudfrontDistribution;

        new cdk.CfnOutput(this, 'WebAssetsBucketArn', {
            value: this.websiteBucket.bucketArn
        });
    }

    private getUUID(): string {
        const useCaseUUID = new cdk.CfnParameter(cdk.Stack.of(this), 'UseCaseUUID', {
            type: 'String',
            description: 'UUID to identify this deployed UI within an application',
            allowedPattern: '^[0-9a-fA-F]+$',
            constraintDescription: 'Please provide an 8 character long UUID'
        }).valueAsString;

        return useCaseUUID;
    }
}


