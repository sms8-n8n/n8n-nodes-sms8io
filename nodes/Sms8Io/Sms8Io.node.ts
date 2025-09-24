import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class Sms8Io implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SMS8.io',
        name: 'sms8Io',
        icon: 'file:sms8io.svg',
        group: ['communication'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["phoneNumber"]}}',
        description: 'Send SMS messages using SMS8.io Android SMS Gateway',
        defaults: {
            name: 'SMS8.io',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'sms8IoApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Send SMS',
                        value: 'sendSms',
                        description: 'Send a text message',
                        action: 'Send SMS message',
                    },
                    {
                        name: 'Get Messages',
                        value: 'getMessages',
                        description: 'Get message status and history',
                        action: 'Get message status',
                    },
                ],
                default: 'sendSms',
            },
            {
                displayName: 'Phone Number',
                name: 'phoneNumber',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendSms'],
                    },
                },
                default: '',
                placeholder: '+212661234567 or {{ $json.phone }}',
                description: 'Phone number to send SMS to',
                required: true,
            },
            {
                displayName: 'Message Text',
                name: 'message',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendSms'],
                    },
                },
                typeOptions: {
                    rows: 3,
                },
                default: '',
                placeholder: 'Hello {{ $json.name }}, your order is ready!',
                description: 'SMS message content (supports expressions)',
                required: true,
            },
            {
                displayName: 'Device ID',
                name: 'deviceId',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendSms'],
                    },
                },
                default: '',
                placeholder: '182',
                description: 'Your Android device ID (find in SMS8 app)',
                required: true,
            },
            {
                displayName: 'SIM Slot',
                name: 'simSlot',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['sendSms'],
                    },
                },
                options: [
                    {
                        name: 'SIM 1',
                        value: '0',
                    },
                    {
                        name: 'SIM 2',
                        value: '1',
                    },
                ],
                default: '0',
                description: 'Select SIM slot',
            },
            {
                displayName: 'Status Filter',
                name: 'messageStatus',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['getMessages'],
                    },
                },
                options: [
                    {
                        name: 'All Messages',
                        value: 'all',
                    },
                    {
                        name: 'Pending',
                        value: 'Pending',
                    },
                    {
                        name: 'Sent',
                        value: 'Sent',
                    },
                    {
                        name: 'Delivered',
                        value: 'Delivered',
                    },
                    {
                        name: 'Failed',
                        value: 'Failed',
                    },
                ],
                default: 'all',
                description: 'Filter messages by status',
            },
            {
                displayName: 'Additional Options',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Option',
                displayOptions: {
                    show: {
                        operation: ['sendSms'],
                    },
                },
                default: {},
                options: [
                    {
                        displayName: 'Priority',
                        name: 'prioritize',
                        type: 'boolean',
                        default: false,
                        description: 'Send with high priority',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        const credentials = await this.getCredentials('sms8IoApi');
        const apiKey = credentials.apiKey as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'sendSms') {
                    const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
                    const message = this.getNodeParameter('message', i) as string;
                    const deviceId = this.getNodeParameter('deviceId', i) as string;
                    const simSlot = this.getNodeParameter('simSlot', i) as string;
                    const additionalFields = this.getNodeParameter('additionalFields', i) as any;

                    if (!phoneNumber || !message || !deviceId) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'Phone number, message, and device ID are required'
                        );
                    }

                    const cleanPhone = phoneNumber.replace(/[\s\-\(\)+]/g, '');
                    const deviceInfo = `["${deviceId}|${simSlot}"]`;
                    const url = `https://app.sms8.io/services/send.php?key=${apiKey}&number=${cleanPhone}&message=${encodeURIComponent(message)}&devices=${encodeURIComponent(deviceInfo)}&type=sms&prioritize=${additionalFields.prioritize ? 1 : 0}`;

                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url,
                        json: true,
                    });

                    if (!response.success) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `SMS sending failed: ${response.error?.message || 'Unknown error'}`
                        );
                    }

                    const messageData = response.data?.messages?.[0];
                    
                    returnData.push({
                        json: {
                            success: true,
                            operation: 'sendSms',
                            messageId: messageData?.ID || null,
                            phoneNumber: cleanPhone,
                            message: message,
                            deviceId: deviceId,
                            simSlot: parseInt(simSlot),
                            status: messageData?.status || 'Pending',
                            sentDate: messageData?.sentDate || new Date().toISOString(),
                            response: response
                        },
                    });

                } else if (operation === 'getMessages') {
                    const messageStatus = this.getNodeParameter('messageStatus', i) as string;

                    const requestOptions = {
                        method: 'GET' as const,
                        url: 'https://app.sms8.io/services/get-msgs.php',
                        qs: {
                            key: apiKey,
                            ...(messageStatus !== 'all' && { status: messageStatus }),
                        },
                        json: true,
                    };

                    const response = await this.helpers.request(requestOptions);

                    if (!response.success) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Failed to get messages: ${response.error?.message || 'Unknown error'}`
                        );
                    }

                    const messages = response.data?.messages || [];

                    if (messages.length > 0) {
                        messages.forEach((msg: any) => {
                            returnData.push({
                                json: {
                                    success: true,
                                    operation: 'getMessages',
                                    messageId: msg.ID,
                                    phoneNumber: msg.number,
                                    message: msg.message,
                                    deviceId: msg.deviceID,
                                    simSlot: msg.simSlot,
                                    status: msg.status,
                                    sentDate: msg.sentDate,
                                    deliveredDate: msg.deliveredDate,
                                    type: msg.type,
                                },
                            });
                        });
                    } else {
                        returnData.push({
                            json: {
                                success: true,
                                operation: 'getMessages',
                                message: 'No messages found matching criteria',
                                filter: messageStatus,
                                count: 0,
                            },
                        });
                    }
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: error.message,
                            operation: operation,
                            input: items[i].json,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
