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
exports.DeleteStackCommandInputBuilder = exports.UpdateStackCommandInputBuilder = exports.CreateStackCommandInputBuilder = exports.CommandInputBuilder = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("../utils/constants");
/**
 * Builder interface for create/ update/ delete operation CommandInputs to implement
 */
class CommandInputBuilder {
    constructor(useCase) {
        this.useCase = useCase;
    }
}
exports.CommandInputBuilder = CommandInputBuilder;
/**
 * Builder to  build the CommandInput for CreateStackCommandInput
 */
class CreateStackCommandInputBuilder extends CommandInputBuilder {
    build() {
        power_tools_init_1.logger.debug('Building CreateStackCommandInput');
        return {
            StackName: `${this.useCase.name}-${this.useCase.shortUUID}`,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: parameters(this.useCase.cfnParameters),
            RoleARN: process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR],
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_NAMED_IAM'],
            OnFailure: 'DELETE',
            Tags: [
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: this.useCase.userId
                }
            ]
        };
    }
}
exports.CreateStackCommandInputBuilder = CreateStackCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildCreateStackCommand' })
], CreateStackCommandInputBuilder.prototype, "build", null);
/**
 * Builder to build the CommandInput for UpdateStackCommandInput
 */
class UpdateStackCommandInputBuilder extends CommandInputBuilder {
    build() {
        return {
            StackName: this.useCase.stackId,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: parameters(this.useCase.cfnParameters),
            RoleARN: process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR],
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_NAMED_IAM'],
            Tags: [
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: this.useCase.userId
                }
            ]
        };
    }
}
exports.UpdateStackCommandInputBuilder = UpdateStackCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildUpdateStackCommand' })
], UpdateStackCommandInputBuilder.prototype, "build", null);
/**
 * Builder to build the CommandInput for DeleteStackCommandInput
 */
class DeleteStackCommandInputBuilder extends CommandInputBuilder {
    build() {
        return {
            StackName: this.useCase.stackId,
            RoleARN: process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR]
        };
    }
}
exports.DeleteStackCommandInputBuilder = DeleteStackCommandInputBuilder;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildDeleteStackCommand' })
], DeleteStackCommandInputBuilder.prototype, "build", null);
/**
 * utility method to build the Parameter array from the Map
 */
