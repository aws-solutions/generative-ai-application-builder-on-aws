// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';

import { Match, Template } from 'aws-cdk-lib/assertions';

import * as rawCdkJson from '../../cdk.json';
import { ApplicationSetup } from '../../lib/framework/application-setup';
import { KnowledgeBaseSetup } from '../../lib/search/knowledge-base-setup';

describe('When a new Kendra index is to be created', () => {
    let template: Template;
    let knowledgeBaseSetup: KnowledgeBaseSetup;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const applicationSetup = new ApplicationSetup(stack, 'ApplicationSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

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
            }),
            customInfra: applicationSetup.customResourceLambda,
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            accessLoggingBucket: applicationSetup.accessLoggingBucket
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

describe('When using an existing Kendra index', () => {
    let template: Template;
    let knowledgeBaseSetup: KnowledgeBaseSetup;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const applicationSetup = new ApplicationSetup(stack, 'ApplicationSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

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
            }),
            customInfra: applicationSetup.customResourceLambda,
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            accessLoggingBucket: applicationSetup.accessLoggingBucket
        });

        template = Template.fromStack(stack);
    });

    it('has condition to deploy Kendra if no index is provided', () => {
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
