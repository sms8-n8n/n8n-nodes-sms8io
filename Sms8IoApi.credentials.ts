import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Sms8IoApi implements ICredentialType {
	name = 'sms8IoApi';
	displayName = 'SMS8.io API';
	documentationUrl = 'https://sms8.io/sms8-api-documentation/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Enter your SMS8.io API key',
			description: 'Get your API key from SMS8.io dashboard',
			required: true,
		},
	];
}
