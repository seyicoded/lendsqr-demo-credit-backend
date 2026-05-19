import type { Knex } from "knex";

import type { WalletTransaction } from "../../models/wallet-transaction";
import { WebhookService } from "../../src/services/webhook.service";
import type { TransactionManager } from "../../src/types/database";
import { RedisObject } from "../../src/connector/redisAdaptor";

jest.mock("../../src/connector/redisAdaptor", () => ({
  RedisObject: jest.fn(),
}));

const mockRedisObject = RedisObject as jest.MockedFunction<typeof RedisObject>;

describe("WebhookService", () => {
  const sampleTransaction: WalletTransaction = {
    id: 100,
    userId: 1,
    walletId: 10,
    amount: 5000,
    status: "processing",
    reason: "top-up",
    reference: "paystack-ref-001",
    type: "deposit",
    via: "card",
    senderInfo: {},
    receiverInfo: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockRedisClient: {
    isOpen: boolean;
    connect: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  const buildRequest = (overrides: Record<string, unknown> = {}) => ({
    headers: { "x-paystack-signature": "sha512=abc" },
    body: {
      event: "charge.success",
      data: { reference: "paystack-ref-001" },
      ...overrides,
    },
  });

  const createDependencies = () => {
    const userRepository = {};

    const auditLogRepository = {
      create: jest.fn(),
    };

    const walletRepository = {
      incrementBalance: jest.fn(),
    };

    const walletTransactionRepository = {
      findByReference: jest.fn(),
      updateStatus: jest.fn(),
    };

    const trx = {} as Knex.Transaction;
    const transactionSpy = jest.fn(
      async (handler: (transaction: Knex.Transaction) => Promise<unknown>) =>
        handler(trx),
    );
    const transactionManager = {
      transaction: transactionSpy as TransactionManager["transaction"],
    } satisfies TransactionManager;

    const webhookService = new WebhookService(
      userRepository as never,
      auditLogRepository as never,
      walletRepository as never,
      walletTransactionRepository as never,
      transactionManager,
    );

    return {
      auditLogRepository,
      transactionSpy,
      trx,
      walletRepository,
      walletTransactionRepository,
      webhookService,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedisClient = {
      isOpen: true,
      connect: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    // Capture lockValue so the finally-block del() path is always exercised
    let capturedLockValue: string;
    mockRedisClient.set.mockImplementation(async (_key: string, value: string) => {
      capturedLockValue = value;
      return "OK";
    });
    mockRedisClient.get.mockImplementation(async () => capturedLockValue);
    mockRedisClient.del.mockResolvedValue(1);

    mockRedisObject.mockResolvedValue(mockRedisClient as never);
  });

  // ─── verifyPaystackTransaction ──────────────────────────────────────────────

  describe("verifyPaystackTransaction", () => {
    it("returns ignored when the Redis lock for the reference is already held", async () => {
      const { webhookService } = createDependencies();

      mockRedisClient.set.mockResolvedValue(null); // lock not acquired

      const result = await webhookService.verifyPaystackTransaction(
        buildRequest(),
      );

      expect(result).toEqual({
        status: "ignored",
        message: "Reference is currently being processed",
      });
    });

    it("throws when x-paystack-signature header is missing", async () => {
      const { webhookService } = createDependencies();

      const req = buildRequest();
      req.headers = {} as typeof req.headers; // no signature header

      await expect(
        webhookService.verifyPaystackTransaction(req),
      ).rejects.toThrow("x-paystack-signature not found on headers");

      // lock must be released even on throw
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("returns ignored when event is not charge.success", async () => {
      const { webhookService } = createDependencies();

      const result = await webhookService.verifyPaystackTransaction(
        buildRequest({ event: "transfer.success" }),
      );

      expect(result).toEqual({
        status: "ignored",
        message: "Event ignored, not a charge.success event",
      });
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("throws when no wallet transaction matches the reference", async () => {
      const { walletTransactionRepository, webhookService } =
        createDependencies();

      walletTransactionRepository.findByReference.mockResolvedValue(null);

      await expect(
        webhookService.verifyPaystackTransaction(buildRequest()),
      ).rejects.toThrow("No wallet transaction found for reference");

      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("returns ignored when the wallet transaction is already completed", async () => {
      const { walletTransactionRepository, webhookService } =
        createDependencies();

      walletTransactionRepository.findByReference.mockResolvedValue({
        ...sampleTransaction,
        status: "completed",
      });

      const result = await webhookService.verifyPaystackTransaction(
        buildRequest(),
      );

      expect(result).toEqual({
        status: "ignored",
        message: "Wallet transaction already completed for this reference",
      });
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("completes the transaction, increments balance, creates audit log, and releases lock", async () => {
      const {
        auditLogRepository,
        transactionSpy,
        trx,
        walletRepository,
        walletTransactionRepository,
        webhookService,
      } = createDependencies();

      walletTransactionRepository.findByReference.mockResolvedValue(
        sampleTransaction,
      );
      walletTransactionRepository.updateStatus.mockResolvedValue(undefined);
      walletRepository.incrementBalance.mockResolvedValue(undefined);
      auditLogRepository.create.mockResolvedValue(undefined);

      const result = await webhookService.verifyPaystackTransaction(
        buildRequest(),
      );

      expect(result).toEqual({
        status: "success",
        message: "Wallet transaction verified and completed successfully",
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);

      expect(walletTransactionRepository.updateStatus).toHaveBeenCalledWith(
        sampleTransaction.id,
        "completed",
        trx,
      );

      expect(walletRepository.incrementBalance).toHaveBeenCalledWith(
        sampleTransaction.walletId,
        sampleTransaction.amount,
        trx,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleTransaction.userId,
          action: "wallet_funded",
          entityId: sampleTransaction.id,
          entityType: "wallet_transaction",
        }),
        trx,
      );

      // lock released in finally
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("connects to Redis if client is not already open", async () => {
      const { walletTransactionRepository, webhookService } =
        createDependencies();

      mockRedisClient.isOpen = false;
      walletTransactionRepository.findByReference.mockResolvedValue({
        ...sampleTransaction,
        status: "completed",
      });

      await webhookService.verifyPaystackTransaction(buildRequest());

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });
});
