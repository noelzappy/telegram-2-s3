# Telegram to Webhook

A TypeScript-based Telegram client that automatically downloads videos from specified Telegram channels, uploads them to Amazon S3, and sends webhook notifications to n8n.

## Features

- 🤖 **Telegram Authentication**: Login to your Telegram account using API credentials
- ⏰ **Scheduled Processing**: Runs every Wednesday at 10:00 AM via cron job
- 📺 **Video Download**: Fetches videos from public Telegram channels since the last run
- ☁️ **S3 Upload**: Uploads downloaded videos to Amazon S3 with organized folder structure
- 🔗 **Webhook Notifications**: Sends POST requests to n8n webhook with video details
- 📝 **Comprehensive Logging**: Detailed logging with Winston
- 🔄 **Error Handling**: Robust error handling with retry mechanisms
- 🔧 **Configurable**: Easy configuration via environment variables

## Prerequisites

- Node.js 18+ and npm
- Telegram API credentials (API ID and API Hash)
- Amazon AWS account with S3 access
- n8n webhook URL for notifications

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Telegram API Credentials

1. Go to [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Navigate to "API development tools"
4. Create a new application to get your `API ID` and `API Hash`

### 3. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Telegram API Configuration
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_PHONE_NUMBER=+1234567890

# Channel Configuration (without @)
TELEGRAM_CHANNEL=funny

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
S3_PUBLIC_URL_BASE=https://your-s3-bucket-name.s3.amazonaws.com

# Webhook Configuration
WEBHOOK_URL=https://your-n8n-instance.com/webhook/telegram-videos

# Optional: Application Configuration
LOG_LEVEL=info
DOWNLOAD_PATH=./downloads
TIMEZONE=America/New_York
CRON_SCHEDULE=0 10 * * 3
```

### 4. Build the Application

```bash
npm run build
```

### 5. First Run (Authentication)

For the first run, you'll need to authenticate with Telegram:

```bash
npm run dev
```

You'll be prompted to enter the verification code sent to your Telegram account. This creates a session file that will be reused for future runs.

### 6. Production Run

```bash
npm start
```

## Usage

### Scheduled Operation

The application runs automatically every Wednesday at 10:00 AM (configurable via `CRON_SCHEDULE`). It will:

1. Connect to Telegram using saved session
2. Fetch all videos from the specified channel since the previous Wednesday
3. Download each video locally
4. Upload videos to S3 with organized folder structure
5. Send webhook notifications for each video
6. Clean up local files

### Manual Testing

You can run the task manually for testing:

```bash
npm run dev
# The scheduler will start and you can trigger it manually if needed
```

## Webhook Payload

Each processed video sends a webhook with this JSON payload:

```json
{
  "video_url": "https://your-s3-bucket.s3.amazonaws.com/telegram-videos/funny/2024/01/15/1642248000000_video.mp4",
  "channel": "t.me/funny",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Project Structure

```
src/
├── config/
│   └── config.ts          # Configuration management
├── services/
│   ├── TelegramService.ts  # Telegram client operations
│   ├── S3Service.ts        # AWS S3 upload operations
│   ├── WebhookService.ts   # Webhook notification service
│   └── SchedulerService.ts # Cron job management
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   ├── logger.ts          # Winston logging configuration
│   └── helpers.ts         # Utility functions
└── index.ts               # Application entry point
```

## S3 Folder Structure

Videos are organized in S3 with the following structure:

```
telegram-videos/
└── {channel_name}/
    └── {year}/
        └── {month}/
            └── {day}/
                └── {timestamp}_{filename}
```

Example: `telegram-videos/funny/2024/01/15/1642248000000_video.mp4`

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (in development mode)

Log levels: `error`, `warn`, `info`, `debug`

## Error Handling

- **Network failures**: Automatic retries with exponential backoff
- **Authentication issues**: Detailed error messages and session management
- **File operations**: Comprehensive error handling for downloads and uploads
- **Webhook failures**: Retry mechanism for webhook deliveries
- **Processing errors**: Individual video failures don't stop the entire batch

## Security Considerations

- Store sensitive credentials in environment variables
- Use IAM roles with minimal required S3 permissions
- Keep Telegram session files secure
- Use HTTPS for webhook URLs
- Consider implementing webhook authentication

## Development

### Scripts

- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled application
- `npm run dev` - Run with ts-node for development
- `npm run watch` - Watch mode compilation
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Dependencies

- **telegram** - Telegram client library (GramJS)
- **@aws-sdk/client-s3** - AWS S3 SDK
- **axios** - HTTP client for webhooks
- **node-cron** - Cron job scheduling
- **winston** - Logging library
- **dotenv** - Environment variable management

## Troubleshooting

### Authentication Issues

1. Ensure your API ID and API Hash are correct
2. Make sure your phone number includes country code
3. Check if 2FA is enabled (requires additional setup)
4. Delete session files and re-authenticate if needed

### S3 Upload Issues

1. Verify AWS credentials have S3 permissions
2. Ensure S3 bucket exists and is accessible
3. Check AWS region configuration
4. Verify S3 bucket policy allows uploads

### Webhook Issues

1. Test webhook URL manually with curl
2. Check n8n webhook configuration
3. Verify network connectivity
4. Review webhook service logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
