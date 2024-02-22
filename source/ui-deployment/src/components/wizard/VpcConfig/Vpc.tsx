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

import React, { useContext } from 'react';
import { Box, Container, Header, SpaceBetween } from '@cloudscape-design/components';

import { DEPLOYMENT_ACTIONS } from '../../../utils/constants';

import HomeContext from '../../../contexts/home.context';
import { StepContentProps } from '../interfaces/Steps';
import VpcId from './VpcId';
import DeployVpc from './DeployVpc';
import UseExistingVpc from './UseExistingVpc';
import SubnetIdAttrEditor from './SubnetIdAttrEditor';
import SecurityGroupAttrEditor from './SecurityGroupAttrEditor';
import { isAttrItemsValid, isSecurityGroupValid, isSubnetIdValid } from './helpers';

const Vpc = ({ info: { vpc }, onChange, setHelpPanelContent }: StepContentProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRequiredFieldsValue = () => {
        if (vpc.isVpcRequired) {
            return ['existingVpc'];
        }
        return [];
    };
    const [requiredFields, setRequiredFields] = React.useState(initRequiredFieldsValue);

    const isRequiredFieldsFilled = () => {
        for (const field of requiredFields) {
            if (vpc[field].length === 0) {
                return false;
            }
        }
        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    React.useEffect(() => {
        updateError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numFieldsInError, requiredFields, vpc.vpcId]);

    const formFieldProps = {
        vpcData: vpc,
        setHelpPanelContent: setHelpPanelContent,
        setNumFieldsInError: setNumFieldsInError,
        onChangeFn: onChange
    };

    const allowEditExistingVpcParams =
        vpc.isVpcRequired && (vpc.existingVpc || (vpc.vpcId && deploymentAction === DEPLOYMENT_ACTIONS.EDIT));

    const disableEditOfSysCreatedVpcParams =
        vpc.isVpcRequired && !vpc.existingVpc && deploymentAction === DEPLOYMENT_ACTIONS.EDIT;

    const isVpcAttributeInvalid = (): boolean => {
        return (
            !isAttrItemsValid(vpc.securityGroupIds, isSecurityGroupValid) ||
            !isAttrItemsValid(vpc.subnetIds, isSubnetIdValid)
        );
    };

    const isVpcAttributeValid = (): boolean => {
        return (
            isAttrItemsValid(vpc.securityGroupIds, isSecurityGroupValid) &&
            isAttrItemsValid(vpc.subnetIds, isSubnetIdValid)
        );
    };

    React.useEffect(() => {
        if (vpc.isVpcRequired && vpc.existingVpc) {
            setRequiredFields(['subnetIds', 'securityGroupIds']);

            if (isVpcAttributeInvalid()) {
                onChange({ inError: true });
            } else if (isVpcAttributeValid()) {
                setNumFieldsInError(0);
                onChange({ inError: false });
            }
        } else if (vpc.isVpcRequired && !vpc.existingVpc) {
            setNumFieldsInError(0);
            setRequiredFields([]);
            onChange({ inError: false });
        }
    }, [vpc.isVpcRequired, vpc.existingVpc, vpc.securityGroupIds, vpc.subnetIds]);

    return (
        <Box margin={{ bottom: 'l' }}>
            <Container header={<Header variant="h2">VPC options</Header>}>
                <SpaceBetween size="s">
                    {deploymentAction === DEPLOYMENT_ACTIONS.EDIT && !vpc.isVpcRequired && (
                        <Box variant="p">
                            VPC cannot be configured on Edit for an Use Case deployed without VPC. Please proceed to the
                            next step.
                        </Box>
                    )}
                    <div key={'key-1'}>
                        {deploymentAction !== DEPLOYMENT_ACTIONS.EDIT && <DeployVpc {...formFieldProps} />}
                    </div>

                    <div key={'key-2'}>
                        {vpc.isVpcRequired && deploymentAction !== DEPLOYMENT_ACTIONS.EDIT && (
                            <UseExistingVpc {...formFieldProps} />
                        )}
                    </div>

                    <div key={'key-3'}>
                        {allowEditExistingVpcParams && (
                            <VpcId disabled={deploymentAction === DEPLOYMENT_ACTIONS.EDIT} {...formFieldProps} />
                        )}
                    </div>

                    <div key={'key-4'}>
                        {allowEditExistingVpcParams && (
                            <SubnetIdAttrEditor disabled={disableEditOfSysCreatedVpcParams} {...formFieldProps} />
                        )}
                    </div>

                    <div key={'key-5'}>
                        {allowEditExistingVpcParams && (
                            <SecurityGroupAttrEditor disabled={disableEditOfSysCreatedVpcParams} {...formFieldProps} />
                        )}
                    </div>
                </SpaceBetween>
            </Container>
        </Box>
    );
};

export default Vpc;
