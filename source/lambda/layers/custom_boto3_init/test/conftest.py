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

import pytest
import os


@pytest.fixture(autouse=True)
def aws_credentials():
    """Mocked AWS Credentials and general environment variables as required by python based lambda functions"""
    os.environ["AWS_ACCESS_KEY_ID"] = "fakeId"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "fakeAccessKey"  # nosec B105
    os.environ["AWS_REGION"] = "us-east-1"  # must be a valid region
