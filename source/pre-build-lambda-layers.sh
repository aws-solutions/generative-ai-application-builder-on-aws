#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

[ "$DEBUG" == 'true' ] && set -x
set -e

echo "------------------------------------------"
echo "Script executing from: ${PWD}"
echo "------------------------------------------"

# Write custom instructions to pre-build lambda layers to use in lambda functions

execution_dir="$PWD"
node_usr_agent_layer="$execution_dir/../lambda/layers/aws-node-user-agent-config"
aws_sdk_lib_layer="$execution_dir/../lambda/layers/aws-sdk-lib"

build_sdk_lib_layer() {
    sdk_lib=$1

    echo "-----------------------------------------"
    echo "Current directory is: ${PWD}". Running install
    echo "-----------------------------------------"    

    cd $sdk_lib
    npm install

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