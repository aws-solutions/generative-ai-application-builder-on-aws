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

from unittest.mock import Mock, patch

import pytest
from langchain.schema import HumanMessage
from shared.memory.ddb_chat_memory import DynamoDBChatMemory


def test_init():
    mock_message_history = Mock()
    memory = DynamoDBChatMemory(mock_message_history)
    assert memory.chat_memory == mock_message_history
    assert memory.memory_variables == [memory.memory_key]


def test_load_memory_variables_with_none():
    mock_message_history = Mock()
    mock_message_history.messages = [HumanMessage(content="Hello world!")]
    memory = DynamoDBChatMemory(mock_message_history)
    var = memory.load_memory_variables(None)
    assert var == {memory.memory_key: memory.buffer}


@pytest.mark.parametrize("input_key,output_key,memory_key", [(None, None, None), ("input", "answer", "chat_history")])
def test_load_memory_variables(input_key, output_key, memory_key):
    mock_message_history = Mock()
    memory = DynamoDBChatMemory(mock_message_history, input_key=input_key, output_key=output_key, memory_key=memory_key)
    test_input = {memory.input_key: "fake message from a user"}
    test_output = {memory.output_key: "fake response from the ai"}
    with patch("shared.memory.ddb_chat_memory.get_prompt_input_key") as prompt_input_key:
        prompt_input_key.return_value = memory.input_key
        memory.save_context(test_input, test_output)

    mock_message_history.add_user_message.assert_called_once_with("fake message from a user")
    mock_message_history.add_ai_message.assert_called_once_with("fake response from the ai")
