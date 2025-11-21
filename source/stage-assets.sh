#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# CDK Asset Staging Script
# 
# This script stages CDK assets (zip files and CloudFormation templates) to S3 for deployment.
# 
# New Features:
# - Skip existing assets: Use --skip-existing to avoid re-uploading assets that already exist
# - Check old assets: Use --check-old-assets to analyze bucket for old duplicate assets
# - Templates are always uploaded and overwritten regardless of skip mode
#
# Usage Examples:
#   ./stage-assets.sh                    # Normal staging (default)
#   ./stage-assets.sh --skip-existing    # Skip existing assets for faster staging  
#   ./stage-assets.sh --check-old-assets # Check for old duplicate assets only

[ "$DEBUG" == 'true' ] && set -x
set -e

echo "This script should be run from the 'source' folder"

# Configuration flags
SKIP_EXISTING_ASSETS=${SKIP_EXISTING_ASSETS:-false}
CHECK_OLD_ASSETS=${CHECK_OLD_ASSETS:-false}
ECR_ONLY=${ECR_ONLY:-false}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Stage CDK assets to S3 bucket for deployment"
    echo ""
    echo "Options:"
    echo "  --skip-existing     Skip uploading assets that already exist in S3 (faster staging)"
    echo "  --check-old-assets  Check for old duplicate assets (over 30 days old)"
    echo "  --ecr-only          Skip CDK asset uploads and only push ECR images"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SKIP_EXISTING_ASSETS=true   Same as --skip-existing"
    echo "  CHECK_OLD_ASSETS=true       Same as --check-old-assets"
    echo "  ECR_ONLY=true               Same as --ecr-only"
    echo ""
    echo "Examples:"
    echo "  $0                          # Normal staging (default behavior)"
    echo "  $0 --skip-existing          # Skip existing assets for faster staging"
    echo "  $0 --check-old-assets       # Check for old duplicate assets only"
    echo "  $0 --ecr-only               # Skip CDK assets, only push ECR images"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-existing)
            SKIP_EXISTING_ASSETS=true
            shift
            ;;
        --check-old-assets)
            CHECK_OLD_ASSETS=true
            shift
            ;;
        --ecr-only)
            ECR_ONLY=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Show current configuration
echo ""
echo "Configuration:"
echo "  Skip existing assets: $SKIP_EXISTING_ASSETS"
echo "  Check old assets only: $CHECK_OLD_ASSETS"
echo "  ECR images only: $ECR_ONLY"
echo ""

# Function to check if an S3 object exists
check_s3_object_exists() {
    local bucket="$1"
    local key="$2"
    local region="$3"
    
    aws s3api head-object --bucket "$bucket" --key "$key" --region "$region" >/dev/null 2>&1
}

