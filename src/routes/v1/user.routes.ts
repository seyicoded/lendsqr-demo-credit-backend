import { Router } from "express";

import { UserController } from "../../controllers/user.controller";
import { asyncHandler } from "../../utils/async-handler";

export const createUserRouter = (userController: UserController): Router => {
  const router = Router();

  router.get("/", asyncHandler(userController.list));
  router.get("/:id", asyncHandler(userController.getById));
  router.post("/", asyncHandler(userController.create));

  return router;
};
