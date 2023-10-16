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
exports.DeleteSecretCommandInputBuilder = exports.PutSecretValueCommandInputBuilder = exports.CreateSecretCommandInputBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
class CommandInputBuilder {
    constructor(useCase) {
        this.useCase = useCase;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
/**
 * Builder class to create a secret in secrets manager
 */
class CreateSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a secret in secrets manager
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building CreateSecretCommandInput');
        return {
            Name: `${this.useCase.shortUUID}/${process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            Description: `3rd party API key for use case with ID ${this.useCase.shortUUID}`,
            SecretString: this.useCase.apiKey,
            ForceOverwriteReplicaSecret: true
        };
    }
}
exports.CreateSecretCommandInputBuilder = CreateSecretCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###createSecret' })
], CreateSecretCommandInputBuilder.prototype, "build", null);
/**
 * Builder class to put a new value in an existing secret in secrets manager
 */
class PutSecretValueCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to put a new value in an existing secret in secrets manager
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building PutSecretValueCommandInput');
        return {
            SecretId: `${this.useCase.shortUUID}/${process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            SecretString: this.useCase.apiKey
        };
    }
}
exports.PutSecretValueCommandInputBuilder = PutSecretValueCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###putSecretValue' })
], PutSecretValueCommandInputBuilder.prototype, "build", null);
/**
 * Builder to build input to delete a secret in secrets manager
 */
class DeleteSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to delete a secret in secrets manager
     *
     * @returns
     */
    build() {
        power_tools_init_1.logger.debug('Building DeleteSecretCommandInput');
        return {
            SecretId: `${this.useCase.shortUUID}/${process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            ForceDeleteWithoutRecovery: true
        };
    }
}
exports.DeleteSecretCommandInputBuilder = DeleteSecretCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteSecret' })
], DeleteSecretCommandInputBuilder.prototype, "build", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWtleS1zZWNyZXQtb3BlcmF0aW9uLWJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zZWNyZXRzbWFuYWdlci9hcGkta2V5LXNlY3JldC1vcGVyYXRpb24tYnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7Ozs7O0FBU3hILDBEQUFxRDtBQUNyRCxrREFBcUU7QUFFckUsTUFBc0IsbUJBQW1CO0lBSXJDLFlBQVksT0FBZ0I7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztDQU9KO0FBYkQsa0RBYUM7QUFFRDs7R0FFRztBQUNILE1BQWEsK0JBQWdDLFNBQVEsbUJBQW1CO0lBQ3BFOzs7T0FHRztJQUVJLEtBQUs7UUFDUix5QkFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU87WUFDSCxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUErQixDQUFDLEVBQUU7WUFDakYsV0FBVyxFQUFFLDBDQUEwQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUMvRSxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO1lBQ2pDLDJCQUEyQixFQUFFLElBQUk7U0FDUixDQUFDO0lBQ2xDLENBQUM7Q0FDSjtBQWZELDBFQWVDO0FBVFU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLENBQUM7NERBU25GO0FBR0w7O0dBRUc7QUFDSCxNQUFhLGlDQUFrQyxTQUFRLG1CQUFtQjtJQUN0RTs7O09BR0c7SUFFSSxLQUFLO1FBQ1IseUJBQU0sQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztRQUNwRCxPQUFPO1lBQ0gsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBK0IsQ0FBQyxFQUFFO1lBQ3JGLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU07U0FDTixDQUFDO0lBQ3BDLENBQUM7Q0FDSjtBQWJELDhFQWFDO0FBUFU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLENBQUM7OERBT3JGO0FBR0w7O0dBRUc7QUFDSCxNQUFhLCtCQUFnQyxTQUFRLG1CQUFtQjtJQUNwRTs7OztPQUlHO0lBRUksS0FBSztRQUNSLHlCQUFNLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDbEQsT0FBTztZQUNILFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQStCLENBQUMsRUFBRTtZQUNyRiwwQkFBMEIsRUFBRSxJQUFJO1NBQ1AsQ0FBQztJQUNsQyxDQUFDO0NBQ0o7QUFkRCwwRUFjQztBQVBVO0lBRE4seUJBQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDOzREQU9uRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHtcbiAgICBEZWxldGVTZWNyZXRDb21tYW5kSW5wdXQsXG4gICAgQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0LFxuICAgIFB1dFNlY3JldFZhbHVlQ29tbWFuZElucHV0XG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xuXG5pbXBvcnQgeyBVc2VDYXNlIH0gZnJvbSAnLi4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7IFVTRV9DQVNFX0FQSV9LRVlfU1VGRklYX0VOVl9WQVIgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgdXNlQ2FzZTogVXNlQ2FzZTtcbiAgICBzdGFja0lkOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3Rvcih1c2VDYXNlOiBVc2VDYXNlKSB7XG4gICAgICAgIHRoaXMudXNlQ2FzZSA9IHVzZUNhc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIHRoZSBDb21tYW5kSW5wdXRcbiAgICAgKiBAcmV0dXJucyB0aGUgQ29tbWFuZElucHV0XG4gICAgICovXG4gICAgYWJzdHJhY3QgYnVpbGQoKTogQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0IHwgRGVsZXRlU2VjcmV0Q29tbWFuZElucHV0O1xufVxuXG4vKipcbiAqIEJ1aWxkZXIgY2xhc3MgdG8gY3JlYXRlIGEgc2VjcmV0IGluIHNlY3JldHMgbWFuYWdlclxuICovXG5leHBvcnQgY2xhc3MgQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjcmVhdGUgYSBzZWNyZXQgaW4gc2VjcmV0cyBtYW5hZ2VyXG4gICAgICogQHJldHVybnNcbiAgICAgKi9cbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2NyZWF0ZVNlY3JldCcgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdCdWlsZGluZyBDcmVhdGVTZWNyZXRDb21tYW5kSW5wdXQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIE5hbWU6IGAke3RoaXMudXNlQ2FzZS5zaG9ydFVVSUR9LyR7cHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl19YCxcbiAgICAgICAgICAgIERlc2NyaXB0aW9uOiBgM3JkIHBhcnR5IEFQSSBrZXkgZm9yIHVzZSBjYXNlIHdpdGggSUQgJHt0aGlzLnVzZUNhc2Uuc2hvcnRVVUlEfWAsXG4gICAgICAgICAgICBTZWNyZXRTdHJpbmc6IHRoaXMudXNlQ2FzZS5hcGlLZXksXG4gICAgICAgICAgICBGb3JjZU92ZXJ3cml0ZVJlcGxpY2FTZWNyZXQ6IHRydWVcbiAgICAgICAgfSBhcyBDcmVhdGVTZWNyZXRDb21tYW5kSW5wdXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIEJ1aWxkZXIgY2xhc3MgdG8gcHV0IGEgbmV3IHZhbHVlIGluIGFuIGV4aXN0aW5nIHNlY3JldCBpbiBzZWNyZXRzIG1hbmFnZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFB1dFNlY3JldFZhbHVlQ29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBwdXQgYSBuZXcgdmFsdWUgaW4gYW4gZXhpc3Rpbmcgc2VjcmV0IGluIHNlY3JldHMgbWFuYWdlclxuICAgICAqIEByZXR1cm5zXG4gICAgICovXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNwdXRTZWNyZXRWYWx1ZScgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogUHV0U2VjcmV0VmFsdWVDb21tYW5kSW5wdXQge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0J1aWxkaW5nIFB1dFNlY3JldFZhbHVlQ29tbWFuZElucHV0Jyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBTZWNyZXRJZDogYCR7dGhpcy51c2VDYXNlLnNob3J0VVVJRH0vJHtwcm9jZXNzLmVudltVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSXX1gLFxuICAgICAgICAgICAgU2VjcmV0U3RyaW5nOiB0aGlzLnVzZUNhc2UuYXBpS2V5XG4gICAgICAgIH0gYXMgUHV0U2VjcmV0VmFsdWVDb21tYW5kSW5wdXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gYnVpbGQgaW5wdXQgdG8gZGVsZXRlIGEgc2VjcmV0IGluIHNlY3JldHMgbWFuYWdlclxuICovXG5leHBvcnQgY2xhc3MgRGVsZXRlU2VjcmV0Q29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBkZWxldGUgYSBzZWNyZXQgaW4gc2VjcmV0cyBtYW5hZ2VyXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqL1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogZmFsc2UsIHN1YlNlZ21lbnROYW1lOiAnIyMjZGVsZXRlU2VjcmV0JyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBEZWxldGVTZWNyZXRDb21tYW5kSW5wdXQge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ0J1aWxkaW5nIERlbGV0ZVNlY3JldENvbW1hbmRJbnB1dCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgU2VjcmV0SWQ6IGAke3RoaXMudXNlQ2FzZS5zaG9ydFVVSUR9LyR7cHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl19YCxcbiAgICAgICAgICAgIEZvcmNlRGVsZXRlV2l0aG91dFJlY292ZXJ5OiB0cnVlXG4gICAgICAgIH0gYXMgRGVsZXRlU2VjcmV0Q29tbWFuZElucHV0O1xuICAgIH1cbn1cbiJdfQ==