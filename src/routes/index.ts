import { Router } from "express";

import { UserController } from "../controllers/user.controller";
import { createUserRouter } from "./v1/user.routes";
import { buildContainer } from "../container";
import { createWalletRouter } from "./v1/wallet.routes";

export const createApiRouter = (): Router => {
  const router = Router();
  const { userController, walletController, appGuard } = buildContainer();

  router.get("/health", (_req, res) => {
    res.json({ status: "success", message: "Service is healthy" });
  });

  router.use("/v1/users", createUserRouter(userController));
  router.use("/v1/wallets", appGuard, createWalletRouter(walletController));

  return router;
};
