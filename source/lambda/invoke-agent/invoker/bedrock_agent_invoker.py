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
from typing import Any, Dict, List, Tuple

from aws_lambda_powertools import Logger, Tracer
from utils import LOCATION_TYPE_MAP, LocationType, UseCaseConfigRetriever

logger = Logger(utc=True)
tracer = Tracer()

from helper import get_service_client


class BedrockAgentInvokerError(Exception):
    """Custom exception class for BedrockAgentInvoker errors."""

    pass


class BedrockAgentInvoker:
    def __init__(self, conversation_id: str, client: Any = None):

        self._conversation_id = conversation_id

        agent_config = self.get_agent_config()
        self._agent_id = agent_config["agent_id"]
        self._agent_alias_id = agent_config["agent_alias_id"]
        self._enable_trace = agent_config["enable_trace"]

        self._client = client or get_service_client("bedrock-agent-runtime")

    @tracer.capture_method
    def invoke_agent(self, input_text: str):
        response = self._client.invoke_agent(
            agentId=self._agent_id,
            agentAliasId=self._agent_alias_id,
            sessionId=self._conversation_id,
            inputText=input_text,
            enableTrace=self._enable_trace,
        )
        return self.process_response(response)

    def process_response(self, response: Dict) -> Dict:
        """
        Process the response from the Bedrock Agent.

        Args:
        response (Dict): The response dictionary from the Bedrock Agent.

        Returns:
        Dict: A processed response containing the generated text, and optionally citations and trace.
        """
        output_text, citations, trace = self._process_completion_chunks(response["completion"])
        processed_response = {"output_text": output_text}

        if self._enable_trace:
            processed_response["citations"] = citations
            processed_response["trace"] = trace

            # Log citations and trace information
            logger.info(f"Citations for conversation {self._conversation_id}: {json.dumps(citations)}")
            logger.info(f"Trace for conversation {self._conversation_id}: {json.dumps(trace)}")

        return processed_response

    @tracer.capture_method
    def _process_completion_chunks(self, completion_stream) -> Tuple[str, List[Dict], Dict]:
        """
        Process the completion chunks from the Bedrock Agent response.

        Args:
            completion_stream: The EventStream containing the completion chunks.

        Returns:
            Tuple[str, List[Dict], Dict]:
                - str: The generated text from all completion chunks.
                - List[Dict]: A list of citation dictionaries.
                - Dict: A dictionary containing agent information and a list of traces.
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

        Args:
            event (Dict[str, Any]): The event containing the chunk.
            generated_text (str): The current generated text.
            citations (List[Dict]): The current list of citations.

        Returns:
            Tuple[str, List[Dict]]: Updated generated text and citations list.
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

        Args:
            chunk (Dict[str, Any]): The chunk containing citations.

        Returns:
            List[Dict]: A list of processed citations.
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

        Args:
            citation (Dict[str, Any]): The citation containing references.

        Returns:
            List[Dict]: A list of processed references.
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

        Args:
            event (Dict[str, Any]): The event containing trace information.
            trace_info (Dict): The current trace info dictionary.
            traces (List[Dict]): The current list of traces.

        Returns:
            Tuple[Dict, List[Dict]]: Updated trace info and traces list.
        """
        processed_trace = event.get("trace", {})
        if processed_trace:
            trace_info = self._extract_trace_info(processed_trace) if not trace_info else trace_info
            traces.append(processed_trace.get("trace", {}))
        return trace_info, traces

    @tracer.capture_method
    def _process_location(self, location: Dict) -> Dict:
        """
        When the Bedrock agent has to query a KnowledgeBase, the source of the retrieved
        information is returned in the location field of the retrieved reference. This method
        processes the location information based on the type of location.

        Args:
        location (Dict): The location dictionary from a retrieved reference.

        Returns:
        Dict: Processed location information.
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
        """Get the agent configuration from the config file.

        Returns:
            Dict: The agent configuration.
        """
        config_retriever = UseCaseConfigRetriever()
        config = config_retriever.retrieve_use_case_config()
        return {
            "agent_id": config.get("AgentParams").get("BedrockAgentParams").get("AgentId"),
            "agent_alias_id": config.get("AgentParams").get("BedrockAgentParams").get("AgentAliasId"),
            "enable_trace": config.get("AgentParams").get("BedrockAgentParams").get("EnableTrace"),
        }

    @staticmethod
    def _extract_trace_info(processed_trace: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract trace information from a processed trace.

        Args:
            processed_trace (Dict[str, Any]): The processed trace containing trace information.

        Returns:
            Dict[str, str]: A dictionary containing extracted trace information.
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

        Args:
            event (Dict[str, Any]): The event to check for errors.

        Raises:
            BedrockAgentInvokerError: If an error is found in the event.
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
