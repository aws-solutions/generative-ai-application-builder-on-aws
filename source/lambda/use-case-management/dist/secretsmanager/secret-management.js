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
exports.SecretManagement = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const aws_node_user_agent_config_1 = require("aws-node-user-agent-config");
const power_tools_init_1 = require("../power-tools-init");
const api_key_secret_operation_builder_1 = require("./api-key-secret-operation-builder");
/**
 * Class to store API keys in secretsmanager for deployed use cases.
 */
class SecretManagement {
    constructor() {
        this.client = new client_secrets_manager_1.SecretsManagerClient((0, aws_node_user_agent_config_1.customAwsConfig)());
    }
    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    async createSecret(useCase) {
        const input = await new api_key_secret_operation_builder_1.CreateSecretCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_secrets_manager_1.CreateSecretCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to create secret: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    async updateSecret(useCase) {
        const input = await new api_key_secret_operation_builder_1.PutSecretValueCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_secrets_manager_1.PutSecretValueCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to put secret value: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to delete an existing Secrets Manager secret for a deployed use case
     *
     * @param useCase
     */
    async deleteSecret(useCase) {
        const input = await new api_key_secret_operation_builder_1.DeleteSecretCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new client_secrets_manager_1.DeleteSecretCommand(input));
        }
        catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            power_tools_init_1.logger.error(errMessage);
            throw error;
        }
    }
}
exports.SecretManagement = SecretManagement;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###createSecret' })
], SecretManagement.prototype, "createSecret", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateSecret' })
], SecretManagement.prototype, "updateSecret", null);
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteSecret' })
], SecretManagement.prototype, "deleteSecret", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0LW1hbmFnZW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zZWNyZXRzbWFuYWdlci9zZWNyZXQtbWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBRXhILDRFQUt5QztBQUN6QywyRUFBNkQ7QUFFN0QsMERBQXFEO0FBQ3JELHlGQUk0QztBQUU1Qzs7R0FFRztBQUNILE1BQWEsZ0JBQWdCO0lBR3pCO1FBQ0ksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLDZDQUFvQixDQUFDLElBQUEsNENBQWUsR0FBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVEOzs7OztPQUtHO0lBRVUsQUFBTixLQUFLLENBQUMsWUFBWSxDQUFDLE9BQWdCO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxrRUFBK0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztRQUNuSCxJQUFJO1lBQ0EsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLDRDQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDMUQ7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNaLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixLQUFLLEVBQUUsQ0FBQztZQUN2RCx5QkFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0wsQ0FBQztJQUVEOzs7OztPQUtHO0lBRVUsQUFBTixLQUFLLENBQUMsWUFBWSxDQUFDLE9BQWdCO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxvRUFBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztRQUNySCxJQUFJO1lBQ0EsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLDhDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDNUQ7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNaLE1BQU0sVUFBVSxHQUFHLCtCQUErQixLQUFLLEVBQUUsQ0FBQztZQUMxRCx5QkFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFFVSxBQUFOLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBZ0I7UUFDdEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLGtFQUErQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMseUNBQXlDO1FBQ25ILElBQUk7WUFDQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksNENBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMxRDtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ1osTUFBTSxVQUFVLEdBQUcscUNBQXFDLEtBQUssRUFBRSxDQUFDO1lBQ2hFLHlCQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sS0FBSyxDQUFDO1NBQ2Y7SUFDTCxDQUFDO0NBQ0o7QUEzREQsNENBMkRDO0FBN0NnQjtJQURaLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztvREFVbEY7QUFTWTtJQURaLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztvREFVbEY7QUFRWTtJQURaLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztvREFVbEYiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7XG4gICAgRGVsZXRlU2VjcmV0Q29tbWFuZCxcbiAgICBDcmVhdGVTZWNyZXRDb21tYW5kLFxuICAgIFNlY3JldHNNYW5hZ2VyQ2xpZW50LFxuICAgIFB1dFNlY3JldFZhbHVlQ29tbWFuZFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcbmltcG9ydCB7IGN1c3RvbUF3c0NvbmZpZyB9IGZyb20gJ2F3cy1ub2RlLXVzZXItYWdlbnQtY29uZmlnJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQgeyBsb2dnZXIsIHRyYWNlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHtcbiAgICBEZWxldGVTZWNyZXRDb21tYW5kSW5wdXRCdWlsZGVyLFxuICAgIENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIsXG4gICAgUHV0U2VjcmV0VmFsdWVDb21tYW5kSW5wdXRCdWlsZGVyXG59IGZyb20gJy4vYXBpLWtleS1zZWNyZXQtb3BlcmF0aW9uLWJ1aWxkZXInO1xuXG4vKipcbiAqIENsYXNzIHRvIHN0b3JlIEFQSSBrZXlzIGluIHNlY3JldHNtYW5hZ2VyIGZvciBkZXBsb3llZCB1c2UgY2FzZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWNyZXRNYW5hZ2VtZW50IHtcbiAgICBwcml2YXRlIGNsaWVudDogU2VjcmV0c01hbmFnZXJDbGllbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5jbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoY3VzdG9tQXdzQ29uZmlnKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgYSBuZXcgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgYSBkZXBsb3llZCB1c2UgY2FzZS5cbiAgICAgKiBBbHNvIHVzZWQgZm9yIHVwZGF0ZXMgYXMgd2Ugd2lzaCB0byBhbHdheXMgb3ZlcndyaXRlIHRoZSBleGlzdGluZyBzZWNyZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlQ2FzZVxuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNjcmVhdGVTZWNyZXQnIH0pXG4gICAgcHVibGljIGFzeW5jIGNyZWF0ZVNlY3JldCh1c2VDYXNlOiBVc2VDYXNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IENyZWF0ZVNlY3JldENvbW1hbmQoaW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNyZWF0ZSBzZWNyZXQ6ICR7ZXJyb3J9YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBhIG5ldyBTZWNyZXRzIE1hbmFnZXIgc2VjcmV0IGZvciBhIGRlcGxveWVkIHVzZSBjYXNlLlxuICAgICAqIEFsc28gdXNlZCBmb3IgdXBkYXRlcyBhcyB3ZSB3aXNoIHRvIGFsd2F5cyBvdmVyd3JpdGUgdGhlIGV4aXN0aW5nIHNlY3JldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiB0cnVlLCBzdWJTZWdtZW50TmFtZTogJyMjI3VwZGF0ZVNlY3JldCcgfSlcbiAgICBwdWJsaWMgYXN5bmMgdXBkYXRlU2VjcmV0KHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBhd2FpdCBuZXcgUHV0U2VjcmV0VmFsdWVDb21tYW5kSW5wdXRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7IC8vTk9TT05BUiAtIHdpdGhvdXQgYXdhaXQsIGlucHV0IGlzIGVtcHR5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQoaW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIHB1dCBzZWNyZXQgdmFsdWU6ICR7ZXJyb3J9YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGRlbGV0ZSBhbiBleGlzdGluZyBTZWNyZXRzIE1hbmFnZXIgc2VjcmV0IGZvciBhIGRlcGxveWVkIHVzZSBjYXNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlQ2FzZVxuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNkZWxldGVTZWNyZXQnIH0pXG4gICAgcHVibGljIGFzeW5jIGRlbGV0ZVNlY3JldCh1c2VDYXNlOiBVc2VDYXNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gYXdhaXQgbmV3IERlbGV0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTsgLy9OT1NPTkFSIC0gd2l0aG91dCBhd2FpdCwgaW5wdXQgaXMgZW1wdHlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LnNlbmQobmV3IERlbGV0ZVNlY3JldENvbW1hbmQoaW5wdXQpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1lc3NhZ2UgPSBgRmFpbGVkIHRvIGRlbGV0ZSBVc2UgQ2FzZSBDb25maWc6ICR7ZXJyb3J9YDtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJNZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19