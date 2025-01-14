// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCaseTypeSelection from '../UseCaseTypeSelection';
import { cloudscapeRender } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('UseCaseTypeSelection', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should render', () => {
        const mockSelectionOptions = [{ label: 'Chat', value: 'Chat' }];
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseTypeSelection
                useCaseTypeOptions={mockSelectionOptions}
                selectedOption={mockSelectionOptions[0]}
                onChangeFn={vi.fn()}
            />
        );
        const element = screen.getByTestId('use-case-type-selection');
        expect(element).toBeDefined();
        cloudscapeWrapper?.findSelect()?.openDropdown();
        expect(
            cloudscapeWrapper.findSelect()?.findDropdown().findSelectedOptions()[0].getElement().innerHTML
        ).toContain('Chat');

        cleanup();
    });
});
