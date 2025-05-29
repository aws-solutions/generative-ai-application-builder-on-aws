// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface SourceDocument {
    source_name?: string;
    excerpt: string;
    link?: string | null;
    title?: string | null;
    location?: string;
    score?: string | number;
    document_title?: string | null;
    document_id?: string | null;
    additional_attributes?: any | null;
}
