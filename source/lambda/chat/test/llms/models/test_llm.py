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
from llms.models.model_provider_inputs import BedrockInputs, ModelProviderInputs, SageMakerInputs
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import DEFAULT_SAGEMAKER_MODEL_ID
from utils.enum_types import BedrockModelProviders

test_conversation_history_cls = DynamoDBChatMessageHistory
test_conversation_history_params = {
    "table_name": "fake-table",
    "user_id": "fake-user-id",
    "conversation_id": "fake-conversation-id",
}


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
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "model": test_model_id,
        },
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
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
        ModelProviderInputs(**{"conversation_history_cls": DynamoDBChatMessageHistory, "param": "value"})
    assert str(exc.value) == "ModelProviderInputs.__init__() got an unexpected keyword argument 'param'"


def test_llm_inputs_with_valid_inputs(setup_environment):
    inputs = ModelProviderInputs(
        conversation_history_cls=DynamoDBChatMessageHistory,
        conversation_history_params={
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
        },
        rag_enabled=False,
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
    assert inputs.conversation_history_cls == DynamoDBChatMessageHistory
    assert inputs.conversation_history_params == {
        "table_name": "fake-table",
        "user_id": "fake-user-id",
        "conversation_id": "fake-conversation-id",
    }
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
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "model_arn": "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw",
            "model_family": BedrockModelProviders.COHERE.value,
            "model": "cohere.test-model",
        },
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "model_arn": "arn:aws:bedrock:us-east-1:123456789012:custom-model/cohere.command-light-text-v14:7:4k/sda8wgq1b9e0",
            "model_family": BedrockModelProviders.COHERE.value,
            "model": "cohere.test-model",
        },
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "model_arn": "arn:aws:bedrock:us-east-1::foundation-model/aaaaaa.aaaaa:1",
            "model_family": BedrockModelProviders.COHERE.value,
            "model": "cohere.test-model",
        },
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "knowledge_base": test_knowledge_base,
            "model_family": BedrockModelProviders.COHERE.value,
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
            "model": "cohere.test-model",
        },
    ],
)
def test_bedrock_schema_valid_inputs(input_schema):
    assert isinstance(BedrockInputs(**input_schema), BedrockInputs)


@pytest.mark.parametrize(
    "input_schema",
    [
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "sagemaker_endpoint_name": "fake-endpoint",
            "input_schema": {"some": "schema"},
            "response_jsonpath": "$.value",
            "model": DEFAULT_SAGEMAKER_MODEL_ID,
        },
        {
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": False,
            "knowledge_base": test_knowledge_base,
            "model": "default",
            "sagemaker_endpoint_name": "fake-endpoint",
            "input_schema": {"some": "schema"},
            "response_jsonpath": "$.value",
            "model_params": test_model_params,
            "model": DEFAULT_SAGEMAKER_MODEL_ID,
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
def test_sagemaker_schema_valid_inputs(input_schema):
    assert isinstance(SageMakerInputs(**input_schema), SageMakerInputs)


@pytest.mark.parametrize(
    "input_schema, expected_error",
    [
        (
            {
                "conversation_history_cls": None,
                "conversation_history_params": {},
                "rag_enabled": False,
                "model": test_model_id,
            },
            "Missing mandatory field 'conversation_history_cls'",
        ),
        (
            {
                "conversation_history_cls": DynamoDBChatMessageHistory,
                "conversation_history_params": {},
                "rag_enabled": False,
                "model": test_model_id,
            },
            "Missing mandatory field 'conversation_history_params'",
        ),
        (
            {
                "conversation_history_cls": DynamoDBChatMessageHistory,
                "conversation_history_params": {"conversation_id": "fake-id", "user_id": "fake-user-id"},
                "rag_enabled": None,
                "model": test_model_id,
            },
            "Missing mandatory field 'rag_enabled'",
        ),
        (
            {
                "conversation_history_cls": DynamoDBChatMessageHistory,
                "conversation_history_params": {"conversation_id": "fake-id", "user_id": "fake-user-id"},
                "rag_enabled": True,
                "model": test_model_id,
            },
            "'rag_enabled' field is set to True and no Knowledge Base is supplied. Please supply a Knowledge Base when rag_enabled is set to True.",
        ),
    ],
)
def test_llm_inputs_with_missing_mandatory_fields(input_schema, expected_error):
    with pytest.raises(ValueError) as exc:
        ModelProviderInputs(**input_schema)
    assert str(exc.value) == expected_error


def test_bedrock_llm_inputs_with_invalid_model_arn():
    with pytest.raises(ValueError) as exc:
        BedrockInputs(
            conversation_history_cls=DynamoDBChatMessageHistory,
            conversation_history_params={
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            model_family=BedrockModelProviders.COHERE.value,
            rag_enabled=False,
            model_arn="invalid-arn",
            model="cohere.test-model",
        )
    assert (
        str(exc.value)
        == "ModelArn must be a valid provisioned/custom model ARN to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax"
    )


def test_bedrock_llm_inputs_with_missing_required_param():
    with pytest.raises(TypeError) as exc:
        BedrockInputs(
            conversation_history_cls=DynamoDBChatMessageHistory,
            conversation_history_params={
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            rag_enabled=False,
            model_arn="invalid-arn",
        )
    assert str(exc.value) == "BedrockInputs.__init__() missing 1 required keyword-only argument: 'model_family'"


def test_bedrock_llm_id_and_arn_both_missing():
    with pytest.raises(ValueError) as exc:
        BedrockInputs(
            conversation_history_cls=DynamoDBChatMessageHistory,
            conversation_history_params={
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            rag_enabled=False,
            model_family=BedrockModelProviders.AMAZON.value,
        )
    assert str(exc.value) == "ModelId and/or ModelArn not provided."


def test_sagemaker_llm_inputs_with_missing_required_param():
    with pytest.raises(TypeError) as exc:
        SageMakerInputs(
            conversation_history_cls=DynamoDBChatMessageHistory,
            conversation_history_params={
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            rag_enabled=False,
            input_schema={"some": "schema"},
            response_jsonpath="$.value",
            model=DEFAULT_SAGEMAKER_MODEL_ID,
        )
    assert (
        str(exc.value)
        == "SageMakerInputs.__init__() missing 1 required keyword-only argument: 'sagemaker_endpoint_name'"
    )
