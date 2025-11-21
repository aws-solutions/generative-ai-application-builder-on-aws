#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from utils.lambda_target_creator import LambdaTargetCreator


class TestLambdaTargetCreator:

    def test_initialization(self):
        config = {
            "TargetName": "test-lambda",
            "TargetType": "lambda",
            "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
            "SchemaUri": "schemas/lambda-schema.json",
        }

        creator = LambdaTargetCreator(config, "test-bucket")
        assert creator.target_name == "test-lambda"
        assert creator.target_type == "lambda"
        assert creator.lambda_arn == "arn:aws:lambda:us-east-1:123456789012:function:test-function"
        assert creator.schema_uri == "schemas/lambda-schema.json"

    def test_validate_configuration_success(self):
        config = {
            "TargetName": "test-lambda",
            "TargetType": "lambda",
            "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
            "SchemaUri": "schemas/lambda-schema.json",
        }

        creator = LambdaTargetCreator(config, "test-bucket")
        assert creator.validate_configuration() is True

    def test_validate_configuration_missing_name(self):
        config = {
            "TargetType": "lambda",
            "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
            "SchemaUri": "schemas/lambda-schema.json",
        }

        creator = LambdaTargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and LambdaArn are required"):
            creator.validate_configuration()

    def test_validate_configuration_missing_arn(self):
        config = {"TargetName": "test-lambda", "TargetType": "lambda", "SchemaUri": "schemas/lambda-schema.json"}

        creator = LambdaTargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and LambdaArn are required"):
            creator.validate_configuration()

    def test_create_target_configuration(self):
        config = {
            "TargetName": "test-lambda",
            "TargetType": "lambda",
            "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
            "SchemaUri": "schemas/lambda-schema.json",
        }

        creator = LambdaTargetCreator(config, "test-bucket")
        result = creator.create_target_configuration()

        expected = {
            "lambda": {
                "lambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
                "toolSchema": {"s3": {"uri": "s3://test-bucket/schemas/lambda-schema.json"}},
            }
        }

        assert result == expected

    def test_build_credential_provider_configurations(self):
        config = {
            "TargetName": "test-lambda",
            "TargetType": "lambda",
            "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
            "SchemaUri": "schemas/lambda-schema.json",
        }

        creator = LambdaTargetCreator(config, "test-bucket")
        result = creator.build_credential_provider_configurations()

        expected = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
        assert result == expected