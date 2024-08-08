#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import os
from typing import Dict, List, Optional

from aws_lambda_powertools import Logger
from langchain_core.memory import BaseMemory
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    AI_PREFIX,
    CONTEXT_KEY,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    HISTORY_KEY,
    HUMAN_PREFIX,
    INPUT_KEY,
    OUTPUT_KEY,
    TRACE_ID_ENV_VAR,
)
from utils.enum_types import ConversationMemoryTypes

logger = Logger(utc=True)


class ConversationMemoryFactory:
    """
    Factory class for creating a conversation memory object based on the ConversationMemoryType provided, along with its configuration
    in the use_case_config.
    """

    def get_conversation_memory(
        self,
        use_case_config: Dict,
        default_memory_config: Dict,
        user_id: str,
        conversation_id: str,
        errors: Optional[List[str]] = None,
    ) -> BaseMemory:
        """
        Returns a BaseMemory object based on the conversation-memory object constructed with the provided configuration.
        Args:
            use_case_config(Dict): Model configuration set by admin
            default_memory_config: Default memory configuration that includes the memory_key, input_key, output_key, human_prefix, ai_prefix
            user_id(str): User ID
            conversation_id (str): Conversation ID
            errors (List[str]): List of errors to append to

        Returns:
            BaseMemory: the conversation-memory constructed with the provided configuration
        """
        if errors is None:
            errors = []

        conversation_memory_type = use_case_config.get("ConversationMemoryParams", {}).get("ConversationMemoryType")
        unsupported_memory_error = f"Unsupported Memory base type: {conversation_memory_type}."

        max_history_length = use_case_config.get("ConversationMemoryParams", {}).get("ChatHistoryLength")

        if conversation_memory_type is None:
            errors.append(
                "Missing required field ConversationMemoryType in the config which is required for constructing conversation memory for the LLM."
            )
            return

        memory_type = ""
        try:
            # Incorrect conversation_memory_type throws ValueError due to enum validation
            memory_type = ConversationMemoryTypes(conversation_memory_type)
        except ValueError as ve:
            logger.error(
                ve,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            errors.append(
                unsupported_memory_error
                + f" Supported types are: {[memory.value for memory in ConversationMemoryTypes]}"
            )
            return

        if memory_type == ConversationMemoryTypes.DynamoDB.value:
            table_name = os.getenv(CONVERSATION_TABLE_NAME_ENV_VAR)

            # should not happen since env is checked in handler
            if not table_name:
                errors.append(
                    f"Missing required environment variable {CONVERSATION_TABLE_NAME_ENV_VAR} which is required for constructing conversation memory for the LLM."
                )
                return
            chat_history = DynamoDBChatMessageHistory(
                table_name=table_name,
                user_id=user_id,
                conversation_id=conversation_id,
                max_history_length=max_history_length,
            )

            ai_prefix = use_case_config.get("ConversationMemoryParams", {}).get("AiPrefix")
            human_prefix = use_case_config.get("ConversationMemoryParams", {}).get("HumanPrefix")

            chat_memory = DynamoDBChatMemory(
                chat_message_history=chat_history,
                memory_key=default_memory_config[HISTORY_KEY],
                input_key=default_memory_config[INPUT_KEY],
                output_key=default_memory_config[OUTPUT_KEY],
                context_key=default_memory_config[CONTEXT_KEY],
                human_prefix=(
                    default_memory_config[HUMAN_PREFIX] if human_prefix is None or not human_prefix else human_prefix
                ),
                ai_prefix=(default_memory_config[AI_PREFIX] if ai_prefix is None or not ai_prefix else ai_prefix),
            )
            return chat_memory

        else:
            errors.append(unsupported_memory_error)
