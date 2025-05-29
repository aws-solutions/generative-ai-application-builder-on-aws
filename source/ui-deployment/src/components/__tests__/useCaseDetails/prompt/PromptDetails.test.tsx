import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { PromptDetails } from '@/components/useCaseDetails/prompt/PromptDetails';
import { renderWithProvider } from '@/utils';
import { baseMock, ragEnabledMock, ragDisabledMock } from '../../__mocks__/mock-context-variants';

describe('PromptDetails', () => {
    afterEach(cleanup);

    test('renders the component', () => {
        renderWithProvider(<PromptDetails selectedDeployment={baseMock.selectedDeployment} />, {
            route: '/deployment-details'
        });
        const component = screen.getByTestId('prompt-details-component');
        expect(component).toBeInTheDocument();
    });

    test('renders prompt experience component', () => {
        renderWithProvider(<PromptDetails selectedDeployment={baseMock.selectedDeployment} />, {
            route: '/deployment-details'
        });
        const promptExperienceComponent = screen.getByTestId('prompt-experience-details-component');
        expect(promptExperienceComponent).toBeInTheDocument();
    });

    test('renders prompt history component', () => {
        renderWithProvider(<PromptDetails selectedDeployment={baseMock.selectedDeployment} />, {
            route: '/deployment-details'
        });
        const promptHistoryComponent = screen.getByTestId('prompt-history-details-component');
        expect(promptHistoryComponent).toBeInTheDocument();
    });

    test('renders disambiguation prompt details when RAGEnabled is true', () => {
        renderWithProvider(<PromptDetails selectedDeployment={ragEnabledMock.selectedDeployment} />, {
            route: '/deployment-details'
        });
        const disambiguationDetailsComponent = screen.getByTestId('prompt-disambiguation-details-component');
        expect(disambiguationDetailsComponent).toBeInTheDocument();
    });

    test('does not render disambiguation prompt details when RAGEnabled is false', () => {
        renderWithProvider(<PromptDetails selectedDeployment={ragDisabledMock.selectedDeployment} />, {
            route: '/deployment-details'
        });
        const disambiguationDetailsComponent = screen.queryByTestId('prompt-disambiguation-details-component');
        expect(disambiguationDetailsComponent).not.toBeInTheDocument();
    });
});
