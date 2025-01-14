// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCaseDescription from '../UseCaseDescription';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseDescription', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription descriptionValue="fake-description" {...mockFormComponentCallbacks()} />
        );
        const element = screen.getByTestId('use-case-description-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findTextarea()?.getTextareaValue()).toEqual('fake-description');
    });
});
