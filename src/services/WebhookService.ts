import axios, { AxiosResponse } from "axios";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { WebhookPayload } from "../types";
import { retryWithBackoff } from "../utils/helpers";

export class WebhookService {
  async sendWebhook(payload: WebhookPayload): Promise<void> {
    try {
      logger.info(`Sending webhook for video: ${payload.video_url}`);

      await retryWithBackoff(
        async () => {
          const response: AxiosResponse = await axios.post(
            config.webhook.url,
            payload,
            {
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "Telegram-2-Webhook/1.0.0",
              },
              timeout: 30000, // 30 seconds timeout
            }
          );

          if (response.status < 200 || response.status >= 300) {
            throw new Error(
              `Webhook returned status ${response.status}: ${response.statusText}`
            );
          }

          logger.info(
            `Webhook sent successfully for video: ${payload.video_url} (Status: ${response.status})`
          );
        },
        3,
        2000
      ); // Retry up to 3 times with 2 second base delay
    } catch (error) {
      logger.error(
        `Failed to send webhook for video ${payload.video_url}:`,
        error
      );
      throw error;
    }
  }

  async sendBatchWebhooks(payloads: WebhookPayload[]): Promise<void> {
    logger.info(`Sending ${payloads.length} webhooks...`);

    const results = await Promise.allSettled(
      payloads.map((payload) => this.sendWebhook(payload))
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failed = results.filter(
      (result) => result.status === "rejected"
    ).length;

    logger.info(
      `Webhooks completed: ${successful} successful, ${failed} failed`
    );

    if (failed > 0) {
      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => (result as PromiseRejectedResult).reason);

      logger.error("Webhook failures:", errors);
      throw new Error(`${failed} out of ${payloads.length} webhooks failed`);
    }
  }
}
