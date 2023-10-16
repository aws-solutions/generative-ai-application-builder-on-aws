"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatUseCaseInfoAdapter = exports.ChatUseCaseDeploymentAdapter = exports.UseCase = void 0;
const crypto = __importStar(require("crypto"));
const missing_value_error_1 = require("../exception/missing-value-error");
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
/**
 * Data Model to store capture use case specific information
 */
class UseCase {
    // prettier-ignore
    constructor(//NOSONAR - typescript:S107 - data model class hence needs primitive types as parameters
    useCaseId, name, description, cfnParameters, configuration, userId, providerName, useCaseType, apiKey) {
        this.useCaseId = useCaseId;
        this.name = name;
        this.description = description;
        this.cfnParameters = cfnParameters;
        this.configuration = configuration;
        this.userId = userId;
        this.providerName = providerName;
        this.shortUUID = this.useCaseId.substring(0, 8);
        this.templateName = `${providerName}${useCaseType}`;
        this.apiKey = apiKey;
    }
    get stackId() {
        return this._stackId;
    }
    set stackId(stackId) {
        this._stackId = stackId;
    }
    getSSMParameterKey() {
        var _a;
        return (_a = this.cfnParameters) === null || _a === void 0 ? void 0 : _a.get(constants_1.CHAT_CONFIG_CFN_PARAMETER_NAME);
    }
    setSSMParameterKey(ssmParameterKey) {
        if (this.cfnParameters === undefined) {
            this.cfnParameters = new Map();
        }
        this.cfnParameters.set(constants_1.CHAT_CONFIG_CFN_PARAMETER_NAME, ssmParameterKey);
    }
    /**
     * Performs a deep copy of this object, preserving methods and property values
     *
     * @returns a deep copy of the object
     */
    clone() {
        let newUseCase = new UseCase(this.useCaseId, this.name, this.description, new Map(this.cfnParameters), { ...this.configuration }, this.userId, this.templateName.split(/(?=[A-Z])/)[0], // provider name, split by capital letters
        this.templateName.split(/(?=[A-Z])/)[1], // use case type
        this.apiKey);
        return newUseCase;
    }
    requiresAPIKey() {
        return constants_1.PROVIDERS_REQUIRING_API_KEY.includes(this.providerName);
    }
}
exports.UseCase = UseCase;
/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates
 */
