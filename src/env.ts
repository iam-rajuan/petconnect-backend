import dotenv from "dotenv";
import { z } from "zod/v4";

// Load environment variables before validation so .env values are available everywhere.
dotenv.config();

const envSchema = z.object({

//  Application configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BASE_URL: z.string().default("/api/v1"),
  PORT: z.coerce.number().default(3000),

//   Database configuration
  MONGO_URI: z.url().nonempty("MONGO_URI is required"),
  JWT_SECRET: z.string().nonempty("jwt secret key is required."),

// JWT configuration
  JWT_EXPIRES_IN: z.string().nonempty("Jwt expire is required."),

//   Admin credentials
  ADMIN_PASSWORD: z.string().nonempty("Admin password is required"),

// AWS credentials
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  AWS_BUCKET_NAME: z.string().min(1, "AWS_BUCKET_NAME is required"),
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),

// Resend (for emails)
  RESEND_API_KEY: z.string().nonempty("RESEND_API_KEY is required for email sending"),
  RESEND_FROM: z.string().nonempty("RESEND_FROM is required for email sending"),
});

try {
  // eslint-disable-next-line node/no-process-env
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Missing environment variables:",
      error.issues.flatMap((issue) => issue.path)
    );
  } else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);
