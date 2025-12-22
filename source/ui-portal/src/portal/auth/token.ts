import { Auth } from 'aws-amplify';

export async function getIdToken(): Promise<string> {
  const user = await Auth.currentAuthenticatedUser();
  return user.getSignInUserSession().getIdToken().getJwtToken();
}


