// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export interface Message {
    role: Role;
    content: string;
}

export interface SourceDocument {
    excerpt: string;
    location: string;
    score: string | number;
    document_title: string;
    document_id: string;
    additional_attributes: any;
}

export interface MessageWithSource extends Message {
    sourceDocuments?: SourceDocument[];
}

export type Role = 'assistant' | 'user';

export interface Conversation {
    id: string;
    name: string;
    messages: MessageWithSource[];
}
