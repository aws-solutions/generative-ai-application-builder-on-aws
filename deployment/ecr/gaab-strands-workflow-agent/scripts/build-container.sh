#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Enable debug mode if DEBUG environment variable is set
if [ "${DEBUG:-}" = "true" ]; then
    set -x
fi

echo "=== Building Workflow Agent Container ==="

# Navigate to agent directory (parent of scripts/)
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

# Enhanced configuration with environment variable support
IMAGE_NAME="${IMAGE_NAME:-gaab-strands-workflow-agent}"
TAG="${TAG:-latest}"

# Build options configuration
BUILD_ARGS="${BUILD_ARGS:-}"
NO_CACHE="${NO_CACHE:-false}"
PLATFORM="${PLATFORM:-}"

# UV configuration - UV is required for this build
REQUIRE_UV="${REQUIRE_UV:-true}"

# Validation functions
validate_docker() {
    log_info "Validating Docker environment..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        log_error "Please install Docker and ensure it's running"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        log_error "Please start Docker and try again"
        exit 1
    fi
    
    # Check Docker version for compatibility
    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    log_info "Docker version: $docker_version"
    
    log_success "Docker environment validated"
}

validate_build_context() {
    log_info "Validating build context..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found in current directory"
        log_error "Current directory: $(pwd)"
        log_error "Please ensure you're in the correct directory"
        exit 1
    fi
    
    # Check if pyproject.toml exists for UV workflow
    if [ ! -f "pyproject.toml" ]; then
        log_warning "pyproject.toml not found - UV workflow may not be available"
    fi
    
    # Check if required source files exist
    if [ ! -d "src" ]; then
        log_warning "Source directory 'src' not found - this may be expected"
    fi
    
    # Verify gaab-strands-common package exists (required dependency)
    if [ ! -d "../gaab-strands-common" ]; then
        log_error "gaab-strands-common package not found at ../gaab-strands-common"
        log_error "The shared library is required for building this agent"
        log_error "Expected structure:"
        log_error "  deployment/ecr/"
        log_error "    ├── gaab-strands-workflow-agent/  (current)"
        log_error "    └── gaab-strands-common/ (required)"
        exit 1
    fi
    
    log_success "Build context validated (including gaab-strands-common)"
}