class ChatUseCaseDeploymentAdapter extends UseCase {
    constructor(event) {
        var _a, _b;
        const jsonBody = JSON.parse(event.body);
        // in update and delete cases, we will be provided a useCaseId. In create, we generate one
        const useCaseId = (_b = (_a = event.pathParameters) === null || _a === void 0 ? void 0 : _a.useCaseId) !== null && _b !== void 0 ? _b : crypto.randomUUID();
        const cfnParameters = ChatUseCaseDeploymentAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = ChatUseCaseDeploymentAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer.UserId;
        if (!jsonBody.LlmParams.ModelProvider) {
            const errMsg = `Model Provider name not found in event body. ${JSON.stringify(jsonBody)}}`;
            power_tools_init_1.logger.error(errMsg);
            throw new missing_value_error_1.MissingValueError(errMsg);
        }
        super(useCaseId, jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.UseCaseName, jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.UseCaseDescription, cfnParameters, config, userId, jsonBody.LlmParams.ModelProvider, 'Chat', jsonBody.LlmParams.ApiKey);
    }
    static createCfnParameters(eventBody, useCaseId) {
        var _a, _b, _c, _d, _e, _f, _g;
        const cfnParameters = new Map();
        const shortUUID = this.generateShortUUID(useCaseId);
        const ssmParamSuffixUUID = this.generateShortUUID(crypto.randomUUID());
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'ExistingKendraIndexId', (_a = eventBody.KnowledgeBaseParams) === null || _a === void 0 ? void 0 : _a.ExistingKendraIndexId);
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'NewKendraIndexName', (_b = eventBody.KnowledgeBaseParams) === null || _b === void 0 ? void 0 : _b.KendraIndexName);
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'NewKendraQueryCapacityUnits', (_c = eventBody.KnowledgeBaseParams) === null || _c === void 0 ? void 0 : _c.QueryCapacityUnits);
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'NewKendraStorageCapacityUnits', (_d = eventBody.KnowledgeBaseParams) === null || _d === void 0 ? void 0 : _d.StorageCapacityUnits);
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'NewKendraIndexEdition', (_e = eventBody.KnowledgeBaseParams) === null || _e === void 0 ? void 0 : _e.KendraIndexEdition);
        // in order to set this as a cfnParameter, note the boolean will be converted to a string (e.g. "true")
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'RAGEnabled', (_f = eventBody.LlmParams) === null || _f === void 0 ? void 0 : _f.RAGEnabled);
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'DefaultUserEmail', eventBody.DefaultUserEmail);
        // fixed/mandatory parameters for the deployment
        // each new deployment or update requires a new SSM param in order to properly have cloudformation update all resources on a deploy
        cfnParameters.set(constants_1.CHAT_CONFIG_CFN_PARAMETER_NAME, `${process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR]}/${shortUUID}/${ssmParamSuffixUUID}`);
        cfnParameters.set('ExistingCognitoUserPoolId', process.env[constants_1.USER_POOL_ID_ENV_VAR]);
        cfnParameters.set('ExistingCognitoGroupPolicyTableName', process.env[constants_1.COGNITO_POLICY_TABLE_ENV_VAR]);
        cfnParameters.set('UseCaseUUID', `${shortUUID}`);
        // only setting the param for API key if it exists
        if (((_g = eventBody.LlmParams) === null || _g === void 0 ? void 0 : _g.ApiKey) !== undefined) {
            cfnParameters.set('ProviderApiKeySecret', `${shortUUID}/${process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`);
        }
        // Mapping the bool input from the API payload to the expected format for the CFN parameter
        if (eventBody.ConsentToDataLeavingAWS !== undefined &&
            eventBody.LlmParams.ModelProvider !== "Bedrock" /* CHAT_PROVIDERS.BEDROCK */) {
            if (eventBody.ConsentToDataLeavingAWS) {
                cfnParameters.set('ConsentToDataLeavingAWS', 'Yes');
            }
            else {
                cfnParameters.set('ConsentToDataLeavingAWS', 'No');
            }
        }
        return cfnParameters;
    }
    static setParameterIfExists(cfnParameters, paramName, value) {
        if (value !== undefined) {
            cfnParameters.set(paramName, value.toString());
        }
    }
    static createConfiguration(eventBody) {
        var _a, _b;
        return {
            UseCaseName: eventBody.UseCaseName,
            ConversationMemoryType: eventBody.ConversationMemoryType,
            ConversationMemoryParams: eventBody.ConversationMemoryParams,
            KnowledgeBaseType: eventBody.KnowledgeBaseType,
            KnowledgeBaseParams: {
                NumberOfDocs: (_a = eventBody.KnowledgeBaseParams) === null || _a === void 0 ? void 0 : _a.NumberOfDocs,
                ReturnSourceDocs: (_b = eventBody.KnowledgeBaseParams) === null || _b === void 0 ? void 0 : _b.ReturnSourceDocs
            },
            LlmParams: {
                ModelProvider: eventBody.LlmParams.ModelProvider,
                ModelId: eventBody.LlmParams.ModelId,
                InferenceEndpoint: eventBody.LlmParams.InferenceEndpoint,
                ModelParams: eventBody.LlmParams.ModelParams,
                PromptTemplate: eventBody.LlmParams.PromptTemplate,
                Streaming: eventBody.LlmParams.Streaming,
                Verbose: eventBody.LlmParams.Verbose,
                Temperature: eventBody.LlmParams.Temperature,
                RAGEnabled: eventBody.LlmParams.RAGEnabled
            },
            IsInternalUser: process.env[constants_1.IS_INTERNAL_USER_ENV_VAR] // env var value is set as 'true' or 'false' on deployment of management stack
        };
    }
    static generateShortUUID(id) {
        return id.substring(0, 8);
    }
}
exports.ChatUseCaseDeploymentAdapter = ChatUseCaseDeploymentAdapter;
/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
class ChatUseCaseInfoAdapter extends UseCase {
    constructor(event) {
        const useCaseId = event.pathParameters.useCaseId;
        const userId = event.requestContext.authorizer.UserId;
        super(useCaseId, '', undefined, undefined, {}, userId, '', 'Chat');
    }
}
exports.ChatUseCaseInfoAdapter = ChatUseCaseInfoAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlLWNhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9tb2RlbC91c2UtY2FzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHeEgsK0NBQWlDO0FBQ2pDLDBFQUFxRTtBQUNyRSwwREFBNkM7QUFDN0Msa0RBUzRCO0FBRTVCOztHQUVHO0FBQ0gsTUFBYSxPQUFPO0lBd0RoQixrQkFBa0I7SUFDbEIsWUFBYSx3RkFBd0Y7SUFDakcsU0FBaUIsRUFDakIsSUFBWSxFQUNaLFdBQStCLEVBQy9CLGFBQThDLEVBQzlDLGFBQXFCLEVBQ3JCLE1BQWMsRUFDZCxZQUFvQixFQUNwQixXQUFtQixFQUNuQixNQUFlO1FBRWYsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7UUFDaEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLFlBQVksR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1AsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFlO1FBQ3ZCLElBQUks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QUNILE1BQWEsc0JBQXVCLFNBQVEsT0FBTztJQUMvQyxZQUFZLEtBQXNCO1FBQzlCLE1BQU0sU0FBUyxHQUFXLEtBQUssQ0FBQyxjQUFlLENBQUMsU0FBVSxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVyxDQUFDLE1BQU0sQ0FBQztRQUV2RCxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7Q0FDSjtBQVBELHdEQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBBUElHYXRld2F5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHsgTWlzc2luZ1ZhbHVlRXJyb3IgfSBmcm9tICcuLi9leGNlcHRpb24vbWlzc2luZy12YWx1ZS1lcnJvcic7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7XG4gICAgQ0hBVF9DT05GSUdfQ0ZOX1BBUkFNRVRFUl9OQU1FLFxuICAgIENIQVRfUFJPVklERVJTLFxuICAgIENPR05JVE9fUE9MSUNZX1RBQkxFX0VOVl9WQVIsXG4gICAgSVNfSU5URVJOQUxfVVNFUl9FTlZfVkFSLFxuICAgIFBST1ZJREVSU19SRVFVSVJJTkdfQVBJX0tFWSxcbiAgICBVU0VSX1BPT0xfSURfRU5WX1ZBUixcbiAgICBVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSLFxuICAgIFVTRV9DQVNFX0NPTkZJR19TU01fUEFSQU1FVEVSX1BSRUZJWF9FTlZfVkFSXG59IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cyc7XG5cbi8qKlxuICogRGF0YSBNb2RlbCB0byBzdG9yZSBjYXB0dXJlIHVzZSBjYXNlIHNwZWNpZmljIGluZm9ybWF0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VDYXNlIHtcbiAgICAvKipcbiAgICAgKiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIHVzZSBjYXNlLlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkb25seSB1c2VDYXNlSWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIE5hbWUgb2YgdGhlIHVzZSBjYXNlIHRvIGJlIGRlcGxveWVkXG4gICAgICovXG4gICAgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uIG9mIHRoZSB1c2UgY2FzZSB0byBiZSBkZXBsb3llZFxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIElEIG9mIHRoZSB1c2VyIHJlcXVlc3RpbmcgdGhlIGNyZWF0aW9uIG9mIHRoZSB1c2UgY2FzZVxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkb25seSB1c2VySWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIENsb3VkRm9ybWF0aW9uIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIHRvIHRoZSB1c2UgY2FzZSAoc3RvcmVkIGFzIGEgTWFwKVxuICAgICAqL1xuICAgIHB1YmxpYyBjZm5QYXJhbWV0ZXJzPzogTWFwPHN0cmluZywgc3RyaW5nPjtcblxuICAgIC8qKlxuICAgICAqIE5hbWUgb2YgdGhlIHByb3ZpZGVyIGZvciB0aGUgdXNlIGNhc2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVhZG9ubHkgcHJvdmlkZXJOYW1lOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpdGlvbmFsIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSB1c2UgY2FzZSwgc3RvcmVkIGFzIGEgSlNPTiBvYmplY3QgaW4gU1NNXG4gICAgICovXG4gICAgcHVibGljIGNvbmZpZ3VyYXRpb246IE9iamVjdDtcblxuICAgIC8qKlxuICAgICAqIFRoZSB0ZW1wbGF0ZSB3aGljaCBzaG91bGQgYmUgdXNlZCB0byBkZXBsb3kgdGhlIHVzZSBjYXNlXG4gICAgICovXG4gICAgcHVibGljIHRlbXBsYXRlTmFtZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogOC1jaGFyYWN0ZXIgc2xpY2VkIFVVSUQgKGRlcml2ZWQgZnJvbSB1c2VDYXNlSWQpIHRvIGFwcGVuZCB0byBDRk4gcmVzb3VyY2VzXG4gICAgICovXG4gICAgcHVibGljIHNob3J0VVVJRDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogM3JkIHBhcnR5IEFQSSBrZXkgdG8gYmUgdXNlZCBmb3IgdGhlIHVzZSBjYXNlXG4gICAgICovXG4gICAgcHVibGljIGFwaUtleT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRoZSBJRCBvZiB0aGUgc3RhY2sgdGhhdCB3YXMgY3JlYXRlZC4gVGhpcyBpcyB1c2VkIGZvciB1cGRhdGUgYW5kIGRlbGV0ZSBzdGFja3MuXG4gICAgICovXG4gICAgX3N0YWNrSWQ6IHN0cmluZztcblxuICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgIGNvbnN0cnVjdG9yKCAvL05PU09OQVIgLSB0eXBlc2NyaXB0OlMxMDcgLSBkYXRhIG1vZGVsIGNsYXNzIGhlbmNlIG5lZWRzIHByaW1pdGl2ZSB0eXBlcyBhcyBwYXJhbWV0ZXJzXG4gICAgICAgIHVzZUNhc2VJZDogc3RyaW5nLFxuICAgICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICAgIGNmblBhcmFtZXRlcnM6IE1hcDxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWQsXG4gICAgICAgIGNvbmZpZ3VyYXRpb246IE9iamVjdCxcbiAgICAgICAgdXNlcklkOiBzdHJpbmcsXG4gICAgICAgIHByb3ZpZGVyTmFtZTogc3RyaW5nLFxuICAgICAgICB1c2VDYXNlVHlwZTogc3RyaW5nLFxuICAgICAgICBhcGlLZXk/OiBzdHJpbmdcbiAgICApIHtcbiAgICAgICAgdGhpcy51c2VDYXNlSWQgPSB1c2VDYXNlSWQ7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICAgICAgdGhpcy5jZm5QYXJhbWV0ZXJzID0gY2ZuUGFyYW1ldGVycztcbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uID0gY29uZmlndXJhdGlvbjtcbiAgICAgICAgdGhpcy51c2VySWQgPSB1c2VySWQ7XG4gICAgICAgIHRoaXMucHJvdmlkZXJOYW1lID0gcHJvdmlkZXJOYW1lXG4gICAgICAgIHRoaXMuc2hvcnRVVUlEID0gdGhpcy51c2VDYXNlSWQuc3Vic3RyaW5nKDAsIDgpO1xuICAgICAgICB0aGlzLnRlbXBsYXRlTmFtZSA9IGAke3Byb3ZpZGVyTmFtZX0ke3VzZUNhc2VUeXBlfWA7XG4gICAgICAgIHRoaXMuYXBpS2V5ID0gYXBpS2V5O1xuICAgIH1cblxuICAgIGdldCBzdGFja0lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFja0lkO1xuICAgIH1cblxuICAgIHNldCBzdGFja0lkKHN0YWNrSWQ6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9zdGFja0lkID0gc3RhY2tJZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U1NNUGFyYW1ldGVyS2V5KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLmNmblBhcmFtZXRlcnM/LmdldChDSEFUX0NPTkZJR19DRk5fUEFSQU1FVEVSX05BTUUpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXRTU01QYXJhbWV0ZXJLZXkoc3NtUGFyYW1ldGVyS2V5OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuY2ZuUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmNmblBhcmFtZXRlcnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jZm5QYXJhbWV0ZXJzLnNldChDSEFUX0NPTkZJR19DRk5fUEFSQU1FVEVSX05BTUUsIHNzbVBhcmFtZXRlcktleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBkZWVwIGNvcHkgb2YgdGhpcyBvYmplY3QsIHByZXNlcnZpbmcgbWV0aG9kcyBhbmQgcHJvcGVydHkgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyBhIGRlZXAgY29weSBvZiB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IFVzZUNhc2Uge1xuICAgICAgICBsZXQgbmV3VXNlQ2FzZSA9IG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgdGhpcy51c2VDYXNlSWQsXG4gICAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4odGhpcy5jZm5QYXJhbWV0ZXJzKSxcbiAgICAgICAgICAgIHsgLi4udGhpcy5jb25maWd1cmF0aW9uIH0sXG4gICAgICAgICAgICB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOYW1lLnNwbGl0KC8oPz1bQS1aXSkvKVswXSwgLy8gcHJvdmlkZXIgbmFtZSwgc3BsaXQgYnkgY2FwaXRhbCBsZXR0ZXJzXG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTmFtZS5zcGxpdCgvKD89W0EtWl0pLylbMV0sIC8vIHVzZSBjYXNlIHR5cGVcbiAgICAgICAgICAgIHRoaXMuYXBpS2V5XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIG5ld1VzZUNhc2U7XG4gICAgfVxuXG4gICAgcHVibGljIHJlcXVpcmVzQVBJS2V5KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gUFJPVklERVJTX1JFUVVJUklOR19BUElfS0VZLmluY2x1ZGVzKHRoaXMucHJvdmlkZXJOYW1lKTtcbiAgICB9XG59XG5cbi8qKlxuICogQWRhcHRlciBpbXBsZW1lbnRhdGlvbiBmb3IgQFVzZUNhc2UgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIExhbWJkYSBldmVudCBvYmplY3RzXG4gKiBhbmQgY29udmVydCB0aGVtIHRvIEBVc2VDYXNlIHR5cGUuXG4gKlxuICogVXNlZCBmb3Igb3BlcmF0aW9ucyB3aGljaCByZXF1aXJlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1c2UgY2FzZSB0byBwZXJmb3JtIHRoZSBhY3Rpb24sXG4gKiBzcGVjaWZpY2FsbHkgZGVwbG95bWVudHMgYW5kIHVwZGF0ZXNcbiAqL1xuZXhwb3J0IGNsYXNzIENoYXRVc2VDYXNlRGVwbG95bWVudEFkYXB0ZXIgZXh0ZW5kcyBVc2VDYXNlIHtcbiAgICBjb25zdHJ1Y3RvcihldmVudDogQVBJR2F0ZXdheUV2ZW50KSB7XG4gICAgICAgIGNvbnN0IGpzb25Cb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5ISk7XG4gICAgICAgIC8vIGluIHVwZGF0ZSBhbmQgZGVsZXRlIGNhc2VzLCB3ZSB3aWxsIGJlIHByb3ZpZGVkIGEgdXNlQ2FzZUlkLiBJbiBjcmVhdGUsIHdlIGdlbmVyYXRlIG9uZVxuICAgICAgICBjb25zdCB1c2VDYXNlSWQ6IHN0cmluZyA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VDYXNlSWQgPz8gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgICAgY29uc3QgY2ZuUGFyYW1ldGVycyA9IENoYXRVc2VDYXNlRGVwbG95bWVudEFkYXB0ZXIuY3JlYXRlQ2ZuUGFyYW1ldGVycyhqc29uQm9keSwgdXNlQ2FzZUlkKTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gQ2hhdFVzZUNhc2VEZXBsb3ltZW50QWRhcHRlci5jcmVhdGVDb25maWd1cmF0aW9uKGpzb25Cb2R5KTtcbiAgICAgICAgY29uc3QgdXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplciEuVXNlcklkO1xuXG4gICAgICAgIGlmICghanNvbkJvZHkuTGxtUGFyYW1zLk1vZGVsUHJvdmlkZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1zZyA9IGBNb2RlbCBQcm92aWRlciBuYW1lIG5vdCBmb3VuZCBpbiBldmVudCBib2R5LiAke0pTT04uc3RyaW5naWZ5KGpzb25Cb2R5KX19YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNc2cpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1pc3NpbmdWYWx1ZUVycm9yKGVyck1zZyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIHVzZUNhc2VJZCxcbiAgICAgICAgICAgIGpzb25Cb2R5Py5Vc2VDYXNlTmFtZSxcbiAgICAgICAgICAgIGpzb25Cb2R5Py5Vc2VDYXNlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAganNvbkJvZHkuTGxtUGFyYW1zLk1vZGVsUHJvdmlkZXIsXG4gICAgICAgICAgICAnQ2hhdCcsXG4gICAgICAgICAgICBqc29uQm9keS5MbG1QYXJhbXMuQXBpS2V5XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgY3JlYXRlQ2ZuUGFyYW1ldGVycyhldmVudEJvZHk6IGFueSwgdXNlQ2FzZUlkOiBzdHJpbmcpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcbiAgICAgICAgY29uc3QgY2ZuUGFyYW1ldGVycyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgIGNvbnN0IHNob3J0VVVJRCA9IHRoaXMuZ2VuZXJhdGVTaG9ydFVVSUQodXNlQ2FzZUlkKTtcbiAgICAgICAgY29uc3Qgc3NtUGFyYW1TdWZmaXhVVUlEID0gdGhpcy5nZW5lcmF0ZVNob3J0VVVJRChjcnlwdG8ucmFuZG9tVVVJRCgpKTtcblxuICAgICAgICBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLnNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICdFeGlzdGluZ0tlbmRyYUluZGV4SWQnLFxuICAgICAgICAgICAgZXZlbnRCb2R5Lktub3dsZWRnZUJhc2VQYXJhbXM/LkV4aXN0aW5nS2VuZHJhSW5kZXhJZFxuICAgICAgICApO1xuICAgICAgICBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLnNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICdOZXdLZW5kcmFJbmRleE5hbWUnLFxuICAgICAgICAgICAgZXZlbnRCb2R5Lktub3dsZWRnZUJhc2VQYXJhbXM/LktlbmRyYUluZGV4TmFtZVxuICAgICAgICApO1xuICAgICAgICBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLnNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICdOZXdLZW5kcmFRdWVyeUNhcGFjaXR5VW5pdHMnLFxuICAgICAgICAgICAgZXZlbnRCb2R5Lktub3dsZWRnZUJhc2VQYXJhbXM/LlF1ZXJ5Q2FwYWNpdHlVbml0c1xuICAgICAgICApO1xuICAgICAgICBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLnNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICdOZXdLZW5kcmFTdG9yYWdlQ2FwYWNpdHlVbml0cycsXG4gICAgICAgICAgICBldmVudEJvZHkuS25vd2xlZGdlQmFzZVBhcmFtcz8uU3RvcmFnZUNhcGFjaXR5VW5pdHNcbiAgICAgICAgKTtcbiAgICAgICAgQ2hhdFVzZUNhc2VEZXBsb3ltZW50QWRhcHRlci5zZXRQYXJhbWV0ZXJJZkV4aXN0cyhcbiAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAnTmV3S2VuZHJhSW5kZXhFZGl0aW9uJyxcbiAgICAgICAgICAgIGV2ZW50Qm9keS5Lbm93bGVkZ2VCYXNlUGFyYW1zPy5LZW5kcmFJbmRleEVkaXRpb25cbiAgICAgICAgKTtcbiAgICAgICAgLy8gaW4gb3JkZXIgdG8gc2V0IHRoaXMgYXMgYSBjZm5QYXJhbWV0ZXIsIG5vdGUgdGhlIGJvb2xlYW4gd2lsbCBiZSBjb252ZXJ0ZWQgdG8gYSBzdHJpbmcgKGUuZy4gXCJ0cnVlXCIpXG4gICAgICAgIENoYXRVc2VDYXNlRGVwbG95bWVudEFkYXB0ZXIuc2V0UGFyYW1ldGVySWZFeGlzdHMoY2ZuUGFyYW1ldGVycywgJ1JBR0VuYWJsZWQnLCBldmVudEJvZHkuTGxtUGFyYW1zPy5SQUdFbmFibGVkKTtcblxuICAgICAgICBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLnNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICdEZWZhdWx0VXNlckVtYWlsJyxcbiAgICAgICAgICAgIGV2ZW50Qm9keS5EZWZhdWx0VXNlckVtYWlsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gZml4ZWQvbWFuZGF0b3J5IHBhcmFtZXRlcnMgZm9yIHRoZSBkZXBsb3ltZW50XG5cbiAgICAgICAgLy8gZWFjaCBuZXcgZGVwbG95bWVudCBvciB1cGRhdGUgcmVxdWlyZXMgYSBuZXcgU1NNIHBhcmFtIGluIG9yZGVyIHRvIHByb3Blcmx5IGhhdmUgY2xvdWRmb3JtYXRpb24gdXBkYXRlIGFsbCByZXNvdXJjZXMgb24gYSBkZXBsb3lcbiAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoXG4gICAgICAgICAgICBDSEFUX0NPTkZJR19DRk5fUEFSQU1FVEVSX05BTUUsXG4gICAgICAgICAgICBgJHtwcm9jZXNzLmVudltVU0VfQ0FTRV9DT05GSUdfU1NNX1BBUkFNRVRFUl9QUkVGSVhfRU5WX1ZBUl0hfS8ke3Nob3J0VVVJRH0vJHtzc21QYXJhbVN1ZmZpeFVVSUR9YFxuICAgICAgICApO1xuICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnRXhpc3RpbmdDb2duaXRvVXNlclBvb2xJZCcsIHByb2Nlc3MuZW52W1VTRVJfUE9PTF9JRF9FTlZfVkFSXSEpO1xuICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnRXhpc3RpbmdDb2duaXRvR3JvdXBQb2xpY3lUYWJsZU5hbWUnLCBwcm9jZXNzLmVudltDT0dOSVRPX1BPTElDWV9UQUJMRV9FTlZfVkFSXSEpO1xuICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnVXNlQ2FzZVVVSUQnLCBgJHtzaG9ydFVVSUR9YCk7XG5cbiAgICAgICAgLy8gb25seSBzZXR0aW5nIHRoZSBwYXJhbSBmb3IgQVBJIGtleSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKGV2ZW50Qm9keS5MbG1QYXJhbXM/LkFwaUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnUHJvdmlkZXJBcGlLZXlTZWNyZXQnLCBgJHtzaG9ydFVVSUR9LyR7cHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl19YCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXBwaW5nIHRoZSBib29sIGlucHV0IGZyb20gdGhlIEFQSSBwYXlsb2FkIHRvIHRoZSBleHBlY3RlZCBmb3JtYXQgZm9yIHRoZSBDRk4gcGFyYW1ldGVyXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIGV2ZW50Qm9keS5Db25zZW50VG9EYXRhTGVhdmluZ0FXUyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICBldmVudEJvZHkuTGxtUGFyYW1zLk1vZGVsUHJvdmlkZXIgIT09IENIQVRfUFJPVklERVJTLkJFRFJPQ0tcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnRCb2R5LkNvbnNlbnRUb0RhdGFMZWF2aW5nQVdTKSB7XG4gICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoJ0NvbnNlbnRUb0RhdGFMZWF2aW5nQVdTJywgJ1llcycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnQ29uc2VudFRvRGF0YUxlYXZpbmdBV1MnLCAnTm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjZm5QYXJhbWV0ZXJzO1xuICAgIH1cblxuICAgIHByaXZhdGUgc3RhdGljIHNldFBhcmFtZXRlcklmRXhpc3RzKFxuICAgICAgICBjZm5QYXJhbWV0ZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICBwYXJhbU5hbWU6IHN0cmluZyxcbiAgICAgICAgdmFsdWU6IGFueSB8IHVuZGVmaW5lZFxuICAgICk6IHZvaWQge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQocGFyYW1OYW1lLCB2YWx1ZS50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc3RhdGljIGNyZWF0ZUNvbmZpZ3VyYXRpb24oZXZlbnRCb2R5OiBhbnkpOiBPYmplY3Qge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgVXNlQ2FzZU5hbWU6IGV2ZW50Qm9keS5Vc2VDYXNlTmFtZSxcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6IGV2ZW50Qm9keS5Db252ZXJzYXRpb25NZW1vcnlUeXBlLFxuICAgICAgICAgICAgQ29udmVyc2F0aW9uTWVtb3J5UGFyYW1zOiBldmVudEJvZHkuQ29udmVyc2F0aW9uTWVtb3J5UGFyYW1zLFxuICAgICAgICAgICAgS25vd2xlZGdlQmFzZVR5cGU6IGV2ZW50Qm9keS5Lbm93bGVkZ2VCYXNlVHlwZSxcbiAgICAgICAgICAgIEtub3dsZWRnZUJhc2VQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICBOdW1iZXJPZkRvY3M6IGV2ZW50Qm9keS5Lbm93bGVkZ2VCYXNlUGFyYW1zPy5OdW1iZXJPZkRvY3MsXG4gICAgICAgICAgICAgICAgUmV0dXJuU291cmNlRG9jczogZXZlbnRCb2R5Lktub3dsZWRnZUJhc2VQYXJhbXM/LlJldHVyblNvdXJjZURvY3NcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBMbG1QYXJhbXM6IHtcbiAgICAgICAgICAgICAgICBNb2RlbFByb3ZpZGVyOiBldmVudEJvZHkuTGxtUGFyYW1zLk1vZGVsUHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgTW9kZWxJZDogZXZlbnRCb2R5LkxsbVBhcmFtcy5Nb2RlbElkLFxuICAgICAgICAgICAgICAgIEluZmVyZW5jZUVuZHBvaW50OiBldmVudEJvZHkuTGxtUGFyYW1zLkluZmVyZW5jZUVuZHBvaW50LFxuICAgICAgICAgICAgICAgIE1vZGVsUGFyYW1zOiBldmVudEJvZHkuTGxtUGFyYW1zLk1vZGVsUGFyYW1zLFxuICAgICAgICAgICAgICAgIFByb21wdFRlbXBsYXRlOiBldmVudEJvZHkuTGxtUGFyYW1zLlByb21wdFRlbXBsYXRlLFxuICAgICAgICAgICAgICAgIFN0cmVhbWluZzogZXZlbnRCb2R5LkxsbVBhcmFtcy5TdHJlYW1pbmcsXG4gICAgICAgICAgICAgICAgVmVyYm9zZTogZXZlbnRCb2R5LkxsbVBhcmFtcy5WZXJib3NlLFxuICAgICAgICAgICAgICAgIFRlbXBlcmF0dXJlOiBldmVudEJvZHkuTGxtUGFyYW1zLlRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgICAgIFJBR0VuYWJsZWQ6IGV2ZW50Qm9keS5MbG1QYXJhbXMuUkFHRW5hYmxlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIElzSW50ZXJuYWxVc2VyOiBwcm9jZXNzLmVudltJU19JTlRFUk5BTF9VU0VSX0VOVl9WQVJdISAvLyBlbnYgdmFyIHZhbHVlIGlzIHNldCBhcyAndHJ1ZScgb3IgJ2ZhbHNlJyBvbiBkZXBsb3ltZW50IG9mIG1hbmFnZW1lbnQgc3RhY2tcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXRpYyBnZW5lcmF0ZVNob3J0VVVJRChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGlkLnN1YnN0cmluZygwLCA4KTtcbiAgICB9XG59XG5cbi8qKlxuICogQWRhcHRlciBpbXBsZW1lbnRhdGlvbiBmb3IgQFVzZUNhc2UgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIExhbWJkYSBldmVudCBvYmplY3RzXG4gKiBhbmQgY29udmVydCB0aGVtIHRvIEBVc2VDYXNlIHR5cGUuXG4gKlxuICogVXNlZCBmb3Igb3BlcmF0aW9ucyB3aGljaCByZXF1aXJlIG9ubHkgdGhlIHVzZSBjYXNlIElEIGFuZCB1c2VyLCBzdWNoIGFzIGRlbGV0aW9uLFxuICogcGVybWFuZW50IGRlbGV0aW9uLCBhbmQgZ2V0dGluZyBpbmZvIG9uIGEgc2luZ2xlIHVzZSBjYXNlXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGF0VXNlQ2FzZUluZm9BZGFwdGVyIGV4dGVuZHMgVXNlQ2FzZSB7XG4gICAgY29uc3RydWN0b3IoZXZlbnQ6IEFQSUdhdGV3YXlFdmVudCkge1xuICAgICAgICBjb25zdCB1c2VDYXNlSWQ6IHN0cmluZyA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzIS51c2VDYXNlSWQhO1xuICAgICAgICBjb25zdCB1c2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyIS5Vc2VySWQ7XG5cbiAgICAgICAgc3VwZXIodXNlQ2FzZUlkLCAnJywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHt9LCB1c2VySWQsICcnLCAnQ2hhdCcpO1xuICAgIH1cbn1cbiJdfQ==