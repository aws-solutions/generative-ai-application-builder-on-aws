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

import KnowledgeBaseReview from '../KnowledgeBaseReview';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const knowledgeBaseData = {
            isRagRequired: true,
            knowledgeBaseType: { label: 'Kendra', value: 'Kendra' },
            existingKendraIndex: 'yes',
            kendraIndexId: 'fake-index-id',
            kendraAdditionalQueryCapacity: 0,
            kendraAdditionalStorageCapacity: 0,
            kendraEdition: { label: 'developer', value: 'developer' },
            maxNumDocs: 2,
            inError: false,
            returnDocumentSource: false
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseReview
                header="Test Knowledge Base Review Section"
                setActiveStepIndex={jest.fn()}
                knowledgeBaseData={knowledgeBaseData}
            />
        );
        expect(screen.getByTestId('review-knowledge-base-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Knowledge Base Review Section');
        expect(screen.getByTestId('advanced-rag-configs-container')).toBeDefined();
        expect(screen.getByTestId('knowledge-base-options-container')).toBeDefined();
    });
});
