// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Review from '../Review';
import { renderWithProvider, mockedModelInfoQuery } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('Review', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        cleanup();
    });

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
                'deployUI': true,
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
                'inferenceEndpoint': '',
                'modelParameters': [],
                'inError': false,
                'temperature': 0.1,
                'verbose': false,
                'streaming': false
            },
            'prompt': {
                'maxPromptTemplateLength': 10000,
                'maxInputTextLength': 10000,
                'promptTemplate': 'fake-prompt',
                'userPromptEditingEnabled': true,
                'chatHistoryLength': 20,
                'humanPrefix': 'Human',
                'aiPrefix': 'AI',
                'disambiguationEnabled': true,
                'disambiguationPromptTemplate': 'fake-disambiguation-prompt',
                inError: false
            }
        };
        renderWithProvider(<Review info={mockReviewData} setActiveStepIndex={jest.fn()} />, { route: '/review' });

        expect(screen.getByTestId('review-use-case-details-container')).toBeDefined();
        expect(screen.getByTestId('vpc-config-details-container')).toBeDefined();
        expect(screen.getByTestId('review-model-details-container')).toBeDefined();
        expect(screen.getByTestId('review-knowledge-base-container')).toBeDefined();
    });
});
