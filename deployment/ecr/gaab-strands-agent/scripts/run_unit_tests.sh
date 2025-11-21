# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/bin/bash
# Script to run unit tests for the Configurable Strands Agent

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Enable debug mode if DEBUG environment variable is set
if [ "${DEBUG:-}" = "true" ]; then
    set -x
fi

# Change to the project root directory (one level up from scripts/)
cd "$(dirname "$0")/.."

# Logging functions for consistent output
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1" >&2
}

log_warning() {
    echo "⚠️  $1"
}

# Configuration
PYTHON_CMD="${PYTHON_CMD:-python3}"
TEST_RUNNER="${TEST_RUNNER:-test/run_tests.py}"
COVERAGE="${COVERAGE:-true}"
VENV_DIR="${VENV_DIR:-.venv}"
SKIP_VENV="${SKIP_VENV:-false}"

# Validation functions
validate_python() {
    log_info "Validating Python environment..."
    
    if ! command -v "$PYTHON_CMD" &> /dev/null; then
        log_error "Python command '$PYTHON_CMD' not found"
        log_error "Please install Python 3 or set PYTHON_CMD environment variable"
        exit 1
    fi
    
    local python_version
    python_version=$($PYTHON_CMD --version 2>&1)
    log_info "Using: $python_version"
    
    # Check Python version (require 3.8+)
    local version_check
    version_check=$($PYTHON_CMD -c "import sys; print(sys.version_info >= (3, 8))")
    if [ "$version_check" != "True" ]; then
        log_error "Python 3.8 or higher is required"
        exit 1
    fi
    
    log_success "Python environment validated"
}

