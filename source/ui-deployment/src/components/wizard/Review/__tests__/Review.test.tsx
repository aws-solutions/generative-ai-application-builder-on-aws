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

import Review from '../Review';
import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Review', () => {
    test('renders', () => {
        const mockReviewData = {
            'useCase': {
                'useCase': {
                    'value': 'Chat',
                    'label': 'Chat'
                },
                'useCaseName': 'asdf',
                'useCaseDescription': '',
                'defaultUserEmail': '',
                'inError': false
            },
            'vpc': {
                'isVpcRequired': true,
                'existingVpc': true,
                'vpcId': 'vpc-234q23',
                'subnetIds': ['subnet-asdf', 'subnet-asdf34r'],
                'securityGroupIds': ['sg-24234'],
                'inError': false
            },
            'knowledgeBase': {
                'isRagRequired': false,
                'knowledgeBaseType': {
                    'value': 'Kendra',
                    'label': 'Kendra'
                },
                'existingKendraIndex': '',
                'kendraIndexId': '',
                'kendraAdditionalQueryCapacity': 0,
                'kendraAdditionalStorageCapacity': 0,
                'kendraEdition': {
                    'value': 'developer',
                    'label': 'Developer'
                },
                'maxNumDocs': 2,
                'inError': false,
                'kendraIndexName': '',
                'returnDocumentSource': false
            },
            'model': {
                'modelProvider': {
                    'label': 'Bedrock',
                    'value': 'Bedrock'
                },
                'apiKey': '',
                'modelName': 'ai21.j2-ultra',
                'modelFamily': '',
                'promptTemplate': '',
                'inferenceEndpoint': '',
                'modelParameters': [],
                'inError': false,
                'temperature': 0.1,
                'verbose': false,
                'streaming': false
            }
        };
        renderWithProvider(<Review info={mockReviewData} setActiveStepIndex={jest.fn()} />, { route: '/review' });

        expect(screen.getByTestId('review-use-case-details-container')).toBeDefined();
        expect(screen.getByTestId('vpc-config-details-container')).toBeDefined();
        expect(screen.getByTestId('review-model-details-container')).toBeDefined();
        expect(screen.getByTestId('review-knowledge-base-container')).toBeDefined();
    });
});
