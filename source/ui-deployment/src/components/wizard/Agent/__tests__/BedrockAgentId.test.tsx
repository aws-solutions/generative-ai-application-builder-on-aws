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
import { BedrockAgentId } from '../BedrockAgentId';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('BedrockAgentId', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with default value for bedrock agent id', () => {
        const mockAgentData = {
            bedrockAgentId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();
    });

    test('renders with an invalid id', () => {
        const mockAgentData = {
            bedrockAgentId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('fake-invalid-agent-id');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockAgentId: 'fake-invalid-agent-id'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(1);

        const err = cloudscapeWrapper.findFormField()?.findError();
        expect(err?.getElement().innerHTML).toEqual('Does not match pattern of a valid Bedrock Agent ID');
    });

    test('renders with a valid id', () => {
        const mockAgentData = {
            bedrockAgentId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('1111111111');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockAgentId: '1111111111'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(0);
    });

    test('renders with info panel', () => {
        const mockAgentData = {
            bedrockAgentId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<BedrockAgentId agent={mockAgentData} {...callbacks} />);

        expect(screen.getByTestId('input-bedrock-agent-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const infoPanel = cloudscapeWrapper.findFormField()?.findInfo();
        expect(infoPanel).toBeDefined();
        expect(infoPanel?.getElement().innerHTML).toContain('Information about the Bedrock Agent ID');
    });
});
