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
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Template } from 'aws-cdk-lib/assertions';

import { KendraKnowledgeBase } from '../../lib/search/kendra-knowledge-base';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    KENDRA_INDEX_ID_ENV_VAR,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS
} from '../../lib/utils/constants';

describe('When KendraKnowledgeBase construct is created', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };
    let kendraKnowledgeBase: KendraKnowledgeBase;

    const kendraRoleCapture = new Capture();
    const kendraKeyCapture = new Capture();

    beforeAll(() => {
        const stack = new cdk.Stack();
        kendraKnowledgeBase = new KendraKnowledgeBase(stack, 'KendraKnowledgeBase', {});
        new lambda.Function(stack, 'MockFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.js',
            environment: {
                [KENDRA_INDEX_ID_ENV_VAR]: kendraKnowledgeBase.kendraKnowledgeBaseIndex.attrId
            }
        });
        template = Template.fromStack(kendraKnowledgeBase);
        jsonTemplate = template.toJSON();
    });

    it('should have Kendra index created, with correct props', () => {
        template.resourceCountIs('AWS::Kendra::Index', 1);
        template.resourceCountIs('AWS::IAM::Role', 1);
        template.hasResource('AWS::IAM::Role', {
            DeletionPolicy: 'Retain'
        });
        template.hasResource('AWS::IAM::Policy', { DeletionPolicy: 'Retain' });

        template.hasResourceProperties('AWS::Kendra::Index', {
            CapacityUnits: {
                QueryCapacityUnits: {
                    Ref: 'QueryCapacityUnits'
                },
                StorageCapacityUnits: {
                    Ref: 'StorageCapacityUnits'
                }
            },
            Description: 'Kendra index which provides a knowledge base for the Chat use case.',
            Edition: {
                Ref: 'KendraIndexEdition'
            },
            Name: {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Ref': 'KendraIndexName'
                        },
                        '-',
                        {
                            'Ref': 'UseCaseUUID'
                        }
                    ]
                ]
            },
            RoleArn: { 'Fn::GetAtt': [kendraRoleCapture, 'Arn'] },
            ServerSideEncryptionConfiguration: {
                KmsKeyId: {
                    'Ref': kendraKeyCapture
                }
            }
        });

        expect(jsonTemplate['Resources'][kendraRoleCapture._captured[0]]['Type']).toMatch('AWS::IAM::Role');
        expect(jsonTemplate['Resources'][kendraKeyCapture._captured[0]]['Type']).toMatch('AWS::KMS::Key');
    });

    it('should have parameters for nested stack', () => {
        template.hasParameter('UseCaseUUID', {
            Type: 'String',
            Description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            AllowedPattern: '^[0-9a-fA-F]{8}$',
            MaxLength: 8,
            ConstraintDescription: 'Please provide an 8 character long UUID'
        });

        template.hasParameter('KendraIndexName', {
            Type: 'String',
            MaxLength: 64,
            AllowedPattern: '^[0-9a-zA-Z-]{1,64}$',
            Default: DEFAULT_NEW_KENDRA_INDEX_NAME,
            Description: 'Name of the new Kendra index to be created. Will have useCaseUUID appended'
        });

        template.hasParameter('QueryCapacityUnits', {
            Type: 'Number',
            Default: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
            Description:
                'The amount of extra query capacity for an index and [GetQuerySuggestions](https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html) capacity.A single extra capacity unit for an index provides 0.1 queries per second or approximately 8,000 queries per day.',
            MaxValue: MAX_KENDRA_QUERY_CAPACITY_UNITS,
            MinValue: 0
        });

        template.hasParameter('StorageCapacityUnits', {
            Type: 'Number',
            Description:
                'The amount of extra storage capacity for an index. A single capacity unit provides 30 GB of storage space or 100,000 documents, whichever is reached first.',
            Default: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
            MaxValue: MAX_KENDRA_STORAGE_CAPACITY_UNITS,
            MinValue: 0
        });

        template.hasParameter('KendraIndexEdition', {
            Type: 'String',
            Default: 'DEVELOPER_EDITION',
            AllowedValues: ['DEVELOPER_EDITION', 'ENTERPRISE_EDITION'],
            ConstraintDescription: 'You can only choose between "DEVELOPER_EDITION" OR "ENTERPRISE_EDITION"',
            Description: 'Indicates whether the index is a Enterprise Edition index or a Developer Edition index'
        });
    });

    it('should have template output with for Kendra Index Id', () => {
        template.hasOutput('*', {
            Value: {
                'Fn::GetAtt': ['KendraKnowledgeBase', 'Id']
            }
        });
    });
});

describe('KendraKnowledgeBase optional params', () => {
    let template: Template;
    let kendraKnowledgeBase: KendraKnowledgeBase;

    beforeAll(() => {
        const stack = new cdk.Stack();
        kendraKnowledgeBase = new KendraKnowledgeBase(stack, 'KendraKnowledgeBase', {
            parameters: {
                QueryCapacityUnits: '50',
                StorageCapacityUnits: '5000'
            }
        });
        template = Template.fromStack(kendraKnowledgeBase);
    });

    it('should have default props overridden', () => {
        template.hasResourceProperties('AWS::Kendra::Index', {
            CapacityUnits: {
                QueryCapacityUnits: {
                    Ref: 'QueryCapacityUnits'
                },
                StorageCapacityUnits: {
                    Ref: 'StorageCapacityUnits'
                }
            }
        });
    });
});
