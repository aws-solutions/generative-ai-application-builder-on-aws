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

import json
import os
from unittest.mock import patch

import pytest
from clients.huggingface_client import HuggingFaceClient
from utils.constants import DEFAULT_HUGGINGFACE_PROMPT, LLM_PARAMETERS_SSM_KEY_ENV_VAR


@pytest.mark.parametrize("prompt, is_streaming, rag_enabled", [(DEFAULT_HUGGINGFACE_PROMPT, False, False)])
def test_parent_get_llm_config(llm_config, chat_event):
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-key"
    client = HuggingFaceClient(rag_enabled=False, connection_id="fake-connection-id")

    with patch("clients.huggingface_client.HuggingFaceClient.construct_chat_model") as mocked_chat_model_construction:
        with patch("clients.huggingface_client.HuggingFaceClient.get_llm_config") as mocked_get_llm_config:
            mocked_chat_model_construction.return_value = None
            mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
            try:
                event_body = json.loads(chat_event["body"])
                assert client.get_model(event_body, "fake-user-uuid") is None
            except Exception as exc:
                assert False, f"'client.get_model' raised an exception {exc}"