const parameters = (cfnParameters) => {
    let parameterArray = new Array();
    cfnParameters.forEach((value, key) => {
        parameterArray.push({
            ParameterKey: key,
            ParameterValue: value
        });
    });
    return parameterArray;
};
const getTemplateUrl = (useCase) => {
    if (process.env[constants_1.ARTIFACT_KEY_PREFIX_ENV_VAR]) {
        return `https://${process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${process.env[constants_1.ARTIFACT_KEY_PREFIX_ENV_VAR]}/${useCase.templateName}${process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    }
    else {
        return `https://${process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${useCase.templateName}${process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stb3BlcmF0aW9uLWJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9jZm4vc3RhY2stb3BlcmF0aW9uLWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7Ozs7Ozs7OztBQVV4SCwwREFBcUQ7QUFDckQsa0RBSzRCO0FBRTVCOztHQUVHO0FBQ0gsTUFBc0IsbUJBQW1CO0lBR3JDLFlBQVksT0FBZ0I7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztDQVdKO0FBaEJELGtEQWdCQztBQUVEOztHQUVHO0FBQ0gsTUFBYSw4QkFBK0IsU0FBUSxtQkFBbUI7SUFFNUQsS0FBSztRQUNSLHlCQUFNLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFFakQsT0FBTztZQUNILFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQzNELFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUN6QyxVQUFVLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUEyQixDQUFDO1lBQ2pELFlBQVksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixDQUFDO1lBQ2xGLFNBQVMsRUFBRSxRQUFRO1lBQ25CLElBQUksRUFBRTtnQkFDRjtvQkFDSSxHQUFHLEVBQUUsWUFBWTtvQkFDakIsS0FBSyxFQUFFLG9CQUFvQjtpQkFDOUI7Z0JBQ0Q7b0JBQ0ksR0FBRyxFQUFFLFFBQVE7b0JBQ2IsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtpQkFDN0I7YUFDSjtTQUN1QixDQUFDO0lBQ2pDLENBQUM7Q0FDSjtBQXhCRCx3RUF3QkM7QUF0QlU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLDRCQUE0QixFQUFFLENBQUM7MkRBc0I5RjtBQUdMOztHQUVHO0FBQ0gsTUFBYSw4QkFBK0IsU0FBUSxtQkFBbUI7SUFFNUQsS0FBSztRQUNSLE9BQU87WUFDSCxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPO1lBQy9CLFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUN6QyxVQUFVLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUEyQixDQUFDO1lBQ2pELFlBQVksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixDQUFDO1lBQ2xGLElBQUksRUFBRTtnQkFDRjtvQkFDSSxHQUFHLEVBQUUsWUFBWTtvQkFDakIsS0FBSyxFQUFFLG9CQUFvQjtpQkFDOUI7Z0JBQ0Q7b0JBQ0ksR0FBRyxFQUFFLFFBQVE7b0JBQ2IsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtpQkFDN0I7YUFDSjtTQUN1QixDQUFDO0lBQ2pDLENBQUM7Q0FDSjtBQXJCRCx3RUFxQkM7QUFuQlU7SUFETix5QkFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLDRCQUE0QixFQUFFLENBQUM7MkRBbUI5RjtBQUdMOztHQUVHO0FBQ0gsTUFBYSw4QkFBK0IsU0FBUSxtQkFBbUI7SUFFNUQsS0FBSztRQUNSLE9BQU87WUFDSCxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPO1lBQy9CLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUEyQixDQUFDO1NBQ3pCLENBQUM7SUFDakMsQ0FBQztDQUNKO0FBUkQsd0VBUUM7QUFOVTtJQUROLHlCQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsNEJBQTRCLEVBQUUsQ0FBQzsyREFNOUY7QUFHTDs7R0FFRztBQUNILE1BQU0sVUFBVSxHQUFHLENBQUMsYUFBa0MsRUFBZSxFQUFFO0lBQ25FLElBQUksY0FBYyxHQUFnQixJQUFJLEtBQUssRUFBRSxDQUFDO0lBQzlDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNoQixZQUFZLEVBQUUsR0FBRztZQUNqQixjQUFjLEVBQUUsS0FBSztTQUN4QixDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sY0FBYyxDQUFDO0FBQzFCLENBQUMsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFHLENBQUMsT0FBZ0IsRUFBVSxFQUFFO0lBQ2hELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBMkIsQ0FBQyxFQUFFO1FBQzFDLE9BQU8sV0FBVyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUF1QixDQUFDLHFCQUFxQixPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUEyQixDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUEwQixDQUFDLEVBQUUsQ0FBQztLQUMzTDtTQUFNO1FBQ0gsT0FBTyxXQUFXLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQXVCLENBQUMscUJBQXFCLE9BQU8sQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBMEIsQ0FBQyxFQUFFLENBQUM7S0FDL0k7QUFDTCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7XG4gICAgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQsXG4gICAgRGVsZXRlU3RhY2tDb21tYW5kSW5wdXQsXG4gICAgRGVzY3JpYmVTdGFja3NDb21tYW5kSW5wdXQsXG4gICAgUGFyYW1ldGVyLFxuICAgIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0XG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBVc2VDYXNlIH0gZnJvbSAnLi4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuLi9wb3dlci10b29scy1pbml0JztcbmltcG9ydCB7XG4gICAgQVJUSUZBQ1RfQlVDS0VUX0VOVl9WQVIsXG4gICAgQVJUSUZBQ1RfS0VZX1BSRUZJWF9FTlZfVkFSLFxuICAgIENGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUixcbiAgICBURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUlxufSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuXG4vKipcbiAqIEJ1aWxkZXIgaW50ZXJmYWNlIGZvciBjcmVhdGUvIHVwZGF0ZS8gZGVsZXRlIG9wZXJhdGlvbiBDb21tYW5kSW5wdXRzIHRvIGltcGxlbWVudFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgdXNlQ2FzZTogVXNlQ2FzZTtcblxuICAgIGNvbnN0cnVjdG9yKHVzZUNhc2U6IFVzZUNhc2UpIHtcbiAgICAgICAgdGhpcy51c2VDYXNlID0gdXNlQ2FzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIENvbW1hbmRJbnB1dFxuICAgICAqIEByZXR1cm5zIHRoZSBDb21tYW5kSW5wdXRcbiAgICAgKi9cbiAgICBhYnN0cmFjdCBidWlsZCgpOlxuICAgICAgICB8IENyZWF0ZVN0YWNrQ29tbWFuZElucHV0XG4gICAgICAgIHwgVXBkYXRlU3RhY2tDb21tYW5kSW5wdXRcbiAgICAgICAgfCBEZWxldGVTdGFja0NvbW1hbmRJbnB1dFxuICAgICAgICB8IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0O1xufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gIGJ1aWxkIHRoZSBDb21tYW5kSW5wdXQgZm9yIENyZWF0ZVN0YWNrQ29tbWFuZElucHV0XG4gKi9cbmV4cG9ydCBjbGFzcyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgZXh0ZW5kcyBDb21tYW5kSW5wdXRCdWlsZGVyIHtcbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IGZhbHNlLCBzdWJTZWdtZW50TmFtZTogJyMjI2J1aWxkQ3JlYXRlU3RhY2tDb21tYW5kJyB9KVxuICAgIHB1YmxpYyBidWlsZCgpOiBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dCB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnQnVpbGRpbmcgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgU3RhY2tOYW1lOiBgJHt0aGlzLnVzZUNhc2UubmFtZX0tJHt0aGlzLnVzZUNhc2Uuc2hvcnRVVUlEfWAsXG4gICAgICAgICAgICBUZW1wbGF0ZVVSTDogZ2V0VGVtcGxhdGVVcmwodGhpcy51c2VDYXNlKSxcbiAgICAgICAgICAgIFBhcmFtZXRlcnM6IHBhcmFtZXRlcnModGhpcy51c2VDYXNlLmNmblBhcmFtZXRlcnMhKSxcbiAgICAgICAgICAgIFJvbGVBUk46IHByb2Nlc3MuZW52W0NGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUl0sXG4gICAgICAgICAgICBDYXBhYmlsaXRpZXM6IFsnQ0FQQUJJTElUWV9JQU0nLCAnQ0FQQUJJTElUWV9BVVRPX0VYUEFORCcsICdDQVBBQklMSVRZX05BTUVEX0lBTSddLFxuICAgICAgICAgICAgT25GYWlsdXJlOiAnREVMRVRFJyxcbiAgICAgICAgICAgIFRhZ3M6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEtleTogJ2NyZWF0ZWRWaWEnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogJ2RlcGxveW1lbnRQbGF0Zm9ybSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgS2V5OiAndXNlcklkJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6IHRoaXMudXNlQ2FzZS51c2VySWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0gYXMgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIEJ1aWxkZXIgdG8gYnVpbGQgdGhlIENvbW1hbmRJbnB1dCBmb3IgVXBkYXRlU3RhY2tDb21tYW5kSW5wdXRcbiAqL1xuZXhwb3J0IGNsYXNzIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlciBleHRlbmRzIENvbW1hbmRJbnB1dEJ1aWxkZXIge1xuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogZmFsc2UsIHN1YlNlZ21lbnROYW1lOiAnIyMjYnVpbGRVcGRhdGVTdGFja0NvbW1hbmQnIH0pXG4gICAgcHVibGljIGJ1aWxkKCk6IFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFN0YWNrTmFtZTogdGhpcy51c2VDYXNlLnN0YWNrSWQsXG4gICAgICAgICAgICBUZW1wbGF0ZVVSTDogZ2V0VGVtcGxhdGVVcmwodGhpcy51c2VDYXNlKSxcbiAgICAgICAgICAgIFBhcmFtZXRlcnM6IHBhcmFtZXRlcnModGhpcy51c2VDYXNlLmNmblBhcmFtZXRlcnMhKSxcbiAgICAgICAgICAgIFJvbGVBUk46IHByb2Nlc3MuZW52W0NGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUl0sXG4gICAgICAgICAgICBDYXBhYmlsaXRpZXM6IFsnQ0FQQUJJTElUWV9JQU0nLCAnQ0FQQUJJTElUWV9BVVRPX0VYUEFORCcsICdDQVBBQklMSVRZX05BTUVEX0lBTSddLFxuICAgICAgICAgICAgVGFnczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgS2V5OiAnY3JlYXRlZFZpYScsXG4gICAgICAgICAgICAgICAgICAgIFZhbHVlOiAnZGVwbG95bWVudFBsYXRmb3JtJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBLZXk6ICd1c2VySWQnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogdGhpcy51c2VDYXNlLnVzZXJJZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSBhcyBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dDtcbiAgICB9XG59XG5cbi8qKlxuICogQnVpbGRlciB0byBidWlsZCB0aGUgQ29tbWFuZElucHV0IGZvciBEZWxldGVTdGFja0NvbW1hbmRJbnB1dFxuICovXG5leHBvcnQgY2xhc3MgRGVsZXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIGV4dGVuZHMgQ29tbWFuZElucHV0QnVpbGRlciB7XG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiBmYWxzZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNidWlsZERlbGV0ZVN0YWNrQ29tbWFuZCcgfSlcbiAgICBwdWJsaWMgYnVpbGQoKTogRGVsZXRlU3RhY2tDb21tYW5kSW5wdXQge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgU3RhY2tOYW1lOiB0aGlzLnVzZUNhc2Uuc3RhY2tJZCxcbiAgICAgICAgICAgIFJvbGVBUk46IHByb2Nlc3MuZW52W0NGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUl1cbiAgICAgICAgfSBhcyBEZWxldGVTdGFja0NvbW1hbmRJbnB1dDtcbiAgICB9XG59XG5cbi8qKlxuICogdXRpbGl0eSBtZXRob2QgdG8gYnVpbGQgdGhlIFBhcmFtZXRlciBhcnJheSBmcm9tIHRoZSBNYXBcbiAqL1xuY29uc3QgcGFyYW1ldGVycyA9IChjZm5QYXJhbWV0ZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+KTogUGFyYW1ldGVyW10gPT4ge1xuICAgIGxldCBwYXJhbWV0ZXJBcnJheTogUGFyYW1ldGVyW10gPSBuZXcgQXJyYXkoKTtcbiAgICBjZm5QYXJhbWV0ZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgcGFyYW1ldGVyQXJyYXkucHVzaCh7XG4gICAgICAgICAgICBQYXJhbWV0ZXJLZXk6IGtleSxcbiAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiB2YWx1ZVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwYXJhbWV0ZXJBcnJheTtcbn07XG5cbmNvbnN0IGdldFRlbXBsYXRlVXJsID0gKHVzZUNhc2U6IFVzZUNhc2UpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChwcm9jZXNzLmVudltBUlRJRkFDVF9LRVlfUFJFRklYX0VOVl9WQVJdKSB7XG4gICAgICAgIHJldHVybiBgaHR0cHM6Ly8ke3Byb2Nlc3MuZW52W0FSVElGQUNUX0JVQ0tFVF9FTlZfVkFSXX0uczMuYW1hem9uYXdzLmNvbS8ke3Byb2Nlc3MuZW52W0FSVElGQUNUX0tFWV9QUkVGSVhfRU5WX1ZBUl19LyR7dXNlQ2FzZS50ZW1wbGF0ZU5hbWV9JHtwcm9jZXNzLmVudltURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUl19YDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYGh0dHBzOi8vJHtwcm9jZXNzLmVudltBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUl19LnMzLmFtYXpvbmF3cy5jb20vJHt1c2VDYXNlLnRlbXBsYXRlTmFtZX0ke3Byb2Nlc3MuZW52W1RFTVBMQVRFX0ZJTEVfRVhUTl9FTlZfVkFSXX1gO1xuICAgIH1cbn07XG4iXX0=