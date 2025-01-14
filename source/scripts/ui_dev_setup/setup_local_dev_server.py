# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# This script is used to prepare the local environment for configuring the UI projects and running the Vite dev server
# It requires the following prerequisites:
# - Generative AI Application Builder deployment to be completed
# - AWS CLI to be installed
# - AWS credentials to be present in environment

import argparse
import json
import logging
import sys
from enum import Enum
from pathlib import Path

import boto3
import requests

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logging.basicConfig(  # NOSONAR - python:S4792 - this is only a local server
    level=logging.ERROR,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

AWS_REGION = boto3.Session().region_name


class ProjectType(Enum):
    CHAT = "ui-chat"
    DEPLOYMENT = "ui-deployment"


UI_DEPLOYMENT_SERVER_PORT = 5177
UI_CHAT_SERVER_PORT = 5178


def process_arguments():
    parser = argparse.ArgumentParser(description="Process various arguments")
    parser.add_argument("-w", "--website", help="The website URL to process")
    parser.add_argument(
        "-t",
        "--ui-project-type",
        help="The UI project type",
        choices=[
            ProjectType.CHAT.value,
            ProjectType.DEPLOYMENT.value,
        ],
    )

    args = parser.parse_args()
    return args


def get_runtime_config(website_url: str):
    """
    Fetch the runtime configuration from the specified website URL.

    Args:
        website_url (str): The URL of the website to fetch the runtime configuration from.

    Returns:
        dict: The runtime configuration, or None if an error occurs.
    """
    try:
        website_url = website_url.rstrip("/")
        response = requests.get(f"{website_url}/runtimeConfig.json")
        response.raise_for_status()
        runtime_config = response.json()

        user_pool_id = runtime_config.get("UserPoolId")
        user_pool_client_id = runtime_config.get("UserPoolClientId")

        if not user_pool_id or not user_pool_client_id:
            logger.error("User pool ID or client ID not found in config")
            return None

        return runtime_config
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching runtime config: {e}")
        return None


def update_cognito_redirect_url(runtime_config, new_redirect_url):
    runtime_config["CognitoRedirectUrl"] = new_redirect_url
    return runtime_config


def update_user_pool_client(runtime_config: dict, port: int):
    """
    Update the user pool client with the specified runtime configuration and port.

    This function retrieves the current user pool client properties, adds the local development server's callback URL to the list of callback URLs, and updates the user pool client with the modified configuration.

    Args:
        runtime_config (dict): The runtime configuration, which should include the user pool ID and user pool client ID.
        port (int): The port number of the local development server.

    Raises:
        Exception: If an error occurs while updating the user pool client.
    """
    user_pool_id = runtime_config["UserPoolId"]
    user_pool_client_id = runtime_config["UserPoolClientId"]
    region = runtime_config.get("AwsRegion", AWS_REGION)
    cognito_idp = boto3.client("cognito-idp", region_name=region)

    try:

        current_client_properties = cognito_idp.describe_user_pool_client(
            UserPoolId=user_pool_id, ClientId=user_pool_client_id
        )

        current_client_properties["UserPoolClient"]["CallbackURLs"].append(f"http://localhost:{port}")
        current_client_properties["UserPoolClient"]["LogoutURLs"].append(f"http://localhost:{port}")

        del current_client_properties["UserPoolClient"]["LastModifiedDate"]
        del current_client_properties["UserPoolClient"]["CreationDate"]

        cognito_idp.update_user_pool_client(**current_client_properties["UserPoolClient"])
        logger.info("User pool client updated successfully!")

    except cognito_idp.exceptions.NotAuthorizedException:
        logger.error("Authentication error occurred. Please ensure you have AWS credentials in the environment.")

    except Exception as e:
        logger.error(f"Error updating user pool client: {e}")


def get_update_save_runtime_config(website_url: str, dir_path: Path, port: int):
    """
    Fetch the runtime configuration, update the Cognito redirect URL, and save the updated configuration to a file.

    This function performs the following steps:
    1. Fetches the runtime configuration from the specified website URL using the `get_runtime_config` function.
    2. Updates the Cognito redirect URL in the runtime configuration to point to the local development server using the `update_cognito_redirect_url` function.
    3. Saves the updated runtime configuration to a file in the specified directory.

    Args:
        website_url (str): The URL of the website to fetch the runtime configuration from.
        dir_path (pathlib.Path): The directory path to save the updated runtime configuration file.
        port (int): The port number of the local development server.

    Returns:
        dict: The updated runtime configuration.

    Raises:
        Any exceptions that may be raised by the `get_runtime_config`, `update_cognito_redirect_url`, or `json.dump` functions.
    """
    runtime_config = get_runtime_config(website_url)
    updated_runtime_config = update_cognito_redirect_url(runtime_config, f"http://localhost:{port}")

    runtime_config_file_path = dir_path / "runtimeConfig.json"
    with open(runtime_config_file_path, "w") as file:
        json.dump(updated_runtime_config, file)

    logger.info(f"Config saved to {runtime_config_file_path}")
    logger.info("Runtime config updated successfully!")
    return updated_runtime_config


def update_ui_project(args, project_type, server_port):
    logger.info(f"Updating the redirect URL for the UI {project_type} project")
    runtime_config_dir = Path(__file__).parents[2] / project_type / "public"
    logger.info(f"Runtime config directory: {runtime_config_dir}")
    updated_runtime_config = get_update_save_runtime_config(args.website, runtime_config_dir, server_port)
    update_user_pool_client(updated_runtime_config, server_port)


if __name__ == "__main__":
    """
    Execute the script to update the UI project.

    This script can be executed from the command line with the following arguments:

    - `--ui-project-type`: The type of the UI project to update (either "ui-chat" or "ui-deployment")
    - `--website`: The URL of the website to fetch the runtime configuration from

    For example, to update the UI Chat project:

    ```
    python setup_local_dev_server.py --ui-project-type ui-chat --website https://example.com
    ```
    or
    ```
    python setup_local_dev_server.py -t ui-chat -w https://example.com
    ```

    To update the UI Deployment project:

    ```
    python setup_local_dev_server.py --ui-project-type ui-deployment --website https://example.com
    ```
    or
    ```
    python setup_local_dev_server.py -t ui-deployment -w https://example.com
    ```
    """

    args = process_arguments()
    if args.ui_project_type == ProjectType.CHAT.value:
        update_ui_project(args, ProjectType.CHAT.value, UI_CHAT_SERVER_PORT)
    elif args.ui_project_type == ProjectType.DEPLOYMENT.value:
        update_ui_project(args, ProjectType.DEPLOYMENT.value, UI_DEPLOYMENT_SERVER_PORT)
