
```markdown
# 📱 SMS8.io Node for n8n


> **Official n8n community node for SMS8.io** - Turn your Android device into a powerful SMS gateway for workflow automation.

## 🌟 Features

- 📤 **Send SMS** to any phone number worldwide
- 📊 **Track delivery status** and message history
- 🔄 **Dynamic content** with n8n expressions
- 📱 **Multi-device support** with SIM slot selection
- 🔗 **Seamless integration** with any n8n workflow
- 🛡️ **Secure authentication** with API key
- 📈 **Real-time monitoring** of message status

## 🚀 Quick Start

### Installation

```bash
# Via npm
npm install n8n-nodes-sms8io

# Via n8n Community Nodes (Recommended)
# Install directly from the n8n interface: Settings > Community Nodes
```

### Prerequisites

1. **SMS8.io Account**: Sign up at [sms8.io](https://sms8.io)
2. **Android Device**: Install the SMS8 app from the dashboard
3. **API Key**: Get your API key from the SMS8.io dashboard
4. **Device ID**: Find it in the SMS8 Android app

## 📚 Usage Examples

### Simple SMS
Send a basic text message:
```
Phone Number: +1234567890
Message: Hello! Your order is ready for pickup.
Device ID: 182
SIM Slot: SIM 1
```

### Dynamic Content from Data Sources
Connect with Google Sheets, databases, or any data source:
```
Phone Number: {{ $json.phone }}
Message: Hi {{ $json.name }}, your order #{{ $json.order_id }} has been shipped!
```

### E-commerce Integration
```
Trigger: New WooCommerce Order
↓
SMS8.io: "{{ $json.customer_name }}, thank you for your order! 
         Tracking: {{ $json.tracking_number }}"
```

### Appointment Reminders
```
Google Calendar → SMS8.io
Message: "{{ $json.patient_name }}, reminder: appointment tomorrow at {{ $json.time }}"
```

## ⚙️ Configuration

### Credentials Setup
1. In n8n: **Settings** → **Credentials** → **Create New**
2. Select **"SMS8.io API"**
3. Enter your API key from SMS8.io dashboard
4. Test connection

### Node Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| **Phone Number** | Recipient's phone number | `+1234567890` or `{{ $json.phone }}` |
| **Message** | SMS content (supports expressions) | `Hello {{ $json.name }}!` |
| **Device ID** | Your Android device ID | `182` |
| **SIM Slot** | Which SIM to use | `SIM 1` or `SIM 2` |

## 🎯 Use Cases

### Business Applications
- 🛒 **E-commerce**: Order confirmations, shipping notifications
- 🏥 **Healthcare**: Appointment reminders, test results
- 📚 **Education**: Parent notifications, school alerts
- 🏦 **Finance**: Transaction alerts, payment confirmations
- 🎫 **Events**: Ticket confirmations, event reminders

### Technical Workflows
- 🔔 **System Alerts**: Server monitoring, error notifications
- 📊 **Reporting**: Daily/weekly report summaries
- 🔐 **Security**: Two-factor authentication, login alerts
- 📈 **Marketing**: Campaign notifications, customer engagement

## 🛠️ Advanced Configuration

### Multiple Devices
```javascript
// Rotate between multiple devices for load balancing
Device ID: {{ $json.device_pool[Math.floor(Math.random() * $json.device_pool.length)] }}
```

### Conditional Messages
```javascript
// Different messages based on order value
Message: {{ $json.order_total > 100 ? 'Thank you for your premium order!' : 'Thanks for your order!' }}
```

### Error Handling
The node provides detailed error information for troubleshooting:
- Invalid API key responses
- Device connectivity issues  
- Message delivery failures
- Network timeout handling

## 📈 Monitoring & Analytics

Track your SMS campaigns with built-in monitoring:
- Message delivery rates
- Failed delivery reasons
- Device performance metrics
- API usage statistics

## 🔧 Development

### Local Development
```bash
git clone https://github.com/sms8-n8n/n8n-nodes-sms8io
cd n8n-nodes-sms8io
npm install
npm run build
npm link
```

### Testing
```bash
npm test
npm run lint
```

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Submit a pull request

## 📞 Support

- 📧 **Email**: [info@sms8.io](mailto:info@sms8.io)
- 🌐 **Website**: [sms8.io](https://sms8.io)
- 📖 **Documentation**: [API Docs](https://sms8.io/sms8-api-documentation/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/sms8-n8n/n8n-nodes-sms8io/issues)
- 💬 **Community**: [n8n Community Forum](https://community.n8n.io)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [n8n](https://n8n.io) - The workflow automation platform
- [SMS8.io](https://sms8.io) - SMS gateway service
- The n8n community for feedback and contributions

---

**Made with ❤️ by the SMS8 team for the n8n community**

*Transform your business communication with SMS8.io + n8n*
```
