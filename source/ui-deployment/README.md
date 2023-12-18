## Generative AI Application Builder on AWS - Deployment Dashboard

This project is the web interface (UI Application) that provides the front-end experience. The application is
based on [Reactjs](https://react.dev/) framework and uses components from the [AWS Cloudscape Design System](https://cloudscape.design/)

### Local Configuration Setup

To build and run the application locally, the setup requires

-   [Nodejs 18.x](https://nodejs.org/en) or higher installed

Follow the below steps before building the web app for local execution

-   The backend infrastructure stacks from `source/infrastructure` are deployed in your AWS account
-   Create a file `source/ui-deployment/public/runtimeConfig.json` (if one does not exist) by executing

```
mkdir -p source/ui-deployment/public
touch source/ui-deployment/public/runtimeConfig.json
```

-   From the AWS CloudFormation console, navigate to the `Outputs` tab of the main/ parent stack deployed and copy the `Value` of the `Key` named `WebConfigKey`.
-   Navigate to AWS Systems Manager Parameter Store in the AWS web console, search for the `Key` in the previous step and copy the contents into the file created in the previous (step #2) steps (`source/ui-deployment/public/runtimeConfig.json`)

For reference, the string in the Parameter Store should look something like the below:

```
{
  "KnowledgeBaseParams": {
    "kendra": {
      "MaxQueryCapacityUnits": "1",
      "DefaultNewKendraIndexName": "GAABKnowledgeBaseIndex",
      "MaxNumberOfDocs": "5",
      "DefaultStorageCapacityUnits": "0",
      "AvailableEditions": [
        "DEVELOPER_EDITION",
        "ENTERPRISE_EDITION"
      ],
      "MinNumberOfDocs": "1",
      "MaxStorageCapacityUnits": "5",
      "DefaultQueryCapacityUnits": "0",
      "DefaultEdition": "DEVELOPER_EDITION",
      "DefaultNumberOfDocs": "2"
    }
  },
  "ModelProviders": {
    "HuggingFace": {
      "ModelProviderParams": {
        "RAGPromptTemplate": <Prompt>
      },
      "SupportedModels": [
        "google/flan-t5-xxl",
        "google/flan-t5-xl",
        "google/flan-t5-large",
        "google/flan-t5-base",
        "google/flan-t5-small"
      ],
      "AllowsStreaming": "false"
    },
    "Anthropic": {
      "ModelProviderParams": <Prompt>,
      "SupportedModels": [
        "claude-instant-1",
        "claude-1",
        "claude-2"
      ],
      "AllowsStreaming": "true"
    },
    "Bedrock": {
      "ModelFamilyParams": {
        "amazon": <Prompt>,
        "anthropic": <Prompt>,
        "ai21": <Prompt>
      },
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
      "AllowsStreaming": "true"
    }
  },
  "UserPoolId": "us-east-1_mCkSfPSu6",
  "IsInternalUser": "true",
  "ApiEndpoint": "https://anoc6xgfh7.execute-api.us-east-1.amazonaws.com/prod/",
  "UserPoolClientId": "2s3s7luhoenog5stee92s5cgco",
  "AwsRegion": "us-east-1"
}
```

After completing the above steps, you can run the web application locally.

### Build and Run the App Locally

1. From the project root directory, change directory to `source/ui-deployment`

```
    cd source/ui-deployment
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
