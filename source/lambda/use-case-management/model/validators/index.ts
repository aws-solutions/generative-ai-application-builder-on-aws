// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Centralized exports for all validator classes and utilities.
 * This provides a clean interface for importing validator functionality
 * throughout the application.
 */

// Base validator and factory
export { UseCaseValidator } from './base-validator';
export { ValidatorFactory } from './validator-factory';

// Specific validator implementations
export { TextUseCaseValidator } from './text-validator';
export { AgentUseCaseValidator } from './agent-validator';
export { AgentBuilderUseCaseValidator } from './agent-builder-validator';
export { MCPUsecaseValidator } from './mcp-validator';
export { WorkflowUseCaseValidator } from './workflow-validator';

// Utility classes and functions
export { ValidationUtils } from './validation-utils';
export { ConfigMergeUtils } from './config-merge-utils';
export { getCognitoDomainPrefixByUserPool } from './validation-utils';

// Backward compatibility - re-export the factory method as the original static method
import { ValidatorFactory } from './validator-factory';
export const createValidator = ValidatorFactory.createValidator;
