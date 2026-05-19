import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { UserService } from "../services/user.service";
import { successResponse } from "../utils/api-response";
import {
  createUserSchema,
  loginUserSchema,
  userIdParamSchema,
} from "../validators/user.validator";
import { AuthService } from "../services/auth.service";

export class UserController {
  constructor(private readonly userService: UserService) {}

  registerUser = async (req: Request, res: Response): Promise<void> => {
    const payload = createUserSchema.parse(req.body);
    const user = await this.userService.createUser(payload);

    const { password, ...userWithoutPassword } = user;

    res
      .status(StatusCodes.CREATED)
      .json(successResponse("User created successfully", userWithoutPassword));
  };

  loginUser = async (req: Request, res: Response): Promise<void> => {
    const payload = loginUserSchema.parse(req.body);
    const user = await this.userService.loginUser(payload);

    const { password, ...userWithoutPassword } = user;

    res
      .status(StatusCodes.OK)
      .json(
        successResponse("User logged in successfully", userWithoutPassword),
      );
  };
}
