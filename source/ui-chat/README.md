## Generative AI Application Builder on AWS - WebApp

This project is the web interface (UI Application) that provides the front-end experience. The application is
based on [Reactjs](https://react.dev/) framework and uses components from the [AWS Cloudscape Design System](https://cloudscape.design/)

### Local Configuration Setup

To build and run the application locally, the setup requires

-   [Nodejs 18.x](https://nodejs.org/en) or higher installed

Follow the below steps before building the web app for local execution

-   The backend infrastructure stacks from `source/infrastructure` are deployed in your AWS account
-   Create a file `source/ui-chat/public/runtimeConfig.json` (if one does not exist) by executing

```
mkdir -p source/ui-chat/public
touch source/ui-chat/public/runtimeConfig.json
```

-   From the AWS CloudFormation console, navigate to the `Outputs` tab of the main/ parent stack deployed and copy the `Value` of the `Key` named `WebConfigKey`.
-   Navigate to AWS Systems Manager Parameter Store in the AWS web console, search for the `Key` in the previous step and copy the contents into the file created in the previous (step #2) steps (`source/ui-chat/public/runtimeConfig.json`)

For reference, the string in the Parameter Store should look something like the below:

```
{
    "ModelFamilyParams": {
        "amazon": <Prompt>,
        "anthropic": <Prompt>,
        "ai21": <Prompt>
    },
    "UserPoolId": "us-east-1_mCkSfPSu6",
    "SupportedModels": [
        "ai21.j2-ultra",
        "ai21.j2-mid",
        "amazon.titan-text-express-v1",
        "anthropic.claude-v1",
        "anthropic.claude-v2",
        "anthropic.claude-instant-v1",
        "meta.llama2-13b-chat-v1",
        "meta.llama2-70b-chat-v1",
        "cohere.command-text-v14",
        "cohere.command-light-text-v14"
    ],
    "AllowsStreaming": "true",
    "IsInternalUser": "true",
    "UserPoolClientId": "bs147rk5tak12cnq080ajsieh",
    "ModelProviderName": "Bedrock",
    "ApiEndpoint": "wss://4g3lbfhl3k.execute-api.us-east-1.amazonaws.com",
    "SocketURL": "wss://4g3lbfhl3k.execute-api.us-east-1.amazonaws.com/prod",
    "AwsRegion": "us-east-1",
    "UseCaseConfig": {
        "UseCaseName": "demo-bedrock-aws-docs",
        "ConversationMemoryType": "DynamoDB",
        "KnowledgeBaseType": "Kendra",
        "KnowledgeBaseParams": {
            "NumberOfDocs": 5,
            "ReturnSourceDocs": false
        },
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "ModelId": "anthropic.claude-v1",
            "ModelParams": {},
            "PromptTemplate": "",
            "Streaming": true,
            "Verbose": false,
            "Temperature": 0.1,
            "RAGEnabled": true
        }
    }
}
```

After completing the above steps, you can run the web application locally.

### Build and Run the App Locally

1. From the project root directory, change directory to `source/ui-chat`

```
    cd source/ui-chat
```

2. Install the library modules if building the project for the first time

```
    npm install
```

3. Building the project with the below command will generate a `build` folder which contains
   the compiled components and minified javascript files.

```
    npm run build
```

4. Executing the following command will run a local server on port 3000 (http://localhost:3000)

```
    npm start
```

You should now be able to log in with the User Id and Password for which you should have received an email during deployment. You can also
create additional users in the Amazon Cognito User Pool from the AWS web console.
