# GAAB Strands Common Library

Shared library for GAAB Strands agents providing common functionality for:
- Runtime streaming
- DynamoDB configuration management
- Data models
- Tool wrapping and event emission
- Base agent patterns

## Installation

```bash
uv sync
```

## Usage

```python
from gaab_strands_common.runtime_streaming import RuntimeStreaming
from gaab_strands_common.ddb_helper import DynamoDBHelper
from gaab_strands_common.models import AgentConfig
from gaab_strands_common.tool_wrapper import wrap_tool_with_events
from gaab_strands_common.base_agent import BaseAgent
```

## Development

Install dependencies:
```bash
uv sync
```

Run tests:
```bash
uv run pytest
```

Run tests with coverage:
```bash
uv run pytest --cov=src/gaab_strands_common --cov-report=term-missing
```

Format code:
```bash
uv run black src/ test/
uv run isort src/ test/
```
