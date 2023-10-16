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
import middy from '@middy/core';
import { ListUseCasesAdapter } from './model/list-use-cases';
import { UseCase } from './model/use-case';
export declare const lambdaHandler: (event: import("aws-lambda").APIGatewayProxyEvent) => Promise<{
    statusCode: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Credentials': boolean;
        'Access-Control-Allow-Origin': string;
    };
    isBase64Encoded: boolean;
    body: string;
} | {
    statusCode: string;
    headers: {
        'Content-Type': string;
        'x-amzn-ErrorType': string;
        'Access-Control-Allow-Origin': string;
    };
    isBase64Encoded: boolean;
    body: string;
}>;
export declare const adaptEvent: (event: import("aws-lambda").APIGatewayProxyEvent, stackAction: string) => UseCase | ListUseCasesAdapter;
export declare const handler: middy.MiddyfiedHandler<import("aws-lambda").APIGatewayProxyEvent, {
    statusCode: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Credentials': boolean;
        'Access-Control-Allow-Origin': string;
    };
    isBase64Encoded: boolean;
    body: string;
} | {
    statusCode: string;
    headers: {
        'Content-Type': string;
        'x-amzn-ErrorType': string;
        'Access-Control-Allow-Origin': string;
    };
    isBase64Encoded: boolean;
    body: string;
}, Error, import("aws-lambda").Context>;
