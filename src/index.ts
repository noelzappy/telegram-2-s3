import dotenv from "dotenv";
dotenv.config();

import { TelegramService } from "./services/TelegramService";
import { SchedulerService } from "./services/SchedulerService";
import { logger } from "./utils/logger";
import { config } from "./config/config";

async function main(): Promise<void> {
  try {
    console.log("🚀 Starting Telegram to Webhook application...");
    console.log("📋 Configuration loaded successfully");
    logger.info("Starting Telegram to Webhook application...");

    // Initialize Telegram service
    console.log("\n🔐 Initializing Telegram client...");
    console.log(
      "📞 This may require authentication if this is your first run."
    );
    console.log("💡 Have your phone ready to receive verification codes!\n");

    const telegramService = new TelegramService();
    await telegramService.initialize();

    console.log("✅ Telegram client authenticated successfully!");

    // Initialize and start scheduler
    const schedulerService = new SchedulerService(telegramService);
    await schedulerService.start();

    logger.info("Application started successfully");
    logger.info(
      `Scheduled to run every Wednesday at 10:00 AM (${config.cronSchedule})`
    );

    // Keep the process running
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      schedulerService.stop();
      await telegramService.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      schedulerService.stop();
      await telegramService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Unhandled error in main:", error);
  process.exit(1);
});
