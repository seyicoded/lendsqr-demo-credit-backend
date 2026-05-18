import cors from "cors";
import express, { type Express } from "express";

import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { createApiRouter } from "./routes";

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createApiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
