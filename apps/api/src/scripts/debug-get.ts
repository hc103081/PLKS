import "reflect-metadata";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

  const tests = [
    "sessions/123e4567-e89b-12d3-a456-426614174000.json",
    "sessions/not-exist.json",
    "vault/CS101/_quiz/CS101.json",
    "vault/CS101/nope.json",
  ];

  for (const key of tests) {
    try {
      const r = await client.send(
        new GetObjectCommand({ Bucket: required("B2_BUCKET_NAME"), Key: key }),
      );
      console.log(`✅ GET ${key} HTTP 200. Body? ${!!r.Body}`);
    } catch (e: any) {
      const status = e?.$metadata?.httpStatusCode ?? "??";
      const name = e?.name ?? "Error";
      const code = e?.Code ?? e?.code ?? "";
      console.log(
        `❌ GET ${key} HTTP ${status} ${name} ${code} msg=${e?.message?.slice(0, 120) ?? ""}`,
      );
    }
  }
}
main();
