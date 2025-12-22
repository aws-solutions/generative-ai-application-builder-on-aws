#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Pre-build ECR images for local development
# This script builds ECR images locally when DIST_OUTPUT_BUCKET is not set (local deployments)
# Images are pushed to ECR during the asset staging phase (stage-assets.sh)

[ "$DEBUG" == 'true' ] && set -x
set -e

echo "=== Pre-building ECR Images ==="

# Allow skipping this step for deployments that don't require local ECR image prebuilds (e.g., Phase 1 infra validation).
# Usage:
#   SKIP_ECR_PREBUILD=1 npx cdk deploy ...
if [ "${SKIP_ECR_PREBUILD}" = "1" ] || [ "${SKIP_ECR_PREBUILD}" = "true" ]; then
    echo "⏭️  SKIP_ECR_PREBUILD is set; skipping ECR image pre-build."
    exit 0
fi

# Function to check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    # Check for required tools
    if ! command -v docker >/dev/null 2>&1; then
        missing_tools+=("docker")
    fi
    
    if ! command -v aws >/dev/null 2>&1; then
        missing_tools+=("aws")
    fi
    
    if ! command -v yq >/dev/null 2>&1; then
        missing_tools+=("yq")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo "❌ Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        echo "Please install the missing tools and try again."
        echo "Installation instructions:"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        echo "  - yq: brew install yq (macOS) or https://github.com/mikefarah/yq#install"
        exit 1
    fi
    
    echo "✅ All required tools are available (docker, aws, yq)"
}

# Function to check AWS credentials
check_aws_credentials() {
    echo "Checking AWS credentials..."
    
    # First check if AWS CLI is configured at all
    if ! aws configure list >/dev/null 2>&1; then
        echo ""
        echo "❌ AWS CLI is not configured"
        echo ""
        echo "Please configure AWS credentials using one of the following methods:"
        echo ""
        echo "1. AWS CLI configure:"
        echo "   aws configure"
        echo ""
        echo "2. Environment variables:"
        echo "   export AWS_ACCESS_KEY_ID=your-access-key"
        echo "   export AWS_SECRET_ACCESS_KEY=your-secret-key"
        echo "   export AWS_SESSION_TOKEN=your-session-token  # (if using temporary credentials)"
        echo ""
        echo "3. AWS SSO login:"
        echo "   aws sso login --profile your-profile"
        echo ""
        echo "4. AWS profiles:"
        echo "   export AWS_PROFILE=your-profile-name"
        echo ""
        echo "For more information, see:"
        echo "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html"
        echo ""
        return 1
    fi
    
    # Try to get AWS account ID to verify credentials are active
    local test_output
    test_output=$(aws sts get-caller-identity --query Account --output text 2>&1)
    local aws_exit_code=$?
    
    if [ $aws_exit_code -ne 0 ] || [ -z "$test_output" ] || [[ "$test_output" == *"error"* ]] || [[ "$test_output" == *"Unable to locate credentials"* ]]; then
        echo ""
        echo "❌ AWS credentials are not active or valid"
        echo ""
        echo "Error details:"
        echo "$test_output"
        echo ""
        echo "Common solutions:"
        echo ""
        echo "1. If using AWS SSO, ensure you're logged in:"
        echo "   aws sso login --profile your-profile"
        echo ""
        echo "2. If using temporary credentials, ensure they haven't expired:"
        echo "   aws sts get-caller-identity"
        echo ""
        echo "3. If using AWS profiles, ensure the correct profile is set:"
        echo "   export AWS_PROFILE=your-profile-name"
        echo ""
        echo "4. If using environment variables, ensure they are set and valid:"
        echo "   echo \$AWS_ACCESS_KEY_ID"
        echo "   echo \$AWS_SECRET_ACCESS_KEY"
        echo ""
        echo "5. Test your credentials:"
        echo "   aws sts get-caller-identity"
        echo ""
        echo "For more troubleshooting, see:"
        echo "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-troubleshooting.html"
        echo ""
        return 1
    fi
    
    echo "✅ AWS credentials are active"
    echo "AWS Account ID: $test_output"
    
    # Set the account ID for later use
    AWS_ACCOUNT_ID="$test_output"
    return 0
}


