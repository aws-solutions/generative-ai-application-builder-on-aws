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
exports.GetParameterCommandBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
const use_case_config_operation_builder_1 = require("./use-case-config-operation-builder");
/**
 *  Builder to build input to get an existing parameter from SSM
 */
class GetParameterCommandBuilder extends use_case_config_operation_builder_1.CommandInputBuilder {
    /**
     * Method to create input to get an existing parameter from SSM
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building web config GetParameterCommandInput');
        return {
            Name: `${process.env[constants_1.WEBCONFIG_SSM_KEY_ENV_VAR]}`,
            WithDecryption: true
        };
    }
}
exports.GetParameterCommandBuilder = GetParameterCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###getWebConfigConfigParameter' })
], GetParameterCommandBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLWNvbmZpZy1idWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3NtL3dlYi1jb25maWctYnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBR3hILDBEQUFxRDtBQUNyRCxrREFBK0Q7QUFDL0QsMkZBQTBFO0FBRTFFOztHQUVHO0FBQ0gsTUFBYSwwQkFBMkIsU0FBUSx1REFBbUI7SUFDL0Q7OztPQUdHO0lBRUksS0FBSztRQUNSLHlCQUFNLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDN0QsT0FBTztZQUNILElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXlCLENBQUMsRUFBRTtZQUNqRCxjQUFjLEVBQUUsSUFBSTtTQUNLLENBQUM7SUFDbEMsQ0FBQztDQUNKO0FBYkQsZ0VBYUM7QUFQVTtJQUROLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQzt1REFPbEciLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zc20nO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7IFdFQkNPTkZJR19TU01fS0VZX0VOVl9WQVIgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuaW1wb3J0IHsgQ29tbWFuZElucHV0QnVpbGRlciB9IGZyb20gJy4vdXNlLWNhc2UtY29uZmlnLW9wZXJhdGlvbi1idWlsZGVyJztcblxuLyoqXG4gKiAgQnVpbGRlciB0byBidWlsZCBpbnB1dCB0byBnZXQgYW4gZXhpc3RpbmcgcGFyYW1ldGVyIGZyb20gU1NNXG4gKi9cbmV4cG9ydCBjbGFzcyBHZXRQYXJhbWV0ZXJDb21tYW5kQnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgaW5wdXQgdG8gZ2V0IGFuIGV4aXN0aW5nIHBhcmFtZXRlciBmcm9tIFNTTVxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNnZXRXZWJDb25maWdDb25maWdQYXJhbWV0ZXInIH0pXG4gICAgcHVibGljIGJ1aWxkKCk6IEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQnVpbGRpbmcgd2ViIGNvbmZpZyBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIE5hbWU6IGAke3Byb2Nlc3MuZW52W1dFQkNPTkZJR19TU01fS0VZX0VOVl9WQVJdfWAsXG4gICAgICAgICAgICBXaXRoRGVjcnlwdGlvbjogdHJ1ZVxuICAgICAgICB9IGFzIEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dDtcbiAgICB9XG59XG4iXX0=