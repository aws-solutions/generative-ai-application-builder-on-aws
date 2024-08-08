import { render, screen, cleanup } from '@testing-library/react';
import ScoreThreshold from '../ScoreThreshold';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils/test-utils';

describe('ScoreThreshold', () => {
    const defaultProps = {
        scoreThreshold: 0.5,
        knowledgeBaseProvider: 'Bedrock',
        'data-testid': 'mock-id',
        ...mockFormComponentCallbacks()
    };

    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    describe('test bedrock knowledge base', () => {
        it('renders correctly', () => {
            render(<ScoreThreshold {...defaultProps} />);
            expect(screen.getByTestId('mock-id-bedrock-input')).toBeInTheDocument();
            expect(screen.queryByTestId('mock-id-kendra-select')).not.toBeInTheDocument();
        });

        it('validates various score threshold inputs', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<ScoreThreshold {...defaultProps} />);

            let formFieldWrapper = cloudscapeWrapper?.findFormField();
            expect(formFieldWrapper).not.toBeNull();
            formFieldWrapper = formFieldWrapper!;

            let inputWrapper = formFieldWrapper?.findControl()?.findInput();
            expect(inputWrapper).not.toBeNull();
            inputWrapper = inputWrapper!;

            //test default state matches props passed from parent (prop is float but input is string)
            expect(inputWrapper.getInputValue()).toBe('0.5');
            expect(formFieldWrapper.findError()).toBeNull();

            //test normal value
            inputWrapper.setInputValue('0.7');
            expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0.7 });
            expect(formFieldWrapper.findError()).toBeNull();

            //test edge cases
            inputWrapper.setInputValue('0.0');
            expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0 });

            inputWrapper.setInputValue('1.0');
            expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 1 });
            expect(formFieldWrapper.findError()).toBeNull();

            //test out of bound error cases
            inputWrapper.setInputValue('-0.1');
            expect(formFieldWrapper.findError()).toBeDefined();

            inputWrapper.setInputValue('1.1');
            expect(formFieldWrapper.findError()).toBeDefined();
        });
    });

    describe('test kendra knowledge base', () => {
        it('renders correctly', () => {
            const props = { ...defaultProps, knowledgeBaseProvider: 'Kendra' };
            render(<ScoreThreshold {...props} />);
            expect(screen.getByTestId('mock-id-kendra-select')).toBeInTheDocument();
            expect(screen.queryByTestId('mock-id-bedrock-input')).not.toBeInTheDocument();
        });

        it('sets scoreThreshold to 0 when score threshold is out of range', () => {
            const props = { ...defaultProps, knowledgeBaseProvider: 'Kendra', scoreThreshold: -5 };
            const { cloudscapeWrapper } = cloudscapeRender(<ScoreThreshold {...props} />);

            let formFieldWrapper = cloudscapeWrapper?.findFormField();
            expect(formFieldWrapper).not.toBeNull();
            formFieldWrapper = formFieldWrapper!;

            let selectWrapper = formFieldWrapper?.findControl()?.findSelect();
            expect(selectWrapper).not.toBeNull();
            selectWrapper = selectWrapper!;

            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0 });
            expect(formFieldWrapper.findError()).toBeNull();
        });

        it('validates various score threshold inputs', () => {
            const props = { ...defaultProps, knowledgeBaseProvider: 'Kendra' };
            const { cloudscapeWrapper } = cloudscapeRender(<ScoreThreshold {...props} />);

            let formFieldWrapper = cloudscapeWrapper?.findFormField();
            expect(formFieldWrapper).not.toBeNull();
            formFieldWrapper = formFieldWrapper!;

            let selectWrapper = formFieldWrapper?.findControl()?.findSelect();
            expect(selectWrapper).not.toBeNull();
            selectWrapper = selectWrapper!;

            //test valid options
            selectWrapper.openDropdown();
            selectWrapper.selectOptionByValue('0.0'); //DISABLED
            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0 });
            expect(formFieldWrapper.findError()).toBeNull();

            selectWrapper.openDropdown();
            selectWrapper.selectOptionByValue('0.25'); //LOW
            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0.25 });
            expect(formFieldWrapper.findError()).toBeNull();

            selectWrapper.openDropdown();
            selectWrapper.selectOptionByValue('0.5'); //MEDIUM
            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0.5 });
            expect(formFieldWrapper.findError()).toBeNull();

            selectWrapper.openDropdown();
            selectWrapper.selectOptionByValue('0.75'); //HIGH
            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 0.75 });
            expect(formFieldWrapper.findError()).toBeNull();

            selectWrapper.openDropdown();
            selectWrapper.selectOptionByValue('1.0'); //VERY_HIGH
            expect(props.onChangeFn).toHaveBeenCalledWith({ scoreThreshold: 1 });
            expect(formFieldWrapper.findError()).toBeNull();

            //test out of bound error cases and non-options
            selectWrapper.openDropdown();
            expect(() => selectWrapper!.selectOptionByValue('-0.1')).toThrow();

            selectWrapper.openDropdown();
            expect(() => selectWrapper!.selectOptionByValue('0.6')).toThrow();

            selectWrapper.openDropdown();
            expect(() => selectWrapper!.selectOptionByValue('1.1')).toThrow();
        });
    });

    describe('test non existant "Fake" knowledge base', () => {
        it('renders empty score', () => {
            const props = { ...defaultProps, knowledgeBaseProvider: 'Fake' };
            const { container } = render(<ScoreThreshold {...props} />);
            expect(container.innerHTML).toBe('');
        });
    });
});
