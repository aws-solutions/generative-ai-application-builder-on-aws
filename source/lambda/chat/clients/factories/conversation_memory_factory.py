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
from langchain.schema import BaseMemory
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CONVERSATION_TABLE_NAME_ENV_VAR, TRACE_ID_ENV_VAR
from utils.enum_types import ConversationMemoryTypes

logger = Logger(utc=True)


class ConversationMemoryFactory:
    """
    Factory class for creating a conversation memory object based on the ConversationMemoryType provided, along with its configuration
    in the llm_config.
    """

    def get_conversation_memory(
        self,
        llm_config: Dict,
        user_id: str,
        conversation_id: str,
        errors: List[str],
        memory_key: Optional[str] = None,
        input_key: Optional[str] = None,
        output_key: Optional[str] = None,
        human_prefix: Optional[str] = None,
        ai_prefix: Optional[str] = None,
    ) -> BaseMemory:
        """
        Returns a BaseMemory object based on the conversation-memory object constructed with the provided configuration.
        Args:
            llm_config(Dict): Model configuration set by admin
            errors(List): List of errors to append to
            user_id(str): User ID
            conversation_id (str): Conversation ID
            memory_key(Optional[str]): Memory/history key for the conversation memory
            input_key(Optional[str]): Input key for the conversation memory
            output_key(Optional[str]): Output key for the conversation memory
            human_prefix(Optional[str]): Human prefix in the conversation
            ai_prefix(Optional[str]): AI prefix in the conversation

        Returns:
            BaseMemory: the conversation-memory constructed with the provided configuration
        """

        conversation_memory_type = llm_config.get("ConversationMemoryType")
        unsupported_memory_error = f"Unsupported Memory base type: {conversation_memory_type}."

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
                table_name=table_name, user_id=user_id, conversation_id=conversation_id
            )
            chat_memory = DynamoDBChatMemory(
                chat_message_history=chat_history,
                memory_key=memory_key,
                input_key=input_key,
                output_key=output_key,
                human_prefix=human_prefix,
                ai_prefix=ai_prefix,
            )

            return chat_memory

        else:
            errors.append(unsupported_memory_error)
