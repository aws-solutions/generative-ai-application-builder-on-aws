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

import ModelReview from '../ModelReview';
import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            apiKey: 'fake-api-key',
            modelName: 'amazon.titan-text-express-v1',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={jest.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        expect(screen.getByTestId('review-model-details-container')).toBeDefined();
        expect(screen.getByTestId('model-review-additional-settings-expandable-section')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Model Review Section');
    });
});