# Function to get S3 object last modified date
get_s3_object_age_days() {
    local bucket="$1"
    local key="$2"
    local region="$3"
    
    local last_modified
    last_modified=$(aws s3api head-object --bucket "$bucket" --key "$key" --region "$region" --query 'LastModified' --output text 2>/dev/null)
    
    if [ -n "$last_modified" ]; then
        # Convert to epoch and calculate days difference
        local last_modified_epoch
        last_modified_epoch=$(date -d "$last_modified" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${last_modified%.*}" +%s 2>/dev/null)
        local current_epoch
        current_epoch=$(date +%s)
        local age_seconds=$((current_epoch - last_modified_epoch))
        local age_days=$((age_seconds / 86400))
        echo "$age_days"
    else
        echo "-1"
    fi
}

# Function to get container images from solution manifest
get_container_images() {
    # Check if yq is available for YAML parsing
    if ! command -v yq >/dev/null 2>&1; then
        echo "❌ Error: yq is not installed or not in PATH"
        echo "Please install yq to parse the solution manifest file:"
        echo "  - macOS: brew install yq"
        echo "  - Ubuntu/Debian: sudo apt install yq"
        echo "  - Other: https://github.com/mikefarah/yq#install"
        exit 1
    fi
    
    # Use yq to parse YAML
    if [ ! -f "../solution-manifest.yaml" ]; then
        echo "❌ Error: solution-manifest.yaml not found"
        exit 1
    fi
    
    yq eval '.container_images[]' ../solution-manifest.yaml 2>/dev/null
}

# Global configuration
root_folder=infrastructure/cdk.out
exclude_stack="DeploymentPlatformStack.assets.json"
bucket_prefix="cdk-hnb659fds-assets-"
MAX_PARALLEL=${MAX_PARALLEL:-8}



# Function to upload zip artifacts
upload_zip_artifacts() {
    local asset_file="$1"

    echo -e "\nZipping and uploading assets for packaging type zip..."
    
    # Get zip artifacts, handling different destination key formats
    local zip_files
    zip_files=$(jq -r '[.files | to_entries[] | .value | select(.source.packaging == "zip") | (.destinations | to_entries[0].value.objectKey)] | .[]' "$asset_file" 2>/dev/null)
    
    if [ -z "$zip_files" ] || [ "$zip_files" = "null" ]; then
        echo "No zip artifacts found in $asset_file"
        return 0
    fi
    
    echo "$zip_files" | while read -r zip_filename; do
        if [ -n "$zip_filename" ] && [ "$zip_filename" != "null" ]; then
            folder_name=$(echo "$zip_filename" | sed 's/.zip//g' | awk '{print "asset."$1}') # remove ".zip" and prepend "asset"
            
            # Check if we should skip existing assets
            if [ "$SKIP_EXISTING_ASSETS" = "true" ]; then
                if check_s3_object_exists "$bucket_name" "$zip_filename" "$region"; then
                    echo "Skipping existing zip asset: $zip_filename"
                    continue
                fi
            fi
            
            echo "Uploading zip: $zip_filename from $folder_name"
            
            if [ -d "$root_folder/$folder_name" ]; then
                cd "$root_folder/$folder_name"
                zip -rq - . | aws s3 cp --region "$region" - "s3://$bucket_name/$zip_filename" 
                cd - > /dev/null
                echo "Completed zip: $zip_filename"
            else
                echo "Warning: Asset folder not found: $root_folder/$folder_name"
            fi
        fi
    done
}

# Function to upload root templates
upload_root_template() {
    local asset_file="$1"

    echo -e "\nUploading root templates..."
    
    # Get root template files (non-nested)
    local root_templates
    root_templates=$(jq -r '[.files | to_entries[] | .value | select(.source.packaging == "file") | select(.source.path | contains("nested") | not) | .source.path] | .[]' "$asset_file" 2>/dev/null)
    
    if [ -z "$root_templates" ] || [ "$root_templates" = "null" ]; then
        echo "No root templates found in $asset_file"
        return 0
    fi
    
    echo "$root_templates" | while read -r template_name; do
        if [ -n "$template_name" ] && [ "$template_name" != "null" ]; then
            # Templates are always uploaded and overwritten
            echo "Uploading root template: $template_name (always overwrite)"
            if [ -f "$root_folder/$template_name" ]; then
                aws s3 cp --quiet --region "$region" "$root_folder/$template_name" "s3://$bucket_name/$template_name"
                echo "Completed root template: $template_name"
            else
                echo "Warning: Template file not found: $root_folder/$template_name"
            fi
        fi
    done
}

# Function to upload nested templates
upload_nested_templates() {
    local asset_file="$1"

    echo -e "\nUploading nested templates..."
    
    # Get nested template files with their hash names
    local nested_templates
    nested_templates=$(jq -c '[.files | to_entries[] | .value | select(.source.packaging == "file") | select(.source.path | contains("nested")) | {filename: .source.path, objectKey: (.destinations | to_entries[0].value.objectKey)}] | .[]' "$asset_file" 2>/dev/null)
    
    if [ -z "$nested_templates" ] || [ "$nested_templates" = "null" ]; then
        echo "No nested templates found in $asset_file"
        return 0
    fi
    
    echo "$nested_templates" | while read -r template_obj; do
        if [ -n "$template_obj" ] && [ "$template_obj" != "null" ]; then
            template_name=$(echo "$template_obj" | jq -r '.filename')
            hash_file_name=$(echo "$template_obj" | jq -r '.objectKey')
            
            if [ -n "$template_name" ] && [ "$template_name" != "null" ] && [ -n "$hash_file_name" ] && [ "$hash_file_name" != "null" ]; then
                # Templates are always uploaded and overwritten
                echo "Uploading nested template: $template_name as $hash_file_name (always overwrite)"
                if [ -f "$root_folder/$template_name" ]; then
                    aws s3 cp --quiet --region "$region" "$root_folder/$template_name" "s3://$bucket_name/$hash_file_name"
                    echo "Completed nested template: $template_name"
                else
                    echo "Warning: Nested template file not found: $root_folder/$template_name"
                fi
            fi
        fi
    done
}

# Function to check for old duplicate assets
check_old_assets() {
    local region="$1"
    local bucket_name="$2"
    local age_threshold_days=${3:-30}  # Default to 30 days
    
    echo ""
    echo "##################################################"
    echo "Checking for old duplicate assets (older than $age_threshold_days days)"
    echo "##################################################"
    
    # List all objects in the bucket
    local all_objects
    all_objects=$(aws s3api list-objects-v2 --bucket "$bucket_name" --region "$region" --query 'Contents[].{Key:Key,LastModified:LastModified}' --output json 2>/dev/null)
    
    if [ -z "$all_objects" ] || [ "$all_objects" = "null" ]; then
        echo "No objects found in bucket or bucket doesn't exist"
        return 0
    fi
    
    # Group objects by base name (without hash) and check for duplicates
    local temp_file="/tmp/asset_analysis.json"
    echo "$all_objects" > "$temp_file"
    
    # Find potential duplicates (objects with similar names but different hashes)
    local old_assets_found=false
    
    echo "Analyzing assets for potential duplicates..."
    
    # Extract unique base patterns (remove hash suffixes)
    jq -r '.[].Key' "$temp_file" | while read -r key; do
        # Skip template files as they're always overwritten
        if [[ "$key" == *.template.json ]] || [[ "$key" == *.template.yaml ]]; then
            continue
        fi
        
        # For zip files, extract base name without hash
        if [[ "$key" == *.zip ]]; then
            base_name=$(echo "$key" | sed -E 's/^[a-f0-9]{64}\.zip$/asset.zip/' | sed -E 's/^asset\.([a-f0-9]{64})\.zip$/asset.zip/')
            
            # Find all objects with similar pattern
            similar_objects=$(jq -r --arg pattern ".*\.zip$" '.[] | select(.Key | test($pattern)) | .Key' "$temp_file")
            
            if [ $(echo "$similar_objects" | wc -l) -gt 1 ]; then
                echo ""
                echo "Found multiple zip assets (potential duplicates):"
                echo "$similar_objects" | while read -r similar_key; do
                    age_days=$(get_s3_object_age_days "$bucket_name" "$similar_key" "$region")
                    if [ "$age_days" -gt "$age_threshold_days" ]; then
                        echo "  🔴 OLD: $similar_key (${age_days} days old)"
                        old_assets_found=true
                    else
                        echo "  🟢 NEW: $similar_key (${age_days} days old)"
                    fi
                done
            fi
        fi
    done
    
    rm -f "$temp_file"
    
    if [ "$old_assets_found" = "true" ]; then
        echo ""
        echo "⚠️  Found old assets that may be duplicates."
        echo "Consider cleaning up assets older than $age_threshold_days days to save storage costs."
        echo ""
        echo "To clean up old assets, you can run:"
        echo "aws s3api list-objects-v2 --bucket $bucket_name --region $region --query 'Contents[?LastModified<\`$(date -d \"$age_threshold_days days ago\" -Iseconds)\`].Key' --output text | xargs -I {} aws s3 rm s3://$bucket_name/{}"
    else
        echo ""
        echo "✅ No old duplicate assets found."
    fi
}

# Process all asset files
upload_all_assets() {
    echo ""
    echo "##################################################"
    echo "Uploading CDK Assets"
    echo "##################################################"
    
    for asset_file in $(find "$root_folder" -name "*.assets.json" ! -name "$exclude_stack"); do
        echo ""
        echo "##################################################"
        echo "Parsing asset file $asset_file"
        echo "##################################################"
        
        upload_zip_artifacts "$asset_file"
        
        echo -e "\nUpload of zip assets complete. Now uploading templates\n"
        
        upload_root_template "$asset_file"
        upload_nested_templates "$asset_file"
        
        echo -e "\nUploading templates complete for $asset_file\n"
    done
    
    echo "All CDK assets uploaded successfully!"
}

# Helper functions for main execution
get_user_confirmation() {
    local bucket_name="$1"
    
    if [ "$ECR_ONLY" = "true" ]; then
        echo "ECR images will be pushed to account ${aws_account_id} in region ${region}"
        echo "Mode: ECR images only (skipping CDK assets)"
    else
        echo "All assets will be uploaded to ${bucket_name}"
        if [ "$SKIP_EXISTING_ASSETS" = "true" ]; then
            echo "Mode: Skip existing assets (faster staging)"
        else
            echo "Mode: Overwrite all assets (default behavior)"
        fi
        echo "Parallel uploads: ${MAX_PARALLEL} (set MAX_PARALLEL env var to change)"
    fi
    
    while true; do
        read -p "Do you want to proceed? (y/n) " yn
        case $yn in 
            [yY] ) echo -e "Proceeding to upload\n"
                return 0;;
            [nN] ) echo "Exiting"
                return 1;;
            * ) echo "Invalid response";;
        esac
    done
}

