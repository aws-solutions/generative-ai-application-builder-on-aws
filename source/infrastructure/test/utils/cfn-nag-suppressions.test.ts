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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';
import { addCfnSuppressRules, CfnNagSuppressRule } from '../../lib/utils/cfn-nag-suppressions';

describe('When adding suppressions', () => {
    let s3Bucket: s3.Bucket;
    let stack: cdk.Stack;
    let suppressionRule1: CfnNagSuppressRule, suppressionRule2: CfnNagSuppressRule;

    beforeEach(() => {
        stack = new cdk.Stack();
        s3Bucket = new s3.Bucket(stack, 'TestBucket');

        suppressionRule1 = {
            id: 'Fake-1',
            reason: 'Fake reason to add suppression'
        };

        suppressionRule2 = {
            id: 'Fake-2',
            reason: 'adding another suppression rule to the existing list'
        };
    });

    it('should add suppressions as metadata to the resource', () => {
        addCfnSuppressRules(s3Bucket, [suppressionRule1]);
        validate(stack, [suppressionRule1]);
    });

    it('should append to the list if suppressions exist', () => {
        addCfnSuppressRules(s3Bucket, [suppressionRule1]);
        addCfnSuppressRules(s3Bucket, [suppressionRule2]);
        validate(stack, [suppressionRule1, suppressionRule2]);
    });

    it('should check for CfnOptions and to the options metadata', () => {
        addCfnSuppressRules(s3Bucket.node.defaultChild as cdk.CfnResource, [suppressionRule1]);
        addCfnSuppressRules(s3Bucket.node.defaultChild as cdk.CfnResource, [suppressionRule2]);
        validate(stack, [suppressionRule1, suppressionRule2]);
    });
});

function validate(stack: cdk.Stack, suppressionRules: CfnNagSuppressRule[]) {
    const template = Template.fromStack(stack);
    template.hasResource('AWS::S3::Bucket', {
        Type: 'AWS::S3::Bucket',
        Metadata: {
            cfn_nag: {
                rules_to_suppress: suppressionRules
            }
        }
    });
}
