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

import json
import os
from unittest.mock import patch

import pytest
from clients.bedrock_client import BedrockClient
from utils.constants import LLM_PARAMETERS_SSM_KEY_ENV_VAR, DEFAULT_BEDROCK_PROMPT, DEFAULT_BEDROCK_MODEL_FAMILY


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled", [(DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, False)]
)
def test_get_model(bedrock_llm_config, chat_event):
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-key"
    client = BedrockClient(connection_id="fake-connection-id", rag_enabled=False)

    with patch("clients.bedrock_client.BedrockClient.construct_chat_model") as mocked_chat_model_construction:
        with patch("clients.bedrock_client.BedrockClient.get_llm_config") as mocked_get_llm_config:
            mocked_chat_model_construction.return_value = None
            mocked_get_llm_config.return_value = json.loads(bedrock_llm_config["Parameter"]["Value"])
            try:
                event_body = json.loads(chat_event["body"])
                assert client.get_model(event_body, "fake-user-uuid") is None
                assert client.builder.conversation_id == "fake-conversation-id"
            except Exception as exc:
                assert False, f"'client.get_model' raised an exception {exc}"
