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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.adaptEvent = exports.lambdaHandler = void 0;
const logger_1 = require("@aws-lambda-powertools/logger");
const metrics_1 = require("@aws-lambda-powertools/metrics");
const tracer_1 = require("@aws-lambda-powertools/tracer");
const core_1 = __importDefault(require("@middy/core"));
const command_1 = require("./command");
const list_use_cases_1 = require("./model/list-use-cases");
const use_case_1 = require("./model/use-case");
const power_tools_init_1 = require("./power-tools-init");
const check_env_1 = require("./utils/check-env");
const http_response_formatters_1 = require("./utils/http-response-formatters");
const commands = new Map();
commands.set('create', new command_1.CreateUseCaseCommand());
commands.set('update', new command_1.UpdateUseCaseCommand());
commands.set('delete', new command_1.DeleteUseCaseCommand());
commands.set('permanentlyDelete', new command_1.PermanentlyDeleteUseCaseCommand());
commands.set('list', new command_1.ListUseCasesCommand());
const lambdaHandler = async (event) => {
    var _a;
    (0, check_env_1.checkEnv)();
    let stackAction;
    // Routing the request to the correct action
    if (event.resource == '/deployments' && event.httpMethod == 'GET') {
        stackAction = 'list';
    }
    else if (event.resource == '/deployments' && event.httpMethod == 'POST') {
        stackAction = 'create';
    }
    else if (event.resource == '/deployments/{useCaseId}' && event.httpMethod == 'PATCH') {
        stackAction = 'update';
    }
    else if (event.resource == '/deployments/{useCaseId}' && event.httpMethod == 'DELETE') {
        if (((_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.permanent) === 'true') {
            stackAction = 'permanentlyDelete';
        }
        else {
            stackAction = 'delete';
        }
    }
    else {
        power_tools_init_1.logger.error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
        throw new Error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
    }
    const command = commands.get(stackAction);
    if (!command) {
        power_tools_init_1.logger.error(`Invalid action: ${stackAction}`);
        throw new Error(`Invalid action: ${stackAction}`);
    }
    try {
        const response = await command.execute((0, exports.adaptEvent)(event, stackAction));
        // as create stack and update stack failures don't throw error, but returns a Failure response
        // to render a 500 request in the UI the following error is
        if (response === command_1.Status.FAILED) {
            throw new Error('Command execution failed');
        }
        return (0, http_response_formatters_1.formatResponse)(response);
    }
    catch (error) {
        const rootTraceId = power_tools_init_1.tracer.getRootXrayTraceId();
        power_tools_init_1.logger.error(`${error}`);
        power_tools_init_1.logger.error(`Error while executing action: ${stackAction}, root trace id: ${rootTraceId}`);
        return (0, http_response_formatters_1.formatError)({
            message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
            extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId }
        });
    }
};
exports.lambdaHandler = lambdaHandler;
const adaptEvent = (event, stackAction) => {
    if (stackAction === 'list') {
        return new list_use_cases_1.ListUseCasesAdapter(event);
    }
    else if (stackAction === 'delete' || stackAction === 'permanentlyDelete') {
        return new use_case_1.ChatUseCaseInfoAdapter(event);
    }
    return new use_case_1.ChatUseCaseDeploymentAdapter(event);
};
exports.adaptEvent = adaptEvent;
exports.handler = (0, core_1.default)(exports.lambdaHandler).use([
    (0, tracer_1.captureLambdaHandler)(power_tools_init_1.tracer),
    (0, logger_1.injectLambdaContext)(power_tools_init_1.logger),
    (0, metrics_1.logMetrics)(power_tools_init_1.metrics)
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7Ozs7O0FBRXhILDBEQUFvRTtBQUNwRSw0REFBNEQ7QUFDNUQsMERBQXFFO0FBQ3JFLHVEQUFnQztBQUVoQyx1Q0FRbUI7QUFDbkIsMkRBQTZEO0FBQzdELCtDQUFpRztBQUNqRyx5REFBNkQ7QUFDN0QsaURBQTZDO0FBQzdDLCtFQUErRTtBQUUvRSxNQUFNLFFBQVEsR0FBNkIsSUFBSSxHQUFHLEVBQXVCLENBQUM7QUFDMUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSw4QkFBb0IsRUFBRSxDQUFDLENBQUM7QUFDbkQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSw4QkFBb0IsRUFBRSxDQUFDLENBQUM7QUFDbkQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSw4QkFBb0IsRUFBRSxDQUFDLENBQUM7QUFDbkQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLHlDQUErQixFQUFFLENBQUMsQ0FBQztBQUN6RSxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLDZCQUFtQixFQUFFLENBQUMsQ0FBQztBQUV6QyxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQUUsS0FBc0IsRUFBRSxFQUFFOztJQUMxRCxJQUFBLG9CQUFRLEdBQUUsQ0FBQztJQUVYLElBQUksV0FBbUIsQ0FBQztJQUV4Qiw0Q0FBNEM7SUFDNUMsSUFBSSxLQUFLLENBQUMsUUFBUSxJQUFJLGNBQWMsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssRUFBRTtRQUMvRCxXQUFXLEdBQUcsTUFBTSxDQUFDO0tBQ3hCO1NBQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxJQUFJLGNBQWMsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLE1BQU0sRUFBRTtRQUN2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LENBQUM7Q0FDdEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBpbmplY3RMYW1iZGFDb250ZXh0IH0gZnJvbSAnQGF3cy1sYW1iZGEtcG93ZXJ0b29scy9sb2dnZXInO1xuaW1wb3J0IHsgbG9nTWV0cmljcyB9IGZyb20gJ0Bhd3MtbGFtYmRhLXBvd2VydG9vbHMvbWV0cmljcyc7XG5pbXBvcnQgeyBjYXB0dXJlTGFtYmRhSGFuZGxlciB9IGZyb20gJ0Bhd3MtbGFtYmRhLXBvd2VydG9vbHMvdHJhY2VyJztcbmltcG9ydCBtaWRkeSBmcm9tICdAbWlkZHkvY29yZSc7XG5pbXBvcnQgeyBBUElHYXRld2F5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7XG4gICAgQ2FzZUNvbW1hbmQsXG4gICAgQ3JlYXRlVXNlQ2FzZUNvbW1hbmQsXG4gICAgRGVsZXRlVXNlQ2FzZUNvbW1hbmQsXG4gICAgTGlzdFVzZUNhc2VzQ29tbWFuZCxcbiAgICBTdGF0dXMsXG4gICAgUGVybWFuZW50bHlEZWxldGVVc2VDYXNlQ29tbWFuZCxcbiAgICBVcGRhdGVVc2VDYXNlQ29tbWFuZFxufSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgTGlzdFVzZUNhc2VzQWRhcHRlciB9IGZyb20gJy4vbW9kZWwvbGlzdC11c2UtY2FzZXMnO1xuaW1wb3J0IHsgQ2hhdFVzZUNhc2VEZXBsb3ltZW50QWRhcHRlciwgQ2hhdFVzZUNhc2VJbmZvQWRhcHRlciwgVXNlQ2FzZSB9IGZyb20gJy4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgbG9nZ2VyLCBtZXRyaWNzLCB0cmFjZXIgfSBmcm9tICcuL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHsgY2hlY2tFbnYgfSBmcm9tICcuL3V0aWxzL2NoZWNrLWVudic7XG5pbXBvcnQgeyBmb3JtYXRFcnJvciwgZm9ybWF0UmVzcG9uc2UgfSBmcm9tICcuL3V0aWxzL2h0dHAtcmVzcG9uc2UtZm9ybWF0dGVycyc7XG5cbmNvbnN0IGNvbW1hbmRzOiBNYXA8c3RyaW5nLCBDYXNlQ29tbWFuZD4gPSBuZXcgTWFwPHN0cmluZywgQ2FzZUNvbW1hbmQ+KCk7XG5jb21tYW5kcy5zZXQoJ2NyZWF0ZScsIG5ldyBDcmVhdGVVc2VDYXNlQ29tbWFuZCgpKTtcbmNvbW1hbmRzLnNldCgndXBkYXRlJywgbmV3IFVwZGF0ZVVzZUNhc2VDb21tYW5kKCkpO1xuY29tbWFuZHMuc2V0KCdkZWxldGUnLCBuZXcgRGVsZXRlVXNlQ2FzZUNvbW1hbmQoKSk7XG5jb21tYW5kcy5zZXQoJ3Blcm1hbmVudGx5RGVsZXRlJywgbmV3IFBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQoKSk7XG5jb21tYW5kcy5zZXQoJ2xpc3QnLCBuZXcgTGlzdFVzZUNhc2VzQ29tbWFuZCgpKTtcblxuZXhwb3J0IGNvbnN0IGxhbWJkYUhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlFdmVudCkgPT4ge1xuICAgIGNoZWNrRW52KCk7XG5cbiAgICBsZXQgc3RhY2tBY3Rpb246IHN0cmluZztcblxuICAgIC8vIFJvdXRpbmcgdGhlIHJlcXVlc3QgdG8gdGhlIGNvcnJlY3QgYWN0aW9uXG4gICAgaWYgKGV2ZW50LnJlc291cmNlID09ICcvZGVwbG95bWVudHMnICYmIGV2ZW50Lmh0dHBNZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgc3RhY2tBY3Rpb24gPSAnbGlzdCc7XG4gICAgfSBlbHNlIGlmIChldmVudC5yZXNvdXJjZSA9PSAnL2RlcGxveW1lbnRzJyAmJiBldmVudC5odHRwTWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICBzdGFja0FjdGlvbiA9ICdjcmVhdGUnO1xuICAgIH0gZWxzZSBpZiAoZXZlbnQucmVzb3VyY2UgPT0gJy9kZXBsb3ltZW50cy97dXNlQ2FzZUlkfScgJiYgZXZlbnQuaHR0cE1ldGhvZCA9PSAnUEFUQ0gnKSB7XG4gICAgICAgIHN0YWNrQWN0aW9uID0gJ3VwZGF0ZSc7XG4gICAgfSBlbHNlIGlmIChldmVudC5yZXNvdXJjZSA9PSAnL2RlcGxveW1lbnRzL3t1c2VDYXNlSWR9JyAmJiBldmVudC5odHRwTWV0aG9kID09ICdERUxFVEUnKSB7XG4gICAgICAgIGlmIChldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnBlcm1hbmVudCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICBzdGFja0FjdGlvbiA9ICdwZXJtYW5lbnRseURlbGV0ZSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGFja0FjdGlvbiA9ICdkZWxldGUnO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEhUVFAgbWV0aG9kOiAke2V2ZW50Lmh0dHBNZXRob2R9LCBhdCByZXNvdXJjZTogJHtldmVudC5yZXNvdXJjZX1gKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIEhUVFAgbWV0aG9kOiAke2V2ZW50Lmh0dHBNZXRob2R9LCBhdCByZXNvdXJjZTogJHtldmVudC5yZXNvdXJjZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21tYW5kID0gY29tbWFuZHMuZ2V0KHN0YWNrQWN0aW9uKTtcbiAgICBpZiAoIWNvbW1hbmQpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIGFjdGlvbjogJHtzdGFja0FjdGlvbn1gKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFjdGlvbjogJHtzdGFja0FjdGlvbn1gKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb21tYW5kLmV4ZWN1dGUoYWRhcHRFdmVudChldmVudCwgc3RhY2tBY3Rpb24pKTtcblxuICAgICAgICAvLyBhcyBjcmVhdGUgc3RhY2sgYW5kIHVwZGF0ZSBzdGFjayBmYWlsdXJlcyBkb24ndCB0aHJvdyBlcnJvciwgYnV0IHJldHVybnMgYSBGYWlsdXJlIHJlc3BvbnNlXG4gICAgICAgIC8vIHRvIHJlbmRlciBhIDUwMCByZXF1ZXN0IGluIHRoZSBVSSB0aGUgZm9sbG93aW5nIGVycm9yIGlzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gU3RhdHVzLkZBSUxFRCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21tYW5kIGV4ZWN1dGlvbiBmYWlsZWQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IHJvb3RUcmFjZUlkID0gdHJhY2VyLmdldFJvb3RYcmF5VHJhY2VJZCgpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoYCR7ZXJyb3J9YCk7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgZXhlY3V0aW5nIGFjdGlvbjogJHtzdGFja0FjdGlvbn0sIHJvb3QgdHJhY2UgaWQ6ICR7cm9vdFRyYWNlSWR9YCk7XG4gICAgICAgIHJldHVybiBmb3JtYXRFcnJvcih7XG4gICAgICAgICAgICBtZXNzYWdlOiBgSW50ZXJuYWwgRXJyb3IgLSBQbGVhc2UgY29udGFjdCBzdXBwb3J0IGFuZCBxdW90ZSB0aGUgZm9sbG93aW5nIHRyYWNlIGlkOiAke3Jvb3RUcmFjZUlkfWAsXG4gICAgICAgICAgICBleHRyYUhlYWRlcnM6IHsgJ19YX0FNWk5fVFJBQ0VfSUQnOiByb290VHJhY2VJZCBhcyBzdHJpbmcgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnQgY29uc3QgYWRhcHRFdmVudCA9IChldmVudDogQVBJR2F0ZXdheUV2ZW50LCBzdGFja0FjdGlvbjogc3RyaW5nKTogVXNlQ2FzZSB8IExpc3RVc2VDYXNlc0FkYXB0ZXIgPT4ge1xuICAgIGlmIChzdGFja0FjdGlvbiA9PT0gJ2xpc3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgTGlzdFVzZUNhc2VzQWRhcHRlcihldmVudCk7XG4gICAgfSBlbHNlIGlmIChzdGFja0FjdGlvbiA9PT0gJ2RlbGV0ZScgfHwgc3RhY2tBY3Rpb24gPT09ICdwZXJtYW5lbnRseURlbGV0ZScpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDaGF0VXNlQ2FzZUluZm9BZGFwdGVyKGV2ZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyKGV2ZW50KTtcbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gbWlkZHkobGFtYmRhSGFuZGxlcikudXNlKFtcbiAgICBjYXB0dXJlTGFtYmRhSGFuZGxlcih0cmFjZXIpLFxuICAgIGluamVjdExhbWJkYUNvbnRleHQobG9nZ2VyKSxcbiAgICBsb2dNZXRyaWNzKG1ldHJpY3MpXG5dKTtcbiJdfQ==