# Check if this is a local deployment (no DIST_OUTPUT_BUCKET)
if [ -z "$DIST_OUTPUT_BUCKET" ]; then
    # Check prerequisites first
    check_prerequisites
    
    # Check AWS credentials early to provide clear error messages
    if ! check_aws_credentials; then
        exit 1
    fi

    echo "Local deployment detected - building ECR images locally"
    
    # Store current directory and determine script location
    execution_dir="$PWD"
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "Execution directory: $execution_dir"
    echo "Script location: $script_dir"
    
    # Define paths relative to script location (source/)
    project_root="$(dirname "$script_dir")"  # One level up from source/
    cdk_json_path="$script_dir/infrastructure/cdk.json"  # source/infrastructure/cdk.json
    solution_manifest_path="$project_root/solution-manifest.yaml"  # project_root/solution-manifest.yaml
    deployment_dir="$project_root/deployment"  # project_root/deployment
    
    # Get version from environment or cdk.json
    if [ -n "$VERSION" ]; then
        IMAGE_TAG="$VERSION"
        echo "Using VERSION environment variable: $IMAGE_TAG"
    else
        # Use script-relative path to cdk.json
        if [ -f "$cdk_json_path" ]; then
            IMAGE_TAG=$(node -p "require('$cdk_json_path').context.solution_version" 2>/dev/null || echo "v4.0.0")
            echo "Using version from $cdk_json_path: $IMAGE_TAG"
        else
            IMAGE_TAG="v4.0.0"
            echo "Using fallback version (cdk.json not found at $cdk_json_path): $IMAGE_TAG"
        fi
    fi
    
    # Sanitize version tag (remove double 'v' prefix if present)
    ORIGINAL_TAG="$IMAGE_TAG"
    IMAGE_TAG=$(echo "$IMAGE_TAG" | sed 's/^vv/v/')
    if [ "$ORIGINAL_TAG" != "$IMAGE_TAG" ]; then
        echo "Sanitized version tag from '$ORIGINAL_TAG' to '$IMAGE_TAG'"
    fi
    
    # Add local suffix for local deployments if not already present
    if [[ "$IMAGE_TAG" != *"-local" ]]; then
        IMAGE_TAG="${IMAGE_TAG}-local"
        echo "Added local suffix to version tag: $IMAGE_TAG"
    fi
    
    echo "Final image tag: $IMAGE_TAG"
    
    # AWS credentials already checked and AWS_ACCOUNT_ID is set
    
    # Get AWS region from environment or AWS CLI config
    AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo 'us-east-1')}"
    echo "AWS Region: $AWS_REGION"
    
    # Function to validate requirements.txt before build
    validate_requirements() {
        local image_dir="$1"
        local image_name="$2"
        
        echo "Validating requirements.txt for $image_name..."
        
        # Check if pyproject.toml exists (indicates UV workflow)
        if [ -f "$image_dir/pyproject.toml" ]; then
            echo "✅ Found pyproject.toml - UV workflow available"
            
            # Check if requirements.txt exists
            if [ ! -f "$image_dir/requirements.txt" ]; then
                echo "⚠️  requirements.txt not found - will be generated during build"
                return 0
            fi
            
            # Check if requirements.txt is newer than pyproject.toml
            if [ "$image_dir/pyproject.toml" -nt "$image_dir/requirements.txt" ]; then
                echo "⚠️  pyproject.toml is newer than requirements.txt - will be regenerated during build"
                return 0
            fi
            
            echo "✅ requirements.txt is current"
        else
            # Traditional pip workflow - requirements.txt must exist
            if [ ! -f "$image_dir/requirements.txt" ]; then
                echo "❌ requirements.txt not found and no pyproject.toml available"
                return 1
            fi
            echo "✅ Found requirements.txt for traditional pip workflow"
        fi
        
        return 0
    }

    # List of common directories to copy into each image directory before build
    # Add more common directories here as needed
    COMMON_DIRS=(
        "gaab-strands-common"
    )
    
    # Function to copy common directories into image directory
    copy_common_dirs() {
        local image_dir="$1"
        local image_name="$2"
        
        echo "Copying common directories into $image_name..."
        
        for common_dir in "${COMMON_DIRS[@]}"; do
            local source_path="$deployment_dir/ecr/$common_dir"
            local dest_path="$image_dir/$common_dir"
            
            # Check if common directory exists
            if [ ! -d "$source_path" ]; then
                echo "⚠️  Common directory not found: $source_path - skipping"
                continue
            fi
            
            # Remove existing common directory if present
            if [ -d "$dest_path" ]; then
                echo "  Removing existing $common_dir directory..."
                rm -rf "$dest_path"
            fi
            
            # Copy common directory
            echo "  Copying $common_dir..."
            cp -r "$source_path" "$dest_path"
            if [ $? -ne 0 ]; then
                echo "❌ Failed to copy $common_dir to $image_dir"
                return 1
            fi
            
            echo "  ✅ Copied $common_dir"
        done
        
        return 0
    }
    
    # Function to build ECR image locally (no push)
    build_ecr_image_local() {
        local image_dir="$1"
        local image_name="$2"
        
        echo ""
        echo "=== Building $image_name locally ==="
        
        # Check if image directory exists
        if [ ! -d "$image_dir" ]; then
            echo "⚠️  Image directory not found: $image_dir - skipping $image_name"
            return 0
        fi
        
        # Copy common directories before build
        if ! copy_common_dirs "$image_dir" "$image_name"; then
            echo "❌ Failed to copy common directories for $image_name"
            return 1
        fi
        
        # Navigate to image directory
        cd "$image_dir"
        
        # Validate requirements before build
        if ! validate_requirements "$image_dir" "$image_name"; then
            echo "❌ Requirements validation failed for $image_name"
            cd "$execution_dir"
            return 1
        fi
        
        # Check if build script exists
        if [ ! -f "scripts/build-container.sh" ]; then
            echo "❌ Build script not found: $image_dir/scripts/build-container.sh"
            cd "$execution_dir"
            return 1
        fi
        
        # Build the container locally only
        echo "Building container locally..."
        ./scripts/build-container.sh
        if [ $? -ne 0 ]; then
            echo "❌ Failed to build $image_name container"
            cd "$execution_dir"
            return 1
        fi
        
        echo "✅ Successfully built $image_name:latest locally"
        echo "ℹ️  Image will be pushed to ECR during asset staging phase"
        
        # Return to execution directory
        cd "$execution_dir"
        return 0
    }
    
    # Function to get container images from solution manifest
    get_container_images() {
        # Check if yq is available for YAML parsing
        if ! command -v yq >/dev/null 2>&1; then
            echo "❌ Error: yq is not installed or not in PATH"
            echo ""
            echo "yq is required to parse the solution-manifest.yaml file."
            echo "Please install yq using one of the following methods:"
            echo ""
            echo "  macOS (Homebrew):"
            echo "    brew install yq"
            echo ""
            echo "  macOS (MacPorts):"
            echo "    sudo port install yq"
            echo ""
            echo "  Ubuntu/Debian:"
            echo "    sudo apt install yq"
            echo ""
            echo "  CentOS/RHEL/Fedora:"
            echo "    sudo yum install yq"
            echo ""
            echo "  Manual installation:"
            echo "    https://github.com/mikefarah/yq#install"
            echo ""
            echo "After installation, please run this script again."
            exit 1
        fi
        
        # Use script-relative path to solution manifest
        local manifest_path="$solution_manifest_path"
        if [ ! -f "$manifest_path" ]; then
            echo "❌ Error: solution-manifest.yaml not found at $manifest_path"
            echo "Script directory: $script_dir"
            echo "Project root: $project_root"
            echo "Please ensure the solution-manifest.yaml file exists at the project root"
            exit 1
        fi
        if [ ! -f "$manifest_path" ]; then
            echo "❌ Error: solution-manifest.yaml not found at $manifest_path"
            echo "Current directory: $(pwd)"
            echo "Expected location: $(realpath $manifest_path 2>/dev/null || echo $manifest_path)"
            echo "Please ensure the solution-manifest.yaml file exists at the project root"
            exit 1
        fi
        

        
        # Use yq to parse YAML and extract container images with timeout
        local images
        local yq_exit_code
        
        # Add timeout to prevent hanging
        if command -v timeout >/dev/null 2>&1; then
            images=$(timeout 10 yq eval '.container_images[]' "$manifest_path" 2>&1)
            yq_exit_code=$?
        else
            images=$(yq eval '.container_images[]' "$manifest_path" 2>&1)
            yq_exit_code=$?
        fi
        

        
        if [ $yq_exit_code -ne 0 ]; then
            echo "❌ Error: Failed to parse solution-manifest.yaml with yq"
            echo "yq command: yq eval '.container_images[]' $manifest_path"
            echo "yq output: $images"
            echo "Please check that the file is valid YAML and contains a 'container_images' section"
            
            # Show the relevant section of the YAML file for debugging
            echo ""
            echo "Relevant section of solution-manifest.yaml:"
            grep -A 5 -B 2 "container_images" "$manifest_path" || echo "container_images section not found"
            exit 1
        fi
        

        echo "$images"
    }
    
    # Get container images from solution manifest
    echo "Parsing container images from solution-manifest.yaml..."
    container_images=$(get_container_images)
    
    if [ -z "$container_images" ]; then
        echo "❌ No container images found in solution manifest"
        echo "Expected to find container_images section in solution-manifest.yaml"
        exit 1
    fi
    
    echo ""
    echo "Container images to build (from solution-manifest.yaml):"
    echo "$container_images" | while read -r image; do
        if [ -n "$image" ]; then
            echo "  - $image"
        fi
    done
    
    # Build and push each container image
    echo ""
    echo "=== Starting Container Image Builds ==="
    
    overall_success=true
    built_images=()
    skipped_images=()
    
    while IFS= read -r image_name; do
        if [ -n "$image_name" ]; then
            echo ""
            echo "Processing $image_name image..."
            
            # Use script-relative path to deployment directory
            image_dir="$deployment_dir/ecr/$image_name"
            
            # Check if image directory exists
            if [ ! -d "$image_dir" ]; then
                echo "⚠️  Image directory not found: $image_dir - skipping $image_name"
                skipped_images+=("$image_name")
                continue
            fi
            
            # Check if image directory exists
            if [ ! -d "$image_dir" ]; then
                echo "⚠️  Image directory not found: $image_dir - skipping $image_name"
                skipped_images+=("$image_name")
                continue
            fi
            
            # Build the image locally
            if build_ecr_image_local "$image_dir" "$image_name"; then
                built_images+=("$image_name")
                echo "✅ Successfully processed $image_name"
            else
                echo "❌ Failed to process $image_name"
                overall_success=false
            fi
        fi
    done <<< "$container_images"
    
    # Summary
    echo ""
    echo "=== ECR Image Build Summary ==="
    
    # Display built images
    if [ ${#built_images[@]} -gt 0 ]; then
        echo "Successfully built images locally:"
        for image_name in "${built_images[@]}"; do
            echo "✅ $image_name: BUILT LOCALLY"
            echo "   Local image: $image_name:latest"
            echo "   Will be pushed during asset staging to: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$image_name:$IMAGE_TAG"
        done
    fi
    
    # Display skipped images
    if [ ${#skipped_images[@]} -gt 0 ]; then
        echo ""
        echo "Skipped images (directories not found):"
        for image_name in "${skipped_images[@]}"; do
            echo "⚠️  $image_name: SKIPPED ($deployment_dir/ecr/$image_name not found)"
        done
    fi
    
    # Check if at least one image was built successfully
    if [ ${#built_images[@]} -eq 0 ]; then
        echo ""
        echo "❌ No ECR images were built successfully - CDK deployment cannot proceed"
        echo "Please check the error messages above and ensure:"
        echo "  1. Docker is running and accessible"
        echo "  2. Container image directories exist in $deployment_dir/ecr/"
        echo "  3. Build scripts are executable and working"
        exit 1
    fi
    
    echo ""
    if [ "$overall_success" = true ]; then
        echo "✅ ECR images built locally successfully"
        echo "ℹ️  Images will be pushed to ECR during the asset staging phase"
        echo "ℹ️  Run './stage-assets.sh' to push images to ECR and stage CloudFormation assets"
    else
        echo "⚠️  Some ECR images failed to build, but at least one succeeded"
        echo "ℹ️  CDK synthesis can proceed with available images"
    fi
    
else
    echo "Pipeline deployment detected (DIST_OUTPUT_BUCKET is set) - skipping local ECR image build"
    echo "ECR images will be resolved via pull-through cache from aws-solutions public ECR repository"
fi

echo "=== Pre-build ECR Images Complete ==="