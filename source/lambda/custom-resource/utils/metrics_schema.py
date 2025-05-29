#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Dict, Any


class MetricsSchema:
    """
    A class for filtering dictionaries against defined schemas and cleaning empty values.
    """

    bedrock_llm_params_schema = {
        "ModelId": (str, None),
        "GuardrailEnabled": (bool, None),
        "ProvisionedModelEnabled": (bool, None),
        "InferenceProfileId": (str, None),
    }

    prompt_params_schema = {
        "RephraseQuestion": (bool, None),
        "UserPromptEditingEnabled": (bool, None),
        "DisambiguationEnabled": (bool, None),
        "MaxInputTextLength": (float, None),
        "MaxPromptTemplateLength": (float, None),
    }

    bedrock_agent_params_schema = {"EnableTrace": (bool, None)}

    agent_params_schema = {"AgentType": (str, None), "BedrockAgentParams": (Dict, bedrock_agent_params_schema)}

    llm_params_schema = {
        "Streaming": (bool, None),
        "Verbose": (bool, None),
        "RAGEnabled": (bool, None),
        "ModelProvider": (str, None),
        "BedrockLlmParams": (Dict, bedrock_llm_params_schema),
        "PromptParams": (Dict, prompt_params_schema),
    }

    knowledge_base_params_schema = {"KnowledgeBaseType": (str, None)}

    authentication_params_schema = {"ClientOwnedUserPool": (bool, None)}

    feedback_params_schema = {"FeedbackEnabled": (bool, None)}

    metrics_schema = {
        "NEW_KENDRA_INDEX_CREATED": (str, None),
        "VPC_ENABLED": (str, None),
        "CREATE_VPC": (str, None),
        "KENDRA_EDITION": (str, None),
        "UC_DEPLOYMENT_SOURCE": (str, None),
        "UseCaseType": (str, None),
        "KnowledgeBaseType": (str, None),
        "DeployUI": (bool, None),
        "LlmParams": (Dict, llm_params_schema),
        "AgentParams": (Dict, agent_params_schema),
        "KnowledgeBaseParams": (Dict, knowledge_base_params_schema),
        "AuthenticationParams": (Dict, authentication_params_schema),
        "FeedbackParams": (Dict, feedback_params_schema),
    }

    def __init__(self, data):
        self.data = data

    def filter_dict_by_schema(self, data: Dict, schema_fields: Dict[str, tuple]):
        """
        Filter a dictionary to only include fields defined in the schema.

        Args:
            data: The input dictionary to filter
            schema_fields: A Dict mapping field aliases to (field_name, field_type, nested_schema) tuples

        Returns:
            A new dictionary with only the fields defined in the schema
        """
        if data is None:
            return

        result = {}

        for key, value in data.items():
            if key in schema_fields:
                _, nested_schema = schema_fields[key]

                # If this is a nested schema and value is a Dict, recursively filter it
                if nested_schema is not None and value is not None and isinstance(value, Dict):
                    value = self.filter_dict_by_schema(value, nested_schema)

                result[key] = value

        return result

    def remove_empty(self, data: Dict) -> Any:
        """
        Remove empty values from the dictionary or list recursively.

        Args:
            data: The data structure to clean (Dict, list, or other value)

        Returns:
            A new data structure with empty values removed
        """
        if isinstance(data, dict):
            cleaned = {k: self.remove_empty(v) for k, v in data.items()}
            return {k: v for k, v in cleaned.items() if v not in (None, {}, [])}
        elif isinstance(data, list):
            cleaned_list = [self.remove_empty(item) for item in data]
            return [item for item in cleaned_list if item not in (None, {}, [])]
        return data

    def model_dump(self, remove_empty: bool = False) -> Dict:
        """
        Filter a dictionary by schema and remove empty values in one operation.

        Returns:
            A filtered and cleaned dictionary
        """

        filtered_data = self.filter_dict_by_schema(self.data, self.metrics_schema)
        if remove_empty:
            return self.remove_empty(filtered_data)
        return filtered_data
