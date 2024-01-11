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

# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'cdk synth' output into solution assets.
#   3. Build and synthesize your CDK project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files generated from build
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code template-bucket-name
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package

[ "$DEBUG" == 'true' ] && set -x
set -e

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    echo "Please provide all required parameters for the build script"
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.2.2 template-bucket-name"
    exit 1
fi

bucket_name="$1"
solution_name="$2"
solution_version="$3"
template_bucket_name="$4"

# Get reference for all important folders
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Remove any old dist files from previous runs"
echo "------------------------------------------------------------------------------"
rm -rf $template_dist_dir
mkdir -p $template_dist_dir

rm -rf $build_dist_dir
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "[Init] Install dependencies for the cdk-solution-helper"
echo "------------------------------------------------------------------------------"
cd $template_dir/cdk-solution-helper
npm ci --omit=dev

echo "------------------------------------------------------------------------------"
echo "[Synth] CDK Project"
echo "------------------------------------------------------------------------------"
cd $source_dir/infrastructure

# Important: CDK global version number
cdk_version=$(node ../../deployment/get-cdk-version.js) # Note: grabs from node_modules/aws-cdk-lib/package.json

echo "------------------------------------------------------------------------------"
echo "[Install] Installing CDK $cdk_version"
echo "------------------------------------------------------------------------------"

npm install aws-cdk@$cdk_version

## Option to suppress the Override Warning messages while synthesizing using CDK
export overrideWarningsEnabled=false
echo "setting override warning to $overrideWarningsEnabled"

node_modules/aws-cdk/bin/cdk synth --quiet --asset-metdata false --path-metadata false

if [ $? -ne 0 ]; then
  echo "******************************************************************************"
  echo "cdk-nag found errors"
  echo "******************************************************************************"
  exit 1
fi

echo "------------------------------------------------------------------------------"
echo "[Packing] Template artifacts"
echo "------------------------------------------------------------------------------"
cp $source_dir/infrastructure/cdk.out/*.template.json $template_dist_dir/

for f in $template_dist_dir/*.template.json; do
    mv -- "$f" "${f%.template.json}.template"
done

mv $template_dist_dir/DeploymentPlatformStack.template $template_dist_dir/$solution_name.template

echo $(pwd)
node $template_dir/cdk-solution-helper/index

echo "------------------------------------------------------------------------------"
echo "Updating placeholders"
echo "------------------------------------------------------------------------------"
for file in $template_dist_dir/*.template
do
    replace="s/%%BUCKET_NAME%%/$bucket_name/g"
    sed -i -e $replace $file

    replace="s/%%SOLUTION_NAME%%/$solution_name/g"
    sed -i -e $replace $file

    replace="s/%%VERSION%%/$solution_version/g"
    sed -i -e $replace $file

    replace="s/%%TEMPLATE_BUCKET_NAME%%/$template_bucket_name/g"
    sed -i -e $replace $file
done

echo "------------------------------------------------------------------------------"
echo "[Packing] Source code artifacts"
echo "------------------------------------------------------------------------------"
# ... For each asset.* source code artifact...
cd $source_dir/infrastructure/cdk.out
for d in `find . -mindepth 1 -maxdepth 1 -type d`; do
    # Rename the artifact, removing the period for handler compatibility
    pfname="$(basename -- $d)"
    fname="$(echo $pfname | sed -e 's/\.//g')"
    mv $d $fname

    # Zip artifacts from asset folder
    cd $fname
    zip -q -r ../$fname.zip *
    cd ..

    # Copy the zipped artifact to /regional-s3-assets
    cp $fname.zip $build_dist_dir

    # Remove the copied artifacts from source/infrastructure/cdk.out folder
    rm -rf $fname
    rm $fname.zip
done

echo "---------------------------------------"
echo "Executing Build Complete"
echo "---------------------------------------"

echo "---------------------------------------"
echo "Printing cdk-nag reports"
echo "---------------------------------------"
cd $source_dir/infrastructure/cdk.out
for csv in `find . -name "*.csv"`; do
    echo -e "File: $csv"
    echo "---------------------------------------"
    cat $csv | perl -pe 's/((?<=,)|(?<=^)),/ ,/g;' | column -t -s, | less -S    
done