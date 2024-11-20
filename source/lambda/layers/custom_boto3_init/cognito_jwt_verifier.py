# *********************************************************************************************************************
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
# ********************************************************************************************************************#

import os
from typing import Dict, Optional

import jwt
from aws_lambda_powertools import Logger
from jwt import PyJWKClient

logger = Logger(utc=True)


class CognitoJWTVerifierError(Exception):
    pass


class CognitoJWTVerifier:
    def __init__(self, user_pool_id: str, app_client_id: str):
        self.user_pool_id = user_pool_id
        self.app_client_id = app_client_id
        self.payload: Optional[Dict] = None
        self.jwks_client: PyJWKClient = None

    def _create_jwks_client(self) -> PyJWKClient:
        """
        Create a PyJWKClient instance with caching enabled.

        Returns:
            PyJWKClient: A client to fetch and cache JSON Web Key Sets (JWKS) from AWS Cognito.
        """
        jwks_endpoint_url = (
            f"https://cognito-idp.{os.environ['AWS_REGION']}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
        )
        return PyJWKClient(jwks_endpoint_url)

    def verify_jwt_token(self, auth_token: str) -> bool:
        """
        Verifies the JWT token issued by AWS Cognito.
        Args:
            auth_token (str): the auth token
        Returns:
            (bool) True if the token is valid, False otherwise
        Raises:
            CognitoJWTVerifierError: If the token is invalid or expired.
        """
        try:
            if self.jwks_client is None:
                self.jwks_client = self._create_jwks_client()

            signing_key = self.jwks_client.get_signing_key_from_jwt(auth_token).key
            # Decode the JWT token and verify the signature
            self.payload = jwt.decode(
                auth_token,
                signing_key,
                options={
                    "verify_signature": True,
                    "verify_iss": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                },
                algorithms=["RS256"],
            )

            if self.payload.get("client_id") != self.app_client_id:  # type: ignore
                logger.error("Invalid audience", exc_info=True)
                raise CognitoJWTVerifierError("Invalid audience")

            return True

        except jwt.ExpiredSignatureError:
            logger.error("Token has expired", exc_info=True)
            raise CognitoJWTVerifierError("Token has expired")

        except jwt.InvalidTokenError:
            logger.error("Invalid token", exc_info=True)
            raise CognitoJWTVerifierError("Invalid token")

    def extract_username_from_jwt_token(self) -> str:
        """
        Extracts the username from the JWT token.
        Returns:
            (str) the username
        Raises:
            CognitoJWTVerifierError: If the token is invalid or the username claim is not found.
        """
        if self.payload is None:
            self._raise_token_unverified_exception()

        username = self.payload.get("username")
        if username is None:
            raise CognitoJWTVerifierError("Username claim not found in token")

        return username

    def extract_groups_from_jwt_token(self) -> list:
        """
        Extracts the groups from the JWT token.
        Returns:
            (list) the groups
        Raises:
            CognitoJWTVerifierError: If the token is invalid or the groups claim is not found.
        """
        if self.payload is None:
            self._raise_token_unverified_exception()

        groups = self.payload.get("cognito:groups")
        if groups is None:
            raise CognitoJWTVerifierError("Groups claim not found in token")

        return groups

    def get_payload(self) -> dict:
        """
        Returns the payload of the JWT token.
        Returns:
            (dict) the payload
        Raises:
            CognitoJWTVerifierError: If the token has not been verified.
        """
        if self.payload is None:
            self._raise_token_unverified_exception()

        return self.payload

    def _raise_token_unverified_exception(self):
        raise CognitoJWTVerifierError("Token has not been verified")
