#!/usr/bin/env node
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
 *********************************************************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnv = void 0;
const power_tools_init_1 = require("../power-tools-init");
const constants_1 = require("./constants");
const checkEnv = () => {
    let missingVars = [];
    for (let envVar of constants_1.REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        const errMsg = `Missing required environment variables: ${missingVars.join(', ')}. This should not happen and indicates in issue with your deployment.`;
        power_tools_init_1.logger.error(errMsg);
        throw new Error(errMsg);
    }
};
exports.checkEnv = checkEnv;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvY2hlY2stZW52LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0E7Ozs7Ozs7Ozs7O3VIQVd1SDs7O0FBRXZILDBEQUE2QztBQUM3QywyQ0FBZ0Q7QUFFekMsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO0lBQ3pCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztJQUNyQixLQUFLLElBQUksTUFBTSxJQUFJLDZCQUFpQixFQUFFO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3RCLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDNUI7S0FDSjtJQUNELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDeEIsTUFBTSxNQUFNLEdBQUcsMkNBQTJDLFdBQVcsQ0FBQyxJQUFJLENBQ3RFLElBQUksQ0FDUCx1RUFBdUUsQ0FBQztRQUN6RSx5QkFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzNCO0FBQ0wsQ0FBQyxDQUFDO0FBZFcsUUFBQSxRQUFRLFlBY25CIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHsgUkVRVUlSRURfRU5WX1ZBUlMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBjb25zdCBjaGVja0VudiA9ICgpID0+IHtcbiAgICBsZXQgbWlzc2luZ1ZhcnMgPSBbXTtcbiAgICBmb3IgKGxldCBlbnZWYXIgb2YgUkVRVUlSRURfRU5WX1ZBUlMpIHtcbiAgICAgICAgaWYgKCFwcm9jZXNzLmVudltlbnZWYXJdKSB7XG4gICAgICAgICAgICBtaXNzaW5nVmFycy5wdXNoKGVudlZhcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1pc3NpbmdWYXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgZXJyTXNnID0gYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzOiAke21pc3NpbmdWYXJzLmpvaW4oXG4gICAgICAgICAgICAnLCAnXG4gICAgICAgICl9LiBUaGlzIHNob3VsZCBub3QgaGFwcGVuIGFuZCBpbmRpY2F0ZXMgaW4gaXNzdWUgd2l0aCB5b3VyIGRlcGxveW1lbnQuYDtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGVyck1zZyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJNc2cpO1xuICAgIH1cbn07XG4iXX0=