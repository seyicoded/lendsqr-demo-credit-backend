import { Router } from "express";

import { UserController } from "../../controllers/user.controller";
import { asyncHandler } from "../../utils/async-handler";

export const createUserRouter = (userController: UserController): Router => {
  const router = Router();

  // guest
  router.post("/register", asyncHandler(userController.registerUser));
  router.post("/login", asyncHandler(userController.loginUser));

  return router;
};
