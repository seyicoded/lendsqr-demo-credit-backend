import { Router } from "express";

import { UserController } from "../controllers/user.controller";
import { createUserRouter } from "./v1/user.routes";
import { buildContainer } from "../container";

export const createApiRouter = (): Router => {
  const router = Router();
  const { userController } = buildContainer();

  router.get("/health", (_req, res) => {
    res.json({ status: "success", message: "Service is healthy" });
  });

  router.use("/v1/users", createUserRouter(userController));

  return router;
};
