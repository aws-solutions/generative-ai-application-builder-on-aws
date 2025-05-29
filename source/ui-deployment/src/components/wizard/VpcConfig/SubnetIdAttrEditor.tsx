// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { AttributeEditor, AttributeEditorProps, FormField } from '@cloudscape-design/components';
import {
    AttributeEditorItem,
    ModelParamsEditorDefinition,
    VpcFormFieldProps,
    isSubnetIdValid,
    vpcToolsContent,
    hasDuplicateAttrItems
} from './helpers';
import InputControl from '../Model/AdvancedModelSettings/InputControl';
import { MAX_NUM_SUBNETS } from '../steps-config';
import { InfoLink } from '@/components/commons';

type SubnetIdItem = AttributeEditorItem;
type SubnetIdItemsArray = SubnetIdItem[] | {}[];

const createDefinition = ({ items, setItems, isEditDisabled }: any): ModelParamsEditorDefinition[] => {
    return [
        {
            label: '',
            control: ({ key = '' }, itemIndex: number) => (
                <InputControl
                    prop="key"
                    value={key}
                    index={itemIndex}
                    placeholder="Enter Subnet Id"
                    setItems={setItems}
                    items={items}
                    data-testid="vpc-subnet-id"
                    disabled={isEditDisabled}
                />
            ),
            errorText: (item: any) => {
                if (!isSubnetIdValid(item.key)) {
                    return 'Must start with "subnet-" and be of valid length';
                }
                
                // Check for duplicates
                if (item.key) {
                    const keyCount = new Map<string, number>();
                    items.forEach((i: any) => {
                        if (i.key) {
                            keyCount.set(i.key, (keyCount.get(i.key) || 0) + 1);
                        }
                    });
                    
                    const count = keyCount.get(item.key) || 0;
                    if (count > 1) {
                        return 'Subnet ID must be unique';
                    }
                }
                
                return null;
            }
        }
    ];
};

export const SubnetIdAttrEditor = (props: VpcFormFieldProps) => {
    const [items, setItems] = React.useState<SubnetIdItemsArray>(props.vpcData.subnetIds);
    const [hasDuplicates, setHasDuplicates] = React.useState<boolean>(false);

    const handleAddParam = () => {
        if (items.length >= MAX_NUM_SUBNETS) {
            return;
        }
        setItems([...items, {}]);
    };

    const handleRemoveParam = (detail: AttributeEditorProps.RemoveButtonClickDetail) => {
        const tmpItems = [...items];
        tmpItems.splice(detail.itemIndex, 1);
        setItems(tmpItems);
    };

    React.useEffect(() => {
        const duplicatesExist = hasDuplicateAttrItems(items);
        setHasDuplicates(duplicatesExist);
        
        // Only update parent if there are no duplicates
        if (!duplicatesExist) {
            props.onChangeFn({ subnetIds: items });
        }
    }, [items]);

    const isEditDisabled = props.disabled ?? false;
    const isRemoveable = !isEditDisabled; // if edit disabled removeable should be false

    return (
        <FormField
            label={
                <span>
                    Subnet Ids <i>- required</i>{' '}
                </span>
            }
            data-testid="subnet-ids-field"
            description="The subnet IDs to be used with the VPC. Each subnet ID must be unique."
            stretch
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(vpcToolsContent.byoVpc)} />}
            errorText={hasDuplicates ? "Duplicate subnet IDs are not allowed" : undefined}
        >
            <AttributeEditor
                onAddButtonClick={handleAddParam}
                onRemoveButtonClick={({ detail }) => handleRemoveParam(detail)}
                removeButtonText="Remove"
                items={items}
                addButtonText="Add Subnet Id"
                definition={createDefinition({ items, setItems, isEditDisabled })}
                data-testid="subnet-id-editor"
                isItemRemovable={() => isRemoveable}
                disableAddButton={isEditDisabled}
                additionalInfo={<span>You can add up to {MAX_NUM_SUBNETS - items.length} more items.</span>}
            />
        </FormField>
    );
};

export default SubnetIdAttrEditor;
