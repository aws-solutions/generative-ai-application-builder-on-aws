# GAAB Strands Common Library Tests

This directory contains comprehensive unit tests for the `gaab-strands-common` shared library.

## Test Coverage

The test suite covers all major components of the shared library:

### 1. RuntimeStreaming (`test_runtime_streaming.py`)
- Event text extraction from streaming events
- Content, completion, and error chunk creation
- Tool event handling and emission
- Event skipping logic for duplicates
- Async streaming with tool events
- Error handling and fallback mechanisms
- Synchronous streaming wrapper

### 2. DynamoDBHelper (`test_ddb_helper.py`)
- DynamoDB table initialization
- Configuration retrieval by key
- MCP server configuration fetching
- Validation of UseCaseType
- Error handling for missing configurations
- Partial failure handling for batch operations

### 3. Data Models (`test_models.py`)
- Pydantic model validation
- BedrockLlmParams with multiple inference types
- Tool and MCP server reference parsing
- AgentConfig deserialization from DDB
- WorkflowConfig deserialization
- Memory configuration
- Model identifier resolution

### 4. Tool Wrapper (`test_tool_wrapper.py`)
- ToolUsageEvent creation and serialization
- ToolEventEmitter singleton pattern
- Tool name extraction from various sources
- MCP server metadata handling
- Argument and kwarg filtering
- Tool wrapping for __call__, invoke, and stream methods
- Event emission for start, completion, and error states
- Tool input/output capture and truncation

### 5. BaseAgent (`test_base_agent.py`)
- Agent initialization with region
- Bedrock model creation for different inference types
- Use case type validation
- Configuration management
- Cross-region inference profile handling

## Running Tests

### Run all tests
```bash
cd deployment/ecr/gaab-strands-common
uv run pytest
```

### Run with coverage
```bash
uv run pytest --cov=gaab_strands_common --cov-report=html
```

### Run specific test file
```bash
uv run pytest test/test_runtime_streaming.py
```

### Run specific test class
```bash
uv run pytest test/test_models.py::TestBedrockLlmParams
```

### Run specific test
```bash
uv run pytest test/test_tool_wrapper.py::TestWrapToolWithEvents::test_wrap_tool_with_call_method
```

## Test Configuration

Tests are configured via `pytest.ini`:
- Test discovery: `test_*.py` files
- Coverage reporting: terminal, HTML, and XML
- Async test support via pytest-asyncio
- Verbose output enabled

## Fixtures

Shared fixtures are defined in `conftest.py`:
- `mock_environment`: Mocks AWS environment variables
- `mock_bedrock_model`: Mocks BedrockModel for testing
- `sample_agent_config`: Sample agent configuration
- `sample_workflow_config`: Sample workflow configuration
- `sample_mcp_config`: Sample MCP server configuration
- `mock_strands_agent`: Mock Strands agent with streaming

## Requirements Coverage

These tests satisfy the requirements from the specification:
- **1.1**: RuntimeStreaming chunk creation and streaming logic
- **1.2**: DynamoDBHelper configuration loading
- **1.3**: Model deserialization with `from_ddb_config()`
- **1.4**: `wrap_tool_with_events()` functionality
- **2.1-2.4**: BaseAgent model creation and validation

## Best Practices

- All tests use proper mocking to avoid external dependencies
- Tests are isolated and can run in any order
- Async tests use pytest-asyncio markers
- Clear test names describe what is being tested
- Comprehensive edge case coverage
