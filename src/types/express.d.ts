import type { Request } from "express";
import type { User } from "../../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
