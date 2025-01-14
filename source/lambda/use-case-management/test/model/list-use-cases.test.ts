// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ListUseCasesAdapter } from '../../model/list-use-cases';
import { APIGatewayEvent } from 'aws-lambda';
import RequestValidationError from '../../utils/error';

describe('When creating a list cases adapter', () => {
    it('Should create a ListUseCasesAdapter instance correctly', () => {
        const event = {
            queryStringParameters: {
                pageNumber: '10'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        const adaptedEvent = new ListUseCasesAdapter(event as APIGatewayEvent);
        expect(adaptedEvent.event).toEqual(event);
        expect(adaptedEvent.pageNumber).toEqual(10);
    });

    it('Should create a ListUseCasesAdapter instance correctly with search filter', () => {
        const event = {
            queryStringParameters: {
                pageNumber: '10',
                searchFilter: 'use case 1'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        const adaptedEvent = new ListUseCasesAdapter(event as APIGatewayEvent);
        expect(adaptedEvent.event).toEqual(event);
        expect(adaptedEvent.pageNumber).toEqual(10);
        expect(adaptedEvent.searchFilter).toEqual('use case 1');
    });

    it('Should throw error when missing pageNumber', () => {
        const event = {
            queryStringParameters: {
                searchFilter: 'usecase1'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        expect(() => new ListUseCasesAdapter(event as APIGatewayEvent)).toThrow(RequestValidationError);
    });

    it('Should throw error when passed bad pageNumber', () => {
        const event = {
            queryStringParameters: {
                pageNumber: 'not a number',
                searchFilter: 'usecase1'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        expect(() => new ListUseCasesAdapter(event as APIGatewayEvent)).toThrow(RequestValidationError);
    });
});
