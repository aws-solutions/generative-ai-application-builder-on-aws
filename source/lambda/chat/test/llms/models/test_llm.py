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

import pytest
from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from llms.models.model_provider_inputs import BedrockInputs, ModelProviderInputs
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory

test_conversation_memory = DynamoDBChatMemory(
    DynamoDBChatMessageHistory(table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id")
)


@pytest.fixture
def test_knowledge_base(setup_environment):
    yield KendraKnowledgeBase(
        {
            "NumberOfDocs": 2,
            "ReturnSourceDocs": False,
            "AttributeFilter": {
                "AndAllFilters": [
                    {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
                ]
            },
            "UserContext": None,
        }
    )


test_model_id = "amazon.fake-model"
test_disambiguation_prompt = "test prompt for disambiguation"
test_prompt_placeholders = ["{history}"]
test_prompt_template = "{history} test prompt"
test_model_params = {"topP": 0.2, "temperature": 0}


@pytest.mark.parametrize(
    "input_schema",
    [
        {"conversation_memory": test_conversation_memory},
        {
            "conversation_memory": test_conversation_memory,
            "knowledge_base": test_knowledge_base,
            "model": test_model_id,
            "model_params": test_model_params,
            "prompt_template": test_prompt_template,
            "prompt_placeholders": test_prompt_placeholders,
            "disambiguation_prompt_template": test_disambiguation_prompt,
            "disambiguation_prompt_enabled": True,
            "streaming": True,
            "verbose": True,
            "temperature": 0.7,
            "callbacks": [AsyncIteratorCallbackHandler()],
        },
    ],
)
def test_schema_success(input_schema):
    assert isinstance(ModelProviderInputs(**input_schema), ModelProviderInputs)


def test_schema_additional_param():
    with pytest.raises(TypeError) as exc:
        ModelProviderInputs(**{"conversation_memory": test_conversation_memory, "param": "value"})
    assert str(exc.value) == "ModelProviderInputs.__init__() got an unexpected keyword argument 'param'"


def test_llm_inputs_with_valid_inputs(setup_environment):
    inputs = ModelProviderInputs(
        conversation_memory=test_conversation_memory,
        knowledge_base=test_knowledge_base,
        model=test_model_id,
        model_params=test_model_params,
        prompt_template=test_prompt_template,
        prompt_placeholders=["{history}"],
        disambiguation_prompt_template=test_disambiguation_prompt,
        disambiguation_prompt_enabled=True,
        streaming=True,
        verbose=True,
        temperature=0.7,
        callbacks=[AsyncIteratorCallbackHandler()],
    )
    assert inputs.conversation_memory == test_conversation_memory
    assert inputs.knowledge_base == test_knowledge_base
    assert inputs.model == test_model_id
    assert inputs.model_params == test_model_params
    assert inputs.prompt_template == test_prompt_template
    assert inputs.prompt_placeholders == test_prompt_placeholders
    assert inputs.disambiguation_prompt_template == test_disambiguation_prompt
    assert inputs.disambiguation_prompt_enabled is True
    assert inputs.streaming is True
    assert inputs.verbose is True
    assert inputs.temperature == 0.7
    assert len(inputs.callbacks) == 1
    assert isinstance(inputs.callbacks[0], AsyncIteratorCallbackHandler)


@pytest.mark.parametrize(
    "input_schema",
    [
        {
            "conversation_memory": test_conversation_memory,
            "model_arn": "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw",
        },
        {
            "conversation_memory": test_conversation_memory,
            "model_arn": "arn:aws:bedrock:us-east-1:123456789012:custom-model/cohere.command-light-text-v14:7:4k/sda8wgq1b9e0",
        },
        {
            "conversation_memory": test_conversation_memory,
            "model_arn": "arn:aws:bedrock:us-east-1::foundation-model/aaaaaa.aaaaa:1",
        },
        {
            "conversation_memory": test_conversation_memory,
            "knowledge_base": test_knowledge_base,
            "model": test_model_id,
            "model_arn": "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw",
            "model_params": test_model_params,
            "prompt_template": test_prompt_template,
            "prompt_placeholders": test_prompt_placeholders,
            "disambiguation_prompt_template": test_disambiguation_prompt,
            "disambiguation_prompt_enabled": True,
            "streaming": True,
            "verbose": True,
            "temperature": 0.7,
            "callbacks": [AsyncIteratorCallbackHandler()],
        },
    ],
)
def test_schema_success(input_schema):
    assert isinstance(BedrockInputs(**input_schema), BedrockInputs)


def test_llm_inputs_with_empty_conversation_memory():
    with pytest.raises(ValueError) as exc:
        ModelProviderInputs(conversation_memory=None)
    assert str(exc.value) == "Empty conversation memory supplied."


def test_bedrock_llm_inputs_with_invalid_model_arn():
    with pytest.raises(ValueError) as exc:
        BedrockInputs(conversation_memory=test_conversation_memory, model_arn="invalid-arn")
    assert (
        str(exc.value)
        == "ModelArn must be a valid provisioned/custom model ARN to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax"
    )
