// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AgentBuilderStep } from '../AgentBuilderStep';
import { DEFAULT_STEP_INFO } from '../../../steps-config';
import { IG_DOCS } from '@/utils/constants';

describe('AgentBuilderStep', () => {
    let agentBuilderStep: AgentBuilderStep;

    beforeEach(() => {
        agentBuilderStep = new AgentBuilderStep();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should have correct id and title', () => {
        expect(agentBuilderStep.id).toBe('agentBuilder');
        expect(agentBuilderStep.title).toBe('Create Agent');
    });

    test('should initialize with default props', () => {
        expect(agentBuilderStep.props.systemPrompt).toBe(DEFAULT_STEP_INFO.agentBuilder.systemPrompt);
        expect(agentBuilderStep.props.mcpServers).toEqual(DEFAULT_STEP_INFO.agentBuilder.mcpServers);
        expect(agentBuilderStep.props.tools).toEqual(DEFAULT_STEP_INFO.agentBuilder.tools);
        expect(agentBuilderStep.props.memoryEnabled).toBe(DEFAULT_STEP_INFO.agentBuilder.memoryEnabled);
        expect(agentBuilderStep.props.inError).toBe(false);
    });

    test('should have correct tool content', () => {
        expect(agentBuilderStep.toolContent.title).toBe('Create Agent');
        expect(agentBuilderStep.toolContent.links).toHaveLength(2);
        expect(agentBuilderStep.toolContent.links[0]).toEqual({
            href: IG_DOCS.AGENT_USE_CASE,
            text: 'Agent Use Cases'
        });
        expect(agentBuilderStep.toolContent.links[1]).toEqual({
            href: IG_DOCS.AGENTCORE_RUNTIME_MCP,
            text: 'AgentCore Runtime MCP'
        });
    });

    test('should generate content component', () => {
        const mockProps = {
            info: { agentBuilder: agentBuilderStep.props },
            onChange: vi.fn(),
            setHelpPanelContent: vi.fn(),
            setNumFieldsInError: vi.fn()
        };

        const content = agentBuilderStep.contentGenerator(mockProps);
        expect(content).toBeDefined();
        expect(content.type.name).toBe('AgentBuilder');
    });

    test('visibility is initially null until set by UseCaseType', () => {
        expect(agentBuilderStep.visibility).toBeNull(); // Initially null until set by UseCaseType
    });

    test('should map step info from deployment with valid data', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'Test system prompt',
                MCPServers: [
                    {
                        UseCaseId: 'server1',
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    }
                ],
                Tools: [
                    {
                        ToolId: 'tool1'
                    }
                ],
                MemoryConfig: {
                    LongTermEnabled: true
                }
            }
        };

        agentBuilderStep.mapStepInfoFromDeployment(mockDeployment, 'EDIT');

        expect(agentBuilderStep.props.systemPrompt).toBe('Test system prompt');
        expect(agentBuilderStep.props.mcpServers).toEqual([
            {
                useCaseId: 'server1',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE',
                useCaseName: 'server1'
            }
        ]);
        expect(agentBuilderStep.props.tools).toEqual([
            {
                description: '',
                name: '',
                type: 'STRANDS_TOOL',
                value: 'tool1'
            }
        ]);
        expect(agentBuilderStep.props.memoryEnabled).toBe(true);
        expect(agentBuilderStep.props.inError).toBe(false);
    });

    test('should map step info from deployment with empty data', () => {
        const mockDeployment = {};

        agentBuilderStep.mapStepInfoFromDeployment(mockDeployment, 'CREATE');

        expect(agentBuilderStep.props.systemPrompt).toBe('');
        expect(agentBuilderStep.props.mcpServers).toEqual([]);
        expect(agentBuilderStep.props.tools).toEqual([]);
        expect(agentBuilderStep.props.memoryEnabled).toBe(false);
        expect(agentBuilderStep.props.inError).toBe(false);
    });

    test('should map step info from deployment with partial data', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'Partial prompt',
                Temperature: 0.8
                // Missing other fields
            }
        };

        agentBuilderStep.mapStepInfoFromDeployment(mockDeployment, 'EDIT');

        expect(agentBuilderStep.props.systemPrompt).toBe('Partial prompt');
        expect(agentBuilderStep.props.mcpServers).toEqual([]);
        expect(agentBuilderStep.props.tools).toEqual([]);
        expect(agentBuilderStep.props.memoryEnabled).toBe(false);
    });

    test('should handle null deployment', () => {
        agentBuilderStep.mapStepInfoFromDeployment(null, 'CREATE');

        expect(agentBuilderStep.props.systemPrompt).toBe('');
        expect(agentBuilderStep.props.mcpServers).toEqual([]);
        expect(agentBuilderStep.props.tools).toEqual([]);
        expect(agentBuilderStep.props.memoryEnabled).toBe(false);
    });

    test('should handle undefined deployment', () => {
        agentBuilderStep.mapStepInfoFromDeployment(undefined, 'CREATE');

        expect(agentBuilderStep.props.systemPrompt).toBe('');
        expect(agentBuilderStep.props.mcpServers).toEqual([]);
        expect(agentBuilderStep.props.tools).toEqual([]);
        expect(agentBuilderStep.props.memoryEnabled).toBe(false);
    });
});
