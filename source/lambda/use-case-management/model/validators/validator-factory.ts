// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StorageManagement } from '../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { UseCaseTypes } from '../../utils/constants';
import { AgentBuilderUseCaseValidator } from './agent-builder-validator';
import { AgentUseCaseValidator } from './agent-validator';
import { UseCaseValidator } from './base-validator';
import { TextUseCaseValidator } from './text-validator';
import { MCPUsecaseValidator } from './mcp-validator';
import { WorkflowUseCaseValidator } from './workflow-validator';

/**
 * Factory class for creating appropriate validators based on use case type.
 * This centralizes validator creation and makes it easy to add new use case types.
 */
export class ValidatorFactory {
    /**
     * Factory method to create the appropriate validator based on the use case type.
     *
     * @param useCaseType - The type of use case (e.g., 'Text', 'Agent', 'AgentBuilder', 'Workflow')
     * @param storageMgmt - The storage management instance
     * @param useCaseConfigMgmt - The use case configuration management instance
     * @returns An instance of the appropriate UseCaseValidator subclass
     * @throws Error if an invalid use case type is provided
     */
    static createValidator(
        useCaseType: string,
        storageMgmt: StorageManagement,
        useCaseConfigMgmt: UseCaseConfigManagement
    ): UseCaseValidator {
        switch (useCaseType) {
            case UseCaseTypes.CHAT:
                return new TextUseCaseValidator(storageMgmt, useCaseConfigMgmt);
            case UseCaseTypes.RAGChat:
                return new TextUseCaseValidator(storageMgmt, useCaseConfigMgmt);
            case UseCaseTypes.AGENT:
                return new AgentUseCaseValidator(storageMgmt, useCaseConfigMgmt);
            case UseCaseTypes.AGENT_BUILDER:
                return new AgentBuilderUseCaseValidator(storageMgmt, useCaseConfigMgmt);
            case UseCaseTypes.MCP_SERVER:
                return new MCPUsecaseValidator(storageMgmt, useCaseConfigMgmt);
            case UseCaseTypes.WORKFLOW:
                return new WorkflowUseCaseValidator(storageMgmt, useCaseConfigMgmt);
            default:
                throw new Error(`Invalid use case type: ${useCaseType}`);
        }
    }
}