get_region_and_account() {
    local default_region
    default_region=$(aws configure get region)
    
    echo "The region to upload CDK artifacts to (default:$default_region)?"
    read region
    region="${region:=$default_region}"
    
    aws_account_id=$(aws sts get-caller-identity --query "Account" --output text)
    bucket_name="${bucket_prefix}${aws_account_id}-${region}"
}

# CDK Asset Upload Functions (called from main)

# ECR Image Staging Functions
get_solution_version() {
    # Get version from VERSION environment variable or cdk.json
    if [ -n "$VERSION" ]; then
        echo "$VERSION"
    else
        # Extract version from cdk.json
        node -p "require('./infrastructure/cdk.json').context.solution_version" 2>/dev/null || echo "v4.0.0"
    fi
}

sanitize_version_tag() {
    local version="$1"
    local deployment_mode="$2"
    
    # Remove double 'v' prefix if present (e.g., vv4.0.0 -> v4.0.0)
    local clean_version=$(echo "$version" | sed 's/^vv/v/')
    
    # Add local suffix for local deployments if not already present
    if [[ "$deployment_mode" == "local" && "$clean_version" != *"-local" ]]; then
        clean_version="${clean_version}-local"
    fi
    
    echo "$clean_version"
}

check_ecr_repository() {
    local repo_name="$1"
    local region="$2"
    
    echo "Checking ECR repository: $repo_name"
    
    if aws ecr describe-repositories --repository-names "$repo_name" --region "$region" >/dev/null 2>&1; then
        echo "✅ ECR repository exists: $repo_name"
        return 0
    else
        echo "Creating ECR repository: $repo_name"
        if aws ecr create-repository --repository-name "$repo_name" --region "$region" >/dev/null 2>&1; then
            echo "✅ ECR repository created: $repo_name"
            return 0
        else
            echo "❌ Failed to create ECR repository: $repo_name"
            return 1
        fi
    fi
}

