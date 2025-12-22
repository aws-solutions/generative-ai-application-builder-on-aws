// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import RequestValidationError from '../utils/error';

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
    TenantId?: string;
    VoicePhoneNumber?: string;
    UseCaseType: string;
    StackId: string;
    Name: string;
    UseCaseConfigRecordKey: string;
    UseCaseConfigTableName: string;
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
    pageNumber: number;
    searchFilter?: string;
    tenantId?: string;

    constructor(event: APIGatewayEvent) {
        this.event = event;

        if (event.queryStringParameters?.pageNumber !== undefined) {
            try {
                this.pageNumber = parseInt(event.queryStringParameters.pageNumber, 10);
                if (isNaN(this.pageNumber)) throw new Error();
            } catch (error) {
                throw new RequestValidationError(
                    'Could not parse pageNumber as an int from the query string parameter in the request'
                );
            }
        } else {
            throw new RequestValidationError('pageNumber was not found in the query string parameters of the request');
        }

        this.searchFilter =
            event.queryStringParameters?.searchFilter !== undefined
                ? event.queryStringParameters.searchFilter
                : undefined;

        this.tenantId =
            event.queryStringParameters?.tenantId !== undefined && event.queryStringParameters.tenantId.length > 0
                ? event.queryStringParameters.tenantId
                : undefined;
    }
}
