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

'use strict';

const USER_AGENT =
    '^(AWSSOLUTION)\\/SO(\\d+)([a-zA-Z]*)\\/v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$';

const usrAgentRegex = new RegExp(USER_AGENT);

export const customAwsConfig = (): any => {
    checkEnvSetup();

    return {
        ...JSON.parse(process.env.AWS_SDK_USER_AGENT!),
        region: process.env.AWS_REGION,
        maxRetries: 5
    };
};

const checkEnvSetup = (): void => {
    if (!process.env.AWS_SDK_USER_AGENT) {
        throw new Error('User-agent for SDK not set as environment variables');
    }

    const jsonUsrAgent = JSON.parse(process.env.AWS_SDK_USER_AGENT);

    if (!jsonUsrAgent.hasOwnProperty('customUserAgent')) {
        throw new Error('The environment variable JSON string does not have key "customUserAgent"');
    }

    if (!usrAgentRegex.test(jsonUsrAgent.customUserAgent)) {
        throw new Error(
            'User-agent for SDK does not meet the required format. The format should be "AWSSOLUTION/SO<id>/v<version number>", where id is the numeric id of the solution and version is the semver version number format'
        );
    }
};
