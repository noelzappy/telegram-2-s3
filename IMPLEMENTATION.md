# Implementation Guide

This document provides detailed implementation notes and technical considerations for the Telegram to Webhook application.

## Architecture Overview

The application follows a modular service-oriented architecture:

### Core Services

1. **TelegramService** - Handles all Telegram API interactions
2. **S3Service** - Manages AWS S3 uploads
3. **WebhookService** - Sends HTTP webhooks to n8n
4. **SchedulerService** - Orchestrates the weekly cron job

### Data Flow

```
Scheduler → Telegram API → Video Download → S3 Upload → Webhook → n8n
```

## Key Implementation Details

### Telegram Authentication

The application uses the GramJS library with session persistence:

- **Session Management**: Sessions are saved to disk to avoid re-authentication
- **Phone Code Handling**: Requires manual intervention on first run
- **2FA Support**: Can be extended to support two-factor authentication

### Video Processing Pipeline

1. **Discovery**: Fetches messages from channel since last Wednesday 10:00 AM
2. **Filtering**: Identifies video messages based on MIME type
3. **Download**: Downloads videos with progress tracking
4. **Upload**: Uploads to S3 with metadata and organized folder structure
5. **Notification**: Sends webhook with video details
6. **Cleanup**: Removes local files after successful upload

### Error Handling Strategy

- **Retry Logic**: Exponential backoff for network operations
- **Graceful Degradation**: Individual video failures don't stop the batch
- **Comprehensive Logging**: All operations are logged for debugging
- **Resource Cleanup**: Local files are cleaned up even on failures

### Security Considerations

- **Credential Management**: All sensitive data via environment variables
- **Session Security**: Telegram sessions stored locally (consider encryption)
- **AWS Permissions**: Minimal required S3 permissions
- **Network Security**: HTTPS for all external communications

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_API_ID` | Yes | Telegram API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | Yes | Telegram API Hash from my.telegram.org |
| `TELEGRAM_PHONE_NUMBER` | Yes | Phone number with country code |
| `TELEGRAM_CHANNEL` | Yes | Channel username (without @) |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `S3_BUCKET_NAME` | Yes | S3 bucket name |
| `S3_PUBLIC_URL_BASE` | Yes | Public S3 URL base |
| `WEBHOOK_URL` | Yes | n8n webhook endpoint |
| `LOG_LEVEL` | No | Logging level (default: info) |
| `CRON_SCHEDULE` | No | Cron pattern (default: 0 10 * * 3) |

### Cron Schedule Format

The application uses node-cron with standard cron syntax:

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

Default: `0 10 * * 3` (Every Wednesday at 10:00 AM)

## Deployment Options

### Local Development

```bash
npm run dev
```

### Production Server

```bash
npm run build
npm start
```

### Docker Deployment

Create a Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env ./

CMD ["npm", "start"]
```

### PM2 Process Manager

```bash
npm install -g pm2
pm2 start dist/index.js --name "telegram-webhook"
pm2 startup
pm2 save
```

## Monitoring and Maintenance

### Logging

Logs are structured JSON format with Winston:

```json
{
  "level": "info",
  "message": "Processing video 1/5: funny_video.mp4",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "telegram-2-webhook"
}
```

### Health Checks

Consider implementing:
- HTTP health endpoint
- Telegram connection status
- S3 connectivity check
- Last successful run timestamp

### Metrics

Track important metrics:
- Videos processed per run
- Success/failure rates
- Processing duration
- File sizes and types

## Troubleshooting

### Common Issues

1. **Telegram Authentication Failures**
   - Solution: Delete session files and re-authenticate
   - Check API credentials and phone number format

2. **S3 Upload Permissions**
   - Solution: Verify IAM permissions for S3 bucket
   - Required actions: `s3:PutObject`, `s3:GetObject`

3. **Webhook Delivery Failures**
   - Solution: Check n8n webhook configuration
   - Verify URL accessibility and authentication

4. **Memory Issues with Large Videos**
   - Solution: Implement streaming downloads
   - Add file size limits and validation

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

## Performance Considerations

### Optimization Opportunities

1. **Parallel Processing**: Download/upload videos in parallel (with limits)
2. **Streaming**: Stream files directly to S3 without local storage
3. **Compression**: Compress videos before upload (optional)
4. **Caching**: Cache channel metadata to reduce API calls

### Resource Usage

- **Memory**: Depends on video file sizes (consider streaming)
- **Disk**: Temporary storage for video files (cleaned up after upload)
- **Network**: Download from Telegram + Upload to S3

## Extensions and Customizations

### Potential Enhancements

1. **Multiple Channels**: Support processing multiple channels
2. **Content Filtering**: Filter videos by duration, size, or keywords
3. **Duplicate Detection**: Avoid reprocessing same videos
4. **Web Interface**: Admin dashboard for monitoring and control
5. **Database Integration**: Store processing history and metadata
6. **Notification Systems**: Email/Slack notifications for failures

### API Integration

The modular design allows easy integration with other services:

- Replace S3Service with Google Cloud Storage
- Add Discord/Slack webhook support
- Integrate with different scheduling systems

## Testing

### Unit Tests

Implement tests for core services:

```typescript
// Example test structure
describe('TelegramService', () => {
  it('should fetch videos from channel', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test complete workflow:
- End-to-end video processing
- Error handling scenarios
- Authentication flows

### Manual Testing

1. Use a test channel with known videos
2. Run with shorter time intervals
3. Monitor logs and webhook deliveries

## Security Best Practices

### Production Deployment

1. **Environment Isolation**: Use different credentials for production
2. **Access Control**: Restrict server access and use VPN if needed
3. **Monitoring**: Set up alerts for failures and unusual activity
4. **Backup**: Regular backups of session files and configuration
5. **Updates**: Keep dependencies updated for security patches

### Credential Management

Consider using:
- AWS Secrets Manager for sensitive data
- Docker secrets for containerized deployments
- Environment-specific configuration files

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint configuration for consistent formatting
- Comprehensive error handling required
- Detailed logging for all operations

### Pull Request Process

1. Fork repository and create feature branch
2. Implement changes with proper TypeScript types
3. Add/update tests as needed
4. Update documentation
5. Submit pull request with detailed description

### Development Setup

```bash
git clone <repository>
cd telegram-2-webhook
npm install
cp .env.example .env
# Edit .env with test credentials
npm run dev
```
