# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/bin/bash

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Enable debug mode if DEBUG environment variable is set
if [ "${DEBUG:-}" = "true" ]; then
    set -x
fi

echo "=== Deploying Configurable Strands Agent to ECR ==="

# Navigate to agent directory (parent of scripts/)
cd "$(dirname "$0")/.."

# Verify we're in the correct directory
if [ ! -f "Dockerfile" ]; then
    log_error "Dockerfile not found. Current directory: $(pwd)"
    log_error "This script must be run from deployment/ecr/gaab-strands-agent/scripts/"
    exit 1
fi

# Logging function for consistent output
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

# Validation function for required environment variables
validate_required_vars() {
    local missing_vars=()
    
    # Check for required variables based on context
    if [ -z "${AWS_REGION:-}" ] && [ -z "${AWS_DEFAULT_REGION:-}" ]; then
        missing_vars+=("AWS_REGION or AWS_DEFAULT_REGION")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error "Please set the required variables and try again."
        exit 1
    fi
}

# Enhanced configuration with environment variable support
# Core AWS configuration
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

# ECR repository configuration with enhanced customization
ECR_REPOSITORY="${ECR_REPOSITORY:-gaab-strands-agent}"
IMAGE_NAME="${IMAGE_NAME:-gaab-strands-agent}"

# Image tag resolution with CI/CD support
if [ -n "${VERSION:-}" ]; then
    # Use VERSION environment variable (CI/CD context)
    # Remove double 'v' prefix if present (e.g., vv4.0.0 -> v4.0.0)
    RESOLVED_VERSION=$(echo "$VERSION" | sed 's/^vv/v/')
    IMAGE_TAG="${IMAGE_TAG:-$RESOLVED_VERSION}"
elif [ -n "${PUBLIC_ECR_TAG:-}" ]; then
    # Use PUBLIC_ECR_TAG for CI/CD pipeline overrides
    IMAGE_TAG="${IMAGE_TAG:-$PUBLIC_ECR_TAG}"
else
    # Default to latest for local development
    IMAGE_TAG="${IMAGE_TAG:-latest}"
fi

# Registry configuration with CI/CD override support
if [ -n "${PUBLIC_ECR_REGISTRY:-}" ]; then
    # CI/CD context with custom registry
    ECR_REGISTRY_URL="$PUBLIC_ECR_REGISTRY"
    log_info "Using custom ECR registry from PUBLIC_ECR_REGISTRY: $ECR_REGISTRY_URL"
else
    # Local development or standard AWS ECR
    ECR_REGISTRY_URL=""  # Will be constructed with AWS account ID
fi

# Validate required variables
validate_required_vars

log_info "Starting ECR deployment process..."
log_info "Configuration validation passed"

# Enhanced AWS Account ID resolution with better error handling
resolve_aws_account_id() {
    if [ -n "${AWS_ACCOUNT_ID:-}" ]; then
        log_info "Using provided AWS Account ID: $AWS_ACCOUNT_ID"
        return 0
    fi
    
    log_info "AWS_ACCOUNT_ID not provided, auto-detecting from current AWS credentials..."
    
    # Try to get account ID with timeout and better error handling
    if ! AWS_ACCOUNT_ID=$(timeout 30 aws sts get-caller-identity --query Account --output text 2>/dev/null); then
        log_error "Failed to auto-detect AWS Account ID"
        log_error "This could be due to:"
        log_error "  - AWS credentials not configured"
        log_error "  - Network connectivity issues"
        log_error "  - Insufficient permissions"
        log_error ""
        log_error "Solutions:"
        log_error "  1. Configure AWS credentials: aws configure"
        log_error "  2. Set AWS_ACCOUNT_ID manually: export AWS_ACCOUNT_ID=123456789012"
        log_error "  3. Check network connectivity to AWS"
        exit 1
    fi
    
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        log_error "AWS Account ID is empty after auto-detection"
        exit 1
    fi
    
    log_success "Auto-detected AWS Account ID: $AWS_ACCOUNT_ID"
}

