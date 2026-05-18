import "dotenv/config";

import type { Knex } from "knex";

const connection = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "password",
  database: process.env.DB_NAME ?? "node_with_knex",
};

const baseConfig: Knex.Config = {
  client: "mysql2",
  connection,
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    directory: "./db/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./db/seeds",
    extension: "ts",
  },
};

export const knexConfig: Record<string, Knex.Config> = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: {
      ...connection,
      database: process.env.DB_NAME ?? "node_with_knex_test",
    },
  },
  production: baseConfig,
};
