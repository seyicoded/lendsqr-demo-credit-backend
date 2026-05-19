import { Router } from "express";

import { UserController } from "../controllers/user.controller";
import { createUserRouter } from "./v1/user.routes";
import { buildContainer } from "../container";
import { createWalletRouter } from "./v1/wallet.routes";
import { createWebhookRouter } from "./v1/webhook.routes";

export const createApiRouter = (): Router => {
  const router = Router();
  const { userController, walletController, webhookController, appGuard } =
    buildContainer();

  router.get("/", (_req, res) => {
    res.json({ status: "success", message: "Service is healthy" });
  });
  router.get("/health", (_req, res) => {
    res.json({ status: "success", message: "Service is healthy" });
  });

  router.use("/v1/users", createUserRouter(userController));
  router.use("/v1/wallets", appGuard, createWalletRouter(walletController));
  router.use("/v1/webhooks", createWebhookRouter(webhookController));

  return router;
};
