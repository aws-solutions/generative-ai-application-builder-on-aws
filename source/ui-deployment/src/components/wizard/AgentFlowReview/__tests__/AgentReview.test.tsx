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

import AgentReview from '../AgentReview';
import { cloudscapeRender, mockedModelInfoQuery } from '@/utils';
import { screen } from '@testing-library/react';

describe('AgentReview', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders', () => {
        const agentData = {
            bedrockAgentId: '1111111111',
            bedrockAgentAliasId: '1111111111',
            enableTrace: true
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <AgentReview header="Test Agent Review Section" setActiveStepIndex={jest.fn()} agentData={agentData} />
        );
        expect(screen.getByTestId('review-agent-details-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Agent Review Section');
    });
});
