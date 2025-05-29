// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatBubbleMessage } from '../../types';
import { FeedbackFormData } from '../input/FeedbackForm';

interface BaseMessageProps {
    message: ChatBubbleMessage;
    author: {
        type: 'user' | 'assistant';
        name: string;
        avatar?: string;
        description?: string;
    };
    'data-testid'?: string;
}

export interface IncomingMessageProps extends BaseMessageProps {
    showActions: boolean;
    conversationId: string;
}

export interface OutgoingMessageProps extends BaseMessageProps {
    previewHeight?: number;
}