# Enhanced ECR URI construction with registry override support
construct_ecr_uri() {
    if [ -n "${ECR_REGISTRY_URL:-}" ]; then
        # Custom registry (CI/CD context)
        ECR_URI="$ECR_REGISTRY_URL/$ECR_REPOSITORY"
    else
        # Standard AWS ECR - use ECR_REPOSITORY as the full repository name
        ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
    fi
}

# Resolve AWS Account ID
resolve_aws_account_id

# Construct ECR URI
construct_ecr_uri

# Enhanced configuration display
display_configuration() {
    log_info "Deployment Configuration:"
    echo "  AWS Region: $AWS_REGION"
    echo "  AWS Account: $AWS_ACCOUNT_ID"
    echo "  ECR Repository: $ECR_REPOSITORY"
    echo "  Image Name: $IMAGE_NAME"
    echo "  Image Tag: $IMAGE_TAG"
    echo "  ECR URI: $ECR_URI:$IMAGE_TAG"
    
    if [ -n "${ECR_REGISTRY_URL:-}" ]; then
        echo "  Custom Registry: $ECR_REGISTRY_URL"
    fi
    
    if [ -n "${VERSION:-}" ]; then
        echo "  Version Source: VERSION environment variable"
    elif [ -n "${PUBLIC_ECR_TAG:-}" ]; then
        echo "  Version Source: PUBLIC_ECR_TAG environment variable"
    else
        echo "  Version Source: Default (latest)"
    fi
    
    echo ""
}

# Enhanced Docker image validation
validate_docker_image() {
    log_info "Validating local Docker image..."
    
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
    
    # Check if the specific image exists
    if ! docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "^$IMAGE_NAME:latest$"; then
        log_error "Local Docker image '$IMAGE_NAME:latest' not found"
        log_error "Available images:"
        docker images --format "table {{.Repository}}:{{.Tag}}" | head -10
        log_error ""
        log_error "Please run './scripts/build-container.sh' first to build the image"
        exit 1
    fi
    
    log_success "Docker image '$IMAGE_NAME:latest' found locally"
}

# Display configuration
display_configuration

# Validate Docker image
validate_docker_image

# Enhanced ECR login with better error handling
ecr_login() {
    echo ""
    log_info "Step 1: Logging into ECR..."
    
    local login_registry
    if [ -n "${ECR_REGISTRY_URL:-}" ]; then
        # Custom registry login
        login_registry="$ECR_REGISTRY_URL"
        log_info "Logging into custom registry: $login_registry"
    else
        # Standard AWS ECR login
        login_registry="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
        log_info "Logging into AWS ECR: $login_registry"
    fi
    
    # Attempt ECR login with timeout and better error handling
    if ! timeout 60 aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$login_registry" 2>/dev/null; then
        log_error "ECR login failed"
        log_error "This could be due to:"
        log_error "  - Invalid AWS credentials"
        log_error "  - Insufficient ECR permissions"
        log_error "  - Network connectivity issues"
        log_error "  - Invalid region: $AWS_REGION"
        log_error ""
        log_error "Required permissions:"
        log_error "  - ecr:GetAuthorizationToken"
        log_error "  - ecr:BatchCheckLayerAvailability"
        log_error "  - ecr:GetDownloadUrlForLayer"
        log_error "  - ecr:BatchGetImage"
        exit 1
    fi
    
    log_success "Successfully logged into ECR"
}

# Perform ECR login
ecr_login

