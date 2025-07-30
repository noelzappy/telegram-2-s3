export interface Config {
  // Telegram configuration
  telegram: {
    apiId: number;
    apiHash: string;
    phoneNumber: string;
    sessionFile: string;
    channel: string;
  };

  // AWS S3 configuration
  s3: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
    publicUrlBase: string;
  };

  // Webhook configuration
  webhook: {
    url: string;
  };

  // Application configuration
  app: {
    logLevel: string;
    downloadPath: string;
    timezone: string;
  };

  // Cron configuration
  cronSchedule: string;
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  console.log(`Loading environment variable: ${name} = ${value}`);

  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config: Config = {
  telegram: {
    apiId: parseInt(getRequiredEnvVar("TELEGRAM_API_ID"), 10),
    apiHash: getRequiredEnvVar("TELEGRAM_API_HASH"),
    phoneNumber: getRequiredEnvVar("TELEGRAM_PHONE_NUMBER"),
    sessionFile: getOptionalEnvVar(
      "TELEGRAM_SESSION_FILE",
      "./telegram_session"
    ),
    channel: getOptionalEnvVar("TELEGRAM_CHANNEL", "Funny"),
  },

  s3: {
    accessKeyId: getRequiredEnvVar("S3_ACCESS_KEY"),
    secretAccessKey: getRequiredEnvVar("S3_SECRET_KEY"),
    region: getOptionalEnvVar("S3_REGION", "fsn1"),
    bucketName: getRequiredEnvVar("S3_BUCKET_NAME"),
    publicUrlBase: getRequiredEnvVar("S3_ENDPOINT"),
  },

  webhook: {
    url: getRequiredEnvVar("WEBHOOK_URL"),
  },

  app: {
    logLevel: getOptionalEnvVar("LOG_LEVEL", "info"),
    downloadPath: getOptionalEnvVar("DOWNLOAD_PATH", "./downloads"),
    timezone: getOptionalEnvVar("TIMEZONE", "Africa/Accra"),
  },

  cronSchedule: getOptionalEnvVar("CRON_SCHEDULE", "0 10 * * 3"), // Every Wednesday at 10:00 AM
};
