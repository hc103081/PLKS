// apps/api/src/config/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  B2_APPLICATION_KEY_ID: z.string().min(1),
  B2_APPLICATION_KEY: z.string().min(1),
  B2_BUCKET_NAME: z.string().min(1),
  B2_ENDPOINT: z.string().url(),
  B2_REGION: z.string().min(1),
  NVIDIA_API_KEY: z.string().min(1),
  NVIDIA_BASE_URL: z.string().url(),
  NVIDIA_MODEL: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  API_PREFIX: z.string().startsWith("/").default("/api"),
});

export function loadEnv(): z.infer<typeof EnvSchema> {
  return EnvSchema.parse(process.env);
}
