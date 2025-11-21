FROM --platform=$BUILDPLATFORM public.ecr.aws/docker/library/python:3.13-slim

# Install system dependencies with security updates
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        curl \
        openssl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Install pip and UV for dependency management
RUN pip install --no-cache-dir --upgrade "pip>=25.3" \
    && pip install --no-cache-dir "uv>=0.5.0"

# Debug: Show build context structure
RUN echo "=== Build context contents ===" && ls -la . 2>/dev/null || true

# Copy shared library - must be present in build context
COPY gaab-strands-common /tmp/gaab-strands-common

# Install shared library using UV
RUN uv pip install --system -e /tmp/gaab-strands-common

# Debug: Verify shared library was copied
RUN echo "=== Verifying gaab-strands-common ===" && ls -la /tmp/gaab-strands-common

# Copy dependency files and README from current directory
COPY pyproject.toml uv.lock README.md ./

# Install dependencies from pyproject.toml (excluding gaab-strands-common which is already installed)
# Extract non-local dependencies and install them
RUN python3 -c "import tomllib; \
    data = tomllib.load(open('pyproject.toml', 'rb')); \
    deps = [d for d in data['project']['dependencies'] if 'gaab-strands-common' not in d]; \
    print('\n'.join(deps))" > /tmp/deps.txt && \
    uv pip install --system -r /tmp/deps.txt

# Debug: Show current directory before copying src
RUN echo "=== Current directory contents ===" && ls -la .

# Copy source code from current directory
COPY src/ ./src/

# Install the package itself (no dependencies, they're already installed)
RUN uv pip install --system --no-deps -e .

# Set Python path
ENV PYTHONPATH=/app/src

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

USER appuser

# Expose port for AgentCore Runtime
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import sys; sys.exit(0)" || exit 1

# Run the application with OpenTelemetry instrumentation
CMD ["opentelemetry-instrument", "python", "src/main.py"]
