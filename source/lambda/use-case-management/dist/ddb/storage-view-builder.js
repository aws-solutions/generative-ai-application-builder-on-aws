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
exports.ScanCaseTableCommandBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
class CommandInputBuilder {
    constructor(useCase) {
        this.listUseCasesEvent = useCase;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
class ScanCaseTableCommandBuilder {
    constructor(listUseCasesEvent) {
        this.eventParams = listUseCasesEvent.event.queryStringParameters;
    }
    /**
     * Method to create input to scan a table in dynamodb
     *
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building ScanCommandInput');
        return {
            TableName: process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR],
            Limit: constants_1.DDB_SCAN_RECORDS_LIMIT
        };
    }
}
exports.ScanCaseTableCommandBuilder = ScanCaseTableCommandBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###scanTable' })
], ScanCaseTableCommandBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS12aWV3LWJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9kZGIvc3RvcmFnZS12aWV3LWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7Ozs7Ozs7OztBQUl4SCwwREFBcUQ7QUFDckQsa0RBQTBGO0FBRTFGLE1BQXNCLG1CQUFtQjtJQUVyQyxZQUFZLE9BQTRCO1FBQ3BDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUM7SUFDckMsQ0FBQztDQU9KO0FBWEQsa0RBV0M7QUFFRCxNQUFhLDJCQUEyQjtJQUdwQyxZQUFZLGlCQUFzQztRQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQztJQUNyRSxDQUFDO0lBQ0Q7Ozs7T0FJRztJQUVJLEtBQUs7UUFDUix5QkFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQzFDLE9BQU87WUFDSCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBNEIsQ0FBQztZQUNwRCxLQUFLLEVBQUUsa0NBQXNCO1NBQ1osQ0FBQztJQUMxQixDQUFDO0NBQ0o7QUFuQkQsa0VBbUJDO0FBUFU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxDQUFDO3dEQU9oRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHsgU2NhbkNvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBMaXN0VXNlQ2FzZXNBZGFwdGVyIH0gZnJvbSAnLi4vbW9kZWwvbGlzdC11c2UtY2FzZXMnO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7IEREQl9TQ0FOX1JFQ09SRFNfTElNSVQsIFVTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVIgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgbGlzdFVzZUNhc2VzRXZlbnQ6IExpc3RVc2VDYXNlc0FkYXB0ZXI7XG4gICAgY29uc3RydWN0b3IodXNlQ2FzZTogTGlzdFVzZUNhc2VzQWRhcHRlcikge1xuICAgICAgICB0aGlzLmxpc3RVc2VDYXNlc0V2ZW50ID0gdXNlQ2FzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIENvbW1hbmRJbnB1dFxuICAgICAqIEByZXR1cm5zIHRoZSBDb21tYW5kSW5wdXRcbiAgICAgKi9cbiAgICBhYnN0cmFjdCBidWlsZCgpOiBTY2FuQ29tbWFuZElucHV0O1xufVxuXG5leHBvcnQgY2xhc3MgU2NhbkNhc2VUYWJsZUNvbW1hbmRCdWlsZGVyIHtcbiAgICBldmVudFBhcmFtczogYW55O1xuXG4gICAgY29uc3RydWN0b3IobGlzdFVzZUNhc2VzRXZlbnQ6IExpc3RVc2VDYXNlc0FkYXB0ZXIpIHtcbiAgICAgICAgdGhpcy5ldmVudFBhcmFtcyA9IGxpc3RVc2VDYXNlc0V2ZW50LmV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycztcbiAgICB9XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNyZWF0ZSBpbnB1dCB0byBzY2FuIGEgdGFibGUgaW4gZHluYW1vZGJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNzY2FuVGFibGUnIH0pXG4gICAgcHVibGljIGJ1aWxkKCk6IFNjYW5Db21tYW5kSW5wdXQge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0J1aWxkaW5nIFNjYW5Db21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl0sXG4gICAgICAgICAgICBMaW1pdDogRERCX1NDQU5fUkVDT1JEU19MSU1JVFxuICAgICAgICB9IGFzIFNjYW5Db21tYW5kSW5wdXQ7XG4gICAgfVxufVxuIl19