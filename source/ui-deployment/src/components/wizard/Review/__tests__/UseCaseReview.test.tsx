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

import UseCaseReview from '../UseCaseReview';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const useCaseData = {
            useCase: { label: 'Test Use Case', value: 'testUseCase' },
            useCaseDescription: 'Test Use Case Description',
            useCaseName: 'Test Use Case',
            defaultUserEmail: 'fake-email@example.com'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseReview header="Test Review Section" setActiveStepIndex={jest.fn()} useCaseData={useCaseData} />
        );
        expect(screen.getByTestId('review-use-case-details-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Review Section');
    });
});
