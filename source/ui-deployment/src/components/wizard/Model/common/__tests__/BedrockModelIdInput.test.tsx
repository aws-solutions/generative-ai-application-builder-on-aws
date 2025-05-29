// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import BedrockModelIdInput from '../BedrockModelIdInput';

describe('BedrockModelIdInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with provided model ID', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockModelIdInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('model-id-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="model-id-input"]')?.getInputValue()).toEqual(
            'amazon.titan-text-express-v1'
        );
    });

    test('renders with empty model ID', () => {
        const mockModelData = {
            modelName: ''
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockModelIdInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(cloudscapeWrapper.findInput('[data-testid="model-id-input"]')?.getInputValue()).toEqual('');
    });

    test('calls onChange when input value changes', () => {
        const mockModelData = {
            modelName: ''
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        input?.setInputValue('amazon.titan-text-express-v1');

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({ modelName: 'amazon.titan-text-express-v1' });
    });

    test('shows error when model ID is empty', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        input?.setInputValue('');

        const formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement()).toHaveTextContent('Required field.');
    });

    test('shows error when model ID has invalid format', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        input?.setInputValue('invalid-model-id');

        const formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement()).toHaveTextContent('Model ID must follow the pattern');
    });

    test('validates valid model ID formats', () => {
        const mockModelData = {
            modelName: ''
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        const formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');

        // Test standard model ID
        input?.setInputValue('amazon.titan-text-express-v1');
        expect(formField?.findError()).toBeNull();

        // Test model ID with version
        input?.setInputValue('anthropic.claude-3-sonnet-20240229-v1:0');
        expect(formField?.findError()).toBeNull();

        // Test model ID with numbers in name
        input?.setInputValue('meta.llama3-2-11b-instruct-v1:0');
        expect(formField?.findError()).toBeNull();

        // Test model ID with periods in name
        input?.setInputValue('ai21.j2.ultra-v1');
        expect(formField?.findError()).toBeNull();
    });

    test('clears error when model ID becomes valid', () => {
        const mockModelData = {
            modelName: ''
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        // First make it invalid
        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        input?.setInputValue('');

        // Verify error is shown
        let formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');
        expect(formField?.findError()).toBeDefined();

        // Now make it valid
        input?.setInputValue('amazon.titan-text-express-v1');

        // Verify error is cleared
        formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');
        expect(formField?.findError()).toBeNull();
    });

    test('displays help panel content when info link is clicked', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<BedrockModelIdInput modelData={mockModelData} {...callbacks} />);

        const infoLink = cloudscapeWrapper.findFormField()?.findInfo()?.findLink();
        infoLink?.click();

        expect(callbacks.setHelpPanelContent).toHaveBeenCalled();
        const helpPanelContent = callbacks.setHelpPanelContent.mock.calls[0][0];
        expect(helpPanelContent.title).toEqual('Model ID');
    });

    test('registers error setter with parent component if provided', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const callbacks = mockFormComponentCallbacks();
        const registerErrorSetter = jest.fn();

        cloudscapeRender(
            <BedrockModelIdInput modelData={mockModelData} {...callbacks} registerErrorSetter={registerErrorSetter} />
        );

        expect(registerErrorSetter).toHaveBeenCalled();
    });

    test('uses provided error state and setter if available', () => {
        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1'
        };
        const callbacks = mockFormComponentCallbacks();
        const modelIdError = 'Custom error';
        const setModelIdError = jest.fn();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockModelIdInput
                modelData={mockModelData}
                {...callbacks}
                modelIdError={modelIdError}
                setModelIdError={setModelIdError}
            />
        );

        const formField = cloudscapeWrapper.findFormField('[data-testid="model-id-field"]');
        expect(formField?.findError()?.getElement()).toHaveTextContent('Custom error');

        // Change the input to trigger the error setter
        const input = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        input?.setInputValue('new-value');

        expect(setModelIdError).toHaveBeenCalled();
    });
});