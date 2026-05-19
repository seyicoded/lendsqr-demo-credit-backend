import type { Knex } from "knex";

import type { CreateUserData, User } from "../../models/user.model";
import { UserService } from "../../src/services/user.service";
import type { TransactionManager } from "../../src/types/database";
import { AppError } from "../../src/utils/app-error";
import { validateBlacklist } from "../../src/network/external-api";
import { AUDIT_ACTIONS } from "../../src/types/audit.types";
import { env } from "../../src/config/env";

jest.mock("../../src/network/external-api", () => ({
  validateBlacklist: jest.fn(),
}));

const mockValidateBlacklist = validateBlacklist as jest.MockedFunction<
  typeof validateBlacklist
>;

describe("UserService", () => {
  const sampleUser: User = {
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    bvn: 12345678901,
    email: "ada@example.com",
    username: "ada_lovelace",
    password: "hashedPassword123\!",
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const createUserInput: CreateUserData = {
    firstName: "Ada",
    lastName: "Lovelace",
    bvn: 12345678901,
    email: "ada@example.com",
    username: "ada_lovelace",
    password: "StrongPass123\!",
  };

  const createDependencies = () => {
    const userRepository = {
      findByEmail: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    };

    const auditLogRepository = {
      create: jest.fn(),
    };

    const walletRepository = {
      create: jest.fn(),
    };

    const authService = {
      validateNewUser: jest.fn(),
      hashPassword: jest.fn(),
      comparePasswords: jest.fn(),
      generateToken: jest.fn(),
    };

    const trx = {} as Knex.Transaction;
    const transactionSpy = jest.fn(
      async (handler: (transaction: Knex.Transaction) => Promise<unknown>) => {
        return handler(trx);
      },
    );
    const transactionManager = {
      transaction: transactionSpy as TransactionManager["transaction"],
    } satisfies TransactionManager;

    const userService = new UserService(
      authService as never,
      userRepository as never,
      auditLogRepository as never,
      walletRepository as never,
      transactionManager,
    );

    return {
      auditLogRepository,
      authService,
      transactionSpy,
      transactionManager,
      trx,
      userRepository,
      walletRepository,
      userService,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createUser ─────────────────────────────────────────────────────────────

  describe("createUser", () => {
    it("creates user, wallet and audit log inside a transaction", async () => {
      const {
        auditLogRepository,
        authService,
        transactionSpy,
        trx,
        userRepository,
        walletRepository,
        userService,
      } = createDependencies();

      userRepository.findByEmailOrUsername.mockResolvedValue(null);
      authService.validateNewUser.mockResolvedValue(undefined);
      mockValidateBlacklist.mockResolvedValue(false);
      authService.hashPassword.mockResolvedValue("hashedPassword123\!");
      userRepository.create.mockResolvedValue(sampleUser);
      walletRepository.create.mockResolvedValue(undefined);
      auditLogRepository.create.mockResolvedValue(undefined);
      authService.generateToken.mockResolvedValue("token.jwt.string");

      const result = await userService.createUser(createUserInput);

      expect(result).toEqual({ ...sampleUser, token: "token.jwt.string" });
      expect(transactionSpy).toHaveBeenCalledTimes(1);

      expect(userRepository.create).toHaveBeenCalledWith(
        { ...createUserInput, password: "hashedPassword123\!" },
        trx,
      );

      expect(walletRepository.create).toHaveBeenCalledWith(
        { userId: sampleUser.id, availableBalance: env.INITIAL_WALLET_BALANCE },
        trx,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        {
          userId: sampleUser.id,
          action: AUDIT_ACTIONS.USER_REGISTERED,
          entityId: sampleUser.id,
          entityType: "user",
          metadata: { email: sampleUser.email },
        },
        trx,
      );

      expect(authService.generateToken).toHaveBeenCalledWith({
        userId: sampleUser.id,
        email: sampleUser.email,
      });
    });

    it("throws CONFLICT when email or username is already taken", async () => {
      const { transactionSpy, userRepository, userService } =
        createDependencies();

      userRepository.findByEmailOrUsername.mockResolvedValue(sampleUser);

      await expect(
        userService.createUser(createUserInput),
      ).rejects.toBeInstanceOf(AppError);

      await expect(
        userService.createUser(createUserInput),
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it("throws FORBIDDEN when user BVN is blacklisted", async () => {
      const { transactionSpy, userRepository, authService, userService } =
        createDependencies();

      userRepository.findByEmailOrUsername.mockResolvedValue(null);
      authService.validateNewUser.mockResolvedValue(undefined);
      mockValidateBlacklist.mockResolvedValue(true);

      await expect(
        userService.createUser(createUserInput),
      ).rejects.toBeInstanceOf(AppError);

      await expect(
        userService.createUser(createUserInput),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it("throws when authService.validateNewUser rejects", async () => {
      const { transactionSpy, userRepository, authService, userService } =
        createDependencies();

      userRepository.findByEmailOrUsername.mockResolvedValue(null);
      authService.validateNewUser.mockRejectedValue(
        new Error("Password too weak"),
      );

      await expect(userService.createUser(createUserInput)).rejects.toThrow(
        "Password too weak",
      );

      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it("surfaces transaction failures so rollback can occur", async () => {
      const {
        auditLogRepository,
        userRepository,
        authService,
        walletRepository,
        userService,
      } = createDependencies();

      userRepository.findByEmailOrUsername.mockResolvedValue(null);
      authService.validateNewUser.mockResolvedValue(undefined);
      mockValidateBlacklist.mockResolvedValue(false);
      authService.hashPassword.mockResolvedValue("hashedPassword123\!");
      userRepository.create.mockResolvedValue(sampleUser);
      walletRepository.create.mockResolvedValue(undefined);
      auditLogRepository.create.mockRejectedValue(
        new Error("audit insert failed"),
      );

      await expect(userService.createUser(createUserInput)).rejects.toThrow(
        "audit insert failed",
      );
    });
  });

  // ─── loginUser ──────────────────────────────────────────────────────────────

  describe("loginUser", () => {
    const loginInput = {
      email: "ada@example.com",
      password: "StrongPass123\!",
    };

    it("returns user with token on valid credentials", async () => {
      const { userRepository, authService, userService } = createDependencies();

      userRepository.findByEmail.mockResolvedValue(sampleUser);
      authService.comparePasswords.mockResolvedValue(true);
      authService.generateToken.mockResolvedValue("token.jwt.string");
      userRepository.update.mockResolvedValue(sampleUser);

      const result = await userService.loginUser(loginInput);

      expect(result).toEqual({ ...sampleUser, token: "token.jwt.string" });
      expect(authService.comparePasswords).toHaveBeenCalledWith(
        loginInput.password,
        sampleUser.password,
      );
      expect(authService.generateToken).toHaveBeenCalledWith({
        userId: sampleUser.id,
        email: sampleUser.email,
      });
      expect(userRepository.update).toHaveBeenCalledWith(
        sampleUser.id,
        expect.objectContaining({ email: sampleUser.email }),
      );
    });

    it("throws UNAUTHORIZED when email is not found", async () => {
      const { userRepository, userService } = createDependencies();

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.loginUser(loginInput)).rejects.toBeInstanceOf(
        AppError,
      );
      await expect(userService.loginUser(loginInput)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("throws UNAUTHORIZED when password is incorrect", async () => {
      const { userRepository, authService, userService } = createDependencies();

      userRepository.findByEmail.mockResolvedValue(sampleUser);
      authService.comparePasswords.mockResolvedValue(false);

      await expect(userService.loginUser(loginInput)).rejects.toBeInstanceOf(
        AppError,
      );
      await expect(userService.loginUser(loginInput)).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ─── getUserById ────────────────────────────────────────────────────────────

  describe("getUserById", () => {
    it("returns the user when found", async () => {
      const { userRepository, userService } = createDependencies();

      userRepository.findById.mockResolvedValue(sampleUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual(sampleUser);
      expect(userRepository.findById).toHaveBeenCalledWith(1);
    });

    it("throws NOT_FOUND when user does not exist", async () => {
      const { userRepository, userService } = createDependencies();

      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(404)).rejects.toBeInstanceOf(
        AppError,
      );
      await expect(userService.getUserById(404)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ─── listUsers ──────────────────────────────────────────────────────────────

  describe("listUsers", () => {
    it("returns all users from the repository", async () => {
      const { userRepository, userService } = createDependencies();

      const users = [
        sampleUser,
        { ...sampleUser, id: 2, email: "bob@example.com" },
      ];
      userRepository.list.mockResolvedValue(users);

      const result = await userService.listUsers();

      expect(result).toEqual(users);
      expect(userRepository.list).toHaveBeenCalledTimes(1);
    });

    it("returns an empty array when no users exist", async () => {
      const { userRepository, userService } = createDependencies();

      userRepository.list.mockResolvedValue([]);

      const result = await userService.listUsers();

      expect(result).toEqual([]);
    });
  });
});
