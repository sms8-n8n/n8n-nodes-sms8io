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
                description: 'Phone number to send SMS to - any format accepted',
                required: true,
                hint: 'Enter phone number in any format - validation is handled by SMS8',
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
                hint: 'Messages over 160 characters will be sent as multiple SMS',
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
                    {
                        displayName: 'Retry Attempts',
                        name: 'retryAttempts',
                        type: 'number',
                        default: 2,
                        description: 'Number of retry attempts if sending fails (0-5)',
                        typeOptions: {
                            minValue: 0,
                            maxValue: 5,
                        },
                    },
                ],
            },
        ],
    };

    /**
     * Helper function to sleep/delay execution
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean phone number - minimal processing, let SMS8 handle validation
     */
    private cleanPhoneNumber(phone: string): string {
        if (!phone) {
            throw new NodeOperationError(
                this.getNode(),
                'Phone number is required'
            );
        }

        // Just trim whitespace, keep everything else
        return phone.trim();
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

                    // Minimal cleaning - no validation
                    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
                    const deviceInfo = `["${deviceId}|${simSlot}"]`;
                    const retryAttempts = additionalFields.retryAttempts !== undefined 
                        ? additionalFields.retryAttempts 
                        : 2;

                    // Add warning for long messages
                    const messageLength = message.length;
                    const smsCount = Math.ceil(messageLength / 160);
                    const messageLengthWarning = messageLength > 160 
                        ? `Message is ${messageLength} characters (${smsCount} SMS segments)` 
                        : '';

                    const url = `${baseUrl}/services/send.php?key=${apiKey}&number=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}&devices=${encodeURIComponent(deviceInfo)}&type=sms&prioritize=${additionalFields.prioritize ? 1 : 0}`;

                    let response: SMS8ApiResponse | null = null;
                    let lastError: Error | null = null;
                    let attempt = 0;

                    // Retry logic
                    while (attempt <= retryAttempts) {
                        try {
                            response = await this.helpers.request({
                                method: 'GET',
                                url: url,
                                json: true,
                            });

                            if (response.success) {
                                break; // Success, exit retry loop
                            } else {
                                lastError = new Error(response.error?.message || 'Unknown error');
                            }
                        } catch (error) {
                            lastError = error as Error;
                        }

                        attempt++;
                        if (attempt <= retryAttempts) {
                            // Wait before retrying (exponential backoff)
                            await this.sleep(1000 * attempt);
                        }
                    }

                    if (!response || !response.success) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `SMS sending failed after ${attempt} attempts: ${lastError?.message || 'Unknown error'}`
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
                            messageLength: messageLength,
                            smsSegments: smsCount,
                            messageLengthWarning: messageLengthWarning,
                            deviceId: deviceId,
                            simSlot: parseInt(simSlot),
                            status: messageData?.status || 'Pending',
                            sentDate: messageData?.sentDate || new Date().toISOString(),
                            retryAttempts: attempt,
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
