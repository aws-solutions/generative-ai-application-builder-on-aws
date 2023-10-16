export const sampleDeployUseCaseFormData = {
    'useCase': {
        'useCase': {
            'value': 'Chat',
            'label': 'Chat'
        },
        'useCaseName': 'test-use-case',
        'useCaseDescription': 'test use case description',
        'includeUi': 'yes',
        'inError': true
    },
    'knowledgeBase': {
        'isRagRequired': true,
        'knowledgeBaseType': {
            'value': 'kendra',
            'label': 'Kendra'
        },
        'existingKendraIndex': 'yes',
        'kendraIndexId': 'fake-idx-id',
        'kendraAdditionalQueryCapacity': '',
        'kendraAdditionalStorageCapacity': '',
        'kendraEdition': {
            'value': 'developer',
            'label': 'Developer'
        },
        'maxNumDocs': '10',
        'identifier': '',
        'inError': false
    },
    'model': {
        'modelProvider': {
            'label': 'HuggingFace',
            'value': 'HuggingFace'
        },
        'apiKey': 'fake-api-key',
        'modelName': 'fake-model',
        'promptTemplate': 'fake-prompt',
        'noHitMessage': '',
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
        'streaming': true
    }
};
