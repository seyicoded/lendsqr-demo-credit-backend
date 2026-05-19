import { StatusCodes } from "http-status-codes";

import type { CreateUserData, User } from "../../models/user.model";
import type { AuditLogRepository } from "../repositories/audit-log.repository";
import type { UserRepository } from "../repositories/user.repository";
import type { TransactionManager } from "../types/database";
import { AppError } from "../utils/app-error";
import { AuthService } from "./auth.service";
import { AUDIT_ACTIONS } from "../types/audit.types";
import { WalletRepository } from "../repositories/wallet.repository";
import { env } from "../config/env";

export class UserService {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async createUser(data: CreateUserData): Promise<User> {
    const existingUser = await this.userRepository.findByEmailOrUsername(
      data?.email,
      data?.username,
    );

    if (existingUser) {
      throw new AppError(
        "User with this email or username already exists",
        StatusCodes.CONFLICT,
        {
          email: data.email,
          username: data.username,
        },
      );
    }

    // check password strength, email format, if user is blacklisted from external service
    await this.authService.validateNewUser(data);

    const password = await this.authService.hashPassword(data.password);

    const user = await this.transactionManager.transaction(async (trx) => {
      // create user
      const user = await this.userRepository.create({ ...data, password }, trx);

      // create wallet
      await this.walletRepository.create(
        { userId: user.id, availableBalance: env.INITIAL_WALLET_BALANCE },
        trx,
      );

      // create audit log
      await this.auditLogRepository.create(
        {
          userId: user.id,
          action: AUDIT_ACTIONS.USER_REGISTERED,
          entityId: user.id,
          entityType: "user",
          metadata: { email: user.email },
        },
        trx,
      );

      return user;
    });

    const token = await this.authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return { ...user, token } as User;
  }

  async loginUser(
    data: Omit<CreateUserData, "firstName" | "lastName" | "username">,
  ): Promise<User> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    const isPasswordValid = await this.authService.comparePasswords(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    const token = await this.authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    // update last activity
    await this.userRepository.update(user.id, { ...user });

    return { ...user, token } as User;
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
