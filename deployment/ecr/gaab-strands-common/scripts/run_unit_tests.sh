#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Script to run unit tests for GAAB Strands Common

set -e  # Exit on any error

# Change to the project root directory (one level up from scripts/)
cd "$(dirname "$0")/.."

echo "🧪 Running tests for gaab-strands-common..."

# Check if UV is available
if ! command -v uv &> /dev/null; then
    echo "❌ ERROR: UV is not installed or not in PATH"
    echo ""
    echo "UV is required for running tests. Please install UV:"
    echo "  - pip install uv>=0.5.0"
    echo "  - brew install uv (macOS)"
    echo "  - https://docs.astral.sh/uv/getting-started/installation/"
    echo ""
    exit 1
fi

echo "ℹ️  Using UV version: $(uv --version)"

# Sync dependencies and run tests
echo "ℹ️  Syncing dependencies..."
uv sync

echo "ℹ️  Running tests with coverage..."
uv run pytest test/ -v --cov --cov-report=term-missing --cov-report=xml

echo ""
echo "✅ Test run complete!"
