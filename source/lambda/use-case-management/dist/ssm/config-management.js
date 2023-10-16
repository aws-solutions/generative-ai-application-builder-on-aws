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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManagement = void 0;
const client_ssm_1 = require("@aws-sdk/client-ssm");
const aws_node_user_agent_config_1 = require("aws-node-user-agent-config");
const power_tools_init_1 = require("../power-tools-init");
const use_case_config_operation_builder_1 = require("./use-case-config-operation-builder");
const lodash_1 = require("lodash");
const use_case_config_view_builder_1 = require("./use-case-config-view-builder");
/**
 * Class to store configs for deployed use cases.
 */
class ConfigManagement {
    constructor() {
        this.client = new client_ssm_1.SSMClient((0, aws_node_user_agent_config_1.customAwsConfig)());
    }
    /**
     * Method to create a new SSM parameter for a deployed use case
     *
     * @param useCase
     */
    async createUseCaseConfig(useCase) {
        const input = await new use_case_config_operation_builder_1.PutParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_ssm_1.PutParameterCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to create Use Case Config: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to update an existing SSM parameter for a deployed use case
     *
     * @param useCase
     */
    async updateUseCaseConfig(useCase, oldSSMParamName) {
        // retrieving the existing config from SSM using a dummy use case object
        let existingConfigObj = {};
        let existingConfigUseCase = useCase.clone();
        existingConfigUseCase.setSSMParameterKey(oldSSMParamName);
        try {
            const getInput = await new use_case_config_operation_builder_1.GetParameterCommandBuilder(existingConfigUseCase).build(); //NOSONAR - without await, input is empty
            const existingConfig = await this.client.send(new client_ssm_1.GetParameterCommand(getInput));
            existingConfigObj = JSON.parse(existingConfig.Parameter.Value);
        }
        catch (error) {
            const errMessage = `Failed to retrieve existing Use Case Config during update: ${error}.`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
        // merges existing config with new config, replacing common parameters with the new values
        // all ModelParams must be overwritten by the input values
        try {
            useCase.configuration = ConfigManagement.mergeConfigs(existingConfigObj, useCase.configuration);
            const putInput = await new use_case_config_operation_builder_1.PutParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
            await this.client.send(new client_ssm_1.PutParameterCommand(putInput));
        }
        catch (error) {
            const errMessage = `Failed to update Use Case Config during update: ${error}.`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
        // deletes the old SSM parameter
        try {
            const input = await new use_case_config_operation_builder_1.DeleteParameterCommandInputBuilder(existingConfigUseCase).build(); //NOSONAR - without await, input is empty
            await this.client.send(new client_ssm_1.DeleteParameterCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Merge existing config with new config, replacing common parameters with the new values.
     * For the LlmParams.ModelParams, the values from the new config are used to overwrite the
     * existing config's ModelParms.
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns
     */
    static mergeConfigs(existingConfigObj, newConfigObj) {
        const modelParams = (0, lodash_1.get)(newConfigObj, 'LlmParams.ModelParams', undefined);
        const mergedConfig = (0, lodash_1.merge)(existingConfigObj, newConfigObj);
        if (modelParams) {
            mergedConfig.LlmParams.ModelParams = modelParams;
        }
        return mergedConfig;
    }
    /**
     * Method to delete an existing SSM parameter for a deployed use case
     *
     * @param useCase
     */
    async deleteUseCaseConfig(useCase) {
        const input = await new use_case_config_operation_builder_1.DeleteParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_ssm_1.DeleteParameterCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to retrieve an existing SSM parameter for a deployed use case
     */
    async getUseCaseConfig(useCase) {
        const input = await new use_case_config_operation_builder_1.GetParameterCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_ssm_1.GetParameterCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to retrieve Use Case Config: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    async getUseCaseConfigFromName(configName) {
        const input = await new use_case_config_view_builder_1.GetParameterFromNameCommandInputBuilder(configName).build(); //NOSONAR - without await, input is empty
        try {
            const response = await this.client.send(new client_ssm_1.GetParameterCommand(input));
            return response.Parameter.Value;
        }
        catch (error) {
            const errMessage = `Failed to retrieve Use Case Config for name "${configName}": ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
}
exports.ConfigManagement = ConfigManagement;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###createUseCaseConfig' })
], ConfigManagement.prototype, "createUseCaseConfig", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateUseCaseConfig' })
], ConfigManagement.prototype, "updateUseCaseConfig", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteUseCaseConfig' })
], ConfigManagement.prototype, "deleteUseCaseConfig", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###getUseCaseConfig' })
], ConfigManagement.prototype, "getUseCaseConfig", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLW1hbmFnZW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zc20vY29uZmlnLW1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7Ozs7Ozs7OztBQUV4SCxvREFBa0g7QUFDbEgsMkVBQTZEO0FBRTdELDBEQUFxRDtBQUNyRCwyRkFJNkM7QUFFN0MsbUNBQW9DO0FBQ3BDLGlGQUF5RjtBQUV6Rjs7R0FFRztBQUNILE1BQWEsZ0JBQWdCO0lBR3pCO1FBQ0ksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLHNCQUFTLENBQUMsSUFBQSw0Q0FBZSxHQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUVVLEFBQU4sS0FBSyxDQUFDLG1CQUFtQixDQUFDLE9BQWdCO1FBQzdDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxtRUFBK0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztRQUNuSCxJQUFJO1lBQ0EsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGdDQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDMUQ7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNaLE1BQU0sVUFBVSxHQUFHLHFDQUFxQyxLQUFLLEVBQUUsQ0FBQztZQUNoRSx5QkFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFFVSxBQUFOLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUFnQixFQUFFLGVBQXVCO1FBQ3RFLHdFQUF3RTtRQUN4RSxJQUFJLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUMzQixJQUFJLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QyxxQkFBcUIsQ0FBQyxrQkFBa0Is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LGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDOzJEQVV6RjtBQVFZO0lBRFoseUJBQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDOzJEQXFDekY7QUEwQlk7SUFEWix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLENBQUM7MkRBVXpGO0FBTVk7SUFEWix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLHFCQUFxQixFQUFFLENBQUM7d0RBVXRGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBEZWxldGVQYXJhbWV0ZXJDb21tYW5kLCBHZXRQYXJhbWV0ZXJDb21tYW5kLCBQdXRQYXJhbWV0ZXJDb21tYW5kLCBTU01DbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IGN1c3RvbUF3c0NvbmZpZyB9IGZyb20gJ2F3cy1ub2RlLXVzZXItYWdlbnQtY29uZmlnJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQgeyBsb2dnZXIsIHRyYWNlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHtcbiAgICBEZWxldGVQYXJhbWV0ZXJDb21tYW5kSW5wdXRCdWlsZGVyLFxuICAgIEdldFBhcmFtZXRlckNvbW1hbmRCdWlsZGVyLFxuICAgIFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXJcbn0gZnJvbSAnLi91c2UtY2FzZS1jb25maWctb3BlcmF0aW9uLWJ1aWxkZXInO1xuXG5pbXBvcnQgeyBtZXJnZSwgZ2V0IH0gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IEdldFBhcmFtZXRlckZyb21OYW1lQ29tbWFuZElucHV0QnVpbGRlciB9IGZyb20gJy4vdXNlLWNhc2UtY29uZmlnLXZpZXctYnVpbGRlcic7XG5cbi8qKlxuICogQ2xhc3MgdG8gc3RvcmUgY29uZmlncyBmb3IgZGVwbG95ZWQgdXNlIGNhc2VzLlxuICovXG5leHBvcnQgY2xhc3MgQ29uZmlnTWFuYWdlbWVudCB7XG4gICAgcHJpdmF0ZSBjbGllbnQ6IFNTTUNsaWVudDtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBTU01DbGllbnQoY3VzdG9tQXdzQ29uZmlnKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgYSBuZXcgU1NNIHBhcmFtZXRlciBmb3IgYSBkZXBsb3llZCB1c2UgY2FzZVxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZUNhc2VcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjY3JlYXRlVXNlQ2FzZUNvbmZpZycgfSlcbiAgICBwdWJsaWMgYXN5bmMgY3JlYXRlVXNlQ2FzZUNvbmZpZyh1c2VDYXNlOiBVc2VDYXNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IFB1dFBhcmFtZXRlckNvbW1hbmQoaW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNyZWF0ZSBVc2UgQ2FzZSBDb25maWc6ICR7ZXJyb3J9YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIHVwZGF0ZSBhbiBleGlzdGluZyBTU00gcGFyYW1ldGVyIGZvciBhIGRlcGxveWVkIHVzZSBjYXNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlQ2FzZVxuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyN1cGRhdGVVc2VDYXNlQ29uZmlnJyB9KVxuICAgIHB1YmxpYyBhc3luYyB1cGRhdGVVc2VDYXNlQ29uZmlnKHVzZUNhc2U6IFVzZUNhc2UsIG9sZFNTTVBhcmFtTmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIC8vIHJldHJpZXZpbmcgdGhlIGV4aXN0aW5nIGNvbmZpZyBmcm9tIFNTTSB1c2luZyBhIGR1bW15IHVzZSBjYXNlIG9iamVjdFxuICAgICAgICBsZXQgZXhpc3RpbmdDb25maWdPYmogPSB7fTtcbiAgICAgICAgbGV0IGV4aXN0aW5nQ29uZmlnVXNlQ2FzZSA9IHVzZUNhc2UuY2xvbmUoKTtcbiAgICAgICAgZXhpc3RpbmdDb25maWdVc2VDYXNlLnNldFNTTVBhcmFtZXRlcktleShvbGRTU01QYXJhbU5hbWUpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZ2V0SW5wdXQgPSBhd2FpdCBuZXcgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIoZXhpc3RpbmdDb25maWdVc2VDYXNlKS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdDb25maWcgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBHZXRQYXJhbWV0ZXJDb21tYW5kKGdldElucHV0KSk7XG4gICAgICAgICAgICBleGlzdGluZ0NvbmZpZ09iaiA9IEpTT04ucGFyc2UoZXhpc3RpbmdDb25maWcuUGFyYW1ldGVyIS5WYWx1ZSEpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gcmV0cmlldmUgZXhpc3RpbmcgVXNlIENhc2UgQ29uZmlnIGR1cmluZyB1cGRhdGU6ICR7ZXJyb3J9LmA7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyTWVzc2FnZSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1lcmdlcyBleGlzdGluZyBjb25maWcgd2l0aCBuZXcgY29uZmlnLCByZXBsYWNpbmcgY29tbW9uIHBhcmFtZXRlcnMgd2l0aCB0aGUgbmV3IHZhbHVlc1xuICAgICAgICAvLyBhbGwgTW9kZWxQYXJhbXMgbXVzdCBiZSBvdmVyd3JpdHRlbiBieSB0aGUgaW5wdXQgdmFsdWVzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB1c2VDYXNlLmNvbmZpZ3VyYXRpb24gPSBDb25maWdNYW5hZ2VtZW50Lm1lcmdlQ29uZmlncyhleGlzdGluZ0NvbmZpZ09iaiwgdXNlQ2FzZS5jb25maWd1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHB1dElucHV0ID0gYXdhaXQgbmV3IFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IFB1dFBhcmFtZXRlckNvbW1hbmQocHV0SW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIHVwZGF0ZSBVc2UgQ2FzZSBDb25maWcgZHVyaW5nIHVwZGF0ZTogJHtlcnJvcn0uYDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZGVsZXRlcyB0aGUgb2xkIFNTTSBwYXJhbWV0ZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IERlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXIoZXhpc3RpbmdDb25maWdVc2VDYXNlKS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGllbnQuc2VuZChuZXcgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZChpbnB1dCkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gZGVsZXRlIFVzZSBDYXNlIENvbmZpZzogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBleGlzdGluZyBjb25maWcgd2l0aCBuZXcgY29uZmlnLCByZXBsYWNpbmcgY29tbW9uIHBhcmFtZXRlcnMgd2l0aCB0aGUgbmV3IHZhbHVlcy5cbiAgICAgKiBGb3IgdGhlIExsbVBhcmFtcy5Nb2RlbFBhcmFtcywgdGhlIHZhbHVlcyBmcm9tIHRoZSBuZXcgY29uZmlnIGFyZSB1c2VkIHRvIG92ZXJ3cml0ZSB0aGVcbiAgICAgKiBleGlzdGluZyBjb25maWcncyBNb2RlbFBhcm1zLlxuICAgICAqIEBwYXJhbSBleGlzdGluZ0NvbmZpZ09iaiBFeGlzdGluZyBjb25maWcgZGF0YSBvYmplY3RcbiAgICAgKiBAcGFyYW0gbmV3Q29uZmlnT2JqIENvbmZpZyBkYXRhIHRvIGJlIHVwZGF0ZWRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqL1xuICAgIHByaXZhdGUgc3RhdGljIG1lcmdlQ29uZmlncyhleGlzdGluZ0NvbmZpZ09iajogYW55LCBuZXdDb25maWdPYmo6IGFueSk6IGFueSB7XG4gICAgICAgIGNvbnN0IG1vZGVsUGFyYW1zID0gZ2V0KG5ld0NvbmZpZ09iaiwgJ0xsbVBhcmFtcy5Nb2RlbFBhcmFtcycsIHVuZGVmaW5lZCk7XG5cbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gbWVyZ2UoZXhpc3RpbmdDb25maWdPYmosIG5ld0NvbmZpZ09iaik7XG4gICAgICAgIGlmIChtb2RlbFBhcmFtcykge1xuICAgICAgICAgICAgbWVyZ2VkQ29uZmlnLkxsbVBhcmFtcy5Nb2RlbFBhcmFtcyA9IG1vZGVsUGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZXJnZWRDb25maWc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGRlbGV0ZSBhbiBleGlzdGluZyBTU00gcGFyYW1ldGVyIGZvciBhIGRlcGxveWVkIHVzZSBjYXNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlQ2FzZVxuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNkZWxldGVVc2VDYXNlQ29uZmlnJyB9KVxuICAgIHB1YmxpYyBhc3luYyBkZWxldGVVc2VDYXNlQ29uZmlnKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0QnVpbGRlcih1c2VDYXNlKS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGllbnQuc2VuZChuZXcgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZChpbnB1dCkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gZGVsZXRlIFVzZSBDYXNlIENvbmZpZzogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdG8gcmV0cmlldmUgYW4gZXhpc3RpbmcgU1NNIHBhcmFtZXRlciBmb3IgYSBkZXBsb3llZCB1c2UgY2FzZVxuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNnZXRVc2VDYXNlQ29uZmlnJyB9KVxuICAgIHB1YmxpYyBhc3luYyBnZXRVc2VDYXNlQ29uZmlnKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IEdldFBhcmFtZXRlckNvbW1hbmQoaW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIHJldHJpZXZlIFVzZSBDYXNlIENvbmZpZzogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZ2V0VXNlQ2FzZUNvbmZpZ0Zyb21OYW1lKGNvbmZpZ05hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IEdldFBhcmFtZXRlckZyb21OYW1lQ29tbWFuZElucHV0QnVpbGRlcihjb25maWdOYW1lKS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBHZXRQYXJhbWV0ZXJDb21tYW5kKGlucHV0KSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuUGFyYW1ldGVyIS5WYWx1ZSE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJNZXNzYWdlID0gYEZhaWxlZCB0byByZXRyaWV2ZSBVc2UgQ2FzZSBDb25maWcgZm9yIG5hbWUgXCIke2NvbmZpZ05hbWV9XCI6ICR7ZXJyb3J9YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19