# Enhanced ECR repository management
manage_ecr_repository() {
    echo ""
    log_info "Step 2: Managing ECR repository..."
    
    local full_repo_name="$ECR_REPOSITORY"
    
    # Skip repository creation for custom registries (CI/CD context)
    if [ -n "${ECR_REGISTRY_URL:-}" ]; then
        log_info "Using custom registry - skipping repository creation"
        log_info "Repository: $full_repo_name"
        return 0
    fi
    
    log_info "Checking repository: $full_repo_name"
    
    # Check if repository exists with better error handling
    if aws ecr describe-repositories --repository-names "$full_repo_name" --region "$AWS_REGION" &>/dev/null; then
        log_success "ECR repository exists: $full_repo_name"
    else
        log_info "Repository does not exist, creating: $full_repo_name"
        
        # Create repository with enhanced error handling
        if ! aws ecr create-repository \
            --repository-name "$full_repo_name" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            &>/dev/null; then
            
            log_error "Failed to create ECR repository: $full_repo_name"
            log_error "This could be due to:"
            log_error "  - Insufficient permissions (ecr:CreateRepository)"
            log_error "  - Repository name conflicts"
            log_error "  - Region-specific issues"
            exit 1
        fi
        
        log_success "ECR repository created: $full_repo_name"
        log_info "Repository features enabled:"
        log_info "  - Image scanning on push"
        log_info "  - AES256 encryption"
    fi
}

# Manage ECR repository
manage_ecr_repository

# Enhanced image tagging with validation
tag_docker_image() {
    echo ""
    log_info "Step 3: Tagging Docker image..."
    
    local source_image="$IMAGE_NAME:latest"
    local target_image="$ECR_URI:$IMAGE_TAG"
    
    log_info "Tagging: $source_image -> $target_image"
    
    if ! docker tag "$source_image" "$target_image"; then
        log_error "Failed to tag Docker image"
        log_error "Source: $source_image"
        log_error "Target: $target_image"
        exit 1
    fi
    
    log_success "Docker image tagged successfully"
}

# Enhanced image pushing
push_docker_image() {
    echo ""
    log_info "Step 4: Pushing image to ECR..."
    
    local target_image="$ECR_URI:$IMAGE_TAG"
    
    log_info "Pushing: $target_image"
    
    # Standard docker push (image already built and tagged)
    if ! docker push "$target_image"; then
        log_error "Failed to push image to ECR"
        log_error "Target: $target_image"
        log_error ""
        log_error "This could be due to:"
        log_error "  - Network connectivity issues"
        log_error "  - ECR repository permissions"
        log_error "  - Image size limits"
        log_error "  - Image not properly tagged"
        exit 1
    fi
    
    log_success "Image pushed successfully to ECR"
}

# Tag and push the image
tag_docker_image
push_docker_image

# Enhanced deployment summary with usage instructions
deployment_summary() {
    echo ""
    echo "🎉 =================================="
    log_success "ECR Deployment Completed Successfully!"
    echo "🎉 =================================="
    echo ""
    
    log_info "Deployment Summary:"
    echo "  📦 Image URI: $ECR_URI:$IMAGE_TAG"
    echo "  🏷️  Image Tag: $IMAGE_TAG"
    echo "  🌍 AWS Region: $AWS_REGION"
    echo "  🏢 AWS Account: $AWS_ACCOUNT_ID"
    echo "  📁 Repository: $ECR_REPOSITORY/$IMAGE_NAME"
    
    if [ -n "${VERSION:-}" ]; then
        echo "  🔖 Version Source: VERSION environment variable ($VERSION)"
    elif [ -n "${PUBLIC_ECR_TAG:-}" ]; then
        echo "  🔖 Version Source: PUBLIC_ECR_TAG environment variable ($PUBLIC_ECR_TAG)"
    fi
    
    echo ""
    log_info "Usage Instructions:"
    echo "  🔧 In CDK/CloudFormation:"
    echo "     Use image URI: $ECR_URI:$IMAGE_TAG"
    echo ""
    echo "  🚀 In AgentCore Runtime:"
    echo "     Set container image to: $ECR_URI:$IMAGE_TAG"
    echo ""
    echo "  📋 For custom deployments:"
    echo "     export CUSTOM_AGENT_IMAGE_URI=\"$ECR_URI:$IMAGE_TAG\""
    echo ""
    
    log_info "Next Steps:"
    echo "  1. Update your CDK stack parameters with the new image URI"
    echo "  2. Deploy your infrastructure: cdk deploy"
    echo "  3. Verify the deployment in AWS Console"
    echo ""
}

# Display deployment summary
deployment_summary