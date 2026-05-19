import { CreateUserData } from "../../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export class AuthService {
  constructor() {}

  async validateNewUser(payload: CreateUserData): Promise<void> {
    // check password strength, email format, if user is blacklisted from external service
    if (payload.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    if (!/\S+@\S+\.\S+/.test(payload.email)) {
      throw new Error("Invalid email format");
    }

    // Example of checking against a blacklist, would replace with the lendsqr
    const blacklistedEmails = ["blacklisteduser@gmail.com"];
    if (blacklistedEmails.includes(payload.email)) {
      throw new Error("This email is blacklisted");
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async generateToken(payload: any): Promise<string> {
    // @ts-ignore
    return await jwt.sign(payload, env.JWT_SECRET as string, {
      expiresIn: env.JWT_EXPIRY as string,
    });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, env.JWT_SECRET as string);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }
}
