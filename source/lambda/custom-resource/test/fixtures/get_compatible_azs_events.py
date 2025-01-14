#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from operations import operation_types
from operations.get_compatible_azs import MAX_AZS, REQUIRED_SERVICE_NAMES
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES


@pytest.fixture()
def get_compatible_azs_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.GET_COMPATIBLE_AZS}
    custom_resource_event[RESOURCE_PROPERTIES][REQUIRED_SERVICE_NAMES] = ",".join(
        ["com.amazonaws.us-east-1.bedrock-agent-runtime" "com.amazonaws.us-east-1.bedrock-runtime"]
    )
    custom_resource_event[RESOURCE_PROPERTIES][MAX_AZS] = 2
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


describe_vpc_endpoint_services_response = {
    "ServiceDetails": [
        {
            "ServiceName": "com.amazonaws.us-east-1.bedrock-agent-runtime",
            "ServiceId": "vpce-svc-0fa8e00f114ecfaa9",
            "ServiceType": [{"ServiceType": "Interface"}],
            "AvailabilityZones": ["us-east-1a", "us-east-1c", "us-east-1d"],
            "Owner": "amazon",
            "BaseEndpointDnsNames": ["bedrock-agent-runtime.us-east-1.vpce.amazonaws.com"],
            "PrivateDnsName": "bedrock-agent-runtime.us-east-1.amazonaws.com",
            "PrivateDnsNames": [{"PrivateDnsName": "bedrock-agent-runtime.us-east-1.amazonaws.com"}],
            "VpcEndpointPolicySupported": True,
            "AcceptanceRequired": False,
            "ManagesVpcEndpoints": False,
            "Tags": [],
            "PrivateDnsNameVerificationState": "verified",
            "SupportedIpAddressTypes": ["ipv4"],
        },
        {
            "ServiceName": "com.amazonaws.us-east-1.bedrock-runtime",
            "ServiceId": "vpce-svc-03ca75398ae055b75",
            "ServiceType": [{"ServiceType": "Interface"}],
            "AvailabilityZones": ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1e", "us-east-1f"],
            "Owner": "amazon",
            "BaseEndpointDnsNames": ["bedrock-runtime.us-east-1.vpce.amazonaws.com"],
            "PrivateDnsName": "bedrock-runtime.us-east-1.amazonaws.com",
            "PrivateDnsNames": [{"PrivateDnsName": "bedrock-runtime.us-east-1.amazonaws.com"}],
            "VpcEndpointPolicySupported": True,
            "AcceptanceRequired": False,
            "ManagesVpcEndpoints": False,
            "Tags": [],
            "PrivateDnsNameVerificationState": "verified",
            "SupportedIpAddressTypes": ["ipv4"],
        },
    ],
    "ServiceNames": ["com.amazonaws.us-east-1.bedrock-agent-runtime", "com.amazonaws.us-east-1.bedrock-runtime"],
}
