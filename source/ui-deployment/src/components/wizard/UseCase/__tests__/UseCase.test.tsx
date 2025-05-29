// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCase from '../UseCase';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';
import { cleanup, screen } from '@testing-library/react';

describe('UseCase', () => {
    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders use case page components', () => {
        const mockUseCaseInfo = {
            useCase: {
                useCase: { label: 'Chat', value: 'Chat' },
                useCaseName: 'fake-use-case',
                defaultUserEmail: 'fake-user-email@example.com',
                useCaseDescription: 'fake-use-case-description',
                deployUI: true
            }
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(
            <UseCase info={mockUseCaseInfo} {...mockFormComponentCallbacks()} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('use-case-name-field')).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('fake-use-case');

        expect(screen.getByTestId('use-case-description-field')).toBeDefined();
        expect(cloudscapeWrapper.findTextarea()?.getTextareaValue()).toEqual('fake-use-case-description');

        expect(screen.getByTestId('user-email-field')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="user-email-field-input"]')?.getInputValue()).toEqual(
            'fake-user-email@example.com'
        );

        expect(screen.getByTestId('deploy-ui-radio-group')).toBeDefined();
        expect(
            cloudscapeWrapper
                .findRadioGroup('[data-testid="deploy-ui-radio-group"]')
                ?.findInputByValue('Yes')
                ?.getElement().checked
        ).toBeTruthy();

        expect(screen.getByTestId('enable-feedback-radio-group')).toBeDefined();
        expect(
            cloudscapeWrapper
                .findRadioGroup('[data-testid="enable-feedback-radio-group"]')
                ?.findInputByValue('No')
                ?.getElement().checked
        ).toBeTruthy();
    });
});
