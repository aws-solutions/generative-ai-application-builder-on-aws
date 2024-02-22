/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import {
    replaceReservedKeys,
    replaceValuesInTemplate,
    replaceInTemplate,
    validateModelParamsInTemplate
} from '../helpers';

describe('replaceReservedKeys', () => {
    const reservedValuesMap = {
        temperature: 0.1
    };
    test('replaces reserved keys', () => {
        const payload = {
            'input': '<<prompt>>',
            'temp': '<<temperature>>'
        };
        const result = replaceReservedKeys(payload, reservedValuesMap);
        expect(result).toEqual({
            'input': 'Your prompt will go here',
            'temp': 0.1
        });
    });
    test('replaces reserved keys in deep object', () => {
        const payload = {
            'top_input': { 'secondLevel': { 'thirdLevel': '<<prompt>>' } },
            'temp': '<<temperature>>'
        };
        const result = replaceReservedKeys(payload, reservedValuesMap);
        expect(result).toEqual({
            'top_input': { 'secondLevel': { 'thirdLevel': 'Your prompt will go here' } },
            'temp': 0.1
        });
    });
});

describe('replaceValuesInTemplate', () => {
    test('replaces values in template', () => {
        const template = {
            'input': 'this is a fake prompt input',
            'topP': '<<top_p>>',
            'fake_string_key': '<<fake_string_key>>'
        };
        const mockModelParams = {
            'top_p': 0.9,
            'fake_string_key': 'fake_string_value'
        };
        const result = replaceValuesInTemplate(template, mockModelParams);
        expect(result).toEqual({
            'input': 'this is a fake prompt input',
            'topP': 0.9,
            'fake_string_key': 'fake_string_value'
        });
    });

    test('replaces values located deep in the object', () => {
        const template = {
            'input': 'this is a fake prompt input',
            'topP': '<<top_p>>'
        };
        const mockModelParams = {
            'top_p': 0.9
        };
        const result = replaceValuesInTemplate(template, mockModelParams);
        expect(result).toEqual({
            'input': 'this is a fake prompt input',
            'topP': 0.9
        });
    });

    test('expect to not replace when params does not match template', () => {
        const template = {
            'input': 'this is a fake prompt input',
            'topP': '<<top_p>>',
            'others': {
                'anotherLevel': {
                    'fake': '<<fake_string_key>>'
                }
            }
        };
        const mockModelParams = {
            'top_p': 0.9,
            'fake_string_key': 'replaced_value'
        };
        const result = replaceValuesInTemplate(template, mockModelParams);
        expect(result).toEqual({
            'input': 'this is a fake prompt input',
            'topP': 0.9,
            'others': {
                'anotherLevel': {
                    'fake': 'replaced_value'
                }
            }
        });
    });
});

describe('replaceInTemplate', () => {
    test('replaces values in template', () => {
        const template = {
            'top_input': { 'secondLevel': { 'thirdLevel': '<<prompt>>' } },
            'temp': '<<temperature>>',
            'parameters': {
                'topP': '<<top_p>>'
            },
            'maxTokens': '<<max_tokens>>',
            'other_parameters': {
                'fake_string_key': '<<fake_string_key>>',
                'stream': '<<stream>>'
            }
        };
        const mockModelParams = {
            'top_p': 0.9,
            'max_tokens': 1000,
            'fake_string_key': 'fake_string_value',
            'stream': false
        };
        const reservedValuesMap = {
            temperature: 0.1
        };
        const result = replaceInTemplate(JSON.stringify(template), mockModelParams, reservedValuesMap);
        expect(result).toEqual({
            'top_input': { 'secondLevel': { 'thirdLevel': 'Your prompt will go here' } },
            'temp': 0.1,
            'parameters': {
                'topP': 0.9
            },
            'maxTokens': 1000,
            'other_parameters': {
                'fake_string_key': 'fake_string_value',
                'stream': false
            }
        });
    });

    test('replaces values in template when model params is empty', () => {
        const template = {
            'top_input': { 'secondLevel': { 'thirdLevel': '<<prompt>>' } },
            'temp': '<<temperature>>',
            'parameters': {
                'topP': '<<top_p>>'
            },
            'maxTokens': '<<max_tokens>>',
            'other_parameters': {
                'fake_string_key': '<<fake_string_key>>',
                'stream': '<<stream>>'
            }
        };
        const mockModelParams = {};
        const reservedValuesMap = {
            temperature: 0.1
        };
        const result = replaceInTemplate(JSON.stringify(template), mockModelParams, reservedValuesMap);
        expect(result).toEqual({
            'top_input': { 'secondLevel': { 'thirdLevel': 'Your prompt will go here' } },
            'temp': 0.1,
            'parameters': {
                'topP': '<<top_p>>'
            },
            'maxTokens': '<<max_tokens>>',
            'other_parameters': {
                'fake_string_key': '<<fake_string_key>>',
                'stream': '<<stream>>'
            }
        });
    });

    test('should throw a formatted error if template is malformed json object', () => {
        const template = '<<prompt>>';
        const mockModelParams = {
            'top_p': 0.9,
            'max_tokens': 1000,
            'fake_string_key': 'fake_string_value',
            'stream': false
        };
        const reservedValuesMap = {
            temperature: 0.1
        };
        expect(() => replaceInTemplate(template, mockModelParams, reservedValuesMap)).toThrow(Error);
    });
});

describe('validateModelParamsInTemplate', () => {
    test('throws an error if model params are not present in template', () => {
        const template = JSON.stringify({
            'input': 'this is a fake prompt input',
            'topP': '<<top_p>>'
        });
        const mockModelParams = {};
        expect(validateModelParamsInTemplate(template, mockModelParams)).toBeFalsy();
    });

    test('does not throw an error if model params are present in template', () => {
        const template = JSON.stringify({
            'input': 'this is a fake prompt input',
            'topP': '<<top_p>>'
        });
        const mockModelParams = {
            'top_p': 0.9
        };
        expect(validateModelParamsInTemplate(template, mockModelParams)).toBeTruthy();
    });
});
