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
