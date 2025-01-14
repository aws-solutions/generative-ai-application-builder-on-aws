// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import KnowledgeBaseReview from '../KnowledgeBaseReview';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    const knowledgeBaseData = {
        isRagRequired: true,
        knowledgeBaseType: { label: 'Kendra', value: 'Kendra' },
        existingKendraIndex: 'Yes',
        kendraIndexId: 'fake-index-id',
        kendraAdditionalQueryCapacity: 0,
        kendraAdditionalStorageCapacity: 0,
        kendraEdition: { label: 'developer', value: 'developer' },
        maxNumDocs: 2,
        scoreThreshold: 0.5,
        noDocsFoundResponse: 'no docs found',
        inError: false,
        returnDocumentSource: false,
        queryFilter: '{}'
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders all knowledge base review', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseReview
                header="Test Knowledge Base Review Section"
                setActiveStepIndex={jest.fn()}
                knowledgeBaseData={knowledgeBaseData}
            />
        );
        expect(screen.getByTestId('review-knowledge-base-container')).toBeInTheDocument();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Knowledge Base Review Section');
        expect(screen.getByTestId('advanced-rag-configs-container')).toBeInTheDocument();
        expect(screen.getByTestId('knowledge-base-options-container')).toBeInTheDocument();
        expect(screen.queryByTestId('query-filter-review')).not.toBeInTheDocument();
    });

    test('renders query filter review component for kendra', () => {
        const knowledgeBaseDataCopy = JSON.parse(JSON.stringify(knowledgeBaseData));
        knowledgeBaseDataCopy.queryFilter = JSON.stringify({
            'key': 'value'
        });
        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseReview
                header="Test Knowledge Base Review Section"
                setActiveStepIndex={jest.fn()}
                knowledgeBaseData={knowledgeBaseDataCopy}
            />
        );
        expect(screen.getByTestId('query-filter-review')).toBeInTheDocument();
        cloudscapeWrapper?.getElement().innerHTML.includes('Attribute filter');
    });

    test('renders query filter review component for bedrock', () => {
        const knowledgeBaseDataCopy = JSON.parse(JSON.stringify(knowledgeBaseData));
        knowledgeBaseDataCopy.knowledgeBaseType = { label: 'Bedrock', value: 'Bedrock' };
        knowledgeBaseDataCopy.queryFilter = JSON.stringify({
            'key': 'value'
        });

        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseReview
                header="Test Knowledge Base Review Section"
                setActiveStepIndex={jest.fn()}
                knowledgeBaseData={knowledgeBaseDataCopy}
            />
        );
        expect(screen.queryByTestId('query-filter-review')).toBeInTheDocument();
        cloudscapeWrapper?.getElement().innerHTML.includes('Retrieval filter');
    });
});
