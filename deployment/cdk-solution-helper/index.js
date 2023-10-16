/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// Imports
const fs = require("fs");

// Paths
const global_s3_assets = "../../deployment/global-s3-assets";

//this regular express also takes into account lambda functions defined in nested stacks
const _regex = /[\w]*AssetParameters/g;

// For each template in global_s3_assets ...
fs.readdirSync(global_s3_assets).forEach((file) => {
	// Import and parse template file
	const raw_template = fs.readFileSync(`${global_s3_assets}/${file}`);
	let template = JSON.parse(raw_template);

	// Clean-up Lambda function code dependencies
	const resources = template.Resources ? template.Resources : {};
	const lambdaFunctions = Object.keys(resources).filter(function (key) {
		return resources[key].Type === "AWS::Lambda::Function" || resources[key].Type === "AWS::Lambda::LayerVersion";
	});

	lambdaFunctions.forEach(function (f) {
		const fn = template.Resources[f];
		let prop;
		if (fn.Properties.hasOwnProperty("Code")) {
			prop = fn.Properties.Code;
		} else if (fn.Properties.hasOwnProperty("Content")) {
			prop = fn.Properties.Content;
		}

		if (prop.hasOwnProperty("S3Bucket")) {
			// Set the S3 key reference
			let artifactHash = Object.assign(prop.S3Key);
			const assetPath = `asset${artifactHash}`;
			prop.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${assetPath}`;

			// Set the S3 bucket reference
			prop.S3Bucket = {
				"Fn::Sub": "%%BUCKET_NAME%%-${AWS::Region}",
			};
		} else {
			console.warn(`No S3Bucket Property found for ${JSON.stringify(prop)}`);
		}
	});

	// Clean-up nested template stack dependencies
	const nestedStacks = Object.keys(resources).filter(function (key) {
		return resources[key].Type === "AWS::CloudFormation::Stack";
	});

	nestedStacks.forEach(function (f) {
		const fn = template.Resources[f];
		if (!fn.Metadata.hasOwnProperty("aws:asset:path")) {
			throw new Error("Nested stack construct missing file name metadata");
		}
		fn.Properties.TemplateURL = {
			"Fn::Join": [
				"",
				[
					"https://%%TEMPLATE_BUCKET_NAME%%.s3.",
					{
						Ref: "AWS::URLSuffix",
					},
					"/",
					`%%SOLUTION_NAME%%/%%VERSION%%/${fn.Metadata["aws:asset:path"].slice(0, -".json".length)}`,
				],
			],
		};

		const params = fn.Properties.Parameters ? fn.Properties.Parameters : {};
		const nestedStackParameters = Object.keys(params).filter(function (key) {
			if (key.search(_regex) > -1) {
				return true;
			}
			return false;
		});

		nestedStackParameters.forEach(function (stkParam) {
			fn.Properties.Parameters[stkParam] = undefined;
		});
	});

	// Clean-up parameters section
	const parameters = template.Parameters ? template.Parameters : {};
	const assetParameters = Object.keys(parameters).filter(function (key) {
		if (key.search(_regex) > -1) {
			return true;
		}
		return false;
	});
	assetParameters.forEach(function (a) {
		template.Parameters[a] = undefined;
	});

	// Output modified template file
	const output_template = JSON.stringify(template, null, 2);
	fs.writeFileSync(`${global_s3_assets}/${file}`, output_template);
});
