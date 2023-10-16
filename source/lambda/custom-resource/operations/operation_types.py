#!/usr/bin/env python
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


# list of operation names as constants
COPY_TEMPLATE = "COPY_TEMPLATE"
COPY_SAMPLE_DOCUMENTS = "COPY_SAMPLE_DOCUMENTS"
GEN_UUID = "GEN_UUID"
ANONYMOUS_METRIC = "ANONYMOUS_METRIC"
CW_LOGGROUP_POLICY = "CW_LOG_POLICY"
COPY_WORKFLOW_CONFIG = "COPY_WORKFLOW_CONFIG"
WEBCONFIG = "WEBCONFIG"
COPY_WEB_UI = "COPY_WEB_UI"
UPDATE_BUCKET_POLICY = "UPDATE_BUCKET_POLICY"
COPY_API_KEY = "COPY_API_KEY"
USE_CASE_POLICY = "USE_CASE_POLICY"
ADMIN_POLICY = "ADMIN_POLICY"

# additional constants
RESOURCE_PROPERTIES = "ResourceProperties"
PHYSICAL_RESOURCE_ID = "PhysicalResourceId"
RESOURCE = "Resource"

# status constants
SUCCESS = "SUCCESS"
FAILED = "FAILED"

# S3 copy constants
SOURCE_BUCKET_NAME = "SOURCE_BUCKET_NAME"
SOURCE_PREFIX = "SOURCE_PREFIX"
LOGGING_BUCKET_NAME = "LOGGING_BUCKET_NAME"

# temporary fs provided by the lambda environment
TMP = "/tmp"  # NOSONAR (python:S5443) using lambda's fs storage /tmp # nosec B108
