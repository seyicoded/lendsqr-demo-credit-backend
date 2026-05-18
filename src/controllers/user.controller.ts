import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { UserService } from "../services/user.service";
import { successResponse } from "../utils/api-response";
import {
  createUserSchema,
  userIdParamSchema,
} from "../validators/user.validator";

export class UserController {
  constructor(private readonly userService: UserService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const payload = createUserSchema.parse(req.body);
    const user = await this.userService.createUser(payload);

    res
      .status(StatusCodes.CREATED)
      .json(successResponse("User created successfully", user));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const params = userIdParamSchema.parse(req.params);
    const user = await this.userService.getUserById(params.id);

    res
      .status(StatusCodes.OK)
      .json(successResponse("User retrieved successfully", user));
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.userService.listUsers();

    res
      .status(StatusCodes.OK)
      .json(successResponse("Users retrieved successfully", users));
  };
}
