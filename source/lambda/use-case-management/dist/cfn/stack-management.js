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
exports.StackManagement = void 0;
const metrics_1 = require("@aws-lambda-powertools/metrics");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const aws_node_user_agent_config_1 = require("aws-node-user-agent-config");
const power_tools_init_1 = require("../power-tools-init");
const stack_operation_builder_1 = require("./stack-operation-builder");
const stack_view_builder_1 = require("./stack-view-builder");
const constants_1 = require("../utils/constants");
/**
 * Class to manage use case stacks
 */
class StackManagement {
    constructor() {
        this.cfnClient = new client_cloudformation_1.CloudFormationClient((0, aws_node_user_agent_config_1.customAwsConfig)());
        this.ssmClient = new client_ssm_1.SSMClient((0, aws_node_user_agent_config_1.customAwsConfig)());
        power_tools_init_1.tracer.captureAWSv3Client(this.cfnClient);
        power_tools_init_1.tracer.captureAWSv3Client(this.ssmClient);
    }
    /**
     * Method that creates a use case stack using cloudformation
     *
     * @param useCase - the parameters required to pass to cloudformation
     * @returns stackId - the id of the created stack
     */
    async createStack(useCase) {
        const input = await new stack_operation_builder_1.CreateStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new client_cloudformation_1.CreateStackCommand(input);
        let response;
        try {
            response = await this.cfnClient.send(command);
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_INITIATION_SUCCESS, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.debug(`StackId: ${response.StackId}`);
        }
        catch (error) {
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_INITIATION_FAILURE, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.error(`Error occurred when creating stack, error is ${error}`);
            throw error;
        }
        finally {
            power_tools_init_1.metrics.publishStoredMetrics();
        }
        return response.StackId;
    }
    /**
     * Method to delete a use case stack
     *
     * @param stackId
     */
    async updateStack(useCase) {
        const input = await new stack_operation_builder_1.UpdateStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new client_cloudformation_1.UpdateStackCommand(input);
        let response;
        try {
            response = await this.cfnClient.send(command);
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_UPDATE_SUCCESS, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.debug(`StackId: ${response.StackId}`);
        }
        catch (error) {
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_UPDATE_FAILURE, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.error(`Error occurred when updating stack, error is ${error}`);
            throw error;
        }
        finally {
            power_tools_init_1.metrics.publishStoredMetrics();
        }
        return response.StackId;
    }
    /**
     * Method to update a use case stack
     *
     * @param stackId
     */
    async deleteStack(useCase) {
        const input = await new stack_operation_builder_1.DeleteStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new client_cloudformation_1.DeleteStackCommand(input);
        let response;
        try {
            response = await this.cfnClient.send(command);
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_DELETION_SUCCESS, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.debug(`StackId: ${response}`);
        }
        catch (error) {
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_DELETION_FAILURE, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.error(`Error occurred when deleting stack, error is ${error}`);
            throw error;
        }
        finally {
            power_tools_init_1.metrics.publishStoredMetrics();
        }
    }
    /**
     * Method to view the details of a use case stack
     */
    async getStackDetails(stackInfo) {
        const input = await new stack_view_builder_1.DescribeStacksCommandInputBuilder(stackInfo).build(); //NOSONAR - removing await, input is empty
        const command = new client_cloudformation_1.DescribeStacksCommand(input);
        let response;
        try {
            response = await this.cfnClient.send(command);
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_DESCRIBE_SUCCESS, metrics_1.MetricUnits.Count, 1);
            // extra error handling to ensure we only get the first stack
            if (response.Stacks.length > 1) {
                throw new Error('More than one stack returned');
            }
            return StackManagement.parseStackDetails(response.Stacks[0]);
        }
        catch (error) {
            power_tools_init_1.metrics.addMetric(constants_1.CloudWatchMetrics.UC_DESCRIBE_FAILURE, metrics_1.MetricUnits.Count, 1);
            power_tools_init_1.logger.error(`Error occurred when describing stack, error is ${error}`);
            throw error;
        }
        finally {
            power_tools_init_1.metrics.publishStoredMetrics();
        }
    }
}
exports.StackManagement = StackManagement;
/**
 * Parse the stack details to get a subset of the required details
 * @param stackDetails response of describe stack for a single stack
 */
