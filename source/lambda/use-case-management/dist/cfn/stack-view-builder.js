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
exports.DescribeStacksCommandInputBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
/**
 * Builder interface for List/ View CommandInputs to implement
 */
class CommandInputBuilder {
    constructor(stackInfo) {
        this.stackInfo = stackInfo;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
/**
 * Builder to build the CommandInput for DescribeStacksCommandInput. When the stack name is
 * provided as input cfn returns a response only for that stack.
 *
 */
class DescribeStacksCommandInputBuilder extends CommandInputBuilder {
    build() {
        return {
            StackName: this.stackInfo.stackArn
        };
    }
}
exports.DescribeStacksCommandInputBuilder = DescribeStacksCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildDescribeStacksCommand' })
], DescribeStacksCommandInputBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stdmlldy1idWlsZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vY2ZuL3N0YWNrLXZpZXctYnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBSXhILDBEQUE2QztBQUU3Qzs7R0FFRztBQUNILE1BQXNCLG1CQUFtQjtJQUdyQyxZQUFZLFNBQW9CO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQy9CLENBQUM7Q0FPSjtBQVpELGtEQVlDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQWEsaUNBQWtDLFNBQVEsbUJBQW1CO0lBRS9ELEtBQUs7UUFDUixPQUFPO1lBQ0gsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUTtTQUNQLENBQUM7SUFDcEMsQ0FBQztDQUNKO0FBUEQsOEVBT0M7QUFMVTtJQUROLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsK0JBQStCLEVBQUUsQ0FBQzs4REFLakciLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7IFN0YWNrSW5mbyB9IGZyb20gJy4uL21vZGVsL2xpc3QtdXNlLWNhc2VzJztcbmltcG9ydCB7IHRyYWNlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuXG4vKipcbiAqIEJ1aWxkZXIgaW50ZXJmYWNlIGZvciBMaXN0LyBWaWV3IENvbW1hbmRJbnB1dHMgdG8gaW1wbGVtZW50XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICBzdGFja0luZm86IFN0YWNrSW5mbztcblxuICAgIGNvbnN0cnVjdG9yKHN0YWNrSW5mbzogU3RhY2tJbmZvKSB7XG4gICAgICAgIHRoaXMuc3RhY2tJbmZvID0gc3RhY2tJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyB0aGUgQ29tbWFuZElucHV0XG4gICAgICogQHJldHVybnMgdGhlIENvbW1hbmRJbnB1dFxuICAgICAqL1xuICAgIGFic3RyYWN0IGJ1aWxkKCk6IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0O1xufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gYnVpbGQgdGhlIENvbW1hbmRJbnB1dCBmb3IgRGVzY3JpYmVTdGFja3NDb21tYW5kSW5wdXQuIFdoZW4gdGhlIHN0YWNrIG5hbWUgaXNcbiAqIHByb3ZpZGVkIGFzIGlucHV0IGNmbiByZXR1cm5zIGEgcmVzcG9uc2Ugb25seSBmb3IgdGhhdCBzdGFjay5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dEJ1aWxkZXIgZXh0ZW5kcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2J1aWxkRGVzY3JpYmVTdGFja3NDb21tYW5kJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dCB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBTdGFja05hbWU6IHRoaXMuc3RhY2tJbmZvLnN0YWNrQXJuXG4gICAgICAgIH0gYXMgRGVzY3JpYmVTdGFja3NDb21tYW5kSW5wdXQ7XG4gICAgfVxufVxuIl19