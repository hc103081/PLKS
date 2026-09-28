import "reflect-metadata";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({ path: "C:/project_Code/PLKS/.env" });
function required(n: string) {
  return process.env[n]!;
}

async function main() {
  const client = new S3Client({
    region: required("B2_REGION"),
    endpoint: required("B2_ENDPOINT"),
    credentials: {
      accessKeyId: required("B2_APPLICATION_KEY_ID"),
      secretAccessKey: required("B2_APPLICATION_KEY"),
    },
    forcePathStyle: true,
  });
  const bucket = required("B2_BUCKET_NAME");

  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 30 }));
  console.log("All keys in bucket:");
  (list.Contents ?? []).forEach((o) => console.log("  ", JSON.stringify(o.Key), "size=", o.Size));

  // Try each with leading slash too
  const candidates = [
    "sessions/123e4567-e89b-12d3-a456-426614174000.json",
    "/sessions/123e4567-e89b-12d3-a456-426614174000.json",
  ];
  for (const k of candidates) {
    try {
      await client.send(new GetObjectCommand({ Bucket: bucket, Key: k }));
      console.log("✅ Found:", JSON.stringify(k));
    } catch (e: any) {
      console.log(
        "❌",
        JSON.stringify(k),
        "HTTP",
        e?.$metadata?.httpStatusCode,
        e?.Code ?? e?.name,
      );
    }
  }
}
main();
