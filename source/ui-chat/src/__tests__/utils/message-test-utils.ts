// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatBubbleMessage, AlertMessage } from '../../pages/chat/types';
import { SourceDocument } from '../../models';

export const mockUserId = 'test-user-id';

let messageCounter = 0;

export const createChatBubbleMessage = (overrides: Partial<ChatBubbleMessage> = {}): ChatBubbleMessage => {
    messageCounter++;
    const timestamp = new Date(2024, 0, messageCounter).toISOString().replace(/[^0-9]/g, '');

    return {
        type: 'chat-bubble',
        authorId: mockUserId,
        content: 'Default content',
        timestamp,
        hideAvatar: false,
        avatarLoading: false,
        ...overrides
    };
};

export const createAlertMessage = (overrides: Partial<AlertMessage> = {}): AlertMessage => ({
    type: 'alert',
    content: 'Default alert content',
    header: 'Default header',
    ...overrides
});

export const createSourceDocument = (overrides: Partial<SourceDocument> = {}): SourceDocument => ({
    excerpt: 'Default excerpt',
    source_name: 'Default Source',
    link: 'https://example.com',
    title: 'Default Title',
    location: 'default/location',
    score: 0.95,
    document_title: 'Default Document Title',
    document_id: 'default-doc-id',
    additional_attributes: null,
    ...overrides
});

export const createXRayTraceId = (
    message: string,
    rootId: string = '1-0000-fake-0000',
    parentId: string = '1-0000-fake-0000',
    sampled: boolean = true,
    lineage: string = 'lineage-123'
) => {
    return `${message} Root=${rootId};Parent=${parentId};Sampled=${sampled ? '1' : '0'};Lineage=${lineage}`;
};
