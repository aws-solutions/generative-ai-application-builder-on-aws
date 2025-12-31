// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ThinkingMetadata } from '../pages/chat/types';

/**
 * Result of extracting thinking content from a message
 */
export interface ThinkingExtractionResult {
    cleanedContent: string;
    thinkingContent: string;
}

/**
 * Result of processing message content with thinking metadata
 */
export interface ProcessedMessageContent {
    /** Cleaned message content with thinking tags removed */
    content: string;
    /** Updated thinking metadata with stripped content attached */
    thinking?: ThinkingMetadata;
}

/**
 * Extracts content from <thinking> tags and returns cleaned message content.
 * Handles multiple thinking tags, malformed tags, and nested content gracefully.
 * No sanitization is performed as content comes from our backend.
 * 
 * @param content - The raw message content that may contain thinking tags
 * @returns Object with cleanedContent (thinking tags removed) and thinkingContent (extracted thinking)
 * 
 * @example
 * const result = extractThinkingContent("Hello <thinking>analyzing...</thinking> world");
 * // result.cleanedContent === "Hello  world"
 * // result.thinkingContent === "analyzing..."
 */
export function extractThinkingContent(content: string): ThinkingExtractionResult {
    // Handle null, undefined, or non-string input
    if (!content || typeof content !== 'string') {
        return {
            cleanedContent: '',
            thinkingContent: ''
        };
    }

    // Regex to match <thinking> tags with content (case-insensitive, multiline, non-greedy)
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
    
    let thinkingContent = '';
    
    // Extract all thinking content from all tags
    const matches = content.matchAll(thinkingRegex);
    for (const match of matches) {
        // match[1] contains the captured group (content between tags)
        if (match[1]) {
            thinkingContent += match[1] + '\n';
        }
    }
    
    // Remove all thinking tags from the content
    const cleanedContent = content.replace(thinkingRegex, '');
    
    return {
        cleanedContent: cleanedContent.trim(),
        thinkingContent: thinkingContent.trim()
    };
}

/**
 * Processes message content by extracting thinking tags and attaching the content to thinking metadata.
 * Combines thinking extraction with metadata attachment in a single operation.
 * No sanitization is performed as content comes from our backend.
 * 
 * @param content - The raw message content that may contain thinking tags
 * @param thinkingMetadata - Optional thinking metadata to attach stripped content to
 * @returns Object with cleaned content and updated thinking metadata (if provided)
 * 
 * @example
 * const metadata = { duration: 3, type: 'analyzing', startTime: '...', endTime: '...' };
 * const result = processMessageContent("Hello <thinking>analyzing...</thinking> world", metadata);
 * // result.content === "Hello  world"
 * // result.thinking.strippedContent === "analyzing..."
 */
export function processMessageContent(
    content: string,
    thinkingMetadata?: ThinkingMetadata
): ProcessedMessageContent {
    // Extract thinking content from the message
    const { cleanedContent, thinkingContent } = extractThinkingContent(content);
    
    // If we have thinking metadata and extracted content, attach the content to metadata
    if (thinkingMetadata && thinkingContent) {
        return {
            content: cleanedContent,
            thinking: {
                ...thinkingMetadata,
                strippedContent: thinkingContent
            }
        };
    }
    
    // If we have thinking metadata but no extracted content, return metadata as-is
    if (thinkingMetadata) {
        return {
            content: cleanedContent,
            thinking: thinkingMetadata
        };
    }
    
    // No thinking metadata provided, just return cleaned content
    return {
        content: cleanedContent,
        thinking: undefined
    };
}
