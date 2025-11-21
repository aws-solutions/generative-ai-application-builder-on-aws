// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { deployUseCaseBodySchema } from './deployments/deploy-usecase-body';
import { deployUseCaseResponseSchema } from './deployments/deploy-usecase-response';
import { updateUseCaseBodySchema } from './deployments/update-usecase-body';
import { updateUseCaseResponseSchema } from './deployments/update-usecase-response';
import { deployMcpUseCaseBodySchema } from './deployments/mcp/deploy-mcp-usecase-body';
import { deployMcpUseCaseResponseSchema } from './deployments/mcp/deploy-mcp-usecase-response';
import { updateMcpUseCaseBodySchema } from './deployments/mcp/update-mcp-usecase-body';
import { updateMcpUseCaseResponseSchema } from './deployments/mcp/update-mcp-usecase-response';
import { deployAgentUseCaseBodySchema } from './deployments/agents/deploy-agent-usecase-body';
import { deployAgentUseCaseResponseSchema } from './deployments/agents/deploy-agent-usecase-response';
import { updateAgentUseCaseBodySchema } from './deployments/agents/update-agent-usecase-body';
import { updateAgentUseCaseResponseSchema } from './deployments/agents/update-agent-usecase-response';
import { deployWorkflowUseCaseBodySchema } from './deployments/workflows/deploy-workflow-usecase-body';
import { deployWorkflowUseCaseResponseSchema } from './deployments/workflows/deploy-workflow-usecase-response';
import { updateWorkflowUseCaseBodySchema } from './deployments/workflows/update-workflow-usecase-body';
import { updateWorkflowUseCaseResponseSchema } from './deployments/workflows/update-workflow-usecase-response';
import { filesUploadRequestSchema } from './multimodal/files-upload-request-body';
import { filesUploadResponseSchema } from './multimodal/files-upload-response-body';
import { filesDeleteRequestSchema } from './multimodal/files-delete-request-body';
import { filesDeleteResponseSchema } from './multimodal/files-delete-response-body';
import { filesGetResponseSchema } from './multimodal/files-get-response-body';

export const UseCaseDeploymentSchemas = {
    base: {
        deploy: deployUseCaseBodySchema,
        deployResponse: deployUseCaseResponseSchema,
        update: updateUseCaseBodySchema,
        updateResponse: updateUseCaseResponseSchema
    },
    mcp: {
        deploy: deployMcpUseCaseBodySchema,
        deployResponse: deployMcpUseCaseResponseSchema,
        update: updateMcpUseCaseBodySchema,
        updateResponse: updateMcpUseCaseResponseSchema
    },
    agent: {
        deploy: deployAgentUseCaseBodySchema,
        deployResponse: deployAgentUseCaseResponseSchema,
        update: updateAgentUseCaseBodySchema,
        updateResponse: updateAgentUseCaseResponseSchema
    },
    workflow: {
        deploy: deployWorkflowUseCaseBodySchema,
        deployResponse: deployWorkflowUseCaseResponseSchema,
        update: updateWorkflowUseCaseBodySchema,
        updateResponse: updateWorkflowUseCaseResponseSchema
    }
} as const;

export const FileOperationSchemas = {
    upload: {
        request: filesUploadRequestSchema,
        response: filesUploadResponseSchema
    },
    delete: {
        request: filesDeleteRequestSchema,
        response: filesDeleteResponseSchema
    },
    get: {
        // Note: GET requests use query parameters, not request body schema
        response: filesGetResponseSchema
    }
} as const;
