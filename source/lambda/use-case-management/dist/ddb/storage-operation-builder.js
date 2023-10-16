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
exports.GetItemCommandInputBuilder = exports.DeleteItemCommandBuilder = exports.MarkItemForDeletionCommandBuilder = exports.UpdateItemCommandBuilder = exports.PutItemCommandInputBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
class CommandInputBuilder {
    constructor(useCase) {
        this.useCase = useCase;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
/**
 * Builder class to build input to insert an item in dynamodb
 */
class PutItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a record for the use case in dynamodb
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building PutItemCommandInput');
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Item: {
                UseCaseId: { S: this.useCase.useCaseId },
                StackId: { S: this.useCase.stackId },
                Name: { S: this.useCase.name },
                ...(this.useCase.description && {
                    Description: { S: this.useCase.description }
                }),
                SSMParameterKey: { S: this.useCase.cfnParameters.get('ChatConfigSSMParameterName') },
                CreatedBy: { S: this.useCase.userId },
                CreatedDate: { S: new Date().toISOString() }
            }
        };
    }
}
exports.PutItemCommandInputBuilder = PutItemCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###createUseCaseRecord' })
], PutItemCommandInputBuilder.prototype, "build", null);
/**
 *  Builder to build input to update a use case record from dynamodb
 */
class UpdateItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb
     * @returns
     */
    build() {
        var _a;
        power_tools_init_1.logger.debug('Building UpdateItemCommandInput');
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            },
            UpdateExpression: 'SET #Description = :description, #UpdatedDate = :date, #UpdatedBy = :user, #SSMParameterKey = :ssm_parameter_key',
            ExpressionAttributeNames: {
                ['#Description']: 'Description',
                ['#UpdatedDate']: 'UpdatedDate',
                ['#UpdatedBy']: 'UpdatedBy',
                ['#SSMParameterKey']: 'SSMParameterKey'
            },
            ExpressionAttributeValues: {
                [':description']: { S: (_a = this.useCase.description) !== null && _a !== void 0 ? _a : '' },
                [':date']: { S: new Date().toISOString() },
                [':user']: { S: this.useCase.userId },
                [':ssm_parameter_key']: { S: this.useCase.cfnParameters.get('ChatConfigSSMParameterName') }
            }
        };
    }
}
exports.UpdateItemCommandBuilder = UpdateItemCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecord' })
], UpdateItemCommandBuilder.prototype, "build", null);
/**
 * Builder to build input to mark a use case for deletion by setting the TTL
 */
class MarkItemForDeletionCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb setting the TTL
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building UpdateItemCommandInput');
        const currentTime = new Date();
        const expiryTime = Math.floor(currentTime.getTime() / 1000) + constants_1.TTL_SECONDS;
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            },
            UpdateExpression: 'SET #TTL = :expiry_time, #DeletedBy = :user, #DeletedDate = :deletion_date',
            ExpressionAttributeNames: {
                ['#TTL']: constants_1.DYNAMODB_TTL_ATTRIBUTE_NAME,
                ['#DeletedBy']: 'DeletedBy',
                ['#DeletedDate']: 'DeletedDate'
            },
            ExpressionAttributeValues: {
                [':expiry_time']: { N: expiryTime.toString() },
                [':user']: { S: this.useCase.userId },
                [':deletion_date']: { S: currentTime.toISOString() }
            }
        };
    }
}
exports.MarkItemForDeletionCommandBuilder = MarkItemForDeletionCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecordForStackDelete' })
], MarkItemForDeletionCommandBuilder.prototype, "build", null);
/**
 * Builder to build input to delete a use case record from dynamodb
 */
class DeleteItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building DeleteItemCommandInput');
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            }
        };
    }
}
exports.DeleteItemCommandBuilder = DeleteItemCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteUseCaseRecord' })
], DeleteItemCommandBuilder.prototype, "build", null);
/**
 * Builder to build input to get a use case record from dynamodb
 */
class GetItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing record in dynamodb
     *
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building GetItemCommandInput');
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            }
        };
    }
}
exports.GetItemCommandInputBuilder = GetItemCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseRecord' })
], GetItemCommandInputBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1vcGVyYXRpb24tYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2RkYi9zdG9yYWdlLW9wZXJhdGlvbi1idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7d0hBV3dIOzs7Ozs7Ozs7QUFVeEgsMERBQXFEO0FBQ3JELGtEQUE0RztBQUU1RyxNQUFzQixtQkFBbUI7SUFJckMsWUFBWSxPQUFnQjtRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUMzQixDQUFDO0NBT0o7QUFiRCxrREFhQztBQUVEOztHQUVHO0FBQ0gsTUFBYSwwQkFBMkIsU0FBUSxtQkFBbUI7SUFDL0Q7OztPQUdHO0lBRUksS0FBSztRQUNSLHlCQUFNLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDN0MsT0FBTztZQUNILFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUE0QixDQUFDO1lBQ3BELElBQUksRUFBRTtnQkFDRixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3hDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO2dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUk7b0JBQzVCLFdBQVcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtpQkFDL0MsQ0FBQztnQkFDRixlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFjLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEVBQUU7Z0JBQ3JGLFNBQVMsRUFBRSxFQUFFLENBQUMs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Q0o7QUFoQkQsZ0VBZ0JDO0FBVFU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLHFCQUFxQixFQUFFLENBQUM7dURBU3ZGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQge1xuICAgIERlbGV0ZUl0ZW1Db21tYW5kSW5wdXQsXG4gICAgR2V0SXRlbUNvbW1hbmRJbnB1dCxcbiAgICBQdXRJdGVtQ29tbWFuZElucHV0LFxuICAgIFF1ZXJ5Q29tbWFuZElucHV0LFxuICAgIFVwZGF0ZUl0ZW1Db21tYW5kSW5wdXRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQgeyBsb2dnZXIsIHRyYWNlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHsgRFlOQU1PREJfVFRMX0FUVFJJQlVURV9OQU1FLCBUVExfU0VDT05EUywgVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUiB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICB1c2VDYXNlOiBVc2VDYXNlO1xuICAgIHN0YWNrSWQ6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKHVzZUNhc2U6IFVzZUNhc2UpIHtcbiAgICAgICAgdGhpcy51c2VDYXNlID0gdXNlQ2FzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIENvbW1hbmRJbnB1dFxuICAgICAqIEByZXR1cm5zIHRoZSBDb21tYW5kSW5wdXRcbiAgICAgKi9cbiAgICBhYnN0cmFjdCBidWlsZCgpOiBQdXRJdGVtQ29tbWFuZElucHV0IHwgR2V0SXRlbUNvbW1hbmRJbnB1dCB8IFF1ZXJ5Q29tbWFuZElucHV0IHwgRGVsZXRlSXRlbUNvbW1hbmRJbnB1dDtcbn1cblxuLyoqXG4gKiBCdWlsZGVyIGNsYXNzIHRvIGJ1aWxkIGlucHV0IHRvIGluc2VydCBhbiBpdGVtIGluIGR5bmFtb2RiXG4gKi9cbmV4cG9ydCBjbGFzcyBQdXRJdGVtQ29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgYSByZWNvcmQgZm9yIHRoZSB1c2UgY2FzZSBpbiBkeW5hbW9kYlxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNjcmVhdGVVc2VDYXNlUmVjb3JkJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBQdXRJdGVtQ29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBQdXRJdGVtQ29tbWFuZElucHV0Jyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52W1VTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVJdLFxuICAgICAgICAgICAgSXRlbToge1xuICAgICAgICAgICAgICAgIFVzZUNhc2VJZDogeyBTOiB0aGlzLnVzZUNhc2UudXNlQ2FzZUlkIH0sXG4gICAgICAgICAgICAgICAgU3RhY2tJZDogeyBTOiB0aGlzLnVzZUNhc2Uuc3RhY2tJZCB9LFxuICAgICAgICAgICAgICAgIE5hbWU6IHsgUzogdGhpcy51c2VDYXNlLm5hbWUgfSxcbiAgICAgICAgICAgICAgICAuLi4odGhpcy51c2VDYXNlLmRlc2NyaXB0aW9uICYmIHtcbiAgICAgICAgICAgICAgICAgICAgRGVzY3JpcHRpb246IHsgUzogdGhpcy51c2VDYXNlLmRlc2NyaXB0aW9uIH1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBTU01QYXJhbWV0ZXJLZXk6IHsgUzogdGhpcy51c2VDYXNlLmNmblBhcmFtZXRlcnMhLmdldCgnQ2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWUnKSB9LFxuICAgICAgICAgICAgICAgIENyZWF0ZWRCeTogeyBTOiB0aGlzLnVzZUNhc2UudXNlcklkIH0sXG4gICAgICAgICAgICAgICAgQ3JlYXRlZERhdGU6IHsgUzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBQdXRJdGVtQ29tbWFuZElucHV0O1xuICAgIH1cbn1cblxuLyoqXG4gKiAgQnVpbGRlciB0byBidWlsZCBpbnB1dCB0byB1cGRhdGUgYSB1c2UgY2FzZSByZWNvcmQgZnJvbSBkeW5hbW9kYlxuICovXG5leHBvcnQgY2xhc3MgVXBkYXRlSXRlbUNvbW1hbmRCdWlsZGVyIGV4dGVuZHMgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBpbnB1dCB0byB1cGRhdGUgYW4gZXhpc3RpbmcgcmVjb3JkIGluIGR5bmFtb2RiXG4gICAgICogQHJldHVybnNcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI3VwZGF0ZVVzZUNhc2VSZWNvcmQnIH0pXG4gICAgcHVibGljIGJ1aWxkKCk6IFVwZGF0ZUl0ZW1Db21tYW5kSW5wdXQge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0J1aWxkaW5nIFVwZGF0ZUl0ZW1Db21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl0sXG4gICAgICAgICAgICBLZXk6IHtcbiAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6IHsgUzogdGhpcy51c2VDYXNlLnVzZUNhc2VJZCB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCAjRGVzY3JpcHRpb24gPSA6ZGVzY3JpcHRpb24sICNVcGRhdGVkRGF0ZSA9IDpkYXRlLCAjVXBkYXRlZEJ5ID0gOnVzZXIsICNTU01QYXJhbWV0ZXJLZXkgPSA6c3NtX3BhcmFtZXRlcl9rZXknLFxuICAgICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XG4gICAgICAgICAgICAgICAgWycjRGVzY3JpcHRpb24nXTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBbJyNVcGRhdGVkRGF0ZSddOiAnVXBkYXRlZERhdGUnLFxuICAgICAgICAgICAgICAgIFsnI1VwZGF0ZWRCeSddOiAnVXBkYXRlZEJ5JyxcbiAgICAgICAgICAgICAgICBbJyNTU01QYXJhbWV0ZXJLZXknXTogJ1NTTVBhcmFtZXRlcktleSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgICAgICAgWyc6ZGVzY3JpcHRpb24nXTogeyBTOiB0aGlzLnVzZUNhc2UuZGVzY3JpcHRpb24gPz8gJycgfSxcbiAgICAgICAgICAgICAgICBbJzpkYXRlJ106IHsgUzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0sXG4gICAgICAgICAgICAgICAgWyc6dXNlciddOiB7IFM6IHRoaXMudXNlQ2FzZS51c2VySWQgfSxcbiAgICAgICAgICAgICAgICBbJzpzc21fcGFyYW1ldGVyX2tleSddOiB7IFM6IHRoaXMudXNlQ2FzZS5jZm5QYXJhbWV0ZXJzIS5nZXQoJ0NoYXRDb25maWdTU01QYXJhbWV0ZXJOYW1lJykgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGFzIFVwZGF0ZUl0ZW1Db21tYW5kSW5wdXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gYnVpbGQgaW5wdXQgdG8gbWFyayBhIHVzZSBjYXNlIGZvciBkZWxldGlvbiBieSBzZXR0aW5nIHRoZSBUVExcbiAqL1xuZXhwb3J0IGNsYXNzIE1hcmtJdGVtRm9yRGVsZXRpb25Db21tYW5kQnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgaW5wdXQgdG8gdXBkYXRlIGFuIGV4aXN0aW5nIHJlY29yZCBpbiBkeW5hbW9kYiBzZXR0aW5nIHRoZSBUVExcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogZmFsc2UsIHN1YlNlZ21lbnROYW1lOiAnIyMjdXBkYXRlVXNlQ2FzZVJlY29yZEZvclN0YWNrRGVsZXRlJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBVcGRhdGVJdGVtQ29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBVcGRhdGVJdGVtQ29tbWFuZElucHV0Jyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3QgZXhwaXJ5VGltZSA9IE1hdGguZmxvb3IoY3VycmVudFRpbWUuZ2V0VGltZSgpIC8gMTAwMCkgKyBUVExfU0VDT05EUztcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl0sXG4gICAgICAgICAgICBLZXk6IHtcbiAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6IHsgUzogdGhpcy51c2VDYXNlLnVzZUNhc2VJZCB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCAjVFRMID0gOmV4cGlyeV90aW1lLCAjRGVsZXRlZEJ5ID0gOnVzZXIsICNEZWxldGVkRGF0ZSA9IDpkZWxldGlvbl9kYXRlJyxcbiAgICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICAgICAgICAgIFsnI1RUTCddOiBEWU5BTU9EQl9UVExfQVRUUklCVVRFX05BTUUsXG4gICAgICAgICAgICAgICAgWycjRGVsZXRlZEJ5J106ICdEZWxldGVkQnknLFxuICAgICAgICAgICAgICAgIFsnI0RlbGV0ZWREYXRlJ106ICdEZWxldGVkRGF0ZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgICAgICAgWyc6ZXhwaXJ5X3RpbWUnXTogeyBOOiBleHBpcnlUaW1lLnRvU3RyaW5nKCkgfSxcbiAgICAgICAgICAgICAgICBbJzp1c2VyJ106IHsgUzogdGhpcy51c2VDYXNlLnVzZXJJZCB9LFxuICAgICAgICAgICAgICAgIFsnOmRlbGV0aW9uX2RhdGUnXTogeyBTOiBjdXJyZW50VGltZS50b0lTT1N0cmluZygpIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBVcGRhdGVJdGVtQ29tbWFuZElucHV0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBCdWlsZGVyIHRvIGJ1aWxkIGlucHV0IHRvIGRlbGV0ZSBhIHVzZSBjYXNlIHJlY29yZCBmcm9tIGR5bmFtb2RiXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWxldGVJdGVtQ29tbWFuZEJ1aWxkZXIgZXh0ZW5kcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICAvKipcbiAgICAgKiBNZXRob2QgdG8gY3JlYXRlIGlucHV0IHRvIGRlbGV0ZSBhbiBleGlzdGluZyByZWNvcmQgaW4gZHluYW1vZGJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNkZWxldGVVc2VDYXNlUmVjb3JkJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBEZWxldGVJdGVtQ29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBEZWxldGVJdGVtQ29tbWFuZElucHV0Jyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52W1VTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVJdLFxuICAgICAgICAgICAgS2V5OiB7XG4gICAgICAgICAgICAgICAgVXNlQ2FzZUlkOiB7IFM6IHRoaXMudXNlQ2FzZS51c2VDYXNlSWQgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGFzIERlbGV0ZUl0ZW1Db21tYW5kSW5wdXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gYnVpbGQgaW5wdXQgdG8gZ2V0IGEgdXNlIGNhc2UgcmVjb3JkIGZyb20gZHluYW1vZGJcbiAqL1xuZXhwb3J0IGNsYXNzIEdldEl0ZW1Db21tYW5kSW5wdXRCdWlsZGVyIGV4dGVuZHMgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBpbnB1dCB0byBnZXQgYW4gZXhpc3RpbmcgcmVjb3JkIGluIGR5bmFtb2RiXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogZmFsc2UsIHN1YlNlZ21lbnROYW1lOiAnIyMjZ2V0VXNlQ2FzZVJlY29yZCcgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogR2V0SXRlbUNvbW1hbmRJbnB1dCB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQnVpbGRpbmcgR2V0SXRlbUNvbW1hbmRJbnB1dCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudltVU0VfQ0FTRVNfVEFCTEVfTkFNRV9FTlZfVkFSXSxcbiAgICAgICAgICAgIEtleToge1xuICAgICAgICAgICAgICAgIFVzZUNhc2VJZDogeyBTOiB0aGlzLnVzZUNhc2UudXNlQ2FzZUlkIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBHZXRJdGVtQ29tbWFuZElucHV0O1xuICAgIH1cbn1cbiJdfQ==