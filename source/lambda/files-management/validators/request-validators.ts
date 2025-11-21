// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FileUploadRequest, FileDeleteRequest } from '../models/types';
import RequestValidationError from '../utils/error';
import { FILE_OPERATION_CONSTRAINTS } from '../utils/constants';

/**
 * Validates file upload request parameters
 * @param request - The file upload request to validate
 * @throws RequestValidationError if validation fails
 */
export const validateFileUploadRequest = (request: FileUploadRequest): void => {
    if (request.fileNames.length > FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST) {
        throw new RequestValidationError(
            `Too many files. Maximum ${FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST} files allowed per request`
        );
    }
};

/**
 * Validates file delete request parameters
 * @param request - The file delete request to validate
 * @throws RequestValidationError if validation fails
 */
export const validateFileDeleteRequest = (request: FileDeleteRequest): void => {
    if (request.fileNames.length > FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST) {
        throw new RequestValidationError(
            `Too many files to delete. Maximum ${FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST} files allowed per request`
        );
    }
};
