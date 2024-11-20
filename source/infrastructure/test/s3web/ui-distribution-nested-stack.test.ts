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
import { Match, Template } from 'aws-cdk-lib/assertions';
import { UIDistribution } from '../../lib/s3web/ui-distribution-nested-stack';

describe('When creating a nested stack with the cloudfront distribution', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
    });

    it('should have the correct output', () => {
        template.hasOutput('WebUrl', {
            Value: {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            'Fn::GetAtt': [Match.stringLikeRegexp('^WebsiteUICloudFrontDistribution.*'), 'DomainName']
                        }
                    ]
                ]
            }
        });
        template.hasOutput('WebAssetsBucketArn', {
            Value: {
                'Fn::GetAtt': ['WebsiteBucket4326D7C2', 'Arn']
            }
        });
    });

    it('should have a cloudfront distribution', () => {
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
});

function buildStack() {
    const stack = new cdk.Stack();
    const uiAssetNestedStack = new UIDistribution(stack, 'TestUIDistribution', {
        parameters: {
            CustomResourceLambdaArn: 'arn:aws:us-east-1:fakeaccount:function:fakefunction',
            CustomResourceRoleArn: 'arn:aws:us-east-1:fakeaccount:role:fakerolename/fakeid',
            AccessLoggingBucketArn: 'arn:aws:s3:::fakebucketname'
        }
    });
    return Template.fromStack(uiAssetNestedStack);
}
