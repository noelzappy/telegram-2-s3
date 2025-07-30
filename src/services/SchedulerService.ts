import * as cron from "node-cron";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { TelegramService } from "./TelegramService";
import { S3Service } from "./S3Service";
import { WebhookService } from "./WebhookService";
import { ProcessingStats, WebhookPayload } from "../types";
import { getPreviousWednesday, formatFileSize } from "../utils/helpers";
import * as fs from "fs";

export class SchedulerService {
  private telegramService: TelegramService;
  private s3Service: S3Service;
  private webhookService: WebhookService;
  private task: cron.ScheduledTask | null = null;

  constructor(telegramService: TelegramService) {
    this.telegramService = telegramService;
    this.s3Service = new S3Service();
    this.webhookService = new WebhookService();
  }

  async start(): Promise<void> {
    logger.info(`Starting scheduler with cron pattern: ${config.cronSchedule}`);

    // await this.executeTask();

    // this.task = cron.schedule(
    //   config.cronSchedule,
    //   async () => {
    //     await this.executeTask();
    //   },
    //   {
    //     scheduled: true,
    //     timezone: config.app.timezone,
    //   }
    // );

    logger.info("Scheduler started successfully");
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info("Scheduler stopped");
    }
  }

  async executeTask(): Promise<void> {
    const startTime = new Date();
    logger.info("=".repeat(60));
    logger.info("Starting video processing task...");
    logger.info("=".repeat(60));

    const stats: ProcessingStats = {
      totalVideosFound: 0,
      videosDownloaded: 0,
      videosUploaded: 0,
      webhooksSent: 0,
      errors: 0,
    };

    try {
      // Fetch videos from the channel
      const videos = await this.telegramService.getChannelVideos(
        config.telegram.channel
      );

      //   stats.totalVideosFound = videos.length;

      //   if (videos.length === 0) {
      //     logger.info("No new videos found since last run");
      //     return;
      //   }

      //   logger.info(`Found ${videos.length} videos to process`);

      //   // Process each video
      //   for (let i = 0; i < videos.length; i++) {
      //     const video = videos[i];

      //     if (!video) {
      //       logger.warn(`Video at index ${i} is undefined, skipping...`);
      //       continue;
      //     }

      //     try {
      //       logger.info(
      //         `Processing video ${i + 1}/${videos.length}: ${video.fileName}`
      //       );

      //       // Download video
      //       const filePath = await this.telegramService.downloadVideo(
      //         config.telegram.channel,
      //         video
      //       );
      //       stats.videosDownloaded++;

      //       // Upload to S3
      //       const s3Result = await this.s3Service.uploadVideo(
      //         filePath,
      //         config.telegram.channel,
      //         video.timestamp
      //       );
      //       logger.info(
      //         `Video uploaded to S3: ${s3Result.url} (${formatFileSize(video.fileSize)})`
      //       );
      //       stats.videosUploaded++;

      //       //   Send webhook
      //       const webhookPayload: WebhookPayload = {
      //         video_url: s3Result.url,
      //         channel: `t.me/${config.telegram.channel}`,
      //         timestamp: video.timestamp.toISOString(),
      //       };

      //       await this.webhookService.sendWebhook(webhookPayload);
      //       stats.webhooksSent++;

      //       // Clean up downloaded file
      //       try {
      //         fs.unlinkSync(filePath);
      //         logger.debug(`Cleaned up local file: ${filePath}`);
      //       } catch (cleanupError) {
      //         logger.warn(
      //           `Failed to clean up local file ${filePath}:`,
      //           cleanupError
      //         );
      //       }

      //       logger.info(`✅ Successfully processed: ${video.fileName}`);
      //     } catch (error) {
      //       stats.errors++;
      //       logger.error(`❌ Failed to process video ${video.fileName}:`, error);
      //       // Continue with next video instead of stopping the entire process
      //     }
      //   }
    } catch (error) {
      stats.errors++;
      logger.error("Fatal error during weekly task execution:", error);
    } finally {
      // Log final statistics
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.info("=".repeat(60));
      logger.info("Weekly task completed");
      logger.info("=".repeat(60));
      logger.info(`📊 Processing Statistics:`);
      logger.info(`   • Videos found: ${stats.totalVideosFound}`);
      logger.info(`   • Videos downloaded: ${stats.videosDownloaded}`);
      logger.info(`   • Videos uploaded to S3: ${stats.videosUploaded}`);
      logger.info(`   • Webhooks sent: ${stats.webhooksSent}`);
      logger.info(`   • Errors: ${stats.errors}`);
      logger.info(`   • Duration: ${Math.round(duration / 1000)}s`);
      logger.info("=".repeat(60));
    }
  }

  // Method to run the task manually (useful for testing)
  async runTaskManually(): Promise<void> {
    logger.info("Running weekly task manually...");
    await this.executeTask();
  }
}
