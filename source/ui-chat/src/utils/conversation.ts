// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Conversation } from '../types/chat';

export const saveConversation = (conversation: Conversation) => {
    localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};
