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
exports.GetParameterFromNameCommandInputBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
class CommandInputBuilder {
    constructor(configName) {
        this.configName = configName;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
class GetParameterFromNameCommandInputBuilder extends CommandInputBuilder {
    constructor(configName) {
        super(configName);
    }
    build() {
        power_tools_init_1.logger.debug('Building GetParameterCommandInput');
        return {
            Name: this.configName,
            WithDecryption: true
        };
    }
}
exports.GetParameterFromNameCommandInputBuilder = GetParameterFromNameCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###getParameterFromName' })
], GetParameterFromNameCommandInputBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlLWNhc2UtY29uZmlnLXZpZXctYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NzbS91c2UtY2FzZS1jb25maWctdmlldy1idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7d0hBV3dIOzs7Ozs7Ozs7QUFJeEgsMERBQXFEO0FBRXJELE1BQXNCLG1CQUFtQjtJQUdyQyxZQUFZLFVBQWtCO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2pDLENBQUM7Q0FPSjtBQVpELGtEQVlDO0FBRUQsTUFBYSx1Q0FBd0MsU0FBUSxtQkFBbUI7SUFHNUUsWUFBWSxVQUFrQjtRQUMxQixLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUdNLEtBQUs7UUFDUix5QkFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU87WUFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDckIsY0FBYyxFQUFFLElBQUk7U0FDSyxDQUFDO0lBQ2xDLENBQUM7Q0FDSjtBQWZELDBGQWVDO0FBUFU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLENBQUM7b0VBTzNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcblxuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIGNvbmZpZ05hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZ05hbWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLmNvbmZpZ05hbWUgPSBjb25maWdOYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyB0aGUgQ29tbWFuZElucHV0XG4gICAgICogQHJldHVybnMgdGhlIENvbW1hbmRJbnB1dFxuICAgICAqL1xuICAgIGFic3RyYWN0IGJ1aWxkKCk6IEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dDtcbn1cblxuZXhwb3J0IGNsYXNzIEdldFBhcmFtZXRlckZyb21OYW1lQ29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIGNvbmZpZ05hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZ05hbWU6IHN0cmluZykge1xuICAgICAgICBzdXBlcihjb25maWdOYW1lKTtcbiAgICB9XG5cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2dldFBhcmFtZXRlckZyb21OYW1lJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0J1aWxkaW5nIEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgTmFtZTogdGhpcy5jb25maWdOYW1lLFxuICAgICAgICAgICAgV2l0aERlY3J5cHRpb246IHRydWVcbiAgICAgICAgfSBhcyBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQ7XG4gICAgfVxufVxuIl19