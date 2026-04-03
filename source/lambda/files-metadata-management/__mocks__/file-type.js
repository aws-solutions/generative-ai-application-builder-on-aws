// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Manual mock for file-type (ESM-only package) to allow Jest (CJS) to resolve it.
// Tests override this with jest.mock('file-type', ...) as needed.
module.exports = {
    fileTypeFromBuffer: jest.fn()
};
