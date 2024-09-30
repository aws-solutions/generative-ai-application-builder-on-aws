import { Alert, Box, Header } from "@cloudscape-design/components";
import { BaseFormComponentProps } from "../../interfaces";
import ExistingUserPoolClientId from "./ExistingUserPoolClientId";
import ExistingUserPoolId from "./ExistingUserPoolId";
import UseExistingUserPoolClientId from "./UseExistingUserPoolClientId";
import UseExistingUserPoolId from "./UseExistingUserPoolId";

export interface UserPoolFieldProps extends BaseFormComponentProps {
    useExistingUserPoolId: boolean;
    existingUserPoolId: string;
    useExistingUserPoolClientId: boolean;
    existingUserPoolClientId: string;
    disabled?: boolean;
}


/**
 * Validate user pool id based on:
 * https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolType.html
 * @param userPoolId user pool id string
 * @returns
 */
export const isUserPoolIdValid = (userPoolId: string) => {
    if (userPoolId === '') {
        return false;
    }

    return userPoolId.match('^[\\w-]+_[0-9a-zA-Z]+$') !== null && userPoolId.length >= 1 && userPoolId.length <= 55;
};

/**
 * Validate user pool client id based on:
 * https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolClientType.html
 * @param userPoolClientId user pool id string
 * @returns
 */
export const isUserPoolClientIdValid = (userPoolClientId: string) => {
    if (userPoolClientId === '') {
        return false;
    }

    return userPoolClientId.match('^[\\w+]+') !== null && userPoolClientId.length >= 1 && userPoolClientId.length <= 128;
};



export const UserPool = (props: UserPoolFieldProps) => {

    return (
        <Box margin={{ bottom: 'l' }}>
            <Header variant="h3">User Pool Configuration</Header>


            {props.disabled && (
                <Box variant="p" margin={{ 'bottom': 'l' }}>
                    <Alert
                        statusIconAriaLabel="warning"
                        type="warning"
                        data-testid="user-pool-locked-warning">
                        User Pool Settings cannot be modified for the deployed Use Case.
                    </Alert>
                </Box>
            )}

            <UseExistingUserPoolId {...props} />

            {props.useExistingUserPoolId && (
                <>
                    <ExistingUserPoolId {...props} />
                    <UseExistingUserPoolClientId {...props} />

                    {props.useExistingUserPoolClientId && (
                        <ExistingUserPoolClientId {...props} />
                    )}
                </>

            )}
        </Box>
    );

}


export default UserPool;
