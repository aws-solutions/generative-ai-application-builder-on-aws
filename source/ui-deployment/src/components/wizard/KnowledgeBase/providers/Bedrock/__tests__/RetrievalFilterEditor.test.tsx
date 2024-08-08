import React from 'react';
import { render, screen } from '@testing-library/react';
import RetrievalFilterEditor from '../RetrievalFilterEditor';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils/test-utils';

describe('RetrievalFilterEditor', () => {
    // Mock the loadAce function
    vi.mock('../../utils', () => ({
        loadAce: vi.fn().mockResolvedValue({})
    }));

    const mockProps = {
        knowledgeBaseData: { queryFilter: '{}' }
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', () => {
        cloudscapeRender(<RetrievalFilterEditor {...mockProps} {...mockFormComponentCallbacks()} />);
        expect(screen.getByTestId('bedrock-retrieval-filter')).toBeInTheDocument();
    });

    it('passes the correct props to QueryFilterJsonEditor', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <RetrievalFilterEditor {...mockProps} {...mockFormComponentCallbacks()} />
        );
        const queryFilterJsonEditor = screen.getByTestId('bedrock-retrieval-filter');
        expect(queryFilterJsonEditor).toBeInTheDocument();

        expect(cloudscapeWrapper.findFormField()?.findDescription()?.getElement()).toHaveTextContent(
            'Filters the search results based on document attributes or fields. This filter is included with every Amazon Bedrock Knowledge Base query.'
        );
        expect(cloudscapeWrapper.findFormField()?.findLabel()?.getElement()).toHaveTextContent(
            'Retrieval Filter - optional'
        );
    });
});
