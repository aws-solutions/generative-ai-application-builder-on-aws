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

import * as CustomConfig from '../index';

describe('calling aws-nodesdk-custom-config', () => {
    let layerFuncSpy: jest.SpyInstance;

    beforeAll(() => {
        layerFuncSpy = jest.spyOn(CustomConfig, 'customAwsConfig');
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('should return a json config', async () => {
        expect(CustomConfig.customAwsConfig()).toStrictEqual({
            ...JSON.parse(process.env.AWS_SDK_USER_AGENT!),
            region: process.env.AWS_REGION,
            maxRetries: 5
        });
        expect(layerFuncSpy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
        layerFuncSpy.mockClear();
    });

    afterAll(() => {
        jest.restoreAllMocks();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('when user agent for SDK is not set as environment variable', () => {
    let layerFuncSpy: jest.SpyInstance;

    beforeAll(() => {
        process.env.AWS_REGION = 'us-east-1';
        layerFuncSpy = jest.spyOn(CustomConfig, 'customAwsConfig');
    });

    it('should throw an error', async () => {
        try {
            CustomConfig.customAwsConfig();
        } catch (error: any) {
            expect(error.message).toEqual('User-agent for SDK not set as environment variables');
        }
        expect(layerFuncSpy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
        layerFuncSpy.mockClear();
    });

    afterAll(() => {
        jest.restoreAllMocks();
        delete process.env.AWS_REGION;
    });
});

describe('when the user agent format is defined, but', () => {
    beforeAll(() => {
        process.env.AWS_REGION = 'us-east-1';
    });

    describe('when regex pattern does not match', () => {
        it('should fail if solution id is incorrect', () => {
            process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/Fake/v9.9.9" }';
            const output = () => {
                CustomConfig.customAwsConfig();
            };
            expect(output).toThrow(Error);
            expect(output).toThrow(
                'User-agent for SDK does not meet the required format. The format should be "AwsSolution/SO<id>/v<version number>", where id is the numeric id of the solution and version is the semver version number format'
            );
        });

        it('should fail if version is incorrect', () => {
            process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO999/fakeversion" }';
            const output = () => {
                CustomConfig.customAwsConfig();
            };
            expect(output).toThrow(Error);
            expect(output).toThrow(
                'User-agent for SDK does not meet the required format. The format should be "AwsSolution/SO<id>/v<version number>", where id is the numeric id of the solution and version is the semver version number format'
            );
        });

        it('should fail if it does not start with "AwsSolution"', () => {
            process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "FakeSolution/SO999/v9.9.9" }';
            const output = () => {
                CustomConfig.customAwsConfig();
            };
            expect(output).toThrow(Error);
            expect(output).toThrow(
                'User-agent for SDK does not meet the required format. The format should be "AwsSolution/SO<id>/v<version number>", where id is the numeric id of the solution and version is the semver version number format'
            );
        });

        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;
        });
    });

    afterAll(() => {
        delete process.env.AWS_REGION;
    });
});

describe('when the user agent key is defined incorrectly', () => {
    beforeAll(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "fakeuseragent": "AwsSolution/Fake/v9.9.9" }';
    });

    it('should fail if solution id is incorrect', () => {
        const output = () => {
            CustomConfig.customAwsConfig();
        };
        expect(output).toThrow(Error);
        expect(output).toThrow('The environment variable JSON string does not have key "customUserAgent"');
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