# UV detection - check if UV is available in the environment
check_uv_available() {
    log_info "Checking for UV availability..."
    
    if ! command -v uv &> /dev/null; then
        log_error "UV is not installed or not in PATH"
        log_error ""
        log_error "Please install UV manually using one of these methods:"
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
        return 1
    fi
    
    # Verify UV is functional
    local uv_version
    uv_version=$(uv --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
    
    if [ "$uv_version" = "unknown" ]; then
        log_error "UV found but version could not be determined"
        log_error "UV may not be properly installed or configured"
        return 1
    fi
    
    log_success "UV detected (version: $uv_version)"
    return 0
}



# Enhanced build function with better error handling
build_docker_image() {
    log_info "Starting Docker image build..."
    
    log_info "Configuration:"
    echo "  📦 Image Name: $IMAGE_NAME"
    echo "  🏷️  Tag: $TAG"
    echo "  📁 Build Context: $(pwd)"
    echo "  🔧 Package Manager: UV"
    echo "  📚 Shared Library: gaab-strands-common (../gaab-strands-common)"
    
    if [ -n "$PLATFORM" ]; then
        echo "  🏗️  Platform: $PLATFORM"
    fi
    
    if [ "$NO_CACHE" = "true" ]; then
        echo "  🚫 Cache: Disabled"
    fi
    
    if [ -n "$BUILD_ARGS" ]; then
        echo "  ⚙️  Build Args: $BUILD_ARGS"
    fi
    
    echo ""
    
    # Construct build command
    local build_cmd="docker build"
    
    # Add no-cache flag if requested
    if [ "$NO_CACHE" = "true" ]; then
        build_cmd="$build_cmd --no-cache"
    fi
    
    # Add platform if specified
    if [ -n "$PLATFORM" ]; then
        build_cmd="$build_cmd --platform $PLATFORM"
    fi
    
    # Add build args if specified
    if [ -n "$BUILD_ARGS" ]; then
        build_cmd="$build_cmd $BUILD_ARGS"
    fi
    
    # Add tag and context (build from current directory)
    build_cmd="$build_cmd -t $IMAGE_NAME:$TAG ."
    
    log_info "Build command: $build_cmd"
    log_info "Tests will run during build process..."
    echo ""
    
    # Execute build with error handling
    if eval "$build_cmd"; then
        log_success "Docker image built successfully!"
        log_success "Tests passed during build!"
        
        # Display image information
        echo ""
        log_info "Image Details:"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -1
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep "^$IMAGE_NAME:$TAG"
        
        # Get image ID and size
        local image_id
        local image_size
        image_id=$(docker images --format "{{.ID}}" "$IMAGE_NAME:$TAG" | head -1)
        image_size=$(docker images --format "{{.Size}}" "$IMAGE_NAME:$TAG" | head -1)
        
        echo ""
        log_info "Build Summary:"
        echo "  🆔 Image ID: $image_id"
        echo "  📏 Image Size: $image_size"
        echo "  🏷️  Full Tag: $IMAGE_NAME:$TAG"
        
    else
        log_error "Docker build failed!"
        log_error ""
        log_error "Common causes of build failures:"
        log_error "  - Missing dependencies in Dockerfile"
        log_error "  - Test failures during build"
        log_error "  - Network connectivity issues"
        log_error "  - Insufficient disk space"
        log_error "  - Invalid Dockerfile syntax"
        log_error "  - UV/pip dependency resolution conflicts"
        log_error ""
        log_error "Troubleshooting steps:"
        log_error "  1. Check Docker logs above for specific errors"
        log_error "  2. Verify Dockerfile syntax"
        log_error "  3. Ensure all required files are present"
        log_error "  4. Check available disk space: df -h"
        log_error "  5. Try building with --no-cache: NO_CACHE=true ./scripts/build-container.sh"
        log_error "  6. Try fallback mode: USE_UV=false ./scripts/build-container.sh"
        exit 1
    fi
}

# Display usage information
display_usage() {
    echo ""
    log_info "Environment Variables:"
    echo "  IMAGE_NAME       - Docker image name (default: gaab-strands-workflow-agent)"
    echo "  TAG              - Docker image tag (default: latest)"
    echo "  BUILD_ARGS       - Additional build arguments"
    echo "  NO_CACHE         - Disable build cache (true/false, default: false)"
    echo "  PLATFORM         - Target platform (e.g., linux/amd64, linux/arm64)"
    echo "  DEBUG            - Enable debug output (true/false, default: false)"
    echo "  REQUIRE_UV       - Require UV to be installed (true/false, default: true)"
    echo ""
    log_info "Prerequisites:"
    echo "  - gaab-strands-common package must exist at ../gaab-strands-common"
    echo "  - UV must be installed (pip install uv>=0.5.0)"
    echo ""
    log_info "Examples:"
    echo "  # Basic UV-based build (recommended)"
    echo "  ./scripts/build-container.sh"
    echo ""
    echo "  # Build with custom tag"
    echo "  TAG=v1.0.0 ./scripts/build-container.sh"
    echo ""
    echo "  # Build without cache"
    echo "  NO_CACHE=true ./scripts/build-container.sh"
    echo ""
    echo "  # Build for specific platform (AgentCore ARM64)"
    echo "  PLATFORM=linux/arm64 ./scripts/build-container.sh"
    echo ""
    echo "  # Build without requiring UV"
    echo "  REQUIRE_UV=false ./scripts/build-container.sh"
    echo ""
    echo "  # Debug mode with verbose output"
    echo "  DEBUG=true ./scripts/build-container.sh"
    echo ""
}

# Main execution
main() {
    validate_docker
    validate_build_context
    build_docker_image
}

# Run main function
main
