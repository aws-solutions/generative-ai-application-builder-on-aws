// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FC, memo } from 'react';
import { ChatMessage, Props } from './ChatMessage';

export const MemoizedChatMessage: FC<Props> = memo(
    ChatMessage,
    (prevProps, nextProps) => prevProps.message.content === nextProps.message.content
);
