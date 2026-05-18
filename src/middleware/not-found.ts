import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { errorResponse } from "../utils/api-response";

export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(StatusCodes.NOT_FOUND)
    .json(errorResponse(`Route ${req.method} ${req.originalUrl} not found`));
};
