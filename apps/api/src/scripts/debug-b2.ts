import "reflect-metadata";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "dotenv";

config({ path: "C:/project_Code/PLKS/.env" });
const env = process.env;

function required(name: string): string {
  const val = env[name];
  if (!val) throw new Error(`Missing env ${name}`);
  return val;
}

async function main() {
  const bucket = required("B2_BUCKET_NAME");
  const region = required("B2_REGION");
  const endpoint = required("B2_ENDPOINT");
  const keyId = required("B2_APPLICATION_KEY_ID");
  const appKey = required("B2_APPLICATION_KEY");

  console.log("=== B2 Debug Test ===");
  console.log("Bucket:", bucket);
  console.log("Region:", region);
  console.log("Endpoint:", endpoint);
  console.log("Key ID:", `${keyId.slice(0, 6)}***`);

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
    forcePathStyle: true,
  });

  console.log("\n1. Testing ListObjectsV2...");
  try {
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    console.log("✅ List OK. Objects found:", result.KeyCount ?? 0);
    if (result.Contents) {
      for (const o of result.Contents) {
        console.log("  -", o.Key, "(", o.Size, "bytes)");
      }
    }
  } catch (err) {
    console.error("❌ List FAILED:", err instanceof Error ? err.message : err);
    console.error("   Stack:", (err as Error).stack);
  }

  console.log("\n2. Testing PutObject (small text)...");
  try {
    const key = `_debug/ping-${Date.now()}.txt`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: "Hello from PLKS B2 adapter debug",
        ContentType: "text/plain",
      }),
    );
    console.log("✅ Put OK:", key);
  } catch (err) {
    console.error("❌ Put FAILED:", err instanceof Error ? err.message : err);
    console.error("   Stack:", (err as Error).stack);
  }

  console.log("\n3. Testing Presigned URL generation...");
  try {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: "_debug/signed-test.txt" }),
      { expiresIn: 900 },
    );
    console.log("✅ Presigned URL OK:", `${url.slice(0, 80)}...`);
  } catch (err) {
    console.error("❌ Presigned FAILED:", err instanceof Error ? err.message : err);
  }
}

main().catch(console.error);
