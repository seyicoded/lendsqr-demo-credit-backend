import { Router } from "express";

import { UserController } from "../../controllers/user.controller";
import { asyncHandler } from "../../utils/async-handler";

export const createUserRouter = (userController: UserController): Router => {
  const router = Router();

  // guest
  router.post("/register", asyncHandler(userController.registerUser));
  router.post("/login", asyncHandler(userController.loginUser));

  // router.get("/", asyncHandler(userController.list));
  // router.get("/:id", asyncHandler(userController.getById));
  // router.post("/", asyncHandler(userController.create));

  // guarded route

  return router;
};
