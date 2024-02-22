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

import { useContext, useEffect } from 'react';

import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { KnowledgeBaseConfigProps } from '../../../interfaces/Steps';
import KendraResourceRetentionWarning from './KendraResourceRetentionWarning';
import ExistingKendraIndexOption from './ExistingKendraIndexOption';
import { KendraIndexId } from './KendraIndexId';
import { KendraIndexName } from './KendraIndexName';
import AdditionalKendraOptions from './AdditionalKendraOptions';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import HomeContext from '../../../../../contexts/home.context';

type KendraProps = KnowledgeBaseConfigProps;

const KendraComponentsOnEdit = (props: KendraProps) => {
    return <KendraIndexId {...props} />;
};

const KendaComponentsOnCreate = (props: KendraProps) => {
    return (
        <SpaceBetween size="l">
            <ExistingKendraIndexOption {...props} />
            {props.knowledgeBaseData.existingKendraIndex === 'no' && (
                <SpaceBetween size="l">
                    <KendraIndexName {...props} />
                    <KendraResourceRetentionWarning />
                </SpaceBetween>
            )}
            {props.knowledgeBaseData.existingKendraIndex === 'yes' && <KendraIndexId {...props} />}
        </SpaceBetween>
    );
};

export const Kendra = (props: KendraProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    useEffect(() => {
        if (props.knowledgeBaseData.existingKendraIndex === 'yes') {
            props.setRequiredFields!(['kendraIndexId']);
        } else {
            props.setRequiredFields!(['kendraIndexName']);
        }
    }, [props.knowledgeBaseData.existingKendraIndex]);

    return (
        <Container
            header={<Header variant="h2">Knowledge base configuration</Header>}
            footer={props.knowledgeBaseData.existingKendraIndex === 'no' && <AdditionalKendraOptions {...props} />}
            data-testid="kendra-container"
        >
            <SpaceBetween size="l">
                {deploymentAction === DEPLOYMENT_ACTIONS.EDIT && <KendraComponentsOnEdit {...props} />}
                {deploymentAction !== DEPLOYMENT_ACTIONS.EDIT && <KendaComponentsOnCreate {...props} />}
            </SpaceBetween>
        </Container>
    );
};

export default Kendra;
