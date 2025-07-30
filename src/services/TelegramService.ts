import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { TelegramVideo } from "../types";
import { ensureDirectoryExists, formatFileSize } from "../utils/helpers";
import { S3Service } from "./S3Service";

export class TelegramService {
  private client: TelegramClient | null = null;
  private session: StringSession;
  private s3Service: S3Service;

  constructor() {
    // Load existing session if available
    const sessionData = this.loadSession();
    this.session = new StringSession(sessionData);
    this.s3Service = new S3Service();
  }

  /**
   * Prompts user for input via terminal
   */
  private async promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Telegram client...");

      this.client = new TelegramClient(
        this.session,
        config.telegram.apiId,
        config.telegram.apiHash,
        {
          connectionRetries: 5,
        }
      );

      await this.client.start({
        phoneNumber: async () => {
          logger.info(`Using phone number: ${config.telegram.phoneNumber}`);
          return config.telegram.phoneNumber;
        },
        password: async () => {
          // If 2FA is enabled, prompt for password
          if (process.env.TELEGRAM_PASSWORD) {
            logger.info("Using 2FA password from environment variable");
            return process.env.TELEGRAM_PASSWORD;
          } else {
            logger.info("2FA password required. Please enter your password:");
            const password = await this.promptUser(
              "Enter your Telegram 2FA password: "
            );
            return password;
          }
        },
        phoneCode: async () => {
          // Prompt for phone verification code
          logger.info("Phone verification code required.");
          console.log("\n🔐 Telegram is sending you a verification code...");
          console.log("📱 Check your Telegram app or SMS for the code.");
          const code = await this.promptUser("Enter the verification code: ");
          logger.info("Phone code entered, attempting verification...");
          return code;
        },
        onError: (err: Error) => {
          logger.error("Telegram auth error:", err);
        },
      });

      // Save session for future use
      const sessionString = this.client.session.save() as unknown as string;
      this.saveSession(sessionString);
      logger.info("Telegram client initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Telegram client:", error);
      throw error;
    }
  }

  async getChannelVideos(channelUsername: string): Promise<TelegramVideo[]> {
    if (!this.client) {
      throw new Error("Telegram client not initialized");
    }

    try {
      logger.info(`Fetching videos from channel @${channelUsername}...`);

      // Get the channel entity
      const entity = await this.client.getEntity(channelUsername);

      const videos: TelegramVideo[] = [];
      let offsetId = parseInt(
        fs
          .readFileSync(
            path.join(config.app.downloadPath, "last_offset.txt"),
            "utf8"
          )
          .trim() || "0"
      );

      let hasMore = true;

      while (hasMore) {
        const messages = await this.client.getMessages(entity, {
          limit: 100,
          offsetId: offsetId,
        });

        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        for (const message of messages) {
          // Check if message has video
          if (
            message.media &&
            message.media instanceof Api.MessageMediaDocument
          ) {
            const document = message.media.document;

            try {
              if (document instanceof Api.Document) {
                const isVideo = document.mimeType?.startsWith("video/");

                if (isVideo) {
                  const video: TelegramVideo = {
                    id: document.id.toString(),
                    fileName:
                      this.getFileName(document) || `video_${document.id}.mp4`,
                    fileSize: Number(document.size),
                    duration: this.getVideoDuration(document),
                    timestamp: new Date(message.date! * 1000),
                  };

                  const filePath = await this.downloadVideo(
                    config.telegram.channel,
                    video
                  );

                  const s3Result = await this.s3Service.uploadVideo(
                    filePath,
                    config.telegram.channel,
                    video.timestamp
                  );
                  logger.info(
                    `Video uploaded to S3: ${s3Result.url} (${formatFileSize(video.fileSize)})`
                  );

                  logger.debug(
                    `Found video: ${video.fileName} (${video.fileSize} bytes)`
                  );

                  // videos.push(video);
                  logger.debug(
                    `Found video: ${video.fileName} (${video.fileSize} bytes)`
                  );
                }
              }
            } catch (error) {
              logger.error(
                `Error processing document in message ${message.id}:`,
                error
              );
            }
          }
        }

        const newOffsetId = messages[messages.length - 1]?.id || 0;
        if (newOffsetId === offsetId) {
          hasMore = false; // No new messages, stop fetching
        }
        offsetId = newOffsetId;

        // Save the new offset ID for next run
        fs.writeFileSync(
          path.join(config.app.downloadPath, "last_offset.txt"),
          offsetId.toString()
        );
        logger.debug(`Updated offset ID to ${offsetId}`);

        await new Promise((resolve) => setTimeout(resolve, 1500)); // Throttle requests
      }

      logger.info(`Found ${videos.length} videos...`);
      return videos;
    } catch (error) {
      logger.error(
        `Failed to fetch videos from channel @${channelUsername}:`,
        error
      );
      throw error;
    }
  }

  async downloadVideo(
    channelUsername: string,
    video: TelegramVideo
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Telegram client not initialized");
    }

    try {
      logger.info(`Downloading video: ${video.fileName}`);

      // Ensure download directory exists
      const downloadDir = path.resolve(config.app.downloadPath);
      ensureDirectoryExists(downloadDir);

      const filePath = path.join(downloadDir, video.fileName);

      // Get the channel entity
      const entity = await this.client.getEntity(channelUsername);

      // Find the message with this video
      const messages = await this.client.getMessages(entity, {
        limit: 100,
      });

      let targetMessage = null;
      for (const message of messages) {
        if (
          message.media &&
          message.media instanceof Api.MessageMediaDocument
        ) {
          const document = message.media.document;
          if (
            document instanceof Api.Document &&
            document.id.toString() === video.id
          ) {
            targetMessage = message;
            break;
          }
        }
      }

      if (!targetMessage || !targetMessage.media) {
        throw new Error(`Video with ID ${video.id} not found or has no media`);
      }

      // Download the file
      await this.client.downloadMedia(targetMessage.media, {
        outputFile: filePath,
        progressCallback: (downloaded: any, total: any) => {
          const percentage = Math.round(
            (Number(downloaded) / Number(total)) * 100
          );
          if (percentage % 10 === 0) {
            // Log every 10%
            logger.debug(
              `Download progress: ${video.fileName} - ${percentage}%`
            );
          }
        },
      });

      logger.info(`Video downloaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to download video ${video.fileName}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info("Telegram client disconnected");
      } catch (error) {
        logger.error("Error disconnecting Telegram client:", error);
      }
    }
  }

  private loadSession(): string {
    try {
      if (fs.existsSync(config.telegram.sessionFile)) {
        return fs.readFileSync(config.telegram.sessionFile, "utf8");
      }
    } catch (error) {
      logger.warn("Could not load existing session:", error);
    }
    return "";
  }

  private saveSession(sessionData: string): void {
    try {
      const sessionDir = path.dirname(config.telegram.sessionFile);
      ensureDirectoryExists(sessionDir);
      fs.writeFileSync(config.telegram.sessionFile, sessionData);
      logger.debug("Session saved successfully");
    } catch (error) {
      logger.error("Failed to save session:", error);
    }
  }

  private getFileName(document: Api.Document): string | null {
    for (const attribute of document.attributes) {
      if (attribute instanceof Api.DocumentAttributeFilename) {
        return attribute.fileName;
      }
    }
    return null;
  }

  private getVideoDuration(document: Api.Document): number | undefined {
    for (const attribute of document.attributes) {
      if (attribute instanceof Api.DocumentAttributeVideo) {
        return attribute.duration;
      }
    }
    return undefined;
  }
}
