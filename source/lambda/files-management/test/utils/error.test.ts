// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import RequestValidationError from '../../utils/error';

describe('RequestValidationError', () => {
    it('should create error with correct message and name', () => {
        const errorMessage = 'Test validation error';
        const error = new RequestValidationError(errorMessage);

        expect(error.message).toBe(errorMessage);
        expect(error.name).toBe('CustomHttpError');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(RequestValidationError);
    });

    it('should be throwable and catchable', () => {
        const errorMessage = 'Test validation error';

        expect(() => {
            throw new RequestValidationError(errorMessage);
        }).toThrow(errorMessage);

        try {
            throw new RequestValidationError(errorMessage);
        } catch (error) {
            expect(error).toBeInstanceOf(RequestValidationError);
            expect((error as RequestValidationError).message).toBe(errorMessage);
        }
    });
});
