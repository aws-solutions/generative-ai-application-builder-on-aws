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

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

import urllib3
import json
from aws_lambda_powertools import Logger, Tracer

logger = Logger(utc=True)
tracer = Tracer()

http = urllib3.PoolManager()
UUID_VERSION = 4


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


@dataclass
class BuilderMetrics:
    solution_id: str
    version: str
    data: dict
    timestamp: datetime
    uuid: UUID

    def __init__(self, uuid: UUID, solution_id: str, version: str, data: dict = None):
        self.uuid = uuid
        self.solution_id = solution_id
        self.version = version
        self.data = data if data else {}
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def __post_init__(self):
        if not isinstance(self.solution_id, str):
            raise TypeError(f"Expected {self.solution_id} to be a str")

        if not isinstance(self.version, str):
            raise TypeError(f"Expected {self.version} to be a str")

        if not isinstance(self.data, dict):
            raise TypeError(f"Expected {self.data} to be a dict")

        try:
            if self.uuid is not None:
                UUID(self.uuid, version=UUID_VERSION)
        except ValueError:
            raise TypeError(f"Expected {self.uuid} to be a UUID")
