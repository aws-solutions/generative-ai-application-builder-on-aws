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

import json
import os
from typing import Any, Callable, Dict, List, Optional
from uuid import UUID

import botocore
from aws_lambda_powertools import Logger
from helper import get_service_client
from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from langchain_core.messages import BaseMessage
from utils.constants import (
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    OUTPUT_KEY,
    PAYLOAD_DATA_KEY,
    PAYLOAD_SOURCE_DOCUMENT_KEY,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_RECEIVED_KEY,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

logger = Logger(utc=True)


class WebsocketStreamingCallbackHandler(AsyncIteratorCallbackHandler):
    """
    This async websocket handler is used to send streaming LLM responses to a websocket client, for a provided connection ID.
    Inherits AsyncIteratorCallbackHandler LangChain callback handler class and overrides its abstract methods

    Attributes:
        connection_url (str): The connection URL for the websocket client.
        connection_id (str): The connection ID for the websocket client, retrieved from the event object
        conversation_id (str): The conversation ID for the websocket client, retrieved from the event object
        is_streaming (bool): Flag to indicate if streaming is enabled.
        client (botocore.client): client that establishes the connection to the websocket API
        source_documents_formatter(Callable): Function that formats the source documents per the specific
            knowledge base on_chain_end

    Methods:
        post_token_to_connection(payload): Sends a payload to the client that is connected to a websocket.
        on_llm_new_token(token, **kwargs): Executed when the llm creates a new token
        on_llm_end(self, payload: any, **kwargs: any): Executes once the LLM completes generating a payload
        on_llm_error(self, error: Exception, **kwargs: any): Executes when the underlying llm errors out.
        format_response(payload): Formats the payload in a format that the websocket accepts

    """

    _connection_url: Optional[str] = None
    _connection_id: Optional[str] = None
    _conversation_id: Optional[str] = None
    _is_streaming: bool = False
    _client: botocore.client = None
    _source_documents_formatter: Callable = None

    def __init__(
        self,
        connection_id: str,
        conversation_id: str,
        source_docs_formatter: Callable,
        is_streaming: bool = False,
        rag_enabled: bool = False,
        response_if_no_docs_found: str = None,
        return_source_docs: bool = True,
    ) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._is_streaming = is_streaming
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)
        self._source_documents_formatter = source_docs_formatter
        self._response_if_no_docs_found = response_if_no_docs_found
        self._rag_enabled = rag_enabled
        self.has_streamed = False
        self.has_streamed_references = False
        self.streamed_rephrase_query = False
        self.return_source_docs = return_source_docs
        super().__init__()

    @property
    def is_streaming(self) -> str:
        return self._is_streaming

    @property
    def connection_id(self) -> str:
        return self._connection_id

    @property
    def connection_url(self) -> str:
        return self._connection_url

    @property
    def conversation_id(self) -> str:
        return self._conversation_id

    @property
    def client(self) -> str:
        return self._client

    @property
    def has_streamed(self) -> str:
        return self._has_streamed

    @has_streamed.setter
    def has_streamed(self, has_streamed) -> None:
        self._has_streamed = has_streamed

    @property
    def has_streamed_references(self) -> str:
        return self._has_streamed_references

    @has_streamed_references.setter
    def has_streamed_references(self, has_streamed_references) -> None:
        self._has_streamed_references = has_streamed_references

    @property
    def rag_enabled(self) -> bool:
        return self._rag_enabled

    @property
    def response_if_no_docs_found(self) -> str:
        return self._response_if_no_docs_found

    @property
    def source_documents_formatter(self) -> str:
        return self._source_documents_formatter

    def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[BaseMessage]],
        **kwargs: Any,
    ) -> None:
        """Run when LLM starts running."""
        logger.debug("Streaming chat model started.")

    def post_token_to_connection(self, payload: str, payload_key: str = PAYLOAD_DATA_KEY) -> None:
        """
        Sends a payload to the client that is connected to a websocket.

        Args:
            payload (str): payload to send to the client.

        Raises:
            Exception: if there is an error posting the payload to the connection
        """
        try:
            self.client.post_to_connection(
                ConnectionId=self.connection_id, Data=self.format_response(payload, payload_key)
            )
        except Exception as ex:
            logger.error(
                f"Error sending token to connection {self.connection_id}: {ex}",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ex

    def on_llm_new_token(self, token: str, **kwargs: any) -> None:
        """
        Executes when the llm creates a new token.
        It is used to send tokens to the client connected, as a post request, to the websocket using the aws-sdk.

        Args:
            token (str): Token to send to the client.
        """
        self.post_token_to_connection(token)
        self.has_streamed = True

    def send_references(self, source_documents: List):
        if self.has_streamed_references:
            return
        payload = self.source_documents_formatter(source_documents)
        for document in payload:
            self.post_token_to_connection(document, PAYLOAD_SOURCE_DOCUMENT_KEY)

    def on_chain_end(
        self,
        outputs: Any,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> None:
        """Run when chain ends running."""

        if isinstance(outputs, dict):
            if (
                not self.has_streamed
                and OUTPUT_KEY in outputs
                and CONTEXT_KEY in outputs
                and self.response_if_no_docs_found is not None
            ):
                if not outputs[CONTEXT_KEY]:
                    self.post_token_to_connection(self.response_if_no_docs_found, PAYLOAD_DATA_KEY)
                else:
                    self.post_token_to_connection(outputs[OUTPUT_KEY], PAYLOAD_DATA_KEY)
                self.has_streamed = True

            if (
                not self.has_streamed_references
                and self.return_source_docs
                and CONTEXT_KEY in outputs
                and len(outputs[CONTEXT_KEY])
            ):
                self.send_references(outputs[SOURCE_DOCUMENTS_RECEIVED_KEY])
                self.has_streamed_references = True

            if not self.streamed_rephrase_query and REPHRASED_QUERY_KEY in outputs:
                self.post_token_to_connection(outputs[REPHRASED_QUERY_KEY], REPHRASED_QUERY_KEY)
                self.streamed_rephrase_query = True

    def on_llm_error(self, error: Exception, **kwargs: any) -> None:
        """
        Executes when the underlying llm errors out. As of now it sends the error as a post payload to the connected client.

        Args:
            error (Exception): error to send
        """
        tracer_id = os.environ[TRACE_ID_ENV_VAR]
        logger.error(f"LLM Error: {error}", xray_trace_id=tracer_id)

    def format_response(self, payload: str, payload_key: str = PAYLOAD_DATA_KEY) -> str:
        """
        Formats the payload of in a format that the websocket accepts

        Args:
            payload (str): The value of the PAYLOAD_KEY key in the websocket payload
        """
        return json.dumps({payload_key: payload, CONVERSATION_ID_EVENT_KEY: self.conversation_id})
