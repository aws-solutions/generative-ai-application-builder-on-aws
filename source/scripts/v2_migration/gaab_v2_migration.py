#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
This script is used to migrate use cases created by an old GAAB v1.4.x deployment to be compatible with a new GAAB v2.X deployment.
Use cases created in previous versions of GAAB used a different format of use case config stored in SSM parameter store, while the latest version stores configs in a DynamoDB table. 
It will be executed on the new GAAB v2.X instance and will handle the migration process.

Note: you will need to execute this script with an active AWS profile with Read/Write permissions on the use cases table, Read permissions on the SSM parameters (read/write if you wish to delete parameters), and write permissions on the config table.

"""

# Modify these variables here as needed, or provide them as command line arguments
USE_CASE_TABLE_NAME = None
CONFIG_TABLE_NAME = None

import argparse
import json
from decimal import Decimal
from typing import Dict

import boto3

ddb = boto3.resource("dynamodb")
ssm = boto3.client("ssm")


def get_use_cases_to_migrate(use_case_table_name: str) -> Dict[str, str]:
    """
    retrieves all use case UUIDs and SSM parameter keys that need to be migrated
    :return: a dictionary of use case UUIDs and their corresponding SSM parameter keys
    """
    table = ddb.Table(use_case_table_name)
    response = table.scan(FilterExpression=boto3.dynamodb.conditions.Attr("SSMParameterKey").exists())
    use_cases = response["Items"]
    while "LastEvaluatedKey" in response:
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("SSMParameterKey").exists(),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        use_cases.extend(response["Items"])

    return {use_case["UseCaseId"]: use_case["SSMParameterKey"] for use_case in use_cases}


def get_old_config(ssm_key: str) -> dict:
    """
    Function to retrieve the old configuration from SSM parameter store, as created by the old GAAB v1.4.x instance.
    """
    try:
        response = ssm.get_parameter(Name=ssm_key, WithDecryption=True)
        return json.loads(response["Parameter"]["Value"], parse_float=Decimal)
    except Exception as e:
        raise RuntimeError(f"Error retrieving old config {ssm_key} from SSM parameter store") from e


def convert_config_format(old_config: dict) -> dict:
    """
    Function to convert the old configuration format to the new format.
    """
    new_config = {
        "UseCaseName": old_config["UseCaseName"],
        "ConversationMemoryParams": {
            "ConversationMemoryType": "DynamoDB",
        },
        "LlmParams": {
            "ModelProvider": old_config["LlmParams"]["ModelProvider"],
            "PromptParams": {"PromptTemplate": old_config["LlmParams"].get("PromptTemplate")},
            "ModelParams": old_config["LlmParams"].get("ModelParams"),
            "Temperature": old_config["LlmParams"].get("Temperature"),
            "RAGEnabled": old_config["LlmParams"].get("RAGEnabled", False),
            "Streaming": old_config["LlmParams"].get("Streaming"),
            "Verbose": old_config["LlmParams"].get("Verbose"),
        },
        "IsInternalUser": old_config.get("IsInternalUser", False),
    }

    # provider specific llm parameters
    if new_config["LlmParams"]["ModelProvider"] == "SageMaker":
        new_config["LlmParams"]["SageMakerLlmParams"] = {
            "EndpointName": old_config["LlmParams"]["InferenceEndpoint"],
            "ModelInputPayloadSchema": old_config["LlmParams"]["ModelInputPayloadSchema"],
            "ModelOutputJSONPath": old_config["LlmParams"]["ModelOutputJSONPath"],
        }
    elif new_config["LlmParams"]["ModelProvider"] == "Bedrock":
        new_config["LlmParams"]["BedrockLlmParams"] = {
            "ModelId": old_config["LlmParams"]["ModelId"],
        }
    else:
        raise ValueError(
            f"Unsupported model provider {old_config['LlmParams']['ModelProvider']}. Note we have removed support for third party providers in v2.0.0. To continue to use third party providers, you must remain on an older version of GAAB"
        )

    # knowledge base parameters if RAG is enabled. Old versions only supported Kendra.
    if "KnowledgeBaseParams" in old_config and new_config["LlmParams"]["RAGEnabled"]:
        new_config["KnowledgeBaseParams"] = {
            "KnowledgeBaseType": "Kendra",
            "NumberOfDocs": old_config["KnowledgeBaseParams"].get("NumberOfDocs"),
            "ReturnSourceDocs": old_config["KnowledgeBaseParams"].get("ReturnSourceDocs"),
            "KendraKnowledgeBaseParams": {"RoleBasedAccessControlEnabled": False},
        }

    return new_config


def write_new_config(config_table_name: str, key: str, new_config: dict):
    """
    Function to write the new configuration to DynamoDB, as expected by the new GAAB v2.X instance.

    :param config_table_name: name of the new configuration table
    :param key: key of the new configuration record
    :param new_config: new configuration as a dictionary
    :return: None
    :raises RuntimeError: if an error occurs while writing to DynamoDB
    """
    try:
        table = ddb.Table(config_table_name)
        table.put_item(Item={"key": key, "config": new_config})
    except Exception as e:
        raise RuntimeError(f"Error writing new config to DynamoDB") from e


def update_use_case_table_record(
    use_case_table_name: str, use_case_id: str, config_table_name: str, config_record_key: str
):
    """
    Function to update the use case table with a reference to the new configuration.

    :param use_case_table_name: name of the use case table
    :param use_case_id: use case UUID
    :param config_table_name: name of the new configuration table
    :param config_record_key: key of the new configuration record
    :return: None
    :raises RuntimeError: if an error occurs while updating the use case table
    """
    try:
        table = ddb.Table(use_case_table_name)
        table.update_item(
            Key={"UseCaseId": use_case_id},
            UpdateExpression="SET UseCaseConfigTableName = :config_table_name, UseCaseConfigRecordKey = :config_record_key REMOVE SSMParameterKey",
            ExpressionAttributeValues={
                ":config_table_name": config_table_name,
                ":config_record_key": config_record_key,
            },
            ReturnValues="UPDATED_NEW",
        )

    except Exception as e:
        raise RuntimeError(f"Error updating use case table record") from e


def delete_ssm_parameter(ssm_key: str):
    """
    Function to delete the old SSM parameter.

    :param ssm_key: key of the SSM parameter
    :return: None
    :raises RuntimeError: if an error occurs while deleting the SSM parameter
    """
    try:
        ssm.delete_parameter(Name=ssm_key)
    except Exception as e:
        raise RuntimeError(f"Error deleting SSM parameter {ssm_key}") from e


def migrate_use_case(
    use_case_table_name: str, config_table_name: str, use_case_id: str, ssm_key: str, delete_old: bool
):
    """
    Function to migrate a single use case.

    :param use_case_table_name: name of the use case table
    :param config_table_name: name of the new configuration table
    :param use_case_id: use case UUID
    :param ssm_key: key of the SSM parameter
    :param delete_old: whether to delete the old SSM parameter after successful migration
    :return: None
    """
    # SSM key used to be of format /some/prefixes/8charUUID1/8charUUID2, while DynamoDB key must be of format 8charUUID1-8charUUID2
    ddb_key = ssm_key[-17:].replace("/", "-")
    print(f"Migrating ssm key: {ssm_key} to table {config_table_name} at key {ddb_key}")

    # get the old configuration from SSM parameter store
    old_config = get_old_config(ssm_key)

    # convert the old configuration format to the new format
    new_config = convert_config_format(old_config)

    # write the new configuration to DynamoDB
    write_new_config(config_table_name, ddb_key, new_config)

    # update the use cases table to reference the new config
    update_use_case_table_record(use_case_table_name, use_case_id, config_table_name, ddb_key)

    if delete_old:
        delete_ssm_parameter(ssm_key)


def main():
    """
    Main function to handle the migration process.
    """

    # parse the table name and old ssm param name
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-u",
        "--use_case_table_name",
        default=USE_CASE_TABLE_NAME,
        type=str,
        help="DynamoDB table name of the table containing the deployed use cases. Can be retrieved from the Deployment Platforms CloudFormation stacks outputs",
    )
    parser.add_argument(
        "-c",
        "--config_table_name",
        default=CONFIG_TABLE_NAME,
        type=str,
        help="DynamoDB table name for the new config. Should have been created by the deployment dashboard on upgrade, and can be retrieved from the CloudFormation stacks outputs",
    )
    parser.add_argument(
        "-d",
        "--delete_old",
        type=bool,
        default=False,
        const=True,
        nargs="?",
        help="If set, will delete the old SSM parameter after successful migration",
    )

    args = parser.parse_args()

    if args.use_case_table_name is None:
        raise ValueError(
            "use_case_table_name is required to be passed as an argument, or USE_CASE_TABLE_NAME must be set manually in this script."
        )
    if args.config_table_name is None:
        raise ValueError(
            "config_table_name is required to be passed as an argument, or CONFIG_TABLE_NAME must be set manually in this script."
        )

    try:
        use_cases_to_migrate = get_use_cases_to_migrate(args.use_case_table_name)
    except Exception as e:
        print(f"Error retrieving ssm keys to migrate: {e}")
        return -1

    failed_migrations = []
    for use_case_id, ssm_key in use_cases_to_migrate.items():
        try:
            migrate_use_case(args.use_case_table_name, args.config_table_name, use_case_id, ssm_key, args.delete_old)
        except Exception as e:
            failed_migrations.append(use_case_id)
            print(f"Error during migration: {e}")

    if failed_migrations:
        print(f"Failed to migrate the following use cases: {failed_migrations}")
        return -1

    print("Migration completed successfully!")


if __name__ == "__main__":
    main()
