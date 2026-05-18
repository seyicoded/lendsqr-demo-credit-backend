import type { Knex } from "knex";

import type { User } from "../../models/user.model";
import { UserService } from "../../src/services/user.service";
import type { TransactionManager } from "../../src/types/database";
import { AppError } from "../../src/utils/app-error";

describe("UserService", () => {
  const sampleUser: User = {
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const createDependencies = () => {
    const userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };

    const auditLogRepository = {
      create: jest.fn(),
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
      userRepository as never,
      auditLogRepository as never,
      transactionManager,
    );

    return {
      auditLogRepository,
      transactionSpy,
      transactionManager,
      trx,
      userRepository,
      userService,
    };
  };

  it("creates a user and audit log within a transaction", async () => {
    const {
      auditLogRepository,
      transactionSpy,
      trx,
      userRepository,
      userService,
    } = createDependencies();

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(sampleUser);
    auditLogRepository.create.mockResolvedValue(undefined);

    const result = await userService.createUser({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });

    expect(result).toEqual(sampleUser);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(userRepository.create).toHaveBeenCalledWith(
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      trx,
    );
    expect(auditLogRepository.create).toHaveBeenCalledWith(
      {
        action: "USER_CREATED",
        entityId: sampleUser.id,
        entityType: "user",
        metadata: {
          email: sampleUser.email,
        },
      },
      trx,
    );
  });

  it("rejects duplicate emails before starting a transaction", async () => {
    const { transactionSpy, userRepository, userService } =
      createDependencies();

    userRepository.findByEmail.mockResolvedValue(sampleUser);

    await expect(
      userService.createUser({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("surfaces transaction failures so rollback can occur", async () => {
    const { auditLogRepository, userRepository, userService } =
      createDependencies();

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(sampleUser);
    auditLogRepository.create.mockRejectedValue(
      new Error("audit insert failed"),
    );

    await expect(
      userService.createUser({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    ).rejects.toThrow("audit insert failed");
  });

  it("returns a not found error when a user does not exist", async () => {
    const { userRepository, userService } = createDependencies();

    userRepository.findById.mockResolvedValue(null);

    await expect(userService.getUserById(404)).rejects.toBeInstanceOf(AppError);
  });
});
