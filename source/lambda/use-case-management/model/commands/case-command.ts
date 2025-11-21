// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UseCase } from '../use-case';
import { ListUseCasesAdapter } from '../list-use-cases';
import { GetUseCaseAdapter } from '../get-use-case';
import { McpOperation } from '../adapters/mcp-adapter';

/**
 * Common command interface for all command types (UseCase and MCP)
 * Supports both UseCase operations and MCP operations
 */
export interface CaseCommand {
    execute(operation: UseCase | ListUseCasesAdapter | GetUseCaseAdapter | McpOperation): Promise<any>;
}
