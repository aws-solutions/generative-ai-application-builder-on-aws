// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonCodeView } from '../json-code-view';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('JsonCodeView', () => {
    it('should render the code content', () => {
        const content = '{"key": "value"}';
        const { cloudscapeWrapper } = cloudscapeRender(
            <JsonCodeView content={content} data-testId="mock-json-viewer" />
        );
        expect(screen.getByTestId('mock-json-viewer')).toBeInTheDocument();

        expect(cloudscapeWrapper.getElement()).toHaveTextContent(content);
    });

    it('should handle empty content', () => {
        const content = '';
        const { cloudscapeWrapper } = cloudscapeRender(
            <JsonCodeView content={content} data-testId="mock-json-viewer" />
        );
        expect(cloudscapeWrapper.getElement()).toHaveTextContent('');
    });
});
