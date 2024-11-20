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
from unittest.mock import Mock, patch

import pytest
from cognito_jwt_verifier import CognitoJWTVerifier, CognitoJWTVerifierError
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWKClient


@pytest.fixture
def valid_jwt_token():
    yield "valid_jwt_token"


@pytest.fixture
def invalid_jwt_token():
    yield "invalid_jwt_token"


@pytest.fixture
def expired_jwt_token():
    yield "expired_jwt_token"


@pytest.fixture
def mocked_jwks_client():
    mocked_client = Mock(spec=PyJWKClient)
    mocked_signing_key = Mock()
    mocked_signing_key.key = "mock_signing_key"
    mocked_client.get_signing_key_from_jwt.return_value = mocked_signing_key
    yield mocked_client


@pytest.fixture(autouse=True)
def jwt_verifier(mocked_jwks_client, monkeypatch):
    user_pool_id = "test_user_pool_id"
    app_client_id = "test_app_client_id"
    verifier = CognitoJWTVerifier(user_pool_id, app_client_id)
    monkeypatch.setattr(verifier, "_create_jwks_client", lambda: mocked_jwks_client)
    yield verifier


@patch("cognito_jwt_verifier.jwt.decode")
def test_verify_jwt_token_valid(mock_decode, jwt_verifier, valid_jwt_token, mocked_jwks_client):
    mock_decode.return_value = {"client_id": jwt_verifier.app_client_id}

    result = jwt_verifier.verify_jwt_token(valid_jwt_token)

    assert result is True
    mocked_jwks_client.get_signing_key_from_jwt.assert_called_once_with(valid_jwt_token)


@patch("cognito_jwt_verifier.jwt.decode", side_effect=ExpiredSignatureError)
def test_verify_jwt_token_expired(mock_decode, jwt_verifier, expired_jwt_token, mocked_jwks_client):
    with pytest.raises(CognitoJWTVerifierError) as excinfo:
        jwt_verifier.verify_jwt_token(expired_jwt_token)

    assert str(excinfo.value) == "Token has expired"


@patch("cognito_jwt_verifier.jwt.decode", side_effect=InvalidTokenError)
def test_verify_jwt_token_invalid(mock_decode, jwt_verifier, invalid_jwt_token, mocked_jwks_client):
    with pytest.raises(CognitoJWTVerifierError) as excinfo:
        jwt_verifier.verify_jwt_token(invalid_jwt_token)

    assert str(excinfo.value) == "Invalid token"


@pytest.mark.parametrize(
    "payload, expected_username",
    [
        ({"username": "test_username"}, "test_username"),
        ({}, CognitoJWTVerifierError("Username claim not found in token")),
        (None, CognitoJWTVerifierError("Token has not been verified")),
    ],
)
def test_extract_username_from_jwt_token(jwt_verifier, payload, expected_username):
    jwt_verifier.payload = payload

    if isinstance(expected_username, Exception):
        with pytest.raises(type(expected_username)) as excinfo:
            jwt_verifier.extract_username_from_jwt_token()
        assert str(excinfo.value) == str(expected_username)
    else:
        username = jwt_verifier.extract_username_from_jwt_token()
        assert username == expected_username


@pytest.mark.parametrize(
    "payload, expected_groups",
    [
        ({"cognito:groups": ["group1", "group2"]}, ["group1", "group2"]),
        ({}, CognitoJWTVerifierError("Groups claim not found in token")),
        (None, CognitoJWTVerifierError("Token has not been verified")),
    ],
)
def test_extract_groups_from_jwt_token(jwt_verifier, payload, expected_groups):
    jwt_verifier.payload = payload

    if isinstance(expected_groups, Exception):
        with pytest.raises(type(expected_groups)) as excinfo:
            jwt_verifier.extract_groups_from_jwt_token()
        assert str(excinfo.value) == str(expected_groups)
    else:
        groups = jwt_verifier.extract_groups_from_jwt_token()
        assert groups == expected_groups


def test_get_payload(jwt_verifier):
    expected_payload = {"test_claim": "test_value"}
    jwt_verifier.payload = expected_payload

    payload = jwt_verifier.get_payload()

    assert payload == expected_payload


@patch.object(CognitoJWTVerifier, "verify_jwt_token", return_value=True)
def test_get_payload_without_verification(mock_verify_jwt_token, jwt_verifier):
    jwt_verifier.payload = None

    with pytest.raises(CognitoJWTVerifierError) as excinfo:
        jwt_verifier.get_payload()

    assert str(excinfo.value) == "Token has not been verified"
    mock_verify_jwt_token.assert_not_called()
