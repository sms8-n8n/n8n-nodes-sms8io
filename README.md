# 📱 SMS8.io Node for n8n

Send SMS messages using your Android device as an SMS gateway through SMS8.io.

## ✨ Features

- 📤 Send SMS to any phone number
- 📊 Get message status and history
- 🔄 Works with any n8n data source
- 📱 Multiple device & SIM support
- ⚡ Dynamic content with expressions
- 🛡️ Error handling & validation

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/your-username/n8n-nodes-sms8io
cd n8n-nodes-sms8io
npm install
npm run build
npm link
```

### 2. Link to n8n
```bash
# In your n8n directory
npm link n8n-nodes-sms8io
n8n start
```

### 3. Setup Credentials
1. Get API key from [SMS8.io](https://app.sms8.io/api.php)
2. Install SMS8 app on Android
3. Find Device ID in the app
4. Add credentials in n8n

### 4. Create Workflow
- Add SMS8.io node
- Configure phone & message
- Connect to data source
- Execute!

## 📝 Usage Examples

**Simple SMS:**
```
Phone: +1234567890
Message: Hello! Your order is ready.
```

**Dynamic from Google Sheets:**
```
Phone: {{ $json.phone }}
Message: Hi {{ $json.name }}, order #{{ $json.id }} shipped!
```

**Get Message Status:**
```
Operation: Get Messages
Filter: Delivered
```

## 🔧 Configuration

| Field | Description | Example |
|-------|-------------|---------|
| Phone Number | Recipient phone | `+1234567890` |
| Message | SMS content | `Hello {{ $json.name }}!` |
| Device ID | Android device ID | `182` |
| SIM Slot | SIM 1 or SIM 2 | `SIM 1` |

## 🎯 Use Cases

- 🛒 **E-commerce**: Order confirmations
- 🏥 **Healthcare**: Appointment reminders  
- 📚 **Education**: Parent notifications
- 💼 **Business**: Customer alerts
- 🎯 **Marketing**: Promotional campaigns

## 🤝 Contributing

Issues and PRs welcome! Please check existing issues first.

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

Made with ❤️ for the n8n community
