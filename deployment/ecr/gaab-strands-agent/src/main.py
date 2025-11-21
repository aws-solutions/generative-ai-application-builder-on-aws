# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Configurable Strands Agent - Main Entry Point
AgentCore Runtime Integration

TODO: Future enhancements to consider:
- Support for multiple model providers (Anthropic, Gemini, Ollama, LlamaAPI, etc.)
- Enhanced BedrockModel configuration (top_p, stop_sequences)
- Tool configuration and management
- Advanced conversation management and memory
"""

import logging
import os
import sys
from typing import Any, Dict, Optional

from bedrock_agentcore.memory.integrations.strands.config import (
    AgentCoreMemoryConfig,
    RetrievalConfig,
)
from bedrock_agentcore.memory.integrations.strands.session_manager import (
    AgentCoreMemorySessionManager,
)
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from configurable_agent import ConfigurableAgent
from gaab_strands_common import (
    ENV_AWS_REGION,
    ENV_MEMORY_ID,
    ENV_MEMORY_STRATEGY_ID,
    ENV_USE_CASE_CONFIG_KEY,
    ENV_USE_CASE_TABLE_NAME,
    RuntimeStreaming,
)
from gaab_strands_common.multimodal.multimodal_processor import MultimodalRequestProcessor
from gaab_strands_common.utils.helpers import extract_user_message


# Suppress OpenTelemetry context warnings
logging.getLogger("opentelemetry.context").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# Initialize the AgentCore app
app = BedrockAgentCoreApp()

# Module-level private agent instance (singleton pattern)
_configurable_agent: Optional[ConfigurableAgent] = None


def validate_environment() -> tuple[str, str, str, str]:
    """Validate required environment variables and return them"""
    required_vars = {
        ENV_USE_CASE_TABLE_NAME: os.getenv(ENV_USE_CASE_TABLE_NAME),
        ENV_USE_CASE_CONFIG_KEY: os.getenv(ENV_USE_CASE_CONFIG_KEY),
        ENV_AWS_REGION: os.getenv(ENV_AWS_REGION),
        ENV_MEMORY_ID: os.getenv(ENV_MEMORY_ID),
    }

    missing_vars = [name for name, value in required_vars.items() if not value]
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    strategy_id = os.getenv(ENV_MEMORY_STRATEGY_ID, "")

    table_name, config_key, region, memory_id = required_vars.values()
    logger.info(
        f"Environment validated - Table: {table_name}, Key: {config_key}, Region: {region}, Memory ID: {memory_id}"
    )
    return table_name, config_key, region, memory_id, strategy_id


def get_agent_instance(session_id: str = None, actor_id=None) -> ConfigurableAgent:
    """Get or create the singleton agent instance"""
    global _configurable_agent

    if _configurable_agent is None:
        logger.info("Initializing Configurable Strands Agent")
        logger.info("Testing longterm memory")
        # Validate environment variables first
        table_name, config_key, region, memory_id, strategy_id = validate_environment()

        # Create session manager only if strategy_id exists
        session_manager = None
        if strategy_id:
            agentcore_memory_config = AgentCoreMemoryConfig(
                memory_id=memory_id,
                session_id=session_id,
                actor_id=actor_id,
                retrieval_config={
                    "/strategies/{memoryStrategyId}/actors/{actorId}": RetrievalConfig(
                        top_k=5, relevance_score=0.7, strategy_id=strategy_id
                    )
                },
            )
            session_manager = AgentCoreMemorySessionManager(
                agentcore_memory_config=agentcore_memory_config, region_name=region
            )

        # Create agent with validated parameters
        _configurable_agent = ConfigurableAgent(
            table_name=table_name,
            config_key=config_key,
            region=region,
            session_manager=session_manager,
        )
        logger.info("Agent initialized successfully")

    return _configurable_agent


@app.entrypoint
def invoke(payload: Dict[str, Any]):
    """AgentCore Runtime entrypoint function"""
    try:
        # Extract session ID and create memory client if needed
        session_id = payload.get("conversationId")
        actor_id = payload.get("userId")
        logger.info(f"Session ID: {session_id}")
        logger.info(f"Actor ID: {actor_id}")

        # Get agent instance with session context
        agent_instance = get_agent_instance(session_id=session_id, actor_id=actor_id)
        strands_agent = agent_instance.get_agent()
        config = agent_instance.get_config()

        region = os.getenv(ENV_AWS_REGION)
        multimodal_processor = MultimodalRequestProcessor(region)
        has_files = multimodal_processor.has_files(payload)
        multimodal_enabled = multimodal_processor.is_multimodal_enabled(config)
        logger.debug(f"Multimodal enabled: {multimodal_enabled}")
        logger.debug(f"Has files: {has_files}")

        # Determine processing mode and handle accordingly
        if has_files and multimodal_enabled:
            logger.debug("Multimodal request detected - processing files")
            user_message = multimodal_processor.process_multimodal_request(payload)
        elif has_files and not multimodal_enabled:
            logger.warning("FILES IGNORED: User sent files but multimodal is disabled. Enable multimodal in configuration to process files. ")
            user_message = extract_user_message(payload)
        else:
            # No files present - process as text-only regardless of multimodal setting
            if multimodal_enabled:
                logger.debug("Text-only request (multimodal enabled but no files provided)")
            else:
                logger.debug("Text-only request (multimodal disabled)")
            user_message = extract_user_message(payload)

        logger.debug(f"User message: {user_message[:100]}...")

        if config.llm_params.streaming:
            logger.debug("Using streaming mode")
            return RuntimeStreaming.stream_response(strands_agent, user_message, config)

        # Non-streaming response
        response = strands_agent(user_message)

        return {
            "result": str(response),
            "agent_name": config.use_case_name,
            "model_id": config.llm_params.bedrock_llm_params.model_id,
        }

    except ValueError as e:
        # Configuration or validation errors
        logger.error(f"Validation error: {e}")
        return {"type": "error", "error": "Invalid configuration or request", "message": str(e)}

    except RuntimeError as e:
        # Agent execution errors
        logger.error(f"Runtime error: {e}")
        return {"type": "error", "error": "Agent execution failed", "message": str(e)}

    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error processing request: {e}", exc_info=True)
        return {"type": "error", "error": "Request processing failed", "message": str(e)}


def main():
    """
    Main entry point for the application.

    This function is called when the Lambda container starts. It:
    1. Initializes the workflow agent (validates environment and loads config)
    2. Starts the AgentCore Runtime application
    3. Handles startup errors gracefully

    Exits:
        1: If initialization fails
    """
    logger.info("Starting the Agent")

    try:
        app.run()
    except Exception as e:
        logger.error(f"Failed to start workflow agent: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
