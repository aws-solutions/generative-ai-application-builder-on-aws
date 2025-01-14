// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const API_NAME = 'api';
export const APP_TRADEMARK_NAME = 'Generative AI Application Builder on AWS - Chat';

export const MIN_PROMPT_TEMPLATE_LENGTH = 0;
export const MAX_PROMPT_TEMPLATE_LENGTH = 375000;
export const END_CONVERSATION_TOKEN = '##END_CONVERSATION##';

export const INTERNAL_USER_GENAI_POLICY_URL = 'https://policy.a2z.com/docs/568686/publication';

// for handling source documents
export const SOURCE_DOCS_RESPONSE_PAYLOAD_KEY = 'sourceDocument';

// for socket connection
export const SOCKET_CONNECTION_RETRIES = 15;
export const DEFAULT_DELAY_MS = 1000;

export enum USE_CASE_TYPES {
    AGENT = 'Agent',
    TEXT = 'Text'
}

export enum USE_CASE_TYPES_ROUTE {
    AGENT = 'invokeAgent',
    TEXT = 'sendMessage'
}

export enum MAX_TEXT_INPUT_LENGTHS {
    DEFAULT = 375000,
    AGENT = 25000000,
    TEXT = 375000
}
