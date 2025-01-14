#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseStackProps } from '../framework/base-stack';
import { KendraKnowledgeBase } from './kendra-knowledge-base';

export interface KnowledgeBaseProps extends BaseStackProps {
    /**
     * UUID to identify this deployed use case within an application.
     * Will be added to the Kendra index name if one is deployed.
     */
    useCaseUUID: string;

    /**
     * The existing Kendra Index ID, if one exists. Should be an empty string if we wish to create a new index.
     */
    existingKendraIndexId: string;

    /**
     * The name of the new Kendra index
     */
    newKendraIndexName: string;

    /**
     * The number of query capacity units to set for the new Kendra index
     */
    newKendraQueryCapacityUnits: number;

    /**
     * The number of storage capacity units to set for the new Kendra index
     */
    newKendraStorageCapacityUnits: number;

    /**
     * The edition of the new Kendra index
     */
    newKendraIndexEdition: string;

    /**
     * Whether or not to deploy the Kendra index conditionally
     */
    deployKendraIndexCondition: cdk.CfnCondition;

    /**
     * Custom lambda function to be passed as service token  for the custom infra setup
     */
    customInfra: lambda.Function;

    /**
     * Bucket to setup access logging across all S3 buckets
     */
    accessLoggingBucket: s3.Bucket;
}

/**
 * A construct that provisions indexed storage options using Kendra
 */
export class KnowledgeBaseSetup extends Construct {
    /**
     * Nested stack that creates a new Kendra index
     */
    public readonly kendraKnowledgeBase: KendraKnowledgeBase;

    /**
     * Kendra index iD for the newly created Kendra index, or the existing index referenced by existingKendraIndexId
     */
    public readonly kendraIndexId: string;

    constructor(scope: Construct, id: string, props: KnowledgeBaseProps) {
        super(scope, id);

        this.kendraKnowledgeBase = new KendraKnowledgeBase(this, 'KendraKnowledgeBase', {
            parameters: {
                UseCaseUUID: props.useCaseUUID,
                KendraIndexName: props.newKendraIndexName,
                QueryCapacityUnits: props.newKendraQueryCapacityUnits.toString(),
                StorageCapacityUnits: props.newKendraStorageCapacityUnits.toString(),
                KendraIndexEdition: props.newKendraIndexEdition,
                CustomResourceLambdaArn: props.customInfra.functionArn,
                CustomResourceRoleArn: props.customInfra.role!.roleArn,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn
            },
            description: `Nested Stack that creates the Kendra Index - Version ${props.solutionVersion}`
        });
        (this.kendraKnowledgeBase.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            props.deployKendraIndexCondition;

        // sets the value of kendraIndexId to the Kendra index ID if one was created, otherwise sets it to the existing index id
        this.kendraIndexId = cdk.Fn.conditionIf(
            props.deployKendraIndexCondition.logicalId,
            this.kendraKnowledgeBase.kendraKnowledgeBaseIndex.attrId,
            props.existingKendraIndexId
        ).toString();
    }
}
