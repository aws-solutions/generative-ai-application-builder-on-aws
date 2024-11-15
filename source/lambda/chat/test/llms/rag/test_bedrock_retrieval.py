#!/usr/bin/env python
# *********************************************************************************************************************
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
# ********************************************************************************************************************#

import os
from unittest import mock

import pytest
from langchain.chains import ConversationalRetrievalChain
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from llms.models.model_provider_inputs import BedrockInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_MODELS_MAP,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

BEDROCK_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
RAG_ENABLED = True
DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT_TEMPLATE = """\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{chat_history}\n\nFollow up question: {question}\n\nAssistant: Standalone question:"""
DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT = PromptTemplate.from_template(
    DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT_TEMPLATE
)

DISAMBIGUATION_PROMPT_TEMPLATE = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""
DISAMBIGUATION_PROMPT = PromptTemplate.from_template(DISAMBIGUATION_PROMPT_TEMPLATE)
model_provider = LLMProviderTypes.BEDROCK.value
model_id = DEFAULT_MODELS_MAP[LLMProviderTypes.BEDROCK.value]
mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})


@pytest.fixture
def llm_params(is_streaming, setup_environment, return_source_docs):
    yield BedrockInputs(
        **{
            "conversation_memory": DynamoDBChatMemory(
                DynamoDBChatMessageHistory(
                    table_name="fake-table",
                    user_id="fake-user-id",
                    conversation_id="fake-conversation-id",
                )
            ),
            "knowledge_base": KendraKnowledgeBase(
                {
                    "NumberOfDocs": 2,
                    "ReturnSourceDocs": return_source_docs,
                    "AttributeFilter": {
                        "AndAllFilters": [
                            {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
                        ]
                    },
                    "UserContext": None,
                }
            ),
            "model": model_id,
            "model_params": {
                "topP": {"Type": "float", "Value": "0.9"},
                "maxTokenCount": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": BEDROCK_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "disambiguation_prompt_template": "test disambiguation prompt",
            "disambiguation_prompt_enabled": True,
            "streaming": is_streaming,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
        }
    )


@pytest.fixture
def titan_model(is_streaming, return_source_docs, llm_params, setup_environment):
    chat = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=DEFAULT_BEDROCK_MODEL_FAMILY,
        return_source_docs=return_source_docs,
    )
    yield chat


@pytest.fixture
def temp_bedrock_dynamodb_defaults_table(dynamodb_resource, prompt, dynamodb_defaults_table, use_case, is_streaming):
    model_provider = LLMProviderTypes.BEDROCK.value
    model_id = "anthropic.claude-x"
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    output_key = "answer"
    context_key = "context"
    input_key = "question"
    history_key = "chat_history"

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT_TEMPLATE,
        }
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, return_source_docs, chat_fixture",
    [
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            model_id,
            False,
            "titan_model",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            model_id,
            False,
            "titan_model",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            model_id,
            True,
            "titan_model",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            model_id,
            True,
            "titan_model",
        ),
    ],
)
def test_implement_error_not_raised(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    model_id,
    return_source_docs,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == model_id
        assert chat_model.prompt_template.template == BEDROCK_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_PROMPT_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {"temperature": 0.25, "maxTokenCount": 200, "topP": 0.9}
        assert chat_model.streaming == is_streaming
        assert chat_model.verbose == False
        assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat_model.conversation_memory.chat_memory.messages == []
        assert chat_model.disambiguation_prompt_template == DISAMBIGUATION_PROMPT
        assert chat_model.return_source_docs == return_source_docs
        assert chat_model.guardrails is None

        assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
        assert type(chat_model.conversation_memory) == DynamoDBChatMemory
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id",
    [
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, False, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            False,
            model_id,
        ),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            model_id,
        ),
    ],
)
def test_exception_for_failed_model_incorrect_key(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    llm_params,
    return_source_docs,
    bedrock_dynamodb_defaults_table,
):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch(
            "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = [mocked_doc]
            model_family = BedrockModelProviders.AMAZON.value
            llm_params.model_params = {"incorrect_param": {"Type": "integer", "Value": "512"}}

            chat = BedrockRetrievalLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
                model_family=DEFAULT_BEDROCK_MODEL_FAMILY,
                return_source_docs=return_source_docs,
            )
            chat.generate("What is lambda?")

    assert (
        f"Error occurred while building Bedrock family '{model_family}' model '{model_id}'. "
        "Ensure that the model params provided are correct and they match the model specification."
        in error.value.args[0]
    )
    assert (
        "Error: BedrockAmazonLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
        in error.value.args[0]
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id",
    [
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, False, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            False,
            model_id,
        ),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            model_id,
        ),
    ],
)
def test_bedrock_model_variation(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    llm_params,
    return_source_docs,
    temp_bedrock_dynamodb_defaults_table,
):
    # testing another bedrock model
    llm_params.model_params = {
        "top_p": {"Type": "float", "Value": "0.9"},
        "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
    }
    chat_model = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, "anthropic.claude-x", RAG_ENABLED),
        model_family=BedrockModelProviders.ANTHROPIC.value,
        return_source_docs=return_source_docs,
    )

    assert chat_model.model == model_id
    assert chat_model.prompt_template.template == BEDROCK_RAG_PROMPT
    assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_PROMPT_RAG_PLACEHOLDERS)
    assert chat_model.model_params == {"temperature": 0.25, "max_tokens_to_sample": 200, "top_p": 0.9}
    assert chat_model.streaming == is_streaming
    assert chat_model.verbose == False
    assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
    assert chat_model.conversation_memory.chat_memory.messages == []
    assert chat_model.disambiguation_prompt_template == DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT
    assert chat_model.return_source_docs == return_source_docs
    assert chat_model.guardrails is None

    assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
    assert type(chat_model.conversation_memory) == DynamoDBChatMemory


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id",
    [
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, False, model_id),
    ],
)
def test_guardrails(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    llm_params,
    return_source_docs,
    temp_bedrock_dynamodb_defaults_table,
):
    # testing another bedrock model
    model_provider = LLMProviderTypes.BEDROCK.value
    llm_params.model_params = {"top_p": {"Value": "0.9", "Type": "float"}}
    llm_params.streaming = is_streaming
    llm_params.guardrails = {"guardrailIdentifier": "fake-id", "guardrailVersion": "1"}

    chat = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, "anthropic.claude-x", RAG_ENABLED),
        model_family=BedrockModelProviders.ANTHROPIC.value,
        return_source_docs=return_source_docs,
    )
    assert chat.model_params["top_p"] == 0.9
    assert chat.guardrails == {"guardrailIdentifier": "fake-id", "guardrailVersion": "1"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id",
    [
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, False, model_id),
    ],
)
def test_provisioned_model(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    llm_params,
    return_source_docs,
    test_provisioned_arn,
    bedrock_dynamodb_defaults_table,
):
    llm_params.model_arn = test_provisioned_arn
    model_provider = LLMProviderTypes.BEDROCK.value
    llm_params.streaming = is_streaming
    llm_params.model = model_id

    chat = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        return_source_docs=return_source_docs,
    )
    assert chat.model == model_id
    assert chat.model_arn == test_provisioned_arn
    assert chat.model_family == BedrockModelProviders.AMAZON.value
