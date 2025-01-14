// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor, fireEvent } from '@testing-library/react';
import QueryFilterJsonEditor from '../QueryFilterJsonEditor';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';

// Mock the loadAce function
vi.mock('../../utils', () => ({
    loadAce: vi.fn().mockResolvedValue({})
}));

const mockProps = {
    label: 'Query Filter',
    description: 'Enter your query filter',
    'data-testid': 'query-filter-editor',
    infoLinkContent: <span>Info Link</span>,
    knowledgeBaseData: { queryFilter: '{}' }
};

describe('QueryFilterJsonEditor', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <QueryFilterJsonEditor {...mockProps} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('query-filter-editor')).toBeInTheDocument();

        expect(cloudscapeWrapper.findFormField()?.findDescription()?.getElement()).toHaveTextContent(
            'Enter your query filter'
        );

        expect(cloudscapeWrapper.findFormField()?.findLabel()?.getElement()).toHaveTextContent('Query Filter');
        expect(cloudscapeWrapper.findFormField()?.findInfo()?.getElement()).toHaveTextContent('Info Link');
    });
});
