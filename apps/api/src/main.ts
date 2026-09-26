// apps/api/src/main.ts
import 'reflect-metadata';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

// Import after dotenv.config() so env vars are loaded
const { default: Fastify } = await import('fastify');
const { loadEnv } = await import('./config/env.js');
const { container } = await import('tsyringe');

const env = loadEnv();

// Import routes (will be implemented in later phases)
// import { ingestionRoutes } from './routes/ingestion';
// import { orchestratorRoutes } from './routes/orchestrator';
// import { gamificationRoutes } from './routes/gamification';

const loggerConfig = {
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
};

const app = Fastify({
  logger: loggerConfig,
});

// Register DI container
app.decorate('container', container);

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register routes (placeholders for now)
// app.register(ingestionRoutes, { prefix: env.API_PREFIX });
// app.register(orchestratorRoutes, { prefix: env.API_PREFIX });
// app.register(gamificationRoutes, { prefix: env.API_PREFIX });

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();