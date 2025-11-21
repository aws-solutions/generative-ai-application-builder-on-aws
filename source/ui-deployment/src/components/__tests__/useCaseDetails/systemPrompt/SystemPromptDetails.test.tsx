// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SystemPromptDetails } from '../../../useCaseDetails/systemPrompt/SystemPromptDetails';

vi.mock('@cloudscape-design/components', () => ({
    Box: ({ children, variant, 'data-testid': dataTestId }: any) => (
        <div data-testid={dataTestId} data-variant={variant}>
            {children}
        </div>
    )
}));

describe('SystemPromptDetails Component', () => {
    test('renders system prompt with text', () => {
        const mockSystemPrompt = 'You are a helpful AI assistant.';
        const mockSelectedDeployment = {
            AgentBuilderParams: {
                SystemPrompt: mockSystemPrompt
            }
        };

        render(<SystemPromptDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('System Prompt')).toBeInTheDocument();
        expect(screen.getByText(mockSystemPrompt)).toBeInTheDocument();
    });

    test('renders system prompt with multiline text', () => {
        const mockSystemPrompt = `You are a helpful AI assistant. Your role is to:

- Provide accurate responses
- Be concise and clear
- Ask for clarification when needed`;

        const mockSelectedDeployment = {
            AgentBuilderParams: {
                SystemPrompt: mockSystemPrompt
            }
        };

        render(<SystemPromptDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('System Prompt')).toBeInTheDocument();
        const promptValue = screen.getByTestId('system-prompt-value');
        expect(promptValue).toHaveTextContent('You are a helpful AI assistant');
        expect(promptValue).toHaveTextContent('Provide accurate responses');
        expect(promptValue).toHaveTextContent('Be concise and clear');
    });

    test('renders empty state when SystemPrompt is missing', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {}
        };

        render(<SystemPromptDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('No system prompt')).toBeInTheDocument();
        expect(screen.getByText('This agent has no system prompt configured.')).toBeInTheDocument();
    });

    test('renders empty state when AgentBuilderParams is missing', () => {
        const mockSelectedDeployment = {};

        render(<SystemPromptDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('No system prompt')).toBeInTheDocument();
    });

    test('renders empty state when SystemPrompt is empty string', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {
                SystemPrompt: ''
            }
        };

        render(<SystemPromptDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('No system prompt')).toBeInTheDocument();
    });
});
