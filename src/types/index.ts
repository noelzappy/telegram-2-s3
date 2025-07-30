export interface TelegramVideo {
  id: string;
  fileName: string;
  fileSize: number;
  duration?: number | undefined;
  timestamp: Date;
  filePath?: string;
  messageId: number; // Optional message ID for tracking
}

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface WebhookPayload {
  video_url: string;
  channel: string;
  timestamp: string;
}

export interface ProcessingStats {
  totalVideosFound: number;
  videosDownloaded: number;
  videosUploaded: number;
  webhooksSent: number;
  errors: number;
}

export interface DownloadProgress {
  fileName: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}
