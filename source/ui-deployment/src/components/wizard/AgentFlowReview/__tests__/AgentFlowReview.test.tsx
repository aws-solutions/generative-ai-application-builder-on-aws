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

import AgentFlowReview from '../AgentFlowReview';
import { renderWithProvider, mockedModelInfoQuery } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('AgentFlowReview', () => {
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
            },
            'agent': {
                'bedrockAgentId': '1111111111',
                'bedrockAgentAliasId': '1111111111',
                'enableTrace': false
            }
        };
        renderWithProvider(<AgentFlowReview info={mockReviewData} setActiveStepIndex={jest.fn()} />, {
            route: '/review'
        });

        expect(screen.getByTestId('review-use-case-details-container')).toBeDefined();
        expect(screen.getByTestId('vpc-config-details-container')).toBeDefined();
        expect(screen.getByTestId('review-agent-details-container')).toBeDefined();
    });
});
