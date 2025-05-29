## Generative AI Application Builder on AWS - Deployment Dashboard

This project is the web interface (UI Application) that provides the front-end experience. The application is
based on [Reactjs](https://react.dev/) framework and uses components from the [AWS Cloudscape Design System](https://cloudscape.design/)

### Local Configuration Setup

To build and run the application locally, the setup requires

-   [Nodejs 18.x](https://nodejs.org/en) or higher installed

#### Option 1 - Script

To set up your local development environment, use `/source/scripts/ui_dev_setup/setup_local_dev_server.py`. Instructions for running the script can be found in the comments at the bottom of the file.

#### Option 2 - Manual

To perform these steps manually, follow the below steps before building the web app for local execution

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
            "MaxNumberOfDocs": "100",
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
    "ApiEndpoint": "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/",
    "UserPoolClientId": "xxxxxxxxx",
    "UserPoolId": "us-east-1_xxxxxxxxx",
    "IsInternalUser": "false",
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

Local Development Setup - Cognito Configuration

1. Get your local server URL
   - Run `npm start`
   - Note the ********* URL that appears

2. Update your configuration files:
   - Open runtimeConfig.json
   - Set CognitoRedirectUrl to your ********* URL

3. Configure Cognito to allow your local URL:
   a. Open AWS Console and navigate to Cognito
   b. Go to User Pools
   c. Find your user pool using the UserPoolId from runtimeConfig.json
   d. Click App integration → App clients
   e. Select the client matching the UserPoolClientId from runtimeConfig.json
   f. Under Hosted UI settings, click 'Edit'
   g. Add your ********* URL to the 'Allowed callback URLs'
   h. Save changes

This enables Cognito to redirect back to your local development server after authentication.

You should now be able to log in with the User Id and Password for which you should have received an email during deployment. You can also
create additional users in the Amazon Cognito User Pool from the AWS web console.