StackManagement.parseStackDetails = (stackDetails) => {
    const findParameterValue = (key) => {
        var _a, _b;
        return (_b = (_a = stackDetails.Parameters) === null || _a === void 0 ? void 0 : _a.find((param) => param.ParameterKey === key)) === null || _b === void 0 ? void 0 : _b.ParameterValue;
    };
    const findOutputValue = (key) => {
        var _a, _b;
        return (_b = (_a = stackDetails.Outputs) === null || _a === void 0 ? void 0 : _a.find((param) => param.OutputKey === key)) === null || _b === void 0 ? void 0 : _b.OutputValue;
    };
    return {
        status: stackDetails.StackStatus,
        chatConfigSSMParameterName: findParameterValue('ChatConfigSSMParameterName'),
        defaultUserEmail: findParameterValue('DefaultUserEmail'),
        useCaseUUID: findParameterValue('UseCaseUUID'),
        ragEnabled: findParameterValue('RAGEnabled'),
        webConfigKey: findOutputValue('WebConfigKey'),
        kendraIndexId: findOutputValue('KendraIndexId'),
        cloudFrontWebUrl: findOutputValue('CloudFrontWebUrl'),
        cloudwatchDashboardUrl: findOutputValue('CloudwatchDashboardUrl'),
        providerApiKeySecret: findParameterValue('ProviderApiKeySecret')
    };
};
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###createStack' })
], StackManagement.prototype, "createStack", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateStack' })
], StackManagement.prototype, "updateStack", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteStack' })
], StackManagement.prototype, "deleteStack", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###getStackDetails' })
], StackManagement.prototype, "getStackDetails", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stbWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Nmbi9zdGFjay1tYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7d0hBV3dIOzs7Ozs7Ozs7QUFFeEgsNERBQTZEO0FBQzdELDBFQVd3QztBQUN4QyxvREFBZ0Q7QUFDaEQsMkVBQTZEO0FBRzdELDBEQUE4RDtBQUM5RCx1RUFJbUM7QUFDbkMsNkRBQXlFO0FBQ3pFLGtEQUF1RDtBQWV2RDs7R0FFRztBQUNILE1BQWEsZUFBZTtJQUt4QjtRQUNJLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSw0Q0FBb0IsQ0FBQyxJQUFBLDRDQUFlLEdBQUUsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUEsNENBQWUsR0FBRSxDQUFDLENBQUM7UUFDbEQseUJBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMseUJBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUNEOzs7OztPQUtHO0lBRVUsQUFBTixLQUFLLENBQUMsV0FBVyxDQUFDLE9BQWdCO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSx3REFBOEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQztRQUNuSCxNQUFNLE9BQU8sR0FBRyxJQUFJLDBDQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTlDLElBQUksUUFBa0MsQ0FBQztRQUN2QyxJQUFJO1lBQ0EsUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUMsMEJBQU8sQ0FBQyxTQUFTLENBQUMsNkJBQWlCLENBQUMscUJBQXFCLEVBQUUscUJBQVcsQ0FBQyxLQUFL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QyxhQUFhLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2tEQWdCakY7QUFNWTtJQURaLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQztzREF1QnJGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBNZXRyaWNVbml0cyB9IGZyb20gJ0Bhd3MtbGFtYmRhLXBvd2VydG9vbHMvbWV0cmljcyc7XG5pbXBvcnQge1xuICAgIENsb3VkRm9ybWF0aW9uQ2xpZW50LFxuICAgIENyZWF0ZVN0YWNrQ29tbWFuZCxcbiAgICBDcmVhdGVTdGFja0NvbW1hbmRPdXRwdXQsXG4gICAgRGVsZXRlU3RhY2tDb21tYW5kLFxuICAgIERlbGV0ZVN0YWNrQ29tbWFuZE91dHB1dCxcbiAgICBEZXNjcmliZVN0YWNrc0NvbW1hbmQsXG4gICAgRGVzY3JpYmVTdGFja3NDb21tYW5kT3V0cHV0LFxuICAgIFN0YWNrLFxuICAgIFVwZGF0ZVN0YWNrQ29tbWFuZCxcbiAgICBVcGRhdGVTdGFja0NvbW1hbmRPdXRwdXRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7IFNTTUNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zc20nO1xuaW1wb3J0IHsgY3VzdG9tQXdzQ29uZmlnIH0gZnJvbSAnYXdzLW5vZGUtdXNlci1hZ2VudC1jb25maWcnO1xuaW1wb3J0IHsgU3RhY2tJbmZvIH0gZnJvbSAnLi4vbW9kZWwvbGlzdC11c2UtY2FzZXMnO1xuaW1wb3J0IHsgVXNlQ2FzZSB9IGZyb20gJy4uL21vZGVsL3VzZS1jYXNlJztcbmltcG9ydCB7IGxvZ2dlciwgbWV0cmljcywgdHJhY2VyIH0gZnJvbSAnLi4vcG93ZXItdG9vbHMtaW5pdCc7XG5pbXBvcnQge1xuICAgIENyZWF0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlcixcbiAgICBEZWxldGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIsXG4gICAgVXBkYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyXG59IGZyb20gJy4vc3RhY2stb3BlcmF0aW9uLWJ1aWxkZXInO1xuaW1wb3J0IHsgRGVzY3JpYmVTdGFja3NDb21tYW5kSW5wdXRCdWlsZGVyIH0gZnJvbSAnLi9zdGFjay12aWV3LWJ1aWxkZXInO1xuaW1wb3J0IHsgQ2xvdWRXYXRjaE1ldHJpY3MgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZUNhc2VTdGFja0RldGFpbHMge1xuICAgIHN0YXR1czogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdlYkNvbmZpZ0tleTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGNoYXRDb25maWdTU01QYXJhbWV0ZXJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgY2xvdWRGcm9udFdlYlVybDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGRlZmF1bHRVc2VyRW1haWw6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBrZW5kcmFJbmRleElkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgY2xvdWR3YXRjaERhc2hib2FyZFVybDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHVzZUNhc2VVVUlEOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgcmFnRW5hYmxlZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHByb3ZpZGVyQXBpS2V5U2VjcmV0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ2xhc3MgdG8gbWFuYWdlIHVzZSBjYXNlIHN0YWNrc1xuICovXG5leHBvcnQgY2xhc3MgU3RhY2tNYW5hZ2VtZW50IHtcbiAgICBwcml2YXRlIGNmbkNsaWVudDogQ2xvdWRGb3JtYXRpb25DbGllbnQ7XG5cbiAgICBwcml2YXRlIHNzbUNsaWVudDogU1NNQ2xpZW50O1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuY2ZuQ2xpZW50ID0gbmV3IENsb3VkRm9ybWF0aW9uQ2xpZW50KGN1c3RvbUF3c0NvbmZpZygpKTtcbiAgICAgICAgdGhpcy5zc21DbGllbnQgPSBuZXcgU1NNQ2xpZW50KGN1c3RvbUF3c0NvbmZpZygpKTtcbiAgICAgICAgdHJhY2VyLmNhcHR1cmVBV1N2M0NsaWVudCh0aGlzLmNmbkNsaWVudCk7XG4gICAgICAgIHRyYWNlci5jYXB0dXJlQVdTdjNDbGllbnQodGhpcy5zc21DbGllbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdGhhdCBjcmVhdGVzIGEgdXNlIGNhc2Ugc3RhY2sgdXNpbmcgY2xvdWRmb3JtYXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlIC0gdGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgdG8gcGFzcyB0byBjbG91ZGZvcm1hdGlvblxuICAgICAqIEByZXR1cm5zIHN0YWNrSWQgLSB0aGUgaWQgb2YgdGhlIGNyZWF0ZWQgc3RhY2tcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjY3JlYXRlU3RhY2snIH0pXG4gICAgcHVibGljIGFzeW5jIGNyZWF0ZVN0YWNrKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IG5ldyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gcmVtb3ZpbmcgYXdhaXQsIGlucHV0IGlzIGVtcHR5XG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgQ3JlYXRlU3RhY2tDb21tYW5kKGlucHV0KTtcblxuICAgICAgICBsZXQgcmVzcG9uc2U6IENyZWF0ZVN0YWNrQ29tbWFuZE91dHB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jZm5DbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICAgICAgICAgIG1ldHJpY3MuYWRkTWV0cmljKENsb3VkV2F0Y2hNZXRyaWNzLlVDX0lOSVRJQVRJT05fU1VDQ0VTUywgTWV0cmljVW5pdHMuQ291bnQsIDEpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBTdGFja0lkOiAke3Jlc3BvbnNlLlN0YWNrSWR9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBtZXRyaWNzLmFkZE1ldHJpYyhDbG91ZFdhdGNoTWV0cmljcy5VQ19JTklUSUFUSU9OX0ZBSUxVUkUsIE1ldHJpY1VuaXRzLkNvdW50LCAxKTtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igb2NjdXJyZWQgd2hlbiBjcmVhdGluZyBzdGFjaywgZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgbWV0cmljcy5wdWJsaXNoU3RvcmVkTWV0cmljcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLlN0YWNrSWQhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBkZWxldGUgYSB1c2UgY2FzZSBzdGFja1xuICAgICAqXG4gICAgICogQHBhcmFtIHN0YWNrSWRcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjdXBkYXRlU3RhY2snIH0pXG4gICAgcHVibGljIGFzeW5jIHVwZGF0ZVN0YWNrKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IG5ldyBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gcmVtb3ZpbmcgYXdhaXQsIGlucHV0IGlzIGVtcHR5XG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlU3RhY2tDb21tYW5kKGlucHV0KTtcbiAgICAgICAgbGV0IHJlc3BvbnNlOiBVcGRhdGVTdGFja0NvbW1hbmRPdXRwdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuY2ZuQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgICAgICAgICBtZXRyaWNzLmFkZE1ldHJpYyhDbG91ZFdhdGNoTWV0cmljcy5VQ19VUERBVEVfU1VDQ0VTUywgTWV0cmljVW5pdHMuQ291bnQsIDEpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBTdGFja0lkOiAke3Jlc3BvbnNlLlN0YWNrSWR9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBtZXRyaWNzLmFkZE1ldHJpYyhDbG91ZFdhdGNoTWV0cmljcy5VQ19VUERBVEVfRkFJTFVSRSwgTWV0cmljVW5pdHMuQ291bnQsIDEpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBvY2N1cnJlZCB3aGVuIHVwZGF0aW5nIHN0YWNrLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBtZXRyaWNzLnB1Ymxpc2hTdG9yZWRNZXRyaWNzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLlN0YWNrSWQhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byB1cGRhdGUgYSB1c2UgY2FzZSBzdGFja1xuICAgICAqXG4gICAgICogQHBhcmFtIHN0YWNrSWRcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjZGVsZXRlU3RhY2snIH0pXG4gICAgcHVibGljIGFzeW5jIGRlbGV0ZVN0YWNrKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgRGVsZXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7IC8vTk9TT05BUiAtIHJlbW92aW5nIGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IERlbGV0ZVN0YWNrQ29tbWFuZChpbnB1dCk7XG4gICAgICAgIGxldCByZXNwb25zZTogRGVsZXRlU3RhY2tDb21tYW5kT3V0cHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNmbkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgICAgICAgICAgbWV0cmljcy5hZGRNZXRyaWMoQ2xvdWRXYXRjaE1ldHJpY3MuVUNfREVMRVRJT05fU1VDQ0VTUywgTWV0cmljVW5pdHMuQ291bnQsIDEpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBTdGFja0lkOiAke3Jlc3BvbnNlfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbWV0cmljcy5hZGRNZXRyaWMoQ2xvdWRXYXRjaE1ldHJpY3MuVUNfREVMRVRJT05fRkFJTFVSRSwgTWV0cmljVW5pdHMuQ291bnQsIDEpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBvY2N1cnJlZCB3aGVuIGRlbGV0aW5nIHN0YWNrLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBtZXRyaWNzLnB1Ymxpc2hTdG9yZWRNZXRyaWNzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdG8gdmlldyB0aGUgZGV0YWlscyBvZiBhIHVzZSBjYXNlIHN0YWNrXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiB0cnVlLCBzdWJTZWdtZW50TmFtZTogJyMjI2dldFN0YWNrRGV0YWlscycgfSlcbiAgICBwdWJsaWMgYXN5bmMgZ2V0U3RhY2tEZXRhaWxzKHN0YWNrSW5mbzogU3RhY2tJbmZvKTogUHJvbWlzZTxVc2VDYXNlU3RhY2tEZXRhaWxzPiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0QnVpbGRlcihzdGFja0luZm8pLmJ1aWxkKCk7IC8vTk9TT05BUiAtIHJlbW92aW5nIGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZChpbnB1dCk7XG5cbiAgICAgICAgbGV0IHJlc3BvbnNlOiBEZXNjcmliZVN0YWNrc0NvbW1hbmRPdXRwdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuY2ZuQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgICAgICAgICBtZXRyaWNzLmFkZE1ldHJpYyhDbG91ZFdhdGNoTWV0cmljcy5VQ19ERVNDUklCRV9TVUNDRVNTLCBNZXRyaWNVbml0cy5Db3VudCwgMSk7XG5cbiAgICAgICAgICAgIC8vIGV4dHJhIGVycm9yIGhhbmRsaW5nIHRvIGVuc3VyZSB3ZSBvbmx5IGdldCB0aGUgZmlyc3Qgc3RhY2tcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5TdGFja3MhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vcmUgdGhhbiBvbmUgc3RhY2sgcmV0dXJuZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBTdGFja01hbmFnZW1lbnQucGFyc2VTdGFja0RldGFpbHMocmVzcG9uc2UuU3RhY2tzIVswXSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBtZXRyaWNzLmFkZE1ldHJpYyhDbG91ZFdhdGNoTWV0cmljcy5VQ19ERVNDUklCRV9GQUlMVVJFLCBNZXRyaWNVbml0cy5Db3VudCwgMSk7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIG9jY3VycmVkIHdoZW4gZGVzY3JpYmluZyBzdGFjaywgZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgbWV0cmljcy5wdWJsaXNoU3RvcmVkTWV0cmljcygpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZSB0aGUgc3RhY2sgZGV0YWlscyB0byBnZXQgYSBzdWJzZXQgb2YgdGhlIHJlcXVpcmVkIGRldGFpbHNcbiAgICAgKiBAcGFyYW0gc3RhY2tEZXRhaWxzIHJlc3BvbnNlIG9mIGRlc2NyaWJlIHN0YWNrIGZvciBhIHNpbmdsZSBzdGFja1xuICAgICAqL1xuICAgIHByaXZhdGUgc3RhdGljIHBhcnNlU3RhY2tEZXRhaWxzID0gKHN0YWNrRGV0YWlsczogU3RhY2spOiBVc2VDYXNlU3RhY2tEZXRhaWxzID0+IHtcbiAgICAgICAgY29uc3QgZmluZFBhcmFtZXRlclZhbHVlID0gKGtleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzdGFja0RldGFpbHMuUGFyYW1ldGVycz8uZmluZCgocGFyYW0pID0+IHBhcmFtLlBhcmFtZXRlcktleSA9PT0ga2V5KT8uUGFyYW1ldGVyVmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZmluZE91dHB1dFZhbHVlID0gKGtleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzdGFja0RldGFpbHMuT3V0cHV0cz8uZmluZCgocGFyYW0pID0+IHBhcmFtLk91dHB1dEtleSA9PT0ga2V5KT8uT3V0cHV0VmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogc3RhY2tEZXRhaWxzLlN0YWNrU3RhdHVzLFxuICAgICAgICAgICAgY2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWU6IGZpbmRQYXJhbWV0ZXJWYWx1ZSgnQ2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWUnKSxcbiAgICAgICAgICAgIGRlZmF1bHRVc2VyRW1haWw6IGZpbmRQYXJhbWV0ZXJWYWx1ZSgnRGVmYXVsdFVzZXJFbWFpbCcpLFxuICAgICAgICAgICAgdXNlQ2FzZVVVSUQ6IGZpbmRQYXJhbWV0ZXJWYWx1ZSgnVXNlQ2FzZVVVSUQnKSxcbiAgICAgICAgICAgIHJhZ0VuYWJsZWQ6IGZpbmRQYXJhbWV0ZXJWYWx1ZSgnUkFHRW5hYmxlZCcpLFxuICAgICAgICAgICAgd2ViQ29uZmlnS2V5OiBmaW5kT3V0cHV0VmFsdWUoJ1dlYkNvbmZpZ0tleScpLFxuICAgICAgICAgICAga2VuZHJhSW5kZXhJZDogZmluZE91dHB1dFZhbHVlKCdLZW5kcmFJbmRleElkJyksXG4gICAgICAgICAgICBjbG91ZEZyb250V2ViVXJsOiBmaW5kT3V0cHV0VmFsdWUoJ0Nsb3VkRnJvbnRXZWJVcmwnKSxcbiAgICAgICAgICAgIGNsb3Vkd2F0Y2hEYXNoYm9hcmRVcmw6IGZpbmRPdXRwdXRWYWx1ZSgnQ2xvdWR3YXRjaERhc2hib2FyZFVybCcpLFxuICAgICAgICAgICAgcHJvdmlkZXJBcGlLZXlTZWNyZXQ6IGZpbmRQYXJhbWV0ZXJWYWx1ZSgnUHJvdmlkZXJBcGlLZXlTZWNyZXQnKVxuICAgICAgICB9O1xuICAgIH07XG59XG4iXX0=