// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import InferenceProfileId from '../InferenceProfileId';
import userEvent from '@testing-library/user-event';

describe('InferenceProfileIdInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with provided inference profile ID', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceProfileId modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('inference-profile-id-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]')?.getInputValue()).toEqual(
            'fake-id'
        );
    });

    test('renders with empty inference profile ID', () => {
        const mockModelData = {
            inferenceProfileId: ''
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceProfileId modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]')?.getInputValue()).toEqual('');
    });

    test('calls onChange when input value changes', () => {
        const mockModelData = {
            inferenceProfileId: ''
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<InferenceProfileId modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        input?.setInputValue('new-profile-id');

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({ inferenceProfileId: 'new-profile-id' });
    });

    test('shows error when inference profile ID is empty', () => {
        const mockModelData = {
            inferenceProfileId: 'valid-id'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<InferenceProfileId modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        input?.setInputValue('');

        const formField = cloudscapeWrapper.findFormField('[data-testid="inference-profile-id-field"]');
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement()).toHaveTextContent('Required field.');
    });

    test('shows error when inference profile ID has invalid characters', () => {
        const mockModelData = {
            inferenceProfileId: 'valid-id'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<InferenceProfileId modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        input?.setInputValue('invalid@id');

        const formField = cloudscapeWrapper.findFormField('[data-testid="inference-profile-id-field"]');
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement()).toHaveTextContent('Invalid inference profile ID.');
    });

    test('clears error when inference profile ID becomes valid', () => {
        const mockModelData = {
            inferenceProfileId: ''
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<InferenceProfileId modelData={mockModelData} {...callbacks} />);

        // First make it invalid
        const input = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        input?.setInputValue('');

        // Verify error is shown
        let formField = cloudscapeWrapper.findFormField('[data-testid="inference-profile-id-field"]');
        expect(formField?.findError()).toBeDefined();

        // Now make it valid
        input?.setInputValue('valid-id');

        // Verify error is cleared
        formField = cloudscapeWrapper.findFormField('[data-testid="inference-profile-id-field"]');
        expect(formField?.findError()).toBeNull();
    });

    test('displays help panel content when info link is clicked', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<InferenceProfileId modelData={mockModelData} {...callbacks} />);

        const infoLink = cloudscapeWrapper.findFormField()?.findInfo()?.findLink();
        infoLink?.click();

        expect(callbacks.setHelpPanelContent).toHaveBeenCalled();
        const helpPanelContent = callbacks.setHelpPanelContent.mock.calls[0][0];
        expect(helpPanelContent.title).toEqual('Inference profile ID');
    });

    test('registers error setter with parent component if provided', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const callbacks = mockFormComponentCallbacks();
        const registerErrorSetter = jest.fn();

        cloudscapeRender(
            <InferenceProfileId modelData={mockModelData} {...callbacks} registerErrorSetter={registerErrorSetter} />
        );

        expect(registerErrorSetter).toHaveBeenCalled();
    });

    test('uses provided error state and setter if available', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const callbacks = mockFormComponentCallbacks();
        const inferenceProfileIdError = 'Custom error';
        const setInferenceProfileIdError = jest.fn();

        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceProfileId
                modelData={mockModelData}
                {...callbacks}
                inferenceProfileIdError={inferenceProfileIdError}
                setInferenceProfileIdError={setInferenceProfileIdError}
            />
        );

        const formField = cloudscapeWrapper.findFormField('[data-testid="inference-profile-id-field"]');
        expect(formField?.findError()?.getElement()).toHaveTextContent('Custom error');

        // Change the input to trigger the error setter
        const input = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        input?.setInputValue('new-value');

        expect(setInferenceProfileIdError).toHaveBeenCalled();
    });
});
