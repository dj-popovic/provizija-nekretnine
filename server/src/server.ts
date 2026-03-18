import { config } from "./config/index.js";
import { logger, readBackup, replaceDataset } from "./modules/shared/index.js";
import { runSync, startScheduler } from "./modules/xml-sync/index.js";
import { buildApp } from "./app/app.js";

async function start() {
  logger.info({ env: config.env, port: config.port }, "Starting server");

  // Load last known good dataset from disk before accepting requests
  const backup = await readBackup();
  if (backup) {
    replaceDataset(backup);
  }

  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info("Server ready");
  } catch (err) {
    logger.error({ err }, "Server failed to start");
    process.exit(1);
  }

  // Run initial sync after the server is listening, then start periodic refresh.
  // This is non-blocking — if the XML feed is down, the server still serves
  // whatever was loaded from the backup.
  void runSync().then(() => {
    startScheduler();
  });
}

start();
