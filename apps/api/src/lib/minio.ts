import { Client } from "minio";

const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
const port = Number(process.env.MINIO_PORT ?? 9000);
const useSSL = process.env.MINIO_USE_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
const secretKey = process.env.MINIO_SECRET_KEY ?? "minioadmin";
const bucket = process.env.MINIO_BUCKET ?? "socialflow-videos";

export const minioClient = new Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey
});

export const MINIO_BUCKET = bucket;

export function getMinioPublicUrl(objectName: string): string {
  // Instagram/TikTok videoyu URL'den indirir - localhost erisilemez. MINIO_PUBLIC_BASE_URL ile tunnel (ngrok) kullan.
  const publicBase = process.env.MINIO_PUBLIC_BASE_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${bucket}/${objectName}`;
  }
  const base = `http${useSSL ? "s" : ""}://${endpoint}:${port}`;
  return `${base}/${bucket}/${objectName}`;
}

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
const MAX_SIZE_MB = 500;

export function isAllowedVideoType(mimetype: string): boolean {
  return ALLOWED_TYPES.includes(mimetype);
}

export function getMaxSizeBytes(): number {
  return MAX_SIZE_MB * 1024 * 1024;
}

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket, "us-east-1");
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucket}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
  }
}
