import { Box, Header } from "@cloudscape-design/components";
import { BaseFormComponentProps } from "../interfaces";
import UseExistingUserPool from "./UseExistingUserPool";
import UserPoolId from "./UserPoolId";

export interface UserPoolFieldProps extends BaseFormComponentProps {
    existingUserPool: boolean;
    userPoolId: string;
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


export const UserPool = (props: UserPoolFieldProps) => {

    return (
        <Box margin={{ bottom: 'l' }}>
            <Header variant="h3">User Pool Configuration</Header>

            <UseExistingUserPool {...props} />

            {props.existingUserPool && (
                <UserPoolId {...props} />
            )}

        </Box>
    );

}


export default UserPool;