#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { Construct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { DynamoDBAttributes } from '../utils/constants';
import { DeploymentPlatformModelInfoStorage } from './deployment-platform-model-info-storage';

export class DynamoDBDeploymentPlatformStorage extends BaseNestedStack {
    /**
     * The DynamoDB table which will store the deployed gen-ai use case records
     */
    public useCasesTable: dynamodb.Table;

    /**
     * The DynamoDB table which will store model info and defaults
     */
    public modelInfoTable: dynamodb.Table;

    /**
     * Table to store LLM configuration for a use case.
     */
    public useCaseConfigTable: dynamodb.Table;

    /**
     * Voice routing table (phoneNumber -> tenantId/useCaseId), used by Amazon Connect voice adapter.
     */
    public voiceRoutingTable: dynamodb.Table;

    /**
     * Voice conversation sessions table (TenantId + ConversationId), used for KPI/portal views.
     */
    public voiceConversationsTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        this.useCasesTable = new dynamodb.Table(this, 'UseCasesTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.USE_CASES_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // the reason to separate use case management from LLM configuration of the lambda
        // is because use cases should be deployable on their own. Going with a single table
        // approach will cause additional issues with standalone deployment. Hence separate
        // tables
        this.useCaseConfigTable = new dynamodb.Table(this, 'LLMConfigTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // Voice routing table for Amazon Connect: dialed number -> tenant/use case
        this.voiceRoutingTable = new dynamodb.Table(this, 'VoiceRoutingTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.VOICE_ROUTING_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // Voice conversation sessions for KPI rollups / customer portal (tenant scoped)
        this.voiceConversationsTable = new dynamodb.Table(this, 'VoiceConversationsTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.VOICE_CONVERSATIONS_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: DynamoDBAttributes.VOICE_CONVERSATIONS_TABLE_SORT_KEY,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // Query by useCaseId for agent-level KPI lists (cross-tenant admin tooling can use this; portal should filter by TenantId)
        this.voiceConversationsTable.addGlobalSecondaryIndex({
            indexName: 'UseCaseIdIndex',
            partitionKey: { name: 'UseCaseId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'StartedAt', type: dynamodb.AttributeType.STRING }
        });

        // a model defaults table must be created and populated with the deployment platform
        const modelInfoStorage = new DeploymentPlatformModelInfoStorage(this, 'ModelInfoStorage', {
            customResourceLambdaArn: this.customResourceLambdaArn,
            customResourceRoleArn: this.customResourceLambdaRoleArn
        });
        this.modelInfoTable = modelInfoStorage.newModelInfoTable;

        cfn_nag.addCfnSuppressRules(this.useCasesTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.useCaseConfigTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.voiceRoutingTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.voiceConversationsTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);
    }
}
