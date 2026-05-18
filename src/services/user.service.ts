import { StatusCodes } from "http-status-codes";

import type { CreateUserData, User } from "../../models/user.model";
import type { AuditLogRepository } from "../repositories/audit-log.repository";
import type { UserRepository } from "../repositories/user.repository";
import type { TransactionManager } from "../types/database";
import { AppError } from "../utils/app-error";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async createUser(data: CreateUserData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new AppError(
        "User with this email already exists",
        StatusCodes.CONFLICT,
        {
          email: data.email,
        },
      );
    }

    return this.transactionManager.transaction(async (trx) => {
      const user = await this.userRepository.create(data, trx);

      await this.auditLogRepository.create(
        {
          action: "USER_CREATED",
          entityId: user.id,
          entityType: "user",
          metadata: { email: user.email },
        },
        trx,
      );

      return user;
    });
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, { id });
    }

    return user;
  }

  async listUsers(): Promise<User[]> {
    return this.userRepository.list();
  }
}
