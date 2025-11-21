# Configurable Strands Agent

Configurable AI agent built with Strands framework for AWS Bedrock Agent Core Runtime.

## Quick Start

```bash
# Build container
./scripts/build-container.sh

# Deploy to ECR
AWS_ACCOUNT_ID=123456789012 ./scripts/deploy-ecr.sh

# Run tests
./scripts/run_unit_tests.sh
```

## Configuration

### Environment Variables

-   `AGENT_CONFIG_TABLE` (optional): DynamoDB table name
-   `AGENT_CONFIG_KEY` (optional): Configuration key
-   `AWS_REGION` (default: us-east-1)
-   `LOG_LEVEL` (default: INFO)

### AgentCore Runtime Payload

```json
{
    "input": "Your message here"
}
```

## Project Structure

```
src/
├── main.py              # AgentCore entrypoint
├── configurable_agent.py # Main agent class
├── ddb_helper.py        # DynamoDB operations
├── models.py            # Data models
└── tools_manager.py     # Tool loading and management
test/                    # Unit tests
scripts/                 # Build/deploy scripts
```

## Build Commands

### Basic Build and Deploy

```bash
# Build with default settings
./scripts/build-container.sh

# Deploy to your AWS account
./scripts/deploy-ecr.sh
```

### Custom Build Options

```bash
# Build with custom tag
TAG=v1.0.0 ./scripts/build-container.sh

# Build for specific platform (e.g., ARM64)
PLATFORM=linux/arm64 ./scripts/build-container.sh

# Build without cache
NO_CACHE=true ./scripts/build-container.sh

# Deploy to custom repository
ECR_REPOSITORY=my-custom-repo ./scripts/deploy-ecr.sh
```

### Testing

```bash
# Run tests with coverage (requires UV)
./scripts/run_unit_tests.sh

# Run tests with HTML coverage report
./scripts/run_unit_tests.sh --coverage-html

# Run tests without coverage
./scripts/run_unit_tests.sh --no-coverage

# Run tests directly with UV (after uv sync and editable install)
uv run pytest

# Run tests with coverage using UV
uv run pytest --cov=src --cov-report=html

# Or use the all-in-one script (recommended)
./scripts/run_unit_tests.sh
```

## Development

### Prerequisites

-   Python 3.13+
-   UV package manager (required)

### Installing UV

```bash
# Using pip (recommended for corporate environments)
pip install uv>=0.5.0

# Using pipx (isolated installation)
pipx install uv>=0.5.0

# Using Homebrew (macOS)
brew install uv

# For more installation options, visit:
# https://docs.astral.sh/uv/getting-started/installation/
```

### Setup Development Environment

**Option 1: Use the test script (recommended, handles everything automatically)**

```bash
./scripts/run_unit_tests.sh
```

**Option 2: Manual setup with UV**

```bash
# Sync dependencies (creates .venv and installs everything from uv.lock)
uv sync

# Install the package in editable mode (required for tests to find modules)
uv pip install -e ".[dev,test]"

# Run tests
uv run pytest
```

**Note:**
- The `uv sync` command automatically installs `gaab-strands-common` from the local path as configured in `pyproject.toml`.
- The editable install (`uv pip install -e`) is required for pytest to properly import modules from the `src/` directory.
- Use `./scripts/run_unit_tests.sh` for the most reliable test execution as it handles all environment setup automatically.

## Key Environment Variables

### Build Configuration

-   `IMAGE_TAG` - Custom image tag (default: latest)
-   `BUILD_ARGS` - Additional Docker build arguments
-   `PLATFORM` - Target platform (linux/arm64, linux/amd64)

### ECR Configuration

-   `AWS_REGION` - AWS region (default: us-east-1)
-   `AWS_ACCOUNT_ID` - AWS account ID (auto-detected if not set)
-   `ECR_REPOSITORY` - ECR repository name (default: gaab-strands-agent)

### CI/CD Integration

-   `VERSION` - Image version tag for CI/CD pipelines
-   `PUBLIC_ECR_REGISTRY` - Custom ECR registry URL
-   `PUBLIC_ECR_TAG` - Pipeline tag override
