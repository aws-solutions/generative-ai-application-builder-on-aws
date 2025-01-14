// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import AttributeFilterEditor from '../AttributeFilterEditor';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';

describe('AttributeFilterEditor', () => {
    // Mock the loadAce function
    vi.mock('../../utils', () => ({
        loadAce: vi.fn().mockResolvedValue({})
    }));

    const mockProps = {
        knowledgeBaseData: { queryFilter: '{}' }
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        cloudscapeRender(<AttributeFilterEditor {...mockProps} {...mockFormComponentCallbacks()} />);
        expect(screen.getByTestId('kendra-attribute-editor')).toBeInTheDocument();
    });

    it('passes the correct props to QueryFilterJsonEditor', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <AttributeFilterEditor {...mockProps} {...mockFormComponentCallbacks()} />
        );
        const queryFilterJsonEditor = screen.getByTestId('kendra-attribute-editor');
        expect(queryFilterJsonEditor).toBeInTheDocument();

        expect(cloudscapeWrapper.findFormField()?.findDescription()?.getElement()).toHaveTextContent(
            'Filters the search results based on document attributes or fields. This filter is included with every Amazon kendra query.'
        );
        expect(cloudscapeWrapper.findFormField()?.findLabel()?.getElement()).toHaveTextContent(
            'Attribute Filter - optional'
        );
    });
});
