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

import os

import pytest
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from utils.constants import KENDRA_INDEX_ID_ENV_VAR

kendra_knowledge_base_params = {"NumberOfDocs": 3, "ReturnSourceDocs": False}


def test_knowledge_base_construction_fails():
    os.environ.pop(KENDRA_INDEX_ID_ENV_VAR)
    with pytest.raises(ValueError) as error:
        KendraKnowledgeBase(kendra_knowledge_base_params)

    assert error.value.args[0] == "Kendra index id env variable is not set"


def test_knowledge_base_construction(setup_environment):
    knowledge_base = KendraKnowledgeBase(kendra_knowledge_base_params)
    assert knowledge_base.kendra_index_id == "fake-kendra-index-id"
    assert knowledge_base.number_of_docs == kendra_knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == kendra_knowledge_base_params["ReturnSourceDocs"]

    assert knowledge_base.retriever.index_id == "fake-kendra-index-id"
    assert knowledge_base.retriever.top_k == kendra_knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.retriever.return_source_documents == kendra_knowledge_base_params["ReturnSourceDocs"]
