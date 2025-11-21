#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from utils.smithy_target_creator import SmithyTargetCreator


class TestSmithyTargetCreator:

    def test_initialization(self):
        config = {"TargetName": "test-smithy", "TargetType": "smithyModel", "SchemaUri": "schemas/smithy-model.json"}

        creator = SmithyTargetCreator(config, "test-bucket")
        assert creator.target_name == "test-smithy"
        assert creator.target_type == "smithyModel"
        assert creator.schema_uri == "schemas/smithy-model.json"

    def test_validate_configuration_success(self):
        config = {"TargetName": "test-smithy", "TargetType": "smithyModel", "SchemaUri": "schemas/smithy-model.json"}

        creator = SmithyTargetCreator(config, "test-bucket")
        assert creator.validate_configuration() is True

    def test_validate_configuration_missing_name(self):
        config = {"TargetType": "smithyModel", "SchemaUri": "schemas/smithy-model.json"}

        creator = SmithyTargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and SchemaUri are required"):
            creator.validate_configuration()

    def test_validate_configuration_missing_schema_uri(self):
        config = {"TargetName": "test-smithy", "TargetType": "smithyModel"}

        creator = SmithyTargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and SchemaUri are required"):
            creator.validate_configuration()

    def test_create_target_configuration(self):
        config = {"TargetName": "test-smithy", "TargetType": "smithyModel", "SchemaUri": "schemas/smithy-model.json"}

        creator = SmithyTargetCreator(config, "test-bucket")
        result = creator.create_target_configuration()

        expected = {"smithyModel": {"s3": {"uri": "s3://test-bucket/schemas/smithy-model.json"}}}
        assert result == expected

    def test_build_credential_provider_configurations(self):
        config = {"TargetName": "test-smithy", "TargetType": "smithyModel", "SchemaUri": "schemas/smithy-model.json"}

        creator = SmithyTargetCreator(config, "test-bucket")
        result = creator.build_credential_provider_configurations()

        expected = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
        assert result == expected