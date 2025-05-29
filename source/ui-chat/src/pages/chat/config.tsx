// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Link, Popover } from '@cloudscape-design/components';

export const AUTHORS = {
    ASSISTANT: 'assistant'
} as const;

export type AuthorAvatarProps = {
    type: 'user' | 'assistant';
    name: string;
    initials?: string;
    loading?: boolean;
};
type AuthorsType = {
    [key: string]: AuthorAvatarProps;
};

// Create a function to generate user author config
export const createUserAuthor = (name: string = 'Anonymous User', initials?: string): AuthorAvatarProps => {
    // get the initials from the name
    // name could be space separated or hypen separated words

    return {
        type: 'user',
        name,
        initials:
            initials ||
            name
                .split('-')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
    };
};

// Default AI assistant config
export const AI_AUTHOR: AuthorAvatarProps = {
    type: AUTHORS.ASSISTANT,
    name: 'Generative AI assistant'
};

// Initialize AUTHORS with just the AI assistant
export const AUTHORS_CONFIG: AuthorsType = {
    [AUTHORS.ASSISTANT]: AI_AUTHOR
};

// Function to get or create user author
export const getUserAuthor = (userId: string, name?: string, initials?: string): AuthorAvatarProps => {
    if (!AUTHORS_CONFIG[userId]) {
        AUTHORS_CONFIG[userId] = createUserAuthor(name, initials);
    }
    return AUTHORS_CONFIG[userId];
};