build_ecr_image() {
    local image_name="$1"
    local ecr_dir="../deployment/ecr/$image_name"
    
    echo "Building ECR image: $image_name"
    
    if [ ! -d "$ecr_dir" ]; then
        echo "❌ ECR directory not found: $ecr_dir"
        return 1
    fi
    
    # Navigate to ECR directory and build
    cd "$ecr_dir"
    
    if [ -f "scripts/build-container.sh" ]; then
        echo "Running build script for $image_name..."
        if ./scripts/build-container.sh; then
            echo "✅ Build completed for $image_name"
            cd - >/dev/null
            return 0
        else
            echo "❌ Build failed for $image_name"
            cd - >/dev/null
            return 1
        fi
    else
        echo "❌ Build script not found: $ecr_dir/scripts/build-container.sh"
        cd - >/dev/null
        return 1
    fi
}

push_ecr_image() {
    local image_name="$1"
    local version_tag="$2"
    local region="$3"
    local account_id="$4"
    
    echo "Pushing ECR image: $image_name:$version_tag"
    
    # ECR login
    echo "Logging into ECR..."
    if ! aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$account_id.dkr.ecr.$region.amazonaws.com"; then
        echo "❌ ECR login failed"
        return 1
    fi
    
    # Check if ECR repository exists, create if not
    if ! check_ecr_repository "$image_name" "$region"; then
        return 1
    fi
    
    # Tag and push image
    local ecr_uri="$account_id.dkr.ecr.$region.amazonaws.com/$image_name"
    
    echo "Tagging image: $image_name:latest -> $ecr_uri:$version_tag"
    if ! docker tag "$image_name:latest" "$ecr_uri:$version_tag"; then
        echo "❌ Failed to tag image"
        return 1
    fi
    
    echo "Pushing image to ECR: $ecr_uri:$version_tag"
    if docker push "$ecr_uri:$version_tag"; then
        echo "✅ Successfully pushed: $ecr_uri:$version_tag"
        return 0
    else
        echo "❌ Failed to push image to ECR"
        return 1
    fi
}

