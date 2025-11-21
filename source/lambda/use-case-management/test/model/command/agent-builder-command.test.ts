// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ListAgentBuilderCommand } from '../../../model/commands/agent-builder-command';
import { ListUseCasesAdapter, UseCaseRecord } from '../../../model/list-use-cases';
import { UseCaseTypes } from '../../../utils/constants';

jest.mock('../../../power-tools-init', () => ({
    tracer: {
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn()
    }
}));

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

describe('ListAgentBuilderCommand', () => {
    let command: ListAgentBuilderCommand;
    let mockAdapter: jest.Mocked<ListUseCasesAdapter>;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = JSON.stringify({ customUserAgent: 'test-agent' });
        process.env.USE_CASES_TABLE_NAME = 'test-table';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
    });

    beforeEach(() => {
        command = new ListAgentBuilderCommand();
        mockAdapter = {} as jest.Mocked<ListUseCasesAdapter>;
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.USE_CASES_TABLE_NAME;
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
    });

    describe('filterUseCasesByType', () => {
        it('should filter use cases to only include Agent Builder type', () => {
            const useCaseRecords: UseCaseRecord[] = [
                {
                    UseCaseId: 'agent-1',
                    Name: 'Agent Builder 1',
                    UseCaseType: UseCaseTypes.AGENT_BUILDER,
                    Description: 'Test agent builder',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-1',
                    UseCaseConfigRecordKey: 'key-1',
                    UseCaseConfigTableName: 'test-config-table'
                },
                {
                    UseCaseId: 'chat-1',
                    Name: 'Chat 1',
                    UseCaseType: UseCaseTypes.CHAT,
                    Description: 'Test chat',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-2',
                    UseCaseConfigRecordKey: 'key-2',
                    UseCaseConfigTableName: 'test-config-table'
                },
                {
                    UseCaseId: 'agent-2',
                    Name: 'Agent Builder 2',
                    UseCaseType: UseCaseTypes.AGENT_BUILDER,
                    Description: 'Test agent builder 2',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-3',
                    UseCaseConfigRecordKey: 'key-3',
                    UseCaseConfigTableName: 'test-config-table'
                },
                {
                    UseCaseId: 'workflow-1',
                    Name: 'Workflow 1',
                    UseCaseType: UseCaseTypes.WORKFLOW,
                    Description: 'Test workflow',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-4',
                    UseCaseConfigRecordKey: 'key-4',
                    UseCaseConfigTableName: 'test-config-table'
                }
            ];

            const result = (command as any).filterUseCasesByType(useCaseRecords);

            expect(result).toHaveLength(2);
            expect(result[0].UseCaseType).toBe(UseCaseTypes.AGENT_BUILDER);
            expect(result[1].UseCaseType).toBe(UseCaseTypes.AGENT_BUILDER);
            expect(result[0].UseCaseId).toBe('agent-1');
            expect(result[1].UseCaseId).toBe('agent-2');
        });

        it('should return empty array when no Agent Builder use cases exist', () => {
            const useCaseRecords: UseCaseRecord[] = [
                {
                    UseCaseId: 'chat-1',
                    Name: 'Chat 1',
                    UseCaseType: UseCaseTypes.CHAT,
                    Description: 'Test chat',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-1',
                    UseCaseConfigRecordKey: 'key-1',
                    UseCaseConfigTableName: 'test-config-table'
                },
                {
                    UseCaseId: 'workflow-1',
                    Name: 'Workflow 1',
                    UseCaseType: UseCaseTypes.WORKFLOW,
                    Description: 'Test workflow',
                    CreatedBy: 'user1',
                    CreatedDate: '2024-01-01',
                    StackId: 'stack-2',
                    UseCaseConfigRecordKey: 'key-2',
                    UseCaseConfigTableName: 'test-config-table'
                }
            ];

            const result = (command as any).filterUseCasesByType(useCaseRecords);

            expect(result).toHaveLength(0);
        });

        it('should return empty array when input is empty', () => {
            const useCaseRecords: UseCaseRecord[] = [];

            const result = (command as any).filterUseCasesByType(useCaseRecords);

            expect(result).toHaveLength(0);
        });
    });

    describe('execute', () => {
        it('should call parent execute method', async () => {
            const mockParentExecute = jest.fn().mockResolvedValue({ success: true });
            (command as any).constructor.prototype.__proto__.execute = mockParentExecute;

            const result = await command.execute(mockAdapter);

            expect(mockParentExecute).toHaveBeenCalledWith(mockAdapter);
            expect(result).toEqual({ success: true });
        });
    });
});
