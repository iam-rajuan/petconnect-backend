import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { awsRegion, bucketName, getS3Client } from "./s3.config";

const s3Client = getS3Client();

const buildKey = (folder: string, mimeType: string): string => {
  const subtype = mimeType.split("/")[1] || "file";
  const extension = subtype === "jpeg" ? "jpg" : subtype;
  return `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
};

export const getPublicUrl = (key: string): string =>
  `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${key}`;

export const extractKeyFromUrl = (value: string): string => {
  const marker = ".amazonaws.com/";
  if (!value) return value;
  if (value.includes(marker)) {
    return value.substring(value.indexOf(marker) + marker.length);
  }
  return value;
};

export const uploadFileToS3 = async (
  buffer: Buffer,
  mimeType: string,
  folder: string
): Promise<{ url: string; key: string }> => {
  const key = buildKey(folder, mimeType);
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: "public-read",
        Metadata: {
          uploadedAt: new Date().toISOString(),
          folder,
        },
      })
    );
    const url = getPublicUrl(key);
    return { url, key };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload file";
    throw new Error(`Failed to upload file: ${message}`);
  }
};

export const deleteFileFromS3 = async (key: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete file";
    throw new Error(`Failed to delete file: ${message}`);
  }
};
