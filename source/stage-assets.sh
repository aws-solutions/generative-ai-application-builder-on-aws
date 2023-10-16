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

echo "This script should be run from the 'source' folder"

root_folder=infrastructure/cdk.out
exclude_stack="DeploymentPlatformStack.assets.json"

# CDK staging bucket
bucket_prefix="cdk-hnb659fds-assets-"
default_region=`aws configure get region`

# Confirm the region
echo "The region to upload CDK artifacts to (default:$default_region)?"
read region
region="${region:=$default_region}"

# Get the account id
aws_account_id=$(aws sts get-caller-identity --query "Account" --output text)

bucket_name="${bucket_prefix}${aws_account_id}-${region}"
echo "All assets will be uploaded to ${bucket_name}"

while true; do
    read -p "Do you want to proceed? (y/n) " yn
    case $yn in 
        [yY] ) echo -e "Proceeding to upload\n"
    		break;;
        [nN] ) echo exiting;
		    exit;;
        * ) echo invalid response;;
    esac
done

upload_zip_artifacts() {
    asset_file=$1

    echo -e "\nZipping and uploading assets for packaging type zip..."
    jq '[.files | to_entries | .[].value | {packaging: .source.packaging, filename:.destinations."current_account-current_region".objectKey}] | map(select(.packaging == "zip")) | .[].filename' $asset_file | while read object; do
        zip_filename=$(echo $object | sed 's/"//g') # string off quotes (")
        folder_name=$(echo $zip_filename | sed 's/.zip//g' | awk '{print "asset."$1}') # remove ".zip" to ass prepend "asset"
        cd $root_folder/$folder_name
        echo "$folder_name"
        zip -rq - . | aws s3 cp --region $region - s3://$bucket_name/$zip_filename 
        cd ~-
    done
}

upload_root_template() {
    asset_file=$1

    jq '[.files | to_entries | .[].value | {packaging: .source.packaging, filename:.source.path}] | map(select(.packaging == "file")) | map(select(.filename | contains("nested") | not)) | .[].filename' $asset_file | while read object; do
        template_name=$(echo $object | sed 's/"//g')
        echo "$template_name"
        aws s3 cp --quiet --region $region $root_folder/$template_name s3://$bucket_name/$template_name
    done
}

upload_nested_templates() {
    asset_file=$1

    jq '[.files | to_entries | .[].value | {packaging: .source.packaging, filename:.source.path, objectKey:.destinations."current_account-current_region".objectKey}] | map(select(.packaging == "file")) | map(select(.filename | contains("nested")))' $asset_file | jq -c '.[]' | while read object; do
        template_name=$(echo $object | jq '.filename' | sed 's/"//g')
        hash_file_name=$(echo $object | jq '.objectKey' | sed 's/"//g')
        echo "$template_name"
        aws s3 cp --quiet --region $region $root_folder/$template_name s3://$bucket_name/$hash_file_name
    done
}


for y in `find $root_folder/* -name "*.assets.json" ! -name $exclude_stack`; do
    echo "##################################################"
    echo "Parsing asset file $y"
    echo "##################################################"
    upload_zip_artifacts $y # upload zip artifacts

    echo -e "\nUpload of zip assets complete. Now uploading templates\n"

    upload_root_template $y # upload root template
    upload_nested_templates $y # upload nested template
   
    echo -e "\nUploading templates complete\n"
done

echo "All stacks complete"
