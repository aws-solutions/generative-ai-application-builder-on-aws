// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
import { KNOWLEDGE_BASE_PROVIDERS } from '@/components/wizard/steps-config';

type KendraProps = KnowledgeBaseConfigProps;

const KendraComponentsOnEdit = (props: KendraProps) => {
    return <KendraIndexId {...props} />;
};

const KendaComponentsOnCreate = (props: KendraProps) => {
    return (
        <SpaceBetween size="l">
            <ExistingKendraIndexOption {...props} />
            {props.knowledgeBaseData.existingKendraIndex === 'No' && (
                <SpaceBetween size="l">
                    <KendraIndexName {...props} />
                    <KendraResourceRetentionWarning />
                </SpaceBetween>
            )}
            {props.knowledgeBaseData.existingKendraIndex === 'Yes' && <KendraIndexId {...props} />}
        </SpaceBetween>
    );
};

export const Kendra = (props: KendraProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    useEffect(() => {
        if (props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra) {
            if (props.knowledgeBaseData.existingKendraIndex === 'Yes' || deploymentAction === DEPLOYMENT_ACTIONS.EDIT) {
                props.onChangeFn({
                    existingKendraIndex: 'Yes'
                });
                props.setRequiredFields!(['kendraIndexId']);
            } else {
                props.setRequiredFields!(['kendraIndexName']);
            }
        }
    }, [props.knowledgeBaseData.existingKendraIndex]);

    return (
        <Container
            header={<Header variant="h2">Knowledge base configuration</Header>}
            footer={props.knowledgeBaseData.existingKendraIndex === 'No' && <AdditionalKendraOptions {...props} />}
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
