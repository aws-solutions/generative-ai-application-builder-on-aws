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

import { Match, Template } from 'aws-cdk-lib/assertions';

import { KnowledgeBaseSetup } from '../../lib/search/knowledge-base-setup';

describe('When a new kendra index is to be created', () => {
    let template: Template;
    let knowledgeBaseSetup: KnowledgeBaseSetup;

    beforeAll(() => {
        const stack = new cdk.Stack();

        knowledgeBaseSetup = new KnowledgeBaseSetup(stack, 'TestKnowledgeBaseSetup', {
            useCaseUUID: 'FAKEABCD',
            existingKendraIndexId: '',
            newKendraIndexName: 'some-new-index-name',
            newKendraQueryCapacityUnits: 1,
            newKendraStorageCapacityUnits: 1,
            newKendraIndexEdition: 'ENTERPRISE_EDITION',
            deployKendraIndexCondition: new cdk.CfnCondition(stack, 'DeployKendraIndexCondition', {
                expression: cdk.Fn.conditionEquals(
                    {
                        'Ref': 'ExistingKendraIndexId'
                    },
                    ''
                )
            })
        });

        template = Template.fromStack(stack);
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('should create Kendra nested template', () => {
        template.hasResource('AWS::CloudFormation::Stack', {
            Properties: {
                TemplateURL: {
                    'Fn::Join': [
                        '',
                        [
                            'https://s3.',
                            {
                                Ref: 'AWS::Region'
                            },
                            '.',
                            {
                                Ref: 'AWS::URLSuffix'
                            },
                            '/',
                            {
                                'Fn::Sub': 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}'
                            },
                            Match.stringLikeRegexp('^[\\S+]*.json$')
                        ]
                    ]
                },
                Parameters: {
                    UseCaseUUID: 'FAKEABCD',
                    QueryCapacityUnits: '1',
                    StorageCapacityUnits: '1',
                    KendraIndexEdition: 'ENTERPRISE_EDITION'
                }
            }
        });
    });

    it('has conditions for the CFN parameters', () => {
        template.hasCondition('DeployKendraIndexCondition', {
            'Fn::Equals': [
                {
                    Ref: 'ExistingKendraIndexId'
                },
                ''
            ]
        });
    });
});

describe('When using an existing kendra index', () => {
    let template: Template;
    let knowledgeBaseSetup: KnowledgeBaseSetup;

    beforeAll(() => {
        const stack = new cdk.Stack();

        knowledgeBaseSetup = new KnowledgeBaseSetup(stack, 'TestKnowledgeBaseSetup', {
            useCaseUUID: 'FAKEABCD',
            existingKendraIndexId: 'some-existing-index-id',
            newKendraIndexName: '',
            newKendraQueryCapacityUnits: 0,
            newKendraStorageCapacityUnits: 0,
            newKendraIndexEdition: '',
            deployKendraIndexCondition: new cdk.CfnCondition(stack, 'DeployKendraIndexCondition', {
                expression: cdk.Fn.conditionEquals(
                    {
                        'Ref': 'ExistingKendraIndexId'
                    },
                    ''
                )
            })
        });

        template = Template.fromStack(stack);
    });

    it('has condition to deploy kendra if no index is provided', () => {
        template.hasCondition('DeployKendraIndexCondition', {
            'Fn::Equals': [
                {
                    Ref: 'ExistingKendraIndexId'
                },
                ''
            ]
        });
    });
});
