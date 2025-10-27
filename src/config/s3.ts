import { type S3Config, S3Service } from '../services/s3.service';

// S3 configuration from environment variables
const s3Config: S3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  urlExpirationMinutes: Number.parseInt(
    process.env.AWS_S3_URL_EXPIRATION_MINUTES || '60',
    10
  ),
  directoryPrefix: process.env.AWS_S3_DIRECTORY_PREFIX || '',
};

// Validate required environment variables
if (
  !s3Config.accessKeyId ||
  !s3Config.secretAccessKey ||
  !s3Config.bucketName
) {
  console.warn(`
⚠️  S3 service warning: AWS credentials not configured.
   Asset uploads will fail unless you configure the following environment variables:
   - AWS_REGION (default: us-east-1)
   - AWS_ACCESS_KEY_ID (required)
   - AWS_SECRET_ACCESS_KEY (required)
   - AWS_S3_BUCKET_NAME (required)
   - AWS_S3_URL_EXPIRATION_MINUTES (default: 60)
   - AWS_S3_DIRECTORY_PREFIX (optional: e.g., 'dev', 'staging', 'prod')
  `);
}

// Create and export S3 service instance
export const s3Service = new S3Service(s3Config);
export { s3Config };
