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

import '@testing-library/jest-dom';
import Review from '@/components/wizard/Review';
import {
    USE_CASE_OPTIONS,
    KNOWLEDGE_BASE_TYPES,
    DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    KENDRA_EDITIONS,
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    MODEL_FAMILY_PROVIDER_OPTIONS
} from '../../../../wizard/steps-config';
import { renderWithProvider } from '@/utils';

vi.mock('@cloudscape-design/components');

describe('Chat', () => {
    const steps_info = {
        useCase: {
            useCase: USE_CASE_OPTIONS[0],
            useCaseName: 'fake-use-case',
            useCaseDescription: 'fake-description',
            defaultUserEmail: 'fake_email@example.com',
            inError: false
        },
        vpc: {
            isVpcRequired: true,
            existingVpc: true,
            vpcId: 'vpc-234q23',
            subnetIds: ['subnet-asdf', 'subnet-asdf34r'],
            securityGroupIds: ['sg-24234'],
            inError: false
        },
        knowledgeBase: {
            isRagRequired: true,
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES[0],
            existingKendraIndex: 'no',
            kendraIndexId: '',
            kendraAdditionalQueryCapacity: DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY,
            kendraAdditionalStorageCapacity: DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
            kendraEdition: KENDRA_EDITIONS[0],
            maxNumDocs: DEFAULT_KENDRA_NUMBER_OF_DOCS,
            inError: false,
            kendraIndexName: 'fake-index'
        },
        model: {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[0],
            apiKey: 'fake-key',
            modelName: 'fake-name',
            modelFamily: 'Bedrock',
            promptTemplate: 'fake-template',
            inferenceEndpoint: 'fake-inference-endpoint',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        }
    };

    test('Snapshot test for wizard step 4', async () => {
        const { container } = renderWithProvider(<Review info={steps_info} setActiveStepIndex={vi.fn()} />, {
            route: '/test'
        });
        expect(container).toMatchSnapshot();
    });
});
