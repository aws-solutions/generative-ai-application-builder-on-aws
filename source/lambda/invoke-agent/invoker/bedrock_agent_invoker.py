# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import uuid
from typing import Any, Dict, List, Tuple

from aws_lambda_powertools import Logger, Tracer

from utils import LOCATION_TYPE_MAP, LocationType, UseCaseConfigRetriever, WebSocketHandler, json_serializer
from utils.constants import CONVERSATION_TABLE_NAME_ENV_VAR
from utils.ddb_history_manager import DynamoDBHistoryManager

logger = Logger(utc=True)
tracer = Tracer()

from helper import get_service_client


class BedrockAgentInvokerError(Exception):
    """Custom exception class for BedrockAgentInvoker errors."""

    pass


class BedrockAgentInvoker:
    def __init__(self, conversation_id: str, connection_id: str, user_id: str, client: Any = None):
        """
        Initialize the BedrockAgentInvoker.

        Args:
            conversation_id (str): The conversation ID for the agent session
            connection_id (str): The WebSocket connection ID for streaming responses
            user_id (str): The user ID for the conversation
            client (Any, optional): The Bedrock agent runtime client. If not provided, a default client will be created.
        """
        self._conversation_id = conversation_id
        self._connection_id = connection_id
        self._user_id = user_id

        # Initialize WebSocket handler
        self._websocket_handler = WebSocketHandler(connection_id=connection_id, conversation_id=conversation_id)

        agent_config = self.get_agent_config()
        self._agent_id = agent_config["agent_id"]
        self._agent_alias_id = agent_config["agent_alias_id"]
        self._enable_trace = agent_config["enable_trace"]
        self._enable_streaming = agent_config["enable_streaming"]

        self._client = client or get_service_client("bedrock-agent-runtime")
        self._history_manager = DynamoDBHistoryManager(user_id=user_id, conversation_id=conversation_id)

    @tracer.capture_method
    def invoke_agent(self, input_text: str) -> None:
        """
        Invoke the Bedrock Agent with the given input text.

        This method sends the input text to the Bedrock Agent and handles the response. If streaming
        is enabled, it will stream the response chunks via WebSocket. Otherwise, it will send the
        complete processed response.

        Args:
            input_text (str): The text to send to the agent

        Returns:
            None: This method either handles streaming responses by sending response chunks
                 or sends complete processed responses via WebSocket
        """
        message_id = str(uuid.uuid4())

        # Prepare invoke parameters
        invoke_params = {
            "agentId": self._agent_id,
            "agentAliasId": self._agent_alias_id,
            "sessionId": self._conversation_id,
            "inputText": input_text,
            "enableTrace": self._enable_trace,
        }

        # Add streaming configuration if enabled
        if self._enable_streaming:
            invoke_params["streamingConfigurations"] = {"streamFinalResponse": True}

        response = self._client.invoke_agent(**invoke_params)

        if self._enable_streaming:
            self.handle_streaming_response(input_text, response, message_id)
        else:
            # Process non-streaming response and send complete response via WebSocket
            processed_response = self.process_response(response)
            output_text = processed_response.get("output_text", "")

            # Store the conversation in DynamoDB
            history_stored = self._store_conversation_history(input_text, output_text, message_id)
            if not history_stored:
                logger.warning(
                    f"Conversation history could not be stored for message {message_id}, but continuing with response"
                )

            self._websocket_handler.send_complete_response(output_text, message_id)

    def handle_streaming_response(self, input_text: str, response: Dict, message_id: str) -> None:
        """
        Handle streaming response by sending chunks to WebSocket.

        This method processes the streaming response from Bedrock Agent, sending each chunk
        via WebSocket as it arrives. It also handles citations and trace information if enabled.

        Args:
            input_text (str): The original input text from the user for history storage
            response (Dict): The streaming response from Bedrock Agent containing completion stream
            message_id (str): The unique message ID for this conversation turn

        Returns:
            None: This method handles the streaming directly by sending chunks via WebSocket

        Raises:
            Exception: Any errors during streaming are caught and sent via WebSocket before being re-raised
        """

        completion_stream = response.get("completion", [])
        generated_text = ""
        citations = []
        trace_info = {}
        traces = []

        try:
            # Process each chunk and send it to the WebSocket
            for event in completion_stream:
                generated_text, citations = self._process_chunk(event, generated_text, citations)

                chunk = event.get("chunk", {})
                if chunk:
                    text_chunk = chunk.get("bytes", b"").decode("utf-8")
                    self._websocket_handler.send_streaming_chunk(text_chunk, message_id)

                trace_info, traces = self._process_trace_event(event, trace_info, traces)
                self._check_for_errors(event)

            # Store the conversation in DynamoDB
            history_stored = self._store_conversation_history(input_text, generated_text, message_id)
            if not history_stored:
                logger.warning(
                    f"Conversation history could not be stored for message {message_id}, but continuing with response"
                )

            # finally send the end conversation token
            self._websocket_handler.end_streaming(message_id)

            if self._enable_trace:
                trace_info["trace"] = traces
                logger.info(
                    f"Citations for conversation {self._conversation_id}: {json.dumps(citations, default=json_serializer)}"
                )
                logger.info(
                    f"Trace for conversation {self._conversation_id}: {json.dumps(trace_info, default=json_serializer)}"
                )

            return None

        except Exception as ex:
            # Handle errors during streaming
            if self._websocket_handler:
                self._websocket_handler.send_error_message(ex)
            raise ex

    def process_response(self, response: Dict) -> Dict:
        """
        Process the response from the Bedrock Agent for non-streaming cases.

        This method processes all chunks into a single response, including citations and trace
        information if enabled.

        Args:
            response (Dict): The response dictionary from the Bedrock Agent containing completion data

        Returns:
            Dict: A processed response containing:
                - output_text (str): The complete generated text
                - citations (List[Dict], optional): List of citations if trace is enabled
                - trace (Dict, optional): Trace information if trace is enabled
        """
        output_text, citations, trace = self._process_completion_chunks(response["completion"])
        processed_response = {"output_text": output_text}

        if self._enable_trace:
            processed_response["citations"] = citations
            processed_response["trace"] = trace

            # Log citations and trace information
            logger.info(
                f"Citations for conversation {self._conversation_id}: {json.dumps(citations, default=json_serializer)}"
            )
            logger.info(f"Trace for conversation {self._conversation_id}: {json.dumps(trace, default=json_serializer)}")

        return processed_response

    @tracer.capture_method
    def _process_completion_chunks(self, completion_stream) -> Tuple[str, List[Dict], Dict]:
        """
        Process the completion chunks from the Bedrock Agent response.

        This method aggregates all chunks into a complete response, processing citations
        and trace information for each chunk.

        Args:
            completion_stream: The EventStream containing the completion chunks

        Returns:
            Tuple[str, List[Dict], Dict]:
                - str: The complete generated text from all completion chunks
                - List[Dict]: A list of all citation dictionaries
                - Dict: A dictionary containing agent information and a list of all traces
        """
        generated_text = ""
        citations = []
        trace_info = {}
        traces = []

        for event in completion_stream:
            generated_text, citations = self._process_chunk(event, generated_text, citations)
            trace_info, traces = self._process_trace_event(event, trace_info, traces)
            self._check_for_errors(event)

        trace_info["trace"] = traces
        return generated_text, citations, trace_info

    @tracer.capture_method
    def _process_chunk(
        self, event: Dict[str, Any], generated_text: str, citations: List[Dict]
    ) -> Tuple[str, List[Dict]]:
        """
        Process a single chunk from the event stream.

        This method extracts the text content from the chunk and processes any citations
        included in the chunk.

        Args:
            event (Dict[str, Any]): The event containing the chunk data
            generated_text (str): The accumulated generated text so far
            citations (List[Dict]): The current list of processed citations

        Returns:
            Tuple[str, List[Dict]]:
                - Updated generated text with new chunk content
                - Updated list of citations including any from this chunk
        """
        chunk = event.get("chunk", {})
        if chunk:
            generated_text += chunk.get("bytes", b"").decode("utf-8")
            citations.extend(self._process_citations(chunk))
        return generated_text, citations

    @tracer.capture_method
    def _process_citations(self, chunk: Dict[str, Any]) -> List[Dict]:
        """
        Process citations from a chunk.

        This method extracts and processes citation information from a chunk when trace
        is enabled and citations are present.

        Args:
            chunk (Dict[str, Any]): The chunk containing potential citations

        Returns:
            List[Dict]: A list of processed citations from the chunk
        """
        citations = []
        if self._enable_trace and "attribution" in chunk:
            for citation in chunk.get("attribution", {}).get("citations", []):
                citations.extend(self._process_references(citation))
        return citations

    @tracer.capture_method
    def _process_references(self, citation: Dict[str, Any]) -> List[Dict]:
        """
        Process references from a citation.

        This method extracts and formats reference information from a citation, including
        content, location, and metadata for each reference.

        Args:
            citation (Dict[str, Any]): The citation containing references

        Returns:
            List[Dict]: A list of processed references, each containing:
                - content: The text content of the reference
                - location: Processed location information
                - metadata: Any additional metadata for the reference
        """
        return [
            {
                "content": reference.get("content", {}).get("text", ""),
                "location": self._process_location(reference.get("location", {})),
                "metadata": reference.get("metadata", {}),
            }
            for reference in citation.get("retrievedReferences", [])
        ]

    @tracer.capture_method
    def _process_trace_event(
        self, event: Dict[str, Any], trace_info: Dict, traces: List[Dict]
    ) -> Tuple[Dict, List[Dict]]:
        """
        Process a trace event.

        This method extracts and processes trace information from an event, updating the
        overall trace info and list of traces.

        Args:
            event (Dict[str, Any]): The event containing trace information
            trace_info (Dict): The current accumulated trace info
            traces (List[Dict]): The current list of traces

        Returns:
            Tuple[Dict, List[Dict]]:
                - Updated trace info dictionary
                - Updated list of traces
        """
        processed_trace = event.get("trace", {})
        if processed_trace:
            trace_info = self._extract_trace_info(processed_trace) if not trace_info else trace_info
            traces.append(processed_trace.get("trace", {}))
        return trace_info, traces

    @tracer.capture_method
    def _process_location(self, location: Dict) -> Dict:
        """
        Process location information from a retrieved reference.

        When the Bedrock agent queries a KnowledgeBase, the source location of the retrieved
        information is included in the reference. This method processes that location information
        based on its type (e.g., S3, web URL).

        Args:
            location (Dict): The location dictionary from a retrieved reference

        Returns:
            Dict: Processed location information containing:
                - type: The type of location
                - uri: The S3 URI (for S3 locations)
                - url: The URL (for other location types)
        """
        location_type = location.get("type", "")
        processed_location = {"type": location_type}

        try:
            enum_location_type = LocationType(location_type)
            location_key = LOCATION_TYPE_MAP[enum_location_type]
            if enum_location_type == LocationType.S3:
                processed_location["uri"] = location.get(location_key, {}).get("uri", "")
            else:
                processed_location["url"] = location.get(location_key, {}).get("url", "")
        except ValueError:
            logger.warning(f"Unknown location type: {location_type}")

        return processed_location

    def get_agent_config(self):
        """
        Get the agent configuration from the config file.

        This method retrieves and processes the agent configuration parameters from the
        use case configuration file.

        Returns:
            Dict: A dictionary containing the agent configuration with:
                - agent_id: The ID of the Bedrock agent
                - agent_alias_id: The alias ID of the agent
                - enable_trace: Whether tracing is enabled
                - enable_streaming: Whether streaming is enabled (defaults to True)
        """
        config = UseCaseConfigRetriever().retrieve_use_case_config()
        agent_params = config.get("AgentParams", {}).get("BedrockAgentParams", {})
        return {
            "agent_id": agent_params.get("AgentId"),
            "agent_alias_id": agent_params.get("AgentAliasId"),
            "enable_trace": agent_params.get("EnableTrace"),
            "enable_streaming": agent_params.get("EnableStreaming", True),
        }

    @staticmethod
    def _extract_trace_info(processed_trace: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract trace information from a processed trace.

        This method extracts key agent and session information from a processed trace event.

        Args:
            processed_trace (Dict[str, Any]): The processed trace containing trace information

        Returns:
            Dict[str, str]: A dictionary containing:
                - agentAliasId: The agent alias ID
                - agentId: The agent ID
                - agentVersion: The version of the agent
                - sessionId: The session ID
        """
        return {
            "agentAliasId": processed_trace.get("agentAliasId", ""),
            "agentId": processed_trace.get("agentId", ""),
            "agentVersion": processed_trace.get("agentVersion", ""),
            "sessionId": processed_trace.get("sessionId", ""),
        }

    @staticmethod
    def _check_for_errors(event: Dict[str, Any]) -> None:
        """
        Check for errors in the event and raise a BedrockAgentInvokerError if found.

        This method checks for various types of errors that might occur during agent
        invocation and raises an appropriate exception if any are found.

        Args:
            event (Dict[str, Any]): The event to check for errors

        Raises:
            BedrockAgentInvokerError: If any error is found in the event, with a message
                                     describing the specific error type and details
        """
        error_types = [
            "accessDeniedException",
            "badGatewayException",
            "conflictException",
            "dependencyFailedException",
            "internalServerException",
            "resourceNotFoundException",
        ]
        for error in error_types:
            error_dict = event.get(error, {})
            if error_dict:
                raise BedrockAgentInvokerError(f"{error}: {error_dict.get('message', 'An error occurred')}")

    @tracer.capture_method
    def _store_conversation_history(self, input_text: str, output_text: str, message_id: str) -> bool:
        """
        Store the conversation history in DynamoDB.

        Args:
            input_text (str): The input text from the user
            output_text (str): The response text from the agent
            message_id (str): The unique message ID for this conversation turn

        Returns:
            bool: True if the history was stored successfully, False otherwise
        """
        try:
            success = self._history_manager.add_message(input_text, output_text, message_id)
            return success
        except Exception as e:
            logger.error(f"Failed to store conversation history. Error: {str(e)}")
            return False
