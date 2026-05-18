import { db } from "../db/knex";
import { env } from "./config/env";
import { createApp } from "./app";

const startServer = async (): Promise<void> => {
  await db.raw("SELECT 1");

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
};

void startServer();
