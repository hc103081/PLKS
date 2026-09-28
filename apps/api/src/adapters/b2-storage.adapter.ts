import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import { type Result, err, ok } from "neverthrow";
import { injectable } from "tsyringe";

@injectable()
export class B2StorageAdapter implements IStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor() {
    const accessKeyId = process.env["B2_APPLICATION_KEY_ID"];
    const secretAccessKey = process.env["B2_APPLICATION_KEY"];
    this.bucket = process.env["B2_BUCKET_NAME"] ?? "plks-vault";
    this.endpoint = process.env["B2_ENDPOINT"] ?? "https://s3.us-west-004.backblazeb2.com";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("B2 credentials not configured (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY)");
    }

    this.client = new S3Client({
      region: process.env["B2_REGION"] ?? "us-west-004",
      endpoint: this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // B2 requires path-style addressing
    });
  }

  async uploadFile(path: string, byteStream: Readable): Promise<Result<string, DomainError>> {
    try {
      // Use multipart upload for large files via @aws-sdk/lib-storage
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: path,
          Body: byteStream,
        },
        // Configure multipart thresholds
        queueSize: 4,
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false,
      });

      await upload.done();

      return ok(`s3://${this.bucket}/${path}`);
    } catch (cause) {
      return err(this.mapError(cause, DomainError.storageUploadFailed, { path }));
    }
  }

  async downloadFile(uri: string): Promise<Result<Readable, DomainError>> {
    try {
      const key = this.resolveKey(uri);
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (!response.Body) {
        return err(new DomainError("STORAGE_DOWNLOAD_FAILED", "Empty response body", { uri, key }));
      }

      return ok(response.Body as Readable);
    } catch (cause) {
      const wrapped = this.mapError(cause, DomainError.storageDownloadFailed, { uri });
      // Retry with slash-prefixed variant (B2 may have stored a key from SDK uploads starting with "/")
      if (
        wrapped.code === "NOT_FOUND" &&
        !uri.startsWith("/") &&
        !uri.startsWith("s3://") &&
        !uri.startsWith("http")
      ) {
        try {
          const key = "/" + (uri.startsWith("/") ? uri.slice(1) : uri);
          const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
          const response = await this.client.send(command);
          if (response.Body) {
            return ok(response.Body as Readable);
          }
        } catch {
          // ignore retry error; fall back to original
        }
      }
      return err(wrapped);
    }
  }

  async listDirectory(prefix: string): Promise<Result<string[], DomainError>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      const uris = (response.Contents ?? [])
        .filter((obj) => obj.Key)
        .map((obj) => `s3://${this.bucket}/${obj.Key}`);

      return ok(uris);
    } catch (cause) {
      return err(this.mapError(cause, DomainError.storageListFailed, { prefix }));
    }
  }

  async generatePresignedUrl(
    uri: string,
    expirySeconds: number,
  ): Promise<Result<string, DomainError>> {
    try {
      const key = this.extractKeyFromUri(uri);
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
      return ok(url);
    } catch (cause) {
      return err(this.mapError(cause, DomainError.presignedUrlFailed, { uri, expirySeconds }));
    }
  }

  /**
   * Resolve an object key. Accepts either:
   *  - full URI `s3://<bucket>/<key>`  -> extract key
   *  - plain `<key>`                   -> use as-is (no leading slash)
   */
  private resolveKey(uri: string): string {
    const prefixS3 = `s3://${this.bucket}/`;
    const prefixHttps1 = `https://${this.bucket}.`;
    const prefixHttps2 = `https://${process.env["B2_ENDPOINT"]?.replace(/^https?:\/\//, "") ?? ""}/${this.bucket}/`;

    if (uri.startsWith(prefixS3)) {
      return uri.slice(prefixS3.length);
    }
    if (uri.startsWith("https://") || uri.startsWith("http://")) {
      const s3PrefixIdx = uri.indexOf(`/${this.bucket}/`);
      if (s3PrefixIdx !== -1) {
        return uri.slice(s3PrefixIdx + this.bucket.length + 2);
      }
    }
    if (uri.startsWith(prefixHttps2)) {
      return uri.slice(prefixHttps2.length);
    }
    // Drop leading slash: B2 S3-compatible API disallows keys starting with "/"
    return uri.startsWith("/") ? uri.slice(1) : uri;
  }

  /**
   * Extract S3 key from s3://bucket/key URI
   * @deprecated Use resolveKey instead
   */
  private extractKeyFromUri(uri: string): string {
    return this.resolveKey(uri);
  }

  /**
   * Map AWS SDK errors to domain errors
   */
  private mapError(
    cause: unknown,
    errorFactory: (cause?: unknown) => DomainError,
    context: Record<string, unknown>,
  ): DomainError {
    const message = cause instanceof Error ? cause.message : "Unknown error";
    const causeObj = cause && typeof cause === "object" ? (cause as Record<string, unknown>) : null;

    // B2 / S3-compatible SDK errors: shape { name: "NoSuchKey", Code: "NoSuchKey", $metadata.httpStatusCode: 404 }
    const errName = causeObj?.["name"] as string | undefined;
    const errCode = causeObj?.["Code"] as string | undefined;
    const status = (causeObj?.["$metadata"] as { httpStatusCode?: number } | undefined)
      ?.httpStatusCode;
    const isNotFound =
      status === 404 ||
      errName === "NoSuchKey" ||
      errCode === "NoSuchKey" ||
      message.includes("NoSuchKey");
    const isDenied = status === 403 || errName === "AccessDenied" || errCode === "AccessDenied";

    if (isNotFound) {
      const id = String(context["uri"] ?? context["path"] ?? context["prefix"] ?? "unknown");
      return DomainError.notFound("object", id);
    }
    if (isDenied) {
      return DomainError.storageAccessDenied(new Error(message));
    }

    const wrapped = cause instanceof Error ? cause : new Error(message);
    return errorFactory(wrapped);
  }
}
