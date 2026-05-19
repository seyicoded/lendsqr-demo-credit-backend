import { createClient } from "redis";
import "dotenv/config";
import { env } from "../config/env";

// @ts-ignore
const client = createClient({
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    connectTimeout: 30000,
  },
});

export const init = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
    client.on("connect", () => console.log("Normal client connected ✅"));
  } catch (error) {
    console.error("Redis connection error:", error);
  }
};
init();

export const RedisObject = async () => {
  return client;
};
