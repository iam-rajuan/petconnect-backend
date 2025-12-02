import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../env";

const awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
export const bucketName = env.AWS_BUCKET_NAME;
export const awsRegion = env.AWS_REGION;

const validateConfig = () => {
  const missing: string[] = [];
  if (!awsAccessKeyId) missing.push("AWS_ACCESS_KEY_ID");
  if (!awsSecretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!bucketName) missing.push("AWS_BUCKET_NAME");
  if (!awsRegion) missing.push("AWS_REGION");

  if (missing.length) {
    throw new Error(`Missing AWS S3 configuration: ${missing.join(", ")}`);
  }
};

let cachedClient: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (cachedClient) return cachedClient;
  validateConfig();
  cachedClient = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });
  return cachedClient;
};

export const s3 = getS3Client();
