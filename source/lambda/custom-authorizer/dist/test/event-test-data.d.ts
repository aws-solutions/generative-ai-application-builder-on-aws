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
import { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
export declare const mockValidWebsocketRequestEvent: Partial<APIGatewayRequestAuthorizerEvent>;
export declare const mockValidRestRequestEvent: Partial<APIGatewayRequestAuthorizerEvent>;
export declare const mockInvalidRequestEvent: Partial<APIGatewayRequestAuthorizerEvent>;
export declare const batchGetItemResponse: {
    $metadata: {
        httpStatusCode: number;
        requestId: string;
        attempts: number;
        totalRetryDelay: number;
    };
    Responses: {
        'fake-table-name': {
            policy: {
                Version: string;
                Statement: {
                    Resource: string[];
                    Effect: string;
                    Action: string;
                    Sid: string;
                }[];
            };
            group: string;
        }[];
    };
    UnprocessedKeys: {};
};
export declare const multiGroupBatchGetItemResponse: {
    $metadata: {
        httpStatusCode: number;
        requestId: string;
        attempts: number;
        totalRetryDelay: number;
    };
    Responses: {
        'fake-table-name': ({
            policy: {
                Version: string;
                Statement: {
                    Resource: string[];
                    Effect: string;
                    Action: string;
                    Sid: string;
                }[];
            };
            group: string;
            'some-bad-object'?: undefined;
        } | {
            'some-bad-object': {
                Version: string;
                Statement: never[];
            };
            policy?: undefined;
            group?: undefined;
        })[];
    };
    UnprocessedKeys: {};
};
export declare const fakeIdToken: Partial<CognitoAccessTokenPayload>;
export declare const fakeMultiGroupIdToken: Partial<CognitoAccessTokenPayload>;
