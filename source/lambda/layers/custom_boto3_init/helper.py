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


from os import getenv

import boto3
from aws_lambda_powertools import Logger, Tracer
from cognito_jwt_verifier import CognitoJWTVerifier
from custom_config import custom_usr_agent_config

logger = Logger(utc=True)
tracer = Tracer()

_helpers_service_clients = dict()
_helpers_service_resources = dict()
_helpers_cognito_jwt_verifiers = dict()
_session = None


@tracer.capture_method
def get_session():
    global _session
    if not _session:
        _session = boto3.session.Session()
    return _session


@tracer.capture_method
def get_service_client(service_name, **kwargs):
    global _helpers_service_clients
    session = get_session()

    if service_name not in _helpers_service_clients:
        logger.debug(f"Cache miss for {service_name}. Creating a new one and cache it")
        _helpers_service_clients[service_name] = session.client(
            service_name, config=custom_usr_agent_config(), **kwargs
        )

    return _helpers_service_clients[service_name]


@tracer.capture_method
def get_service_resource(service_name, **kwargs):
    global _helpers_service_resources
    session = get_session()

    if service_name not in _helpers_service_resources:
        logger.debug(f"Cache miss for {service_name}. Creating a new one and cache it")
        _helpers_service_resources[service_name] = session.resource(
            service_name, config=custom_usr_agent_config(), **kwargs
        )
    return _helpers_service_resources[service_name]


@tracer.capture_method
def get_cognito_jwt_verifier(user_pool_id: str, app_client_id: str):
    global _helpers_cognito_jwt_verifiers
    if app_client_id not in _helpers_cognito_jwt_verifiers:
        _helpers_cognito_jwt_verifiers[app_client_id] = CognitoJWTVerifier(
            user_pool_id=user_pool_id, app_client_id=app_client_id
        )
    return _helpers_cognito_jwt_verifiers[app_client_id]
