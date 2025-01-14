// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { BedrockAgentAliasId } from '../BedrockAgentAliasId';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('BedrockAgentAliasId', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with default value for bedrock agent alias id', () => {
        const mockAgentData = {
            bedrockAgentAliasId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentAliasId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-alias-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();
    });

    test('renders with an invalid alias id', () => {
        const mockAgentData = {
            bedrockAgentAliasId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentAliasId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-alias-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('fake-invalid-agent-alias-id');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockAgentAliasId: 'fake-invalid-agent-alias-id'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(1);

        const err = cloudscapeWrapper.findFormField()?.findError();
        expect(err?.getElement().innerHTML).toEqual('Does not match pattern of a valid Bedrock Agent Alias ID');
    });

    test('renders with a valid alias id', () => {
        const mockAgentData = {
            bedrockAgentAliasId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentAliasId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-alias-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('1111111111');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockAgentAliasId: '1111111111'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(0);
    });

    test('renders with info panel', () => {
        const mockAgentData = {
            bedrockAgentAliasId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentAliasId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-alias-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();
        const infoPanel = cloudscapeWrapper.findFormField()?.findInfo();
        expect(infoPanel).toBeDefined();
        expect(infoPanel?.getElement().innerHTML).toContain('Information about the Bedrock Agent Alias ID');
    });
});
