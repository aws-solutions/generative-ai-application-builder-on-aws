// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// file-type v17+ is ESM-only; wrap in a helper so tests can mock without circular deps
export async function detectFileType(buffer: Buffer): Promise<{ mime: string; ext: string } | undefined> {
    const { fileTypeFromBuffer } = await import('file-type');
    return fileTypeFromBuffer(buffer);
}
