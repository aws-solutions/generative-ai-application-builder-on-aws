# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from unittest.mock import patch

import pytest
from botocore.exceptions import ClientError
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import DDB_MESSAGE_TTL_ENV_VAR

table_name = "my-test-table"
MOCK_MESSAGE_ID = "fake-message-id"
MOCK_CONVERSATION_ID = "fake-conversation-id"
MOCK_USER_ID = "fake-user-id"


@pytest.fixture
def setup_test_table(dynamodb_resource):
    # Create the DynamoDB table.
    dynamodb_resource.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": "UserId", "KeyType": "HASH"},
            {"AttributeName": "ConversationId", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "ConversationId", "AttributeType": "S"},
            {"AttributeName": "UserId", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    yield dynamodb_resource


def test_add_message(setup_test_table):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    human_message = HumanMessage(content="Hello world!", id=MOCK_MESSAGE_ID)
    memory.add_message(human_message)
    assert memory.messages == [human_message]
    assert memory.messages[0].content == "Human: Hello world!"

    ai_message = AIMessage(content="Bye World!", id=MOCK_MESSAGE_ID)
    memory.add_message(ai_message)
    assert memory.messages == [human_message, ai_message]
    assert memory.messages[1].content == "AI: Bye World!"


def test_add_message_with_ttl_env_var(setup_test_table):
    os.environ[DDB_MESSAGE_TTL_ENV_VAR] = "1000"
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    message = HumanMessage(content="Hello world!", id=MOCK_MESSAGE_ID)
    memory.add_message(message)
    assert memory.messages == [message]
    del os.environ[DDB_MESSAGE_TTL_ENV_VAR]


def test_adding_multiple_messages(setup_test_table):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    message1 = HumanMessage(content="Hello AI!", id=MOCK_MESSAGE_ID)
    message2 = AIMessage(content="Hello from AI!", id=MOCK_MESSAGE_ID)
    memory.add_message(message1)
    memory.add_message(message2)
    assert memory.messages == [message1, message2]


def test_adding_multiple_messages_with_limit(setup_test_table):
    memory = DynamoDBChatMessageHistory(
        table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID, max_history_length=2
    )
    message1 = HumanMessage(content="Hello AI!", id=MOCK_MESSAGE_ID)
    message2 = AIMessage(content="Hello from AI!", id=MOCK_MESSAGE_ID)
    message3 = HumanMessage(content="Hello from human!", id=MOCK_MESSAGE_ID)
    memory.add_message(message1)
    memory.add_message(message2)
    memory.add_message(message3)
    assert memory.messages == [message2, message3]
    assert len(memory.raw_messages) == 3


def test_getting_different_messages_for_different_conversations(setup_test_table):
    memory1 = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    message1 = HumanMessage(content="Hello AI!", id=MOCK_MESSAGE_ID)
    message2 = AIMessage(content="Hello from AI!", id=MOCK_MESSAGE_ID)
    memory1.add_message(message1)

    memory2 = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, "another-fake-conversation-id", MOCK_MESSAGE_ID)
    memory2.add_message(message2)

    assert memory1.messages == [message1]
    assert memory2.messages == [message2]


def test_instances_with_same_user_conversation_are_equal(setup_test_table):
    memory1 = DynamoDBChatMessageHistory(table_name, "fake-user-id", "fake-conversation-id", MOCK_MESSAGE_ID)
    memory2 = DynamoDBChatMessageHistory(table_name, "fake-user-id", "fake-conversation-id", MOCK_MESSAGE_ID)

    message1 = HumanMessage(content="Hello AI!", id=MOCK_MESSAGE_ID)
    message2 = AIMessage(content="Hello from AI!", id=MOCK_MESSAGE_ID)
    memory1.add_message(message1)
    memory2.add_message(message2)

    assert memory1.messages == memory2.messages


def test_works_with_existing_ddb(dynamodb_resource):
    dynamodb_resource.create_table(
        TableName="test-table-2",
        KeySchema=[
            {"AttributeName": "UserId", "KeyType": "HASH"},
            {"AttributeName": "ConversationId", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "ConversationId", "AttributeType": "S"},
            {"AttributeName": "UserId", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    table = dynamodb_resource.Table("test-table-2")
    table.put_item(
        Item={
            "UserId": "user-id",
            "ConversationId": "conversation-id",
            "History": [{"type": "system", "data": {"content": "some system message", "additional_kwargs": {}}}],
            "Context": [
                {
                    "kendraQuery": "some query",
                    "Documents": [{"page_content": "the contents", "metadata": {}}],
                }
            ],
        }
    )

    memory = DynamoDBChatMessageHistory("test-table-2", "user-id", "conversation-id", MOCK_MESSAGE_ID)
    assert memory.messages == [
        SystemMessage(content="some system message", additional_kwargs={}),
    ]


def test_no_messages(setup_test_table):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    assert memory.messages == []


def test_clear(dynamodb_resource, setup_test_table):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    message = HumanMessage(content="Hello world!", id=MOCK_MESSAGE_ID)
    memory.add_message(message)
    assert memory.messages == [message]
    memory.clear()
    assert memory.messages == []


def test_get_message_generic_error(caplog, setup_environment):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    with patch.object(memory.table, "get_item") as mock_get_item:
        mock_get_item.side_effect = ClientError(
            {"Error": {"Code": "GenericException", "Message": "get error"}}, "get_item"
        )
        memory.messages
        assert "get error" in caplog.text


def test_get_message_no_resource_error(caplog, setup_environment):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    with patch.object(memory.table, "get_item") as mock_get_item:
        mock_get_item.side_effect = ClientError(
            {"Error": {"Code": "ResourceNotFoundException", "Message": "get error"}}, "get_item"
        )
        memory.messages
        assert "No record found with user id" in caplog.text


def test_add_message_error(caplog, setup_environment):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    with patch.object(memory.table, "update_item") as mock_put_item:
        mock_put_item.side_effect = ClientError(
            {"Error": {"Code": "GenericException", "Message": "update error"}}, "update_item"
        )
        memory.add_message(HumanMessage(content="Hello world!"))
        assert "update error" in caplog.text


def test_clear_error(caplog, setup_environment):
    memory = DynamoDBChatMessageHistory(table_name, MOCK_USER_ID, MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
    with patch.object(memory.table, "delete_item") as mock_delete_item:
        mock_delete_item.side_effect = ClientError(
            {"Error": {"Code": "GenericException", "Message": "delete error"}}, "delete_item"
        )
        memory.clear()
        assert "delete error" in caplog.text
