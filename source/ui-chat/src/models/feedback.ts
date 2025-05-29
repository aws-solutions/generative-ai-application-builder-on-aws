// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FeedbackType } from '../pages/chat/components/input/FeedbackForm';

export interface FeedbackData {
    messageId: string;
    type: FeedbackType;
    comment: string;
    reasons: string[];
    timestamp: string;
}
