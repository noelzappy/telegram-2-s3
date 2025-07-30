import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { S3UploadResult } from "../types";
import { generateS3Key, formatFileSize } from "../utils/helpers";

export class S3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: config.s3.publicUrlBase,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadVideo(
    filePath: string,
    channelName: string,
    timestamp: Date
  ): Promise<S3UploadResult> {
    try {
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      logger.info(
        `Uploading ${fileName} (${formatFileSize(fileStats.size)}) to S3...`
      );

      // Generate S3 key
      const s3Key = generateS3Key(channelName, fileName, timestamp);

      const uploadParams: PutObjectCommandInput = {
        Bucket: config.s3.bucketName,
        Key: s3Key,
        Body: fileStream,
        ContentType: this.getContentType(fileName),
        Metadata: {
          originalFileName: fileName,
          channelName: channelName,
          uploadTimestamp: new Date().toISOString(),
          telegramTimestamp: timestamp.toISOString(),
        },
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const publicUrl = `${config.s3.publicUrlBase}/${s3Key}`;

      logger.info(`Video uploaded successfully: ${publicUrl}`);

      return {
        key: s3Key,
        url: publicUrl,
        bucket: config.s3.bucketName,
      };
    } catch (error) {
      logger.error(`Failed to upload video ${filePath} to S3:`, error);
      throw error;
    }
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".m4v": "video/x-m4v",
      ".3gp": "video/3gpp",
      ".flv": "video/x-flv",
    };

    return contentTypes[ext] || "video/mp4";
  }
}
