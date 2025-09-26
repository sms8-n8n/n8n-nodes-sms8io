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
            description: 'Get your API key from SMS8.io dashboard at <a href="https://sms8.io/dashboard" target="_blank">sms8.io/dashboard</a>',
            required: true,
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://app.sms8.io',
            description: 'Base URL for SMS8.io API (leave default unless instructed otherwise)',
            required: false,
        },
    ];

    // Test the connection
    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl || "https://app.sms8.io"}}',
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
