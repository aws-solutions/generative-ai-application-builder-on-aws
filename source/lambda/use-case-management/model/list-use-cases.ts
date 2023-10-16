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

import { APIGatewayEvent } from 'aws-lambda';

/**
 * Interface to describe a stack that is stored in the dynamoDb table.
 * It is used to describe the stacks using the cloudformation describe-stacks API
 */
export interface StackInfo {
    stackArn: string;
    stackName: string;
    stackId: string;
    stackInstanceAccount: string;
    stackInstanceRegion: string;
}

/**
 * Interface to describe a record in the UseCase dynamoDb table
 */
export interface UseCaseRecord {
    UseCaseId: string;
    StackId: string;
    Name: string;
    SSMParameterKey: string;
    CreatedBy: string;
    CreatedDate: string;
    UpdatedBy?: string;
    UpdatedDate?: string;
    DeletedBy?: string;
    DeletedDate?: string;
    Description?: string;
    TTL?: number;
}

/**
 * Create event adapter from the API Gateway event for the GET request.
 */
export class ListUseCasesAdapter {
    event: APIGatewayEvent;

    constructor(event: APIGatewayEvent) {
        this.event = event;
    }
}