stage_ecr_images() {
    local region="$1"
    local account_id="$2"
    
    echo ""
    echo "##################################################"
    echo "Staging ECR Images"
    echo "##################################################"
    
    # Determine deployment mode (local if DIST_OUTPUT_BUCKET is not set)
    local deployment_mode="local"
    if [ -n "$DIST_OUTPUT_BUCKET" ]; then
        deployment_mode="pipeline"
    fi
    
    # Get and sanitize version
    local raw_version
    raw_version=$(get_solution_version)
    local version_tag
    version_tag=$(sanitize_version_tag "$raw_version" "$deployment_mode")
    
    echo "Deployment mode: $deployment_mode"
    echo "Using version tag: $version_tag"
    echo "Target region: $region"
    echo "Target account: $account_id"
    
    # Get container images from solution manifest
    local container_images
    container_images=$(get_container_images)
    
    if [ -z "$container_images" ]; then
        echo "❌ No container images found in solution manifest"
        return 1
    fi
    
    echo ""
    echo "Container images to process:"
    echo "$container_images" | while read -r image; do
        echo "  - $image"
    done
    
    local success=true
    local staged_images=()
    
    # Process each container image
    echo "$container_images" | while read -r image_name; do
        if [ -n "$image_name" ]; then
            echo ""
            echo "--- Processing Image: $image_name ---"
            
            local ecr_dir="../deployment/ecr/$image_name"
            if [ -d "$ecr_dir" ]; then
                if build_ecr_image "$image_name"; then
                    if push_ecr_image "$image_name" "$version_tag" "$region" "$account_id"; then
                        staged_images+=("$account_id.dkr.ecr.$region.amazonaws.com/$image_name:$version_tag")
                    else
                        success=false
                    fi
                else
                    success=false
                fi
            else
                echo "⚠️  ECR directory not found: $ecr_dir"
                echo "Skipping $image_name image staging"
            fi
        fi
    done
    
    # Check final success status
    if [ "$success" = true ]; then
        echo ""
        echo "✅ ECR image staging completed successfully"
        echo ""
        echo "Staged Image URIs:"
        echo "$container_images" | while read -r image_name; do
            if [ -n "$image_name" ] && [ -d "../deployment/ecr/$image_name" ]; then
                echo "  $image_name: $account_id.dkr.ecr.$region.amazonaws.com/$image_name:$version_tag"
            fi
        done
        echo ""
        return 0
    else
        echo ""
        echo "❌ ECR image staging failed"
        return 1
    fi
}

# Main function
main() {
    # Get region and account information
    get_region_and_account
    
    # Handle check-old-assets mode
    if [ "$CHECK_OLD_ASSETS" = "true" ]; then
        echo "Checking for old duplicate assets in ${bucket_name}"
        check_old_assets "$region" "$bucket_name" 30
        return 0
    fi
    
    # Handle ECR-only mode
    if [ "$ECR_ONLY" = "true" ]; then
        # Get user confirmation to proceed
        if ! get_user_confirmation "$bucket_name"; then
            return 0
        fi
        
        # Stage ECR images only
        if ! stage_ecr_images "$region" "$aws_account_id"; then
            echo "❌ ECR image staging failed"
            return 1
        fi
        
        echo "ECR image staging complete"
        return 0
    fi
    
    # Get user confirmation to proceed
    if ! get_user_confirmation "$bucket_name"; then
        return 0
    fi
    
    # Upload CDK assets
    upload_all_assets
    echo "CDK assets staging complete"
    
    # Stage ECR images
    if ! stage_ecr_images "$region" "$aws_account_id"; then
        echo "❌ ECR image staging failed, aborting asset staging"
        return 1
    fi
    
    echo "All stacks complete"
    return 0
}

# Execute main function
main "$@"
