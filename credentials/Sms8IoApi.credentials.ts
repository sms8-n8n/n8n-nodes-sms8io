import {
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest,
} from 'n8n-workflow';

export class Sms8IoApi implements ICredentialType {
    name = 'sms8IoApi';
    displayName = 'SMS8.io API';
    documentationUrl = 'https://sms8.io/sms8-api-documentation/';
    icon = 'file:sms8io.svg';
    
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

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://app.sms8.io',
            url: '/services/get-devices.php',
            method: 'GET',
            qs: {
                key: '={{$credentials.apiKey}}',
            },
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'success',
                    value: true,
                },
            },
        ],
    };
}
