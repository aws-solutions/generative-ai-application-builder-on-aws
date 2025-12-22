#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

[ "$DEBUG" == 'true' ] && set -x
set -e

echo "------------------------------------------"
echo "Script executing from: ${PWD}"
echo "------------------------------------------"

# Write custom instructions to pre-build lambda layers to use in lambda functions

# Always resolve paths relative to this script's location (so it works when invoked from CDK)
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
execution_dir="$script_dir"

# In this repo, lambda layers live under source/lambda/layers
node_usr_agent_layer="$execution_dir/lambda/layers/aws-node-user-agent-config"
aws_sdk_lib_layer="$execution_dir/lambda/layers/aws-sdk-lib"

build_sdk_lib_layer() {
    sdk_lib=$1

    echo "-----------------------------------------"
    echo "Current directory is: ${PWD}". Running install
    echo "-----------------------------------------"    

    cd $sdk_lib
    npm install
    npm run build

    cd $execution_dir
    echo "-----------------------------------------"
    echo "complete install $sdk_lib"
    echo "-----------------------------------------"    
}

build_custom_lib_layer() {
    layer_folder=$1

    cd $layer_folder

    echo "-----------------------------------------"
    echo "Current directory is: ${PWD}". Running build
    echo "-----------------------------------------"

    npm install
    npm run build

    echo "-----------------------------------------"
    echo "Build complete $layer_folder"
    echo "-----------------------------------------"
    
    cd $execution_dir     
}

build_sdk_lib_layer $aws_sdk_lib_layer
build_custom_lib_layer $node_usr_agent_layer