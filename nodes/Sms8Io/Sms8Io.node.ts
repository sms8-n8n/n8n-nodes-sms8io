import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IRequestOptions,
} from 'n8n-workflow';

// Types for better type safety
interface SMS8ApiResponse {
	success: boolean;
	data?: {
		messages?: SMS8Message[];
		devices?: SMS8Device[];
	};
	error?: {
		message: string;
		code?: string;
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
	simCards?: Array<{
		slot: number;
		operator: string;
		number: string;
	}>;
}

export class Sms8Io implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SMS8.io',
		name: 'sms8Io',
		icon: 'file:sms8io.svg',
		group: ['communication'],
		version: 1,
		subtitle:
			'={{$parameter["operation"] + ": " + ($parameter["phoneNumber"] || $parameter["messageStatus"] || "devices")}}',
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
