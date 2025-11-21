# GAAB Strands Workflow Agent

This is the workflow orchestration agent for the Generative AI Application Builder (GAAB) on AWS. It implements the "Agents as Tools" pattern using the Strands SDK to orchestrate multiple specialized agents.

## Overview

The workflow agent treats specialized agents as tools for a client agent, enabling complex multi-step workflows where the client agent can delegate tasks to specialized agents based on user requests.

## Architecture

- **main.py**: Entry point using BedrockAgentCoreApp
- **workflow_agent.py**: Workflow-specific agent creation and orchestration
- **agents_loader.py**: Loading and instantiation of specialized agents

## Dependencies

This agent depends on the `gaab-strands-common` shared library which provides:
- Runtime streaming logic
- DynamoDB helper utilities
- Data models
- Tool wrapper for event emission
- Base agent class

## Configuration

The workflow agent expects the following environment variables:
- `USE_CASE_TABLE_NAME`: DynamoDB table name for configurations
- `USE_CASE_CONFIG_KEY`: Configuration key to load
- `AWS_REGION`: AWS region for Bedrock and DynamoDB

## Prerequisites

- Python 3.13+
- UV package manager (install via `pip install uv>=0.5.0`)

## Development Setup

```bash
# Install UV if not already installed
pip install uv>=0.5.0

# Sync dependencies (creates virtual environment and installs all dependencies)
uv sync

# Activate the virtual environment
source .venv/bin/activate
```

## Building

```bash
# From the deployment/ecr directory
docker build -f gaab-strands-workflow-agent/Dockerfile -t gaab-strands-workflow-agent .
```

## Testing

```bash
# Run tests with UV (recommended)
uv run pytest test/

# Or use the test script
./scripts/run_unit_tests.sh

# Run tests with coverage
uv run pytest test/ --cov=src --cov-report=term --cov-report=html
```

## Message Format

The workflow agent maintains the same message format as the existing tool-based agent:
- Content chunks: `{type: "content", text: string, agent_name: string, model_id: string}`
- Tool usage chunks: `{type: "tool_use", toolUsage: {...}}`
- Completion chunks: `{type: "completion", agent_name: string, model_id: string}`
- Error chunks: `{type: "error", error: string, message: string, agent_name: string, model_id: string}`
