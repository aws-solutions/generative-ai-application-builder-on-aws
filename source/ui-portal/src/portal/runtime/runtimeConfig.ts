export type RuntimeConfig = {
  AwsRegion: string;
  UserPoolId: string;
  UserPoolClientId: string;
  CognitoDomain: string;
  CognitoRedirectUrl: string;
  RestApiEndpoint: string;
};

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const resp = await fetch('/runtimeConfig.json', { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`Failed to fetch runtimeConfig.json: ${resp.status}`);
  }
  return (await resp.json()) as RuntimeConfig;
}

export function constructAmplifyConfig(config: RuntimeConfig) {
  const endpoint = config.RestApiEndpoint.endsWith('/')
    ? config.RestApiEndpoint.slice(0, -1)
    : config.RestApiEndpoint;

  return {
    Auth: {
      region: config.AwsRegion,
      userPoolId: config.UserPoolId,
      userPoolWebClientId: config.UserPoolClientId,
      oauth: {
        domain: config.CognitoDomain,
        scopes: ['aws.cognito.signin.user.admin', 'email', 'openid', 'profile'],
        redirectSignIn: config.CognitoRedirectUrl,
        redirectSignOut: config.CognitoRedirectUrl,
        responseType: 'code'
      }
    },
    API: {
      endpoints: [
        {
          name: 'api',
          endpoint,
          region: config.AwsRegion
        }
      ]
    }
  };
}


