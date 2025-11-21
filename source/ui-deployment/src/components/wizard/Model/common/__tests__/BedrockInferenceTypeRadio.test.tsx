// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { BedrockInferenceTypeRadio } from '../BedrockInferenceTypeRadio';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';

describe('BedrockInferenceTypeRadio', () => {
    test('renders with default value', () => {
        const mockModelData = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockInferenceTypeRadio modelData={mockModelData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(
            radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES)?.getElement().checked
        ).toBeTruthy();
    });

    test('selects a different inference type', () => {
        const mockModelData = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockInferenceTypeRadio modelData={mockModelData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS)?.getElement().click();

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
            modelName: '',
            inferenceProfileId: '',
            modelArn: ''
        });
    });

    test('calls clearErrors when inference type changes', () => {
        const mockModelData = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS
        };
        const callbacks = mockFormComponentCallbacks();
        const clearErrors = jest.fn();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockInferenceTypeRadio modelData={mockModelData} {...callbacks} clearErrors={clearErrors} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES)?.getElement().click();

        expect(clearErrors).toHaveBeenCalled();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            modelName: '',
            inferenceProfileId: '',
            modelArn: ''
        });
    });

    test('uses default value when bedrockInferenceType is not provided', () => {
        const mockModelData = {};
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockInferenceTypeRadio modelData={mockModelData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        expect(
            radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES)?.getElement().checked
        ).toBeTruthy();
    });
});
