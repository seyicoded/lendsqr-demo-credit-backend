import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { AuthService } from "../services/auth.service";
import type { UserRepository } from "../repositories/user.repository";

const authService = new AuthService();

export const createAppGuard = (userRepository: UserRepository) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | null> => {
    try {
      // extract access token from headers bearer token
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Missing or invalid token",
        });
        return null;
      }

      // get id and email from token
      const token = authHeader.slice(7);
      const decoded = authService.verifyToken(token);

      // confirm if email exist in the users table of our database
      const user = await userRepository.findByEmail(decoded.email);

      if (!user) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "User not found",
        });
        return null;
      }

      // attach toUser(user) into req.user
      req.user = user;

      next();
    } catch (error) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return null;
  };
};
