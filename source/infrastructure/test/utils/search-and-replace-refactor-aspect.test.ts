// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { SearchAndReplaceRefactorAspect } from '../../lib/utils/search-and-replace-refactor-aspect';

describe('SearchAndReplaceRefactorAspect', () => {
    describe('Basic Functionality', () => {
        test('should override logical ID of a resource', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'TestStack');

            // Create a simple resource (S3 bucket)
            const bucket = new cdk.aws_s3.Bucket(stack, 'NewBucket', {
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });

            // Get the generated logical ID for the bucket
            const newLogicalId = stack.getLogicalId(bucket.node.defaultChild as cdk.CfnResource);
            const targetLogicalId = 'OldBucketLogicalId';

            // WHEN
            // Apply the aspect with a mapping from the new logical ID to the target one
            const aspect = new SearchAndReplaceRefactorAspect({
                logicalIdMappings: {
                    [newLogicalId]: targetLogicalId
                }
            });
            cdk.Aspects.of(stack).add(aspect);
            console.debug(aspect);

            // Synthesize the stack to a CloudFormation template
            const template = Template.fromStack(stack);

            // THEN
            // Verify the bucket exists in the template with the old logical ID
            template.hasResource('AWS::S3::Bucket', {});

            // Check that the template has the resource with the target logical ID and not the new one
            const resources = template.toJSON().Resources;
            expect(resources[targetLogicalId]).toBeDefined();
            expect(resources[newLogicalId]).toBeUndefined();
        });

        test('should override logical IDs of multiple resources', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'MultipleResourcesStack');

            // Create multiple resources
            const bucket = new cdk.aws_s3.Bucket(stack, 'NewBucket', {
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            const table = new cdk.aws_dynamodb.Table(stack, 'NewTable', {
                partitionKey: { name: 'id', type: cdk.aws_dynamodb.AttributeType.STRING },
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });

            // Get the generated logical IDs
            const bucketLogicalId = stack.getLogicalId(bucket.node.defaultChild as cdk.CfnResource);
            const tableLogicalId = stack.getLogicalId(table.node.defaultChild as cdk.CfnResource);
            
            const targetBucketLogicalId = 'OldBucketLogicalId';
            const targetTableLogicalId = 'OldTableLogicalId';

            // WHEN
            // Apply the aspect with mappings for both resources
            const aspect = new SearchAndReplaceRefactorAspect({
                logicalIdMappings: {
                    [bucketLogicalId]: targetBucketLogicalId,
                    [tableLogicalId]: targetTableLogicalId
                }
            });
            cdk.Aspects.of(stack).add(aspect);

            // Synthesize the stack to a CloudFormation template
            const template = Template.fromStack(stack);
            const resources = template.toJSON().Resources;

            // THEN
            // Verify both resources exist with their target logical IDs
            expect(resources[targetBucketLogicalId]).toBeDefined();
            expect(resources[targetTableLogicalId]).toBeDefined();
            
            // Verify the new logical IDs are not present
            expect(resources[bucketLogicalId]).toBeUndefined();
            expect(resources[tableLogicalId]).toBeUndefined();
        });

        test('should not override logical IDs of resources without mappings', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'NonMatchingResourcesStack');

            // Create two resources
            const bucket = new cdk.aws_s3.Bucket(stack, 'MappedBucket', {
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            const table = new cdk.aws_dynamodb.Table(stack, 'UnmappedTable', {
                partitionKey: { name: 'id', type: cdk.aws_dynamodb.AttributeType.STRING },
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });

            // Get the generated logical IDs
            const bucketLogicalId = stack.getLogicalId(bucket.node.defaultChild as cdk.CfnResource);
            const tableLogicalId = stack.getLogicalId(table.node.defaultChild as cdk.CfnResource);
            
            const targetBucketLogicalId = 'OldBucketLogicalId';

            // WHEN
            // Apply the aspect with mapping only for the bucket
            const aspect = new SearchAndReplaceRefactorAspect({
                logicalIdMappings: {
                    [bucketLogicalId]: targetBucketLogicalId
                }
            });
            cdk.Aspects.of(stack).add(aspect);

            // Synthesize the stack to a CloudFormation template
            const template = Template.fromStack(stack);
            const resources = template.toJSON().Resources;

            // THEN
            // Verify bucket has target logical ID
            expect(resources[targetBucketLogicalId]).toBeDefined();
            expect(resources[bucketLogicalId]).toBeUndefined();
            
            // Verify table retains its original logical ID
            expect(resources[tableLogicalId]).toBeDefined();
        });

        test('should override logical IDs of resources in nested constructs', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'NestedConstructsStack');

            // Create a nested construct
            class NestedResources extends Construct {
                public readonly bucket: cdk.aws_s3.Bucket;
                
                constructor(scope: Construct, id: string) {
                    super(scope, id);
                    this.bucket = new cdk.aws_s3.Bucket(this, 'NestedBucket', {
                        removalPolicy: cdk.RemovalPolicy.DESTROY
                    });
                }
            }

            // Create the nested construct
            const nested = new NestedResources(stack, 'MyNestedResources');
            
            // Get the generated logical ID for the nested bucket
            const nestedBucketLogicalId = stack.getLogicalId(nested.bucket.node.defaultChild as cdk.CfnResource);
            const targetNestedBucketLogicalId = 'OldNestedBucketLogicalId';

            // WHEN
            // Apply the aspect with mapping for the nested bucket
            const aspect = new SearchAndReplaceRefactorAspect({
                logicalIdMappings: {
                    [nestedBucketLogicalId]: targetNestedBucketLogicalId
                }
            });
            cdk.Aspects.of(stack).add(aspect);

            // Synthesize the stack to a CloudFormation template
            const template = Template.fromStack(stack);
            const resources = template.toJSON().Resources;

            // THEN
            // Verify nested bucket has target logical ID
            expect(resources[targetNestedBucketLogicalId]).toBeDefined();
            expect(resources[nestedBucketLogicalId]).toBeUndefined();
        });
    });
});
