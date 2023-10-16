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
exports.StorageManagement = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const aws_node_user_agent_config_1 = require("aws-node-user-agent-config");
const power_tools_init_1 = require("../power-tools-init");
const storage_operation_builder_1 = require("./storage-operation-builder");
const storage_view_builder_1 = require("./storage-view-builder");
/**
 * Class to store state information for deployed use cases.
 */
class StorageManagement {
    constructor() {
        this.client = new client_dynamodb_1.DynamoDBClient((0, aws_node_user_agent_config_1.customAwsConfig)());
    }
    /**
     * Method to create a new record for a deployed use case in DynamoDB
     *
     * @param useCase
     */
    async createUseCaseRecord(useCase) {
        const input = await new storage_operation_builder_1.PutItemCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_dynamodb_1.PutItemCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to create Use Case Record: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to update an existing record for a deployed use case in DynamoDB using
     * stackId as the hash key
     *
     * @param useCase
     */
    async updateUseCaseRecord(useCase) {
        const input = await new storage_operation_builder_1.UpdateItemCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_dynamodb_1.UpdateItemCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to update Use Case Record: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method for setting the TTL of a use case in the use cases table
     *
     * @param useCase
     */
    async markUseCaseRecordForDeletion(useCase) {
        const input = await new storage_operation_builder_1.MarkItemForDeletionCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_dynamodb_1.UpdateItemCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to update Use Case Record: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to permanently delete a record from the use cases table
     *
     * @param useCase
     */
    async deleteUseCaseRecord(useCase) {
        const input = await new storage_operation_builder_1.DeleteItemCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_dynamodb_1.DeleteItemCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to delete Use Case Record: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to get a single record from the use cases table
     *
     * @param useCase
     */
    async getUseCaseRecord(useCase) {
        const input = await new storage_operation_builder_1.GetItemCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            const response = await this.client.send(new client_dynamodb_1.GetItemCommand(input));
            power_tools_init_1.logger.debug(`Got DDB response: ${JSON.stringify(response)}`);
            return (0, util_dynamodb_1.unmarshall)(response.Item);
        }
        catch (error) {
            const errMessage = `Failed to get Use Case Record: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * method to view all cases in DynamoDB
     */
    async getAllCaseRecords(listUseCasesEvent) {
        var _a;
        const useCases = [];
        try {
            const input = await new storage_view_builder_1.ScanCaseTableCommandBuilder(listUseCasesEvent).build(); //NOSONAR - without await, input is empty
            const response = await this.client.send(new client_dynamodb_1.ScanCommand(input));
            const itemCount = response.ScannedCount;
            // need to unmarshall the ddb response to get the actual data
            (_a = response.Items) === null || _a === void 0 ? void 0 : _a.forEach((item) => {
                useCases.push((0, util_dynamodb_1.unmarshall)(item));
            });
            power_tools_init_1.logger.debug(`Unmarshalled useCases: ${JSON.stringify(useCases)}`);
            return {
                useCaseRecords: useCases,
                scannedCount: itemCount
            };
        }
        catch (error) {
            const errMessage = `Failed to fetch cases: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
}
exports.StorageManagement = StorageManagement;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###createUseCaseRecord' })
], StorageManagement.prototype, "createUseCaseRecord", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecord' })
], StorageManagement.prototype, "updateUseCaseRecord", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###markUseCaseRecordForDeletion' })
], StorageManagement.prototype, "markUseCaseRecordForDeletion", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteUseCaseRecord' })
], StorageManagement.prototype, "deleteUseCaseRecord", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseRecord' })
], StorageManagement.prototype, "getUseCaseRecord", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###viewAllCases' })
], StorageManagement.prototype, "getAllCaseRecords", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1tYW5hZ2VtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGRiL3N0b3JhZ2UtbWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBRXhILDhEQU9rQztBQUNsQywwREFBb0Q7QUFDcEQsMkVBQTZEO0FBRzdELDBEQUFxRDtBQUNyRCwyRUFNcUM7QUFDckMsaUVBQXFFO0FBT3JFOztHQUVHO0FBQ0gsTUFBYSxpQkFBaUI7SUFHMUI7UUFDSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxJQUFBLDRDQUFlLEdBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRDs7OztPQUlHO0lBRVUsQUFBTixLQUFLLENBQUMsbUJBQW1CLENBQUMsT0FBZ0I7UUFDN0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLHNEQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMseUNBQXlDO1FBQzlHLElBQUk7WUFDQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksZ0NBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDWixNQUFNLFVBQVUsR0FBRyxxQ0FBcUMsS0FBSyxFQUFFLENBQUM7WUFDaEUseUJBQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekIsTUFBTSxLQUFLLENBQUM7U0FDZjtJQUNMLENBQUM7SUFFRDs7Ozs7T0FLRztJQUVVLEFBQU4sS0FBSyxDQUFDLG1CQUFtQixDQUFDLE9BQWdCO1FBQzdDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxvREFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztRQUM1RyxJQUFJO1lBQ0EsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElB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QUFhLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDOzBEQXVCbkYiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7XG4gICAgRGVsZXRlSXRlbUNvbW1hbmQsXG4gICAgRHluYW1vREJDbGllbnQsXG4gICAgR2V0SXRlbUNvbW1hbmQsXG4gICAgUHV0SXRlbUNvbW1hbmQsXG4gICAgU2NhbkNvbW1hbmQsXG4gICAgVXBkYXRlSXRlbUNvbW1hbmRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IHVubWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcbmltcG9ydCB7IGN1c3RvbUF3c0NvbmZpZyB9IGZyb20gJ2F3cy1ub2RlLXVzZXItYWdlbnQtY29uZmlnJztcbmltcG9ydCB7IExpc3RVc2VDYXNlc0FkYXB0ZXIsIFVzZUNhc2VSZWNvcmQgfSBmcm9tICcuLi9tb2RlbC9saXN0LXVzZS1jYXNlcyc7XG5pbXBvcnQgeyBVc2VDYXNlIH0gZnJvbSAnLi4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7XG4gICAgRGVsZXRlSXRlbUNvbW1hbmRCdWlsZGVyLFxuICAgIEdldEl0ZW1Db21tYW5kSW5wdXRCdWlsZGVyLFxuICAgIE1hcmtJdGVtRm9yRGVsZXRpb25Db21tYW5kQnVpbGRlcixcbiAgICBQdXRJdGVtQ29tbWFuZElucHV0QnVpbGRlcixcbiAgICBVcGRhdGVJdGVtQ29tbWFuZEJ1aWxkZXJcbn0gZnJvbSAnLi9zdG9yYWdlLW9wZXJhdGlvbi1idWlsZGVyJztcbmltcG9ydCB7IFNjYW5DYXNlVGFibGVDb21tYW5kQnVpbGRlciB9IGZyb20gJy4vc3RvcmFnZS12aWV3LWJ1aWxkZXInO1xuXG5leHBvcnQgdHlwZSBMaXN0VXNlQ2FzZXNSZWNvcmRzID0ge1xuICAgIHVzZUNhc2VSZWNvcmRzOiBVc2VDYXNlUmVjb3JkW107XG4gICAgc2Nhbm5lZENvdW50PzogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBDbGFzcyB0byBzdG9yZSBzdGF0ZSBpbmZvcm1hdGlvbiBmb3IgZGVwbG95ZWQgdXNlIGNhc2VzLlxuICovXG5leHBvcnQgY2xhc3MgU3RvcmFnZU1hbmFnZW1lbnQge1xuICAgIHByaXZhdGUgY2xpZW50OiBEeW5hbW9EQkNsaWVudDtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudChjdXN0b21Bd3NDb25maWcoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIG5ldyByZWNvcmQgZm9yIGEgZGVwbG95ZWQgdXNlIGNhc2UgaW4gRHluYW1vREJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNjcmVhdGVVc2VDYXNlUmVjb3JkJyB9KVxuICAgIHB1YmxpYyBhc3luYyBjcmVhdGVVc2VDYXNlUmVjb3JkKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgUHV0SXRlbUNvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKGlucHV0KSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJNZXNzYWdlID0gYEZhaWxlZCB0byBjcmVhdGUgVXNlIENhc2UgUmVjb3JkOiAke2Vycm9yfWA7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyTWVzc2FnZSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byB1cGRhdGUgYW4gZXhpc3RpbmcgcmVjb3JkIGZvciBhIGRlcGxveWVkIHVzZSBjYXNlIGluIER5bmFtb0RCIHVzaW5nXG4gICAgICogc3RhY2tJZCBhcyB0aGUgaGFzaCBrZXlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyN1cGRhdGVVc2VDYXNlUmVjb3JkJyB9KVxuICAgIHB1YmxpYyBhc3luYyB1cGRhdGVVc2VDYXNlUmVjb3JkKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgVXBkYXRlSXRlbUNvbW1hbmRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7IC8vTk9TT05BUiAtIHdpdGhvdXQgYXdhaXQsIGlucHV0IGlzIGVtcHR5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBVcGRhdGVJdGVtQ29tbWFuZChpbnB1dCkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gdXBkYXRlIFVzZSBDYXNlIFJlY29yZDogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgZm9yIHNldHRpbmcgdGhlIFRUTCBvZiBhIHVzZSBjYXNlIGluIHRoZSB1c2UgY2FzZXMgdGFibGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNtYXJrVXNlQ2FzZVJlY29yZEZvckRlbGV0aW9uJyB9KVxuICAgIHB1YmxpYyBhc3luYyBtYXJrVXNlQ2FzZVJlY29yZEZvckRlbGV0aW9uKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgTWFya0l0ZW1Gb3JEZWxldGlvbkNvbW1hbmRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7IC8vTk9TT05BUiAtIHdpdGhvdXQgYXdhaXQsIGlucHV0IGlzIGVtcHR5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBVcGRhdGVJdGVtQ29tbWFuZChpbnB1dCkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gdXBkYXRlIFVzZSBDYXNlIFJlY29yZDogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdG8gcGVybWFuZW50bHkgZGVsZXRlIGEgcmVjb3JkIGZyb20gdGhlIHVzZSBjYXNlcyB0YWJsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZUNhc2VcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2RlbGV0ZVVzZUNhc2VSZWNvcmQnIH0pXG4gICAgcHVibGljIGFzeW5jIGRlbGV0ZVVzZUNhc2VSZWNvcmQodXNlQ2FzZTogVXNlQ2FzZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IG5ldyBEZWxldGVJdGVtQ29tbWFuZEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IERlbGV0ZUl0ZW1Db21tYW5kKGlucHV0KSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJNZXNzYWdlID0gYEZhaWxlZCB0byBkZWxldGUgVXNlIENhc2UgUmVjb3JkOiAke2Vycm9yfWA7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyTWVzc2FnZSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBnZXQgYSBzaW5nbGUgcmVjb3JkIGZyb20gdGhlIHVzZSBjYXNlcyB0YWJsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZUNhc2VcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2dldFVzZUNhc2VSZWNvcmQnIH0pXG4gICAgcHVibGljIGFzeW5jIGdldFVzZUNhc2VSZWNvcmQodXNlQ2FzZTogVXNlQ2FzZSk6IFByb21pc2U8VXNlQ2FzZVJlY29yZD4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGF3YWl0IG5ldyBHZXRJdGVtQ29tbWFuZElucHV0QnVpbGRlcih1c2VDYXNlKS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBHZXRJdGVtQ29tbWFuZChpbnB1dCkpO1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBHb3QgRERCIHJlc3BvbnNlOiAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1gKTtcbiAgICAgICAgICAgIHJldHVybiB1bm1hcnNoYWxsKHJlc3BvbnNlLkl0ZW0hKSBhcyBVc2VDYXNlUmVjb3JkO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyTWVzc2FnZSA9IGBGYWlsZWQgdG8gZ2V0IFVzZSBDYXNlIFJlY29yZDogJHtlcnJvcn1gO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBtZXRob2QgdG8gdmlldyBhbGwgY2FzZXMgaW4gRHluYW1vREJcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI3ZpZXdBbGxDYXNlcycgfSlcbiAgICBwdWJsaWMgYXN5bmMgZ2V0QWxsQ2FzZVJlY29yZHMobGlzdFVzZUNhc2VzRXZlbnQ6IExpc3RVc2VDYXNlc0FkYXB0ZXIpOiBQcm9taXNlPExpc3RVc2VDYXNlc1JlY29yZHM+IHtcbiAgICAgICAgY29uc3QgdXNlQ2FzZXM6IFVzZUNhc2VSZWNvcmRbXSA9IFtdO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgU2NhbkNhc2VUYWJsZUNvbW1hbmRCdWlsZGVyKGxpc3RVc2VDYXNlc0V2ZW50KS5idWlsZCgpOyAvL05PU09OQVIgLSB3aXRob3V0IGF3YWl0LCBpbnB1dCBpcyBlbXB0eVxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZChpbnB1dCkpO1xuXG4gICAgICAgICAgICBjb25zdCBpdGVtQ291bnQgPSByZXNwb25zZS5TY2FubmVkQ291bnQ7XG4gICAgICAgICAgICAvLyBuZWVkIHRvIHVubWFyc2hhbGwgdGhlIGRkYiByZXNwb25zZSB0byBnZXQgdGhlIGFjdHVhbCBkYXRhXG4gICAgICAgICAgICByZXNwb25zZS5JdGVtcz8uZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIHVzZUNhc2VzLnB1c2godW5tYXJzaGFsbChpdGVtKSBhcyBVc2VDYXNlUmVjb3JkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoYFVubWFyc2hhbGxlZCB1c2VDYXNlczogJHtKU09OLnN0cmluZ2lmeSh1c2VDYXNlcyl9YCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVzZUNhc2VSZWNvcmRzOiB1c2VDYXNlcyxcbiAgICAgICAgICAgICAgICBzY2FubmVkQ291bnQ6IGl0ZW1Db3VudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIGZldGNoIGNhc2VzOiAke2Vycm9yfWA7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyTWVzc2FnZSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==