export const sampleDeployUseCaseFormData = {
    'useCase': {
        'useCaseType': 'Text',
        'useCaseName': 'test-use-case',
        'useCaseDescription': 'test use case description',
        'deployUI': true,
        'inError': true
    },
    'knowledgeBase': {
        'isRagRequired': true,
        'knowledgeBaseType': {
            'value': 'Kendra',
            'label': 'Kendra'
        },
        'existingKendraIndex': 'Yes',
        'kendraIndexId': 'fake-idx-id',
        'kendraAdditionalQueryCapacity': '',
        'kendraAdditionalStorageCapacity': '',
        'kendraEdition': {
            'value': 'developer',
            'label': 'Developer'
        },
        'maxNumDocs': '10',
        'identifier': '',
        'inError': false,
        'returnDocumentSource': false,
        'enableRoleBasedAccessControl': false
    },
    'model': {
        'modelProvider': {
            'label': 'Bedrock',
            'value': 'Bedrock'
        },
        'modelName': 'fake-model',
        'modelParameters': [
            {
                'key': 'fake-param',
                'value': '1',
                'type': {
                    'label': 'integer',
                    'value': 'integer'
                }
            },
            {
                'key': 'fake-param2',
                'value': '0.9',
                'type': {
                    'label': 'float',
                    'value': 'float'
                }
            }
        ],
        'accessibility': 'on',
        'encryption': 'off',
        'upgrades': 'off',
        'monitoring': 'off',
        'backtrack': 'on',
        'inError': false,
        'temperature': 0.1,
        'stopSequences': [''],
        'verbose': false,
        'streaming': true,
        'enableGuardrails': false
    },
    'vpc': {
        'isVpcRequired': true,
        'existingVpc': true,
        'vpcId': 'vpc-234q23',
        'subnetIds': [{ key: 'subnet-asdf' }, { key: 'subnet-asdf34r' }],
        'securityGroupIds': [{ key: 'sg-24234' }],
        'inError': false
    },
    'prompt': {
        'maxPromptTemplateLength': 30000,
        'maxInputTextLength': 30000,
        'promptTemplate': '{history}\n\n{input}',
        'inError': false,
        'humanPrefix': 'Human',
        'aiPrefix': 'AI',
        'disambiguationEnabled': true,
        'disambiguationPromptTemplate': 'fake-disambiguation-prompt',
        'chatHistoryLength': 20,
        'userPromptEditingEnabled': true,
        'rephraseQuestion': true
    },
    'agent': {
        'bedrockAgentId': '1111111111',
        'bedrockAgentAliasId': '1111111111',
        'enableTrace': false
    }
};
