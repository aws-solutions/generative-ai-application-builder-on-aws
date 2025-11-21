// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatActionTypes, ChatActionType } from '../../../pages/chat/types';

describe('ChatActionTypes', () => {
    it('should include all existing action types', () => {
        expect(ChatActionTypes.ADD_USER_MESSAGE).toBe('ADD_USER_MESSAGE');
        expect(ChatActionTypes.UPDATE_AI_RESPONSE).toBe('UPDATE_AI_RESPONSE');
        expect(ChatActionTypes.COMPLETE_AI_RESPONSE).toBe('COMPLETE_AI_RESPONSE');
        expect(ChatActionTypes.SET_CONVERSATION_ID).toBe('SET_CONVERSATION_ID');
        expect(ChatActionTypes.ADD_SOURCE_DOCUMENT).toBe('ADD_SOURCE_DOCUMENT');
        expect(ChatActionTypes.SET_ERROR).toBe('SET_ERROR');
        expect(ChatActionTypes.SET_MESSAGES).toBe('SET_MESSAGES');
        expect(ChatActionTypes.ADD_REPHRASED_QUERY).toBe('ADD_REPHRASED_QUERY');
        expect(ChatActionTypes.RESET_CHAT).toBe('RESET_CHAT');
    });

    it('should include streaming action types', () => {
        expect(ChatActionTypes.START_STREAMING).toBe('START_STREAMING');
        expect(ChatActionTypes.UPDATE_STREAMING_CHUNK).toBe('UPDATE_STREAMING_CHUNK');
        expect(ChatActionTypes.COMPLETE_STREAMING).toBe('COMPLETE_STREAMING');
    });

    it('should include tool usage action types', () => {
        expect(ChatActionTypes.UPDATE_TOOL_USAGE).toBe('UPDATE_TOOL_USAGE');
        expect(ChatActionTypes.ADD_TOOL_USAGE).toBe('ADD_TOOL_USAGE');
        expect(ChatActionTypes.CLEAR_TOOL_USAGE).toBe('CLEAR_TOOL_USAGE');
    });

    // Thinking is now managed as message metadata, not as separate actions

    it('should have ChatActionType union type that includes all action types', () => {
        // This is a compile-time check - if this compiles, the union type is correct
        const testActionType: ChatActionType = ChatActionTypes.START_STREAMING;
        expect(testActionType).toBe('START_STREAMING');

        const testActionType2: ChatActionType = ChatActionTypes.ADD_TOOL_USAGE;
        expect(testActionType2).toBe('ADD_TOOL_USAGE');

        const testActionType3: ChatActionType = ChatActionTypes.CLEAR_TOOL_USAGE;
        expect(testActionType3).toBe('CLEAR_TOOL_USAGE');
    });

    it('should have all action types as const values', () => {
        // Verify that the object is readonly
        const actionTypes = ChatActionTypes;
        expect(Object.isFrozen(actionTypes)).toBe(false); // as const doesn't freeze, but makes readonly
        
        // Verify all keys exist
        const expectedKeys = [
            'ADD_USER_MESSAGE',
            'UPDATE_AI_RESPONSE',
            'COMPLETE_AI_RESPONSE',
            'SET_CONVERSATION_ID',
            'ADD_SOURCE_DOCUMENT',
            'SET_ERROR',
            'SET_MESSAGES',
            'ADD_REPHRASED_QUERY',
            'RESET_CHAT',
            'START_STREAMING',
            'UPDATE_STREAMING_CHUNK',
            'COMPLETE_STREAMING',
            'UPDATE_TOOL_USAGE',
            'ADD_TOOL_USAGE',
            'CLEAR_TOOL_USAGE'
        ];

        const actualKeys = Object.keys(actionTypes);
        expect(actualKeys).toEqual(expectedKeys);
    });
});
