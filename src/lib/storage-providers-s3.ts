import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  StorageObjectIdentity,
  StorageProvider,
  StorageUploadResult,
} from "@/lib/storage-provider";

function requireS3Env() {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }
  return { bucket, accessKeyId, secretAccessKey, region, endpoint };
}

function createS3Client() {
  const { accessKeyId, secretAccessKey, region, endpoint } = requireS3Env();
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
}

export class S3StorageProvider implements StorageProvider {
  readonly backend = "s3" as const;

  get bucket(): string {
    return requireS3Env().bucket;
  }

  async upload(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const client = createS3Client();
    const bucket = this.bucket;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return {
      url: this.getPublicUrl(objectKey),
      storage: "s3",
      bucket,
      objectKey,
    };
  }

  async deleteObject(identity: StorageObjectIdentity): Promise<boolean> {
    if (identity.storageBackend !== "s3") return false;
    try {
      const client = createS3Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: identity.bucket || this.bucket,
          Key: identity.objectKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(objectKey: string): string {
    const base = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
    if (base) return `${base}/${objectKey}`;
    const { bucket, endpoint, region } = requireS3Env();
    if (endpoint) {
      return `${endpoint.replace(/\/$/, "")}/${bucket}/${objectKey}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  }

  async getSignedUrl(objectKey: string, ttlSeconds: number): Promise<string> {
    const client = createS3Client();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return s3GetSignedUrl(client, command, { expiresIn: ttlSeconds });
  }
}
