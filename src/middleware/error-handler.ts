import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import { errorResponse } from "../utils/api-response";
import { AppError } from "../utils/app-error";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json(errorResponse("Validation failed", error.flatten()));
    return;
  }

  if (error instanceof AppError) {
    res
      .status(error.statusCode)
      .json(errorResponse(error.message, error.details));
    return;
  }

  res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(errorResponse("Internal server error"));
};
