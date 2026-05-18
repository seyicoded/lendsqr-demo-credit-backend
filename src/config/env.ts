import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default("node_with_knex"),
  DB_USER: z.string().min(1).default("root"),
  DB_PASSWORD: z.string().default("password"),
  INITIAL_WALLET_BALANCE: z.coerce.number().int().nonnegative().default(10000),
  JWT_SECRET: z.string().min(1).default("your_jwt_secret_key"),
  JWT_EXPIRY: z.string().min(1).default("1h"),
});

export const env = envSchema.parse(process.env);
