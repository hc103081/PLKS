import "reflect-metadata";
import { Readable } from "node:stream";
import { config } from "dotenv";
import { B2StorageAdapter } from "../adapters/b2-storage.adapter.js";

config({ path: "C:/project_Code/PLKS/.env" });

console.log(
  "DEBUG B2 env: BUCKET=",
  process.env["B2_BUCKET_NAME"],
  "ENDPOINT=",
  process.env["B2_ENDPOINT"],
  "KEYID prefix=",
  `${(process.env["B2_APPLICATION_KEY_ID"] ?? "").slice(0, 8)}***`,
  "REGION=",
  process.env["B2_REGION"],
);

process.chdir(
  new URL("../../../..", import.meta.url).pathname
    .slice(1)
    .replace(/^\//, "")
    .replace(/^([A-Z]):\//, "$1:/"),
);

async function main() {
  const adapter = new B2StorageAdapter();

  // 1. download a known session
  console.log("\n=== Test 1: downloadFile session (known exists) ===");
  const d1 = await adapter.downloadFile("sessions/123e4567-e89b-12d3-a456-426614174000.json");
  console.log("isOk?", d1.isOk(), "isErr?", d1.isErr());
  if (d1.isOk()) {
    const chunks: string[] = [];
    for await (const c of d1.value) chunks.push(typeof c === "string" ? c : c.toString());
    console.log("BODY:", chunks.join(""));
  } else {
    console.log("ERR:", d1.error.code, d1.error.message, "cause=", String(d1.error.cause ?? ""));
  }

  // 2. download a missing session
  console.log("\n=== Test 2: downloadFile session (not-exists) ===");
  const d2 = await adapter.downloadFile("sessions/does-not-exist.json");
  console.log("isOk?", d2.isOk());
  if (d2.isErr()) console.log("ERR code=", d2.error.code, "msg=", d2.error.message);

  // 3. download quiz JSON (known exists)
  console.log("\n=== Test 3: downloadFile vault/CS101/_quiz/CS101.json ===");
  const d3 = await adapter.downloadFile("vault/CS101/_quiz/CS101.json");
  console.log("isOk?", d3.isOk());
  if (d3.isErr())
    console.log(
      "ERR code=",
      d3.error.code,
      "msg=",
      d3.error.message,
      "cause=",
      String(d3.error.cause ?? ""),
    );
  else {
    const chunks: string[] = [];
    for await (const c of d3.value) chunks.push(typeof c === "string" ? c : c.toString());
    const json = JSON.parse(chunks.join(""));
    console.log(
      "quiz items count:",
      Array.isArray(json) ? json.length : (json?.items?.length ?? "unknown shape"),
    );
  }

  // 4. listDirectory vault/CS101/
  console.log("\n=== Test 4: listDirectory vault/CS101/ ===");
  const l1 = await adapter.listDirectory("vault/CS101/");
  console.log("isOk?", l1.isOk());
  if (l1.isOk()) {
    for (const u of l1.value) {
      console.log(" -", u);
    }
  } else {
    console.log("ERR code=", l1.error.code, "msg=", l1.error.message);
  }

  // 5. generatePresignedUrl for an existing object
  console.log("\n=== Test 5: generatePresignedUrl ===");
  const p1 = await adapter.generatePresignedUrl("s3://test/vault/CS101/_quiz/CS101.json", 900);
  console.log("isOk?", p1.isOk());
  if (p1.isOk()) console.log("URL:", `${p1.value.slice(0, 100)}...`);
  else console.log("ERR code=", p1.error.code, "msg=", p1.error.message);

  // 6. upload + download a small file
  console.log("\n=== Test 6: uploadFile + downloadFile (roundtrip) ===");
  const key = `_debug/rt-${Date.now()}.json`;
  const payload = JSON.stringify({ hello: "world", ts: Date.now() });
  const up = await adapter.uploadFile(key, Readable.from([payload]));
  console.log("upload isOk?", up.isOk());
  if (up.isOk()) console.log("URI:", up.value);
  else console.log("ERR code=", up.error.code, "msg=", up.error.message);

  const dl = await adapter.downloadFile(key);
  console.log("download isOk?", dl.isOk());
  if (dl.isOk()) {
    const chunks: string[] = [];
    for await (const c of dl.value) chunks.push(typeof c === "string" ? c : c.toString());
    console.log("BODY:", chunks.join(""));
  }
}
main().catch(console.error);
