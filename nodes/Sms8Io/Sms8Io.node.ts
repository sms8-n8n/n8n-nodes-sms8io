import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

interface SMS8ApiResponse {
    success: boolean;
    data?: {
        messages?: SMS8Message[];
        devices?: SMS8Device[];
    };
    error?: {
        message: string;
    };
}

interface SMS8Message {
    ID: string;
    status: 'Pending' | 'Sent' | 'Delivered' | 'Failed';
    sentDate: string;
    number: string;
    message: string;
    deviceID: string;
    simSlot: number;
    deliveredDate?: string;
    type: string;
}

interface SMS8Device {
    ID: string;
    name: string;
    status: 'Online' | 'Offline';
    lastSeen: string;
    model?: string;
    androidVersion?: string;
    appVersion?: string;
}

export class Sms8Io implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SMS8.io',
        name: 'sms8Io',
        icon: 'file:sms8io.svg',
        group: ['communication'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + ($parameter["phoneNumber"] || $parameter["messageStatus"] || "devices")}}',
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
                    {
                        name: 'Get Devices',
                        value: 'getDevices',
                        description: 'Get list of your connected Android devices',
                        action: 'Get available devices',
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
                description: 'Phone number to send SMS to (international format recommended)',
                required: true,
                hint: 'Use international format like +212661234567',
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
                    rows: 4,
                },
                default: '',
                placeholder: 'Hello {{ $json.name }}, your order is ready!',
                description: 'SMS message content (supports n8n expressions)',
                required: true,
                hint: 'Maximum 160 characters for single SMS',
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
                description: 'Your Android device ID (find in SMS8 mobile app or use "Get Devices" operation)',
                required: true,
                hint: 'Get this from your SMS8 Android app settings or use "Get Devices" operation',
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
                        description: 'Primary SIM card slot',
                    },
                    {
                        name: 'SIM 2',
                        value: '1',
                        description: 'Secondary SIM card slot',
                    },
                ],
                default: '0',
                description: 'Select which SIM card to use for sending',
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
                        description: 'Get all messages regardless of status',
                    },
                    {
                        name: 'Pending',
                        value: 'Pending',
                        description: 'Messages waiting to be sent',
                    },
                    {
                        name: 'Sent',
                        value: 'Sent',
                        description: 'Successfully sent messages',
                    },
                    {
                        name: 'Delivered',
                        value: 'Delivered',
                        description: 'Messages confirmed as delivered',
                    },
                    {
                        name: 'Failed',
                        value: 'Failed',
                        description: 'Messages that failed to send',
                    },
                ],
                default: 'all',
                description: 'Filter messages by delivery status',
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
                        displayName: 'High Priority',
                        name: 'prioritize',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to send message with high priority',
                    },
                ],
            },
        ],
    };

    /**
     * Clean and validate phone number (international support)
     */
    private cleanAndValidatePhoneNumber(phone: string): string {
        if (!phone) {
            throw new NodeOperationError(
                this.getNode(),
                'Phone number is required'
            );
        }

        // Remove spaces, dashes, parentheses, but keep +
        let cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
        
        // Convert 00 to +
        if (cleanPhone.startsWith('00')) {
            cleanPhone = '+' + cleanPhone.substring(2);
        }

        // Check basic length (7-15 digits after country code)
        const digitsOnly = cleanPhone.replace(/^\+/, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            throw new NodeOperationError(
                this.getNode(),
                `Invalid phone number length. Expected 7-15 digits, got ${digitsOnly.length}: ${phone}`
            );
        }

        // Check that all characters are digits (except + at the beginning)
        if (!/^\+?[0-9]+$/.test(cleanPhone)) {
            throw new NodeOperationError(
                this.getNode(),
                `Invalid phone number format. Only digits and + allowed: ${phone}`
            );
        }

        // Add + if missing and number looks international
        if (!cleanPhone.startsWith('+') && digitsOnly.length >= 10) {
            cleanPhone = '+' + cleanPhone;
        }

        return cleanPhone;
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        const credentials = await this.getCredentials('sms8IoApi');
        const apiKey = credentials.apiKey as string;
        const baseUrl = 'https://app.sms8.io';

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

                    const cleanPhone = this.cleanAndValidatePhoneNumber(phoneNumber);
                    const deviceInfo = `["${deviceId}|${simSlot}"]`;
                    const url = `${baseUrl}/services/send.php?key=${apiKey}&number=${cleanPhone}&message=${encodeURIComponent(message)}&devices=${encodeURIComponent(deviceInfo)}&type=sms&prioritize=${additionalFields.prioritize ? 1 : 0}`;

                    const response: SMS8ApiResponse = await this.helpers.request({
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
                        url: `${baseUrl}/services/get-msgs.php`,
                        qs: {
                            key: apiKey,
                            ...(messageStatus !== 'all' && { status: messageStatus }),
                        },
                        json: true,
                    };

                    const response: SMS8ApiResponse = await this.helpers.request(requestOptions);

                    if (!response.success) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Failed to get messages: ${response.error?.message || 'Unknown error'}`
                        );
                    }

                    const messages = response.data?.messages || [];

                    if (messages.length > 0) {
                        messages.forEach((msg: SMS8Message) => {
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

                } else if (operation === 'getDevices') {
                    const requestOptions = {
                        method: 'GET' as const,
                        url: `${baseUrl}/services/get-devices.php`,
                        qs: {
                            key: apiKey,
                        },
                        json: true,
                    };

                    const response: SMS8ApiResponse = await this.helpers.request(requestOptions);

                    if (!response.success) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Failed to get devices: ${response.error?.message || 'Unknown error'}`
                        );
                    }

                    const devices = response.data?.devices || [];

                    if (devices.length > 0) {
                        devices.forEach((device: SMS8Device) => {
                            returnData.push({
                                json: {
                                    success: true,
                                    operation: 'getDevices',
                                    deviceId: device.ID,
                                    deviceName: device.name,
                                    status: device.status,
                                    lastSeen: device.lastSeen,
                                    model: device.model || 'Unknown',
                                    androidVersion: device.androidVersion || 'Unknown',
                                    appVersion: device.appVersion || 'Unknown',
                                },
                            });
                        });
                    } else {
                        returnData.push({
                            json: {
                                success: true,
                                operation: 'getDevices',
                                message: 'No devices found. Make sure you have the SMS8 app installed and configured on your Android device.',
                                devicesCount: 0,
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
