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
exports.DeleteParameterCommandInputBuilder = exports.PutParameterCommandInputBuilder = exports.GetParameterCommandBuilder = exports.CommandInputBuilder = void 0;
const client_ssm_1 = require("@aws-sdk/client-ssm");
const power_tools_init_1 = require("../power-tools-init");
class CommandInputBuilder {
    constructor(useCase) {
        this.useCase = useCase;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
/**
 *  Builder to build input to get an existing parameter from SSM
 */
class GetParameterCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing parameter from SSM
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building GetParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey(),
            WithDecryption: true
        };
    }
}
exports.GetParameterCommandBuilder = GetParameterCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateConfigParameter' })
], GetParameterCommandBuilder.prototype, "build", null);
/**
 * Builder class to create a parameter in SSM
 */
class PutParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a parameter in SSM
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building PutParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey(),
            Description: `Configuration for the use case with ID ${this.useCase.shortUUID}`,
            Value: JSON.stringify(this.useCase.configuration),
            Type: client_ssm_1.ParameterType.SECURE_STRING,
            Overwrite: true,
            Tier: client_ssm_1.ParameterTier.INTELLIGENT_TIERING
        };
    }
}
exports.PutParameterCommandInputBuilder = PutParameterCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###createConfigParameter' })
], PutParameterCommandInputBuilder.prototype, "build", null);
/**
 * Builder to build input to delete a use case record from dynamodb
 */
class DeleteParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building DeleteParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey()
        };
    }
}
exports.DeleteParameterCommandInputBuilder = DeleteParameterCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteConfigParameter' })
], DeleteParameterCommandInputBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlLWNhc2UtY29uZmlnLW9wZXJhdGlvbi1idWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3NtL3VzZS1jYXNlLWNvbmZpZy1vcGVyYXRpb24tYnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBRXhILG9EQU02QjtBQUU3QiwwREFBcUQ7QUFFckQsTUFBc0IsbUJBQW1CO0lBSXJDLFlBQVksT0FBZ0I7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztDQU9KO0FBYkQsa0RBYUM7QUFFRDs7R0FFRztBQUNILE1BQWEsMEJBQTJCLFNBQVEsbUJBQW1CO0lBQy9EOzs7T0FHRztJQUVJLEtBQUs7UUFDUix5QkFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU87WUFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRTtZQUN2QyxjQUFjLEVBQUUsSUFBSTtTQUNLLENBQUM7SUFDbEMsQ0FBQztDQUNKO0FBYkQsZ0VBYUM7QUFQVTtJQUROLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQzt1REFPNUY7QUFHTDs7R0FFRztBQUNILE1BQWEsK0JBQWdDLFNBQVEsbUJBQW1CO0lBQ3BFOzs7T0FHRztJQUVJLEtBQUs7UUFDUix5QkFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU87WUFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsMENBQTBDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQy9FLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQ2pELElBQUksRUFBRSwwQkFBYSxDQUFDLGFBQWE7WUFDakMsU0FBUyxFQUFFLElBQUk7WUFDZixJQUFJLEVBQUUsMEJBQWEsQ0FBQyxtQkFBbUI7U0FDZCxDQUFDO0lBQ2xDLENBQUM7Q0FDSjtBQWpCRCwwRUFpQkM7QUFYVTtJQUROLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQzs0REFXNUY7QUFHTDs7R0FFRztBQUNILE1BQWEsa0NBQW1DLFNBQVEsbUJBQW1CO0lBQ3ZFOzs7O09BSUc7SUFFSSxLQUFLO1FBQ1IseUJBQU0sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUNyRCxPQUFPO1lBQ0gsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUU7U0FDWCxDQUFDO0lBQ3JDLENBQUM7Q0FDSjtBQWJELGdGQWFDO0FBTlU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixFQUFFLENBQUM7K0RBTTVGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQge1xuICAgIERlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dCxcbiAgICBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQsXG4gICAgUHV0UGFyYW1ldGVyQ29tbWFuZElucHV0LFxuICAgIFBhcmFtZXRlclRpZXIsXG4gICAgUGFyYW1ldGVyVHlwZVxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQgeyBsb2dnZXIsIHRyYWNlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgdXNlQ2FzZTogVXNlQ2FzZTtcbiAgICBzdGFja0lkOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3Rvcih1c2VDYXNlOiBVc2VDYXNlKSB7XG4gICAgICAgIHRoaXMudXNlQ2FzZSA9IHVzZUNhc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIHRoZSBDb21tYW5kSW5wdXRcbiAgICAgKiBAcmV0dXJucyB0aGUgQ29tbWFuZElucHV0XG4gICAgICovXG4gICAgYWJzdHJhY3QgYnVpbGQoKTogR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0IHwgUHV0UGFyYW1ldGVyQ29tbWFuZElucHV0IHwgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0O1xufVxuXG4vKipcbiAqICBCdWlsZGVyIHRvIGJ1aWxkIGlucHV0IHRvIGdldCBhbiBleGlzdGluZyBwYXJhbWV0ZXIgZnJvbSBTU01cbiAqL1xuZXhwb3J0IGNsYXNzIEdldFBhcmFtZXRlckNvbW1hbmRCdWlsZGVyIGV4dGVuZHMgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBpbnB1dCB0byBnZXQgYW4gZXhpc3RpbmcgcGFyYW1ldGVyIGZyb20gU1NNXG4gICAgICogQHJldHVybnNcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI3VwZGF0ZUNvbmZpZ1BhcmFtZXRlcicgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIE5hbWU6IHRoaXMudXNlQ2FzZS5nZXRTU01QYXJhbWV0ZXJLZXkoKSxcbiAgICAgICAgICAgIFdpdGhEZWNyeXB0aW9uOiB0cnVlXG4gICAgICAgIH0gYXMgR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBCdWlsZGVyIGNsYXNzIHRvIGNyZWF0ZSBhIHBhcmFtZXRlciBpbiBTU01cbiAqL1xuZXhwb3J0IGNsYXNzIFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXIgZXh0ZW5kcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICAvKipcbiAgICAgKiBNZXRob2QgdG8gY3JlYXRlIGEgcGFyYW1ldGVyIGluIFNTTVxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNjcmVhdGVDb25maWdQYXJhbWV0ZXInIH0pXG4gICAgcHVibGljIGJ1aWxkKCk6IFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dCB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQnVpbGRpbmcgUHV0UGFyYW1ldGVyQ29tbWFuZElucHV0Jyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBOYW1lOiB0aGlzLnVzZUNhc2UuZ2V0U1NNUGFyYW1ldGVyS2V5KCksXG4gICAgICAgICAgICBEZXNjcmlwdGlvbjogYENvbmZpZ3VyYXRpb24gZm9yIHRoZSB1c2UgY2FzZSB3aXRoIElEICR7dGhpcy51c2VDYXNlLnNob3J0VVVJRH1gLFxuICAgICAgICAgICAgVmFsdWU6IEpTT04uc3RyaW5naWZ5KHRoaXMudXNlQ2FzZS5jb25maWd1cmF0aW9uKSxcbiAgICAgICAgICAgIFR5cGU6IFBhcmFtZXRlclR5cGUuU0VDVVJFX1NUUklORyxcbiAgICAgICAgICAgIE92ZXJ3cml0ZTogdHJ1ZSxcbiAgICAgICAgICAgIFRpZXI6IFBhcmFtZXRlclRpZXIuSU5URUxMSUdFTlRfVElFUklOR1xuICAgICAgICB9IGFzIFB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dDtcbiAgICB9XG59XG5cbi8qKlxuICogQnVpbGRlciB0byBidWlsZCBpbnB1dCB0byBkZWxldGUgYSB1c2UgY2FzZSByZWNvcmQgZnJvbSBkeW5hbW9kYlxuICovXG5leHBvcnQgY2xhc3MgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgaW5wdXQgdG8gZGVsZXRlIGFuIGV4aXN0aW5nIHJlY29yZCBpbiBkeW5hbW9kYlxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2RlbGV0ZUNvbmZpZ1BhcmFtZXRlcicgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBEZWxldGVQYXJhbWV0ZXJDb21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIE5hbWU6IHRoaXMudXNlQ2FzZS5nZXRTU01QYXJhbWV0ZXJLZXkoKVxuICAgICAgICB9IGFzIERlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dDtcbiAgICB9XG59XG4iXX0=