# UV detection
check_uv_available() {
    log_info "Checking for UV availability..."
    
    if ! command -v uv &> /dev/null; then
        log_error "UV is not installed or not in PATH"
        log_error ""
        log_error "UV is required for running tests."
        log_error ""
        log_error "Please install UV using one of these methods:"
        log_error ""
        log_error "  1. Using pip (recommended for corporate environments):"
        log_error "     pip install uv>=0.5.0"
        log_error ""
        log_error "  2. Using pipx (isolated installation):"
        log_error "     pipx install uv>=0.5.0"
        log_error ""
        log_error "  3. Using your system package manager:"
        log_error "     - macOS: brew install uv"
        log_error "     - Linux: Check your distribution's package manager"
        log_error ""
        log_error "  4. For more installation options, visit:"
        log_error "     https://docs.astral.sh/uv/getting-started/installation/"
        log_error ""
        log_error "After installation, ensure UV is in your PATH and try again."
        exit 1
    fi
    
    # Verify UV is functional
    local uv_version
    uv_version=$(uv --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
    
    if [ "$uv_version" = "unknown" ]; then
        log_error "UV found but version could not be determined"
        log_error "UV may not be properly installed or configured"
        exit 1
    fi
    
    log_success "UV detected (version: $uv_version)"
}

# Virtual environment management with UV
setup_virtual_environment() {
    if [ "$SKIP_VENV" = "true" ]; then
        log_info "Skipping virtual environment setup (SKIP_VENV=true)"
        return 0
    fi
    
    log_info "Setting up UV-managed virtual environment..."
    setup_uv_environment
}

setup_uv_environment() {
    # Check if pyproject.toml exists for UV workflow
    if [ ! -f "pyproject.toml" ]; then
        log_error "pyproject.toml not found"
        log_error "UV requires pyproject.toml for dependency management"
        exit 1
    fi
    
    # Create virtual environment using UV
    if [ ! -d "$VENV_DIR" ]; then
        log_info "Creating UV virtual environment at $VENV_DIR..."
        uv venv "$VENV_DIR"
        log_success "UV virtual environment created"
    else
        log_info "Using existing virtual environment at $VENV_DIR"
    fi
    
    # Activate virtual environment
    log_info "Activating virtual environment..."
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    
    # Install gaab-strands-common first (local dependency)
    local common_lib_path="../gaab-strands-common"
    if [ -d "$common_lib_path" ]; then
        log_info "Installing gaab-strands-common from local directory..."
        uv pip install -e "$common_lib_path"
        log_success "gaab-strands-common installed"
    else
        log_error "gaab-strands-common directory not found at $common_lib_path"
        log_error "The shared library is required for running tests"
        exit 1
    fi
    
    # Install dependencies using UV sync (installs both dependencies and dev-dependencies)
    log_info "Installing dependencies using UV sync..."
    uv sync
    
    log_success "UV virtual environment setup completed"
}

cleanup_virtual_environment() {
    if [ "$SKIP_VENV" = "true" ]; then
        return 0
    fi
    
    # Only show deactivation message if we actually have an active virtual environment
    if [ -n "${VIRTUAL_ENV:-}" ]; then
        log_info "Deactivating virtual environment..."
        
        # Try to deactivate and capture the result
        if command -v deactivate >/dev/null 2>&1; then
            deactivate 2>/dev/null || {
                log_warning "Virtual environment deactivation failed, but continuing..."
            }
        else
            # If deactivate function isn't available, just unset the environment variable
            unset VIRTUAL_ENV
            log_info "Virtual environment variables cleared"
        fi
        
        # Verify deactivation
        if [ -z "${VIRTUAL_ENV:-}" ]; then
            log_success "Virtual environment deactivated successfully"
        fi
    fi
}

validate_test_environment() {
    log_info "Validating test environment..."
    
    if [ ! -f "$TEST_RUNNER" ]; then
        log_error "Test runner not found: $TEST_RUNNER"
        log_error "Current directory: $(pwd)"
        log_error "Please ensure you're in the correct directory"
        exit 1
    fi
    
    if [ ! -d "test" ]; then
        log_error "Test directory not found"
        exit 1
    fi
    
    log_success "Test environment validated"
}

# Enhanced test execution with better error handling
run_tests() {
    log_info "Starting unit test execution..."
    log_info "Configuration:"
    echo "  🐍 Python Command: $PYTHON_CMD"
    echo "  🧪 Test Runner: $TEST_RUNNER"
    echo "  📁 Working Directory: $(pwd)"
    echo "  🔧 Virtual Environment: $VENV_DIR"
    
    if [ "$COVERAGE" = "true" ]; then
        echo "  📊 Coverage: Enabled"
    fi
    
    if [ "$SKIP_VENV" = "true" ]; then
        echo "  ⚠️  Virtual Environment: Skipped"
    fi
    
    echo ""
    
    # Determine which Python command to use
    local python_exec
    if [ "$SKIP_VENV" = "true" ]; then
        python_exec="$PYTHON_CMD"
    else
        python_exec="python"  # Use the activated venv python
    fi
    
    # Run the test runner with enhanced error handling
    if [ "$COVERAGE" = "true" ]; then
        log_info "Running tests with coverage..."
        if ! $python_exec -m coverage run "$TEST_RUNNER"; then
            log_error "Unit tests failed!"
            exit 1
        fi
        
        # Generate coverage report
        log_info "Generating coverage report..."
        $python_exec -m coverage report
        
        # Generate XML coverage report if requested
        if [ "${COVERAGE_XML:-true}" = "true" ]; then
            log_info "Generating XML coverage report..."
            $python_exec -m coverage xml
            log_info "XML coverage report generated at "
        fi
        
        # Generate HTML coverage report if requested
        if [ "${COVERAGE_HTML:-false}" = "true" ]; then
            log_info "Generating HTML coverage report..."
            $python_exec -m coverage html
            log_info "HTML coverage report generated in htmlcov/"
        fi
        
    else
        log_info "Running tests..."
        if ! $python_exec "$TEST_RUNNER"; then
            log_error "Unit tests failed!"
            log_error ""
            log_error "Troubleshooting steps:"
            log_error "  1. Check test output above for specific failures"
            log_error "  2. Verify all dependencies are installed"
            log_error "  3. Check Python version compatibility"
            log_error "  4. Run with DEBUG=true for more verbose output"
            log_error "  5. Try recreating virtual environment: rm -rf $VENV_DIR"
            exit 1
        fi
    fi
    
    log_success "All unit tests passed!"
}

# Display usage information
display_usage() {
    echo "Usage: $0 [options]"
    log_info "Environment Variables:"
    echo "  PYTHON_CMD       - Python command to use (default: python3)"
    echo "  TEST_RUNNER      - Test runner script (default: test/run_tests.py)"
    echo "  COVERAGE         - Enable coverage reporting (true/false, default: true)"
    echo "  COVERAGE_XML     - Generate XML coverage report (true/false, default: true)"
    echo "  COVERAGE_HTML    - Generate HTML coverage report (true/false, default: false)"
    echo "  DEBUG            - Enable debug output (true/false, default: false)"
    echo "  VENV_DIR         - Virtual environment directory (default: .venv)"
    echo "  SKIP_VENV        - Skip virtual environment setup (true/false, default: false)"
    echo ""
    log_info "Command Line Options:"
    echo "  -h, --help           Show this help message"
    echo "  -c, --coverage       Enable coverage reporting (default: enabled)"
    echo "  --no-coverage        Disable coverage reporting"
    echo "  --coverage-html      Enable coverage reporting with HTML output"
    echo ""
    log_info "Examples:"
    echo "  # Basic test run with coverage (default behavior)"
    echo "  ./scripts/run_unit_tests.sh"
    echo ""
    echo "  # Run without coverage report"
    echo "  ./scripts/run_unit_tests.sh --no-coverage"
    echo ""
    echo "  # Run with coverage and HTML report"
    echo "  ./scripts/run_unit_tests.sh --coverage-html"
    echo ""
    echo "  # Use environment variables to disable coverage"
    echo "  COVERAGE=false ./scripts/run_unit_tests.sh"
    echo ""
    echo "  # Use specific Python version"
    echo "  PYTHON_CMD=python3.11 ./scripts/run_unit_tests.sh"
    echo ""
    echo "  # Skip virtual environment (use system Python)"
    echo "  SKIP_VENV=true ./scripts/run_unit_tests.sh"
    echo ""
    echo "  # Use custom virtual environment directory"
    echo "  VENV_DIR=test-env ./scripts/run_unit_tests.sh"
    echo ""
    echo "  # Clean virtual environment and recreate"
    echo "  rm -rf .venv && ./scripts/run_unit_tests.sh"
    echo ""
}

# Cleanup function for trap
cleanup_on_exit() {
    local exit_code=$?
    
    # Only cleanup if we're not skipping venv and there's an active virtual environment
    if [ "$SKIP_VENV" != "true" ] && [ -n "${VIRTUAL_ENV:-}" ]; then
        cleanup_virtual_environment
    fi
    
    if [ $exit_code -ne 0 ]; then
        log_error "Script exited with error code $exit_code"
    fi
    
    exit $exit_code
}

# Set trap for cleanup
trap cleanup_on_exit EXIT INT TERM

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                display_usage
                exit 0
                ;;
            -c|--coverage)
                COVERAGE="true"
                log_info "Coverage reporting enabled via command line"
                ;;
            --no-coverage)
                COVERAGE="false"
                log_info "Coverage reporting disabled via command line"
                ;;
            --coverage-xml)
                COVERAGE="true"
                COVERAGE_XML="true"
                log_info "Coverage reporting with XML output enabled via command line"
                ;;
            --no-coverage-xml)
                COVERAGE_XML="false"
                log_info "XML coverage reporting disabled via command line"
                ;;
            --coverage-html)
                COVERAGE="true"
                COVERAGE_HTML="true"
                log_info "Coverage reporting with HTML output enabled via command line"
                ;;
            *)
                log_error "Unknown option: $1"
                display_usage
                exit 1
                ;;
        esac
        shift
    done
}

# Main execution
main() {
    echo "🧪 Running unit tests for Configurable Strands Agent..."
    echo "================================================"
    validate_python
    check_uv_available
    validate_test_environment
    setup_virtual_environment
    run_tests
}

echo "================================================"

# Parse arguments first
parse_arguments "$@"

# Run main function
main

echo "================================================"
log_success "Unit test execution completed!"