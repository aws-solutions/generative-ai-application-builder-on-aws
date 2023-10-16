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

from typing import Any, Dict, List, Optional, Tuple

from aws_lambda_powertools import Logger
from langchain.memory.chat_memory import BaseChatMemory
from langchain.memory.utils import get_prompt_input_key
from langchain.schema import get_buffer_string
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.enum_types import ConversationMemoryTypes

logger = Logger(utc=True)


class DynamoDBChatMemory(BaseChatMemory):
    """A chat memory interface which uses DynamoDb as the backing store."""

    # Mimicking ConversationBufferMemory and other such memory classes provided by langchain
    memory_type: ConversationMemoryTypes = ConversationMemoryTypes.DynamoDB.value
    memory_key: str  #: :meta private:
    input_key: Optional[str] = None
    human_prefix: str = "Human"
    ai_prefix: Optional[str] = "AI"
    output_key: Optional[str] = None

    def __init__(
        self,
        chat_message_history: DynamoDBChatMessageHistory,
        memory_key: Optional[str] = None,
        input_key: Optional[str] = None,
        output_key: Optional[str] = None,
        human_prefix: Optional[str] = None,
        ai_prefix: Optional[str] = None,
        return_messages: bool = False,
    ) -> None:
        """
        Args:
            chat_message_history (DynamoDBChatMessageHistory): The chat message history object which will store the
            conversation in DynamoDB
            memory_key (str, optional): The key to use for the memory. Defaults to "history".
            input_key (str, optional): The key to use for the input. Defaults to "input".
            output_key (str, optional): The key to use for the output. Defaults to None.
            human_prefix (str, optional): The prefix to use for human messages. Defaults to "Human".
            ai_prefix (str, optional): The prefix to use for AI messages. Defaults to "AI".

        Raises:
            ValueError: If the chat_message_history is not a DynamoDBChatMessageHistory object.
        """
        memory_key = memory_key if memory_key else "history"
        input_key = input_key if input_key else "input"
        super().__init__(
            memory_key=memory_key, input_key=input_key, output_key=output_key, return_messages=return_messages
        )
        self.human_prefix = human_prefix if human_prefix else self.human_prefix
        self.ai_prefix = ai_prefix if ai_prefix else self.ai_prefix
        self.chat_memory = chat_message_history

    @property
    def buffer(self) -> Any:
        """Returns the buffer memory.

        Args: None
        Returns:
            Any: The buffer memory containing conversation history.

        """
        if self.return_messages:
            return self.chat_memory.messages
        else:
            return get_buffer_string(
                self.chat_memory.messages,
                human_prefix=self.human_prefix,
                ai_prefix=self.ai_prefix,
            )

    def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Return history buffer. Implementation of the abstract method."""
        return {self.memory_key: self.buffer}

    @property
    def memory_variables(self) -> List[str]:
        """
        Returns list of memory variables.

        Args: None
        Returns:
            List[str]: The list of memory variables.

        """
        return [self.memory_key]

    def _get_input_output(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> Tuple[str, str]:
        """
        Fetches the input and outputs based on the prompt or conversation memory input/output keys
        Raises a warning if the multiple output keys are provided.

        Args:
            inputs (Dict[str, Any]): The inputs from the prompt or conversation memory
            outputs (Dict[str, str]): The outputs from the prompt or conversation memory

        Returns:
            Tuple[str, str]: The input and output strings

        Examples:
            >>> inputs = {"input": "Hello assistant"}
            >>> outputs = {"output": "Hi human"}
            >>> get_input_output(inputs, outputs)
            ("Hello assistant", "Hi human")

        """
        if self.input_key is None:
            prompt_input_key = get_prompt_input_key(inputs, self.memory_variables)
        else:
            prompt_input_key = self.input_key

        if self.output_key:
            output_key = self.output_key
            return inputs[prompt_input_key], outputs[output_key]

        selected_keys = outputs.keys()
        if len(outputs) != 1 and "source_documents" in outputs:
            logger.debug(f"Removing source documents from outputs.")
            selected_keys = list(set(selected_keys) - {"source_documents"})

        # If the length of selected_keys is still not equal to one, select one and move ahead.
        if len(selected_keys) != 1:
            logger.warning(f"One output key expected, got {outputs.keys()}. Taking the first one.")
        else:
            selected_keys = list(selected_keys)

        output_key = selected_keys[0]
        return inputs[prompt_input_key], outputs[output_key]
