import { config } from "./config/index.js";
import { logger } from "./modules/shared/index.js";
import { buildApp } from "./app/app.js";

async function start() {
  logger.info({ env: config.env, port: config.port }, "Starting server");

  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info("Server ready");
  } catch (err) {
    logger.error({ err }, "Server failed to start");
    process.exit(1);
  }
}

start();
