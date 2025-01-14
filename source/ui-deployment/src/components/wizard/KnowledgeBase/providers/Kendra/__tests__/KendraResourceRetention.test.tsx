// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KendraResourceRetentionWarning } from '../KendraResourceRetentionWarning';
import { cloudscapeRender } from '@/utils';
import { KENDRA_WARNING } from '@/utils/constants';
import { screen } from '@testing-library/react';

describe('KendraResourceRetention', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<KendraResourceRetentionWarning />);
        expect(screen.getByTestId('kendra-resource-retention-alert')).toBeDefined();

        expect(cloudscapeWrapper.findAlert()?.findContent()?.getElement().innerHTML).toContain(KENDRA_WARNING);
    });
});
