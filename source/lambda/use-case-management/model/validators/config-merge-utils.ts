// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import { tracer } from '../../power-tools-init';

/**
 * Utility class for merging and resolving configuration objects during updates.
 * This handles the complex logic of merging existing and new configurations
 * while resolving conflicts and maintaining data integrity.
 */
export class ConfigMergeUtils {
    /**
     * Merge existing config with new config, replacing common parameters with the new values.
     * ModelParams and ModelInputPayloadSchema are completely replaced rather than merged.
     * Async to ensure consistent behavior with tracer decorator across environments.
     *
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns Merged configuration object
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###mergeConfigs' })
    static async mergeConfigs(existingConfigObj: any, newConfigObj: any): Promise<any> {
        const modelParams = _.get(newConfigObj, 'LlmParams.ModelParams', undefined);
        const sageMakerModelInputPayloadSchema = _.get(
            newConfigObj,
            'LlmParams.SageMakerLlmParams.ModelInputPayloadSchema',
            undefined
        );
        let mergedConfig = _.merge(existingConfigObj, newConfigObj);

        if (modelParams) {
            mergedConfig.LlmParams.ModelParams = modelParams;
        }
        if (sageMakerModelInputPayloadSchema) {
            mergedConfig.LlmParams.SageMakerLlmParams.ModelInputPayloadSchema = sageMakerModelInputPayloadSchema;
        }
        mergedConfig = this.resolveKnowledgeBaseParamsOnUpdate(newConfigObj, mergedConfig);
        mergedConfig = this.resolveBedrockModelSourceOnUpdate(newConfigObj, mergedConfig);

        return mergedConfig;
    }

    /**
     * Resolve Bedrock model source to ensure only one of InferenceProfileId or ModelId is present.
     * Prevents invalid configurations where both values exist after merging.
     *
     * @param updateConfig The new config object coming from an update request
     * @param mergedConfig A merged config from existing and new configs
     * @returns Resolved config with only one model source identifier
     */
    static resolveBedrockModelSourceOnUpdate(updateConfig: any, mergedConfig: any): any {
        let resolvedConfig = mergedConfig;

        if (
            mergedConfig.LlmParams?.BedrockLlmParams?.ModelId &&
            mergedConfig.LlmParams?.BedrockLlmParams?.InferenceProfileId
        ) {
            if (updateConfig.LlmParams?.BedrockLlmParams?.ModelId) {
                resolvedConfig.LlmParams.BedrockLlmParams.ModelId = updateConfig.LlmParams.BedrockLlmParams.ModelId;
                delete resolvedConfig.LlmParams.BedrockLlmParams.InferenceProfileId;
            } else if (updateConfig.LlmParams?.BedrockLlmParams?.InferenceProfileId) {
                resolvedConfig.LlmParams.BedrockLlmParams.InferenceProfileId =
                    updateConfig.LlmParams.BedrockLlmParams.InferenceProfileId;
                delete resolvedConfig.LlmParams.BedrockLlmParams.ModelId;
                if (resolvedConfig.LlmParams?.BedrockLlmParams?.ModelArn) {
                    delete resolvedConfig.LlmParams?.BedrockLlmParams?.ModelArn;
                }
            }
        }

        return resolvedConfig;
    }

    /**
     * Resolve knowledge base parameters to ensure NoDocsFoundResponse is properly cleared when removed.
     * Prevents stale NoDocsFoundResponse values from persisting after updates.
     *
     * @param updateConfig The new config object coming from an update request
     * @param mergedConfig A merged config from existing and new configs
     * @returns Resolved config with correct NoDocsFoundResponse state
     */
    static resolveKnowledgeBaseParamsOnUpdate(updateConfig: any, mergedConfig: any): any {
        let resolvedConfig = mergedConfig;

        if (
            resolvedConfig?.KnowledgeBaseParams?.NoDocsFoundResponse &&
            !updateConfig?.KnowledgeBaseParams?.NoDocsFoundResponse
        ) {
            delete resolvedConfig.KnowledgeBaseParams.NoDocsFoundResponse;
        }

        return resolvedConfig;
    }

    /**
     * Merge configs for Agent Builder use cases with array replacement semantics.
     * Tools and MCPServers arrays are replaced entirely rather than merged.
     * Async to ensure consistent behavior with tracer decorator across environments.
     *
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns Merged configuration object
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###mergeAgentBuilderConfigs' })
    static async mergeAgentBuilderConfigs(existingConfigObj: any, newConfigObj: any): Promise<any> {
        let mergedConfig = await this.mergeConfigs(existingConfigObj, newConfigObj);

        if (newConfigObj.AgentBuilderParams !== undefined && mergedConfig.AgentBuilderParams) {
            mergedConfig.AgentBuilderParams.Tools =
                newConfigObj.AgentBuilderParams.Tools !== undefined ? newConfigObj.AgentBuilderParams.Tools : [];

            mergedConfig.AgentBuilderParams.MCPServers =
                newConfigObj.AgentBuilderParams.MCPServers !== undefined
                    ? newConfigObj.AgentBuilderParams.MCPServers
                    : [];
        }

        return mergedConfig;
    }

    /**
     * Merge configs for Workflow use cases with array replacement semantics.
     * Agents array in AgentsAsToolsParams is replaced entirely rather than merged.
     * Async to ensure consistent behavior with tracer decorator across environments.
     *
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns Merged configuration object
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###mergeWorkflowConfigs' })
    static async mergeWorkflowConfigs(existingConfigObj: any, newConfigObj: any): Promise<any> {
        let mergedConfig = await this.mergeConfigs(existingConfigObj, newConfigObj);

        if (
            newConfigObj.WorkflowParams !== undefined &&
            newConfigObj.WorkflowParams.AgentsAsToolsParams !== undefined
        ) {
            if (!mergedConfig.WorkflowParams.AgentsAsToolsParams) {
                mergedConfig.WorkflowParams.AgentsAsToolsParams = {};
            }
            mergedConfig.WorkflowParams.AgentsAsToolsParams.Agents =
                newConfigObj.WorkflowParams.AgentsAsToolsParams.Agents !== undefined
                    ? newConfigObj.WorkflowParams.AgentsAsToolsParams.Agents
                    : [];
        }

        return mergedConfig;
    }
}
