import type { Knex } from "knex";

import type { User } from "../../models/user.model";
import type { Wallet } from "../../models/wallet.model";
import type { WalletTransaction } from "../../models/wallet-transaction";
import { WalletService } from "../../src/services/wallet.service";
import type { TransactionManager } from "../../src/types/database";
import { AUDIT_ACTIONS } from "../../src/types/audit.types";
import {
  createPaystackPayment,
  getBankList,
  validateAccount,
} from "../../src/network/external-api";
import { RedisObject } from "../../src/connector/redisAdaptor";

jest.mock("../../src/network/external-api", () => ({
  createPaystackPayment: jest.fn(),
  getBankList: jest.fn(),
  validateAccount: jest.fn(),
}));

jest.mock("../../src/connector/redisAdaptor", () => ({
  RedisObject: jest.fn(),
}));

jest.mock("../../src/config/env", () => ({
  env: {
    PAYSTACK_SUCCESS_URL: "https://example.com/success",
    PAYSTACK_BASE_URL: "https://api.paystack.co",
    PAYSTACK_SECRET_KEY: "sk_test_xxx",
    INITIAL_WALLET_BALANCE: 0,
  },
}));

const mockCreatePaystackPayment = createPaystackPayment as jest.MockedFunction<typeof createPaystackPayment>;
const mockGetBankList = getBankList as jest.MockedFunction<typeof getBankList>;
const mockValidateAccount = validateAccount as jest.MockedFunction<typeof validateAccount>;
const mockRedisObject = RedisObject as jest.MockedFunction<typeof RedisObject>;

describe("WalletService", () => {
  const sampleUser: User = {
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    bvn: 12345678901,
    email: "ada@example.com",
    username: "ada_lovelace",
    password: "hashedPassword123!",
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const recipientUser: User = {
    id: 2,
    firstName: "Bob",
    lastName: "Babbage",
    bvn: 98765432101,
    email: "bob@example.com",
    username: "bob_babbage",
    password: "hashedPassword456!",
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const senderWallet: Wallet = {
    id: 10,
    userId: 1,
    availableBalance: 50000,
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const recipientWallet: Wallet = {
    id: 20,
    userId: 2,
    availableBalance: 10000,
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
  };

  const sampleTransaction: WalletTransaction = {
    id: 100,
    userId: 1,
    walletId: 10,
    amount: 5000,
    status: "processing",
    reason: "test",
    reference: "ref-123",
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

  const createDependencies = () => {
    const userRepository = {
      findByUsername: jest.fn(),
    };

    const auditLogRepository = {
      create: jest.fn(),
    };

    const walletRepository = {
      findByUserId: jest.fn(),
      incrementBalance: jest.fn(),
    };

    const walletTransactionRepository = {
      create: jest.fn(),
      findByWalletId: jest.fn(),
    };

    const trx = {} as Knex.Transaction;
    const transactionSpy = jest.fn(
      async (handler: (transaction: Knex.Transaction) => Promise<unknown>) =>
        handler(trx),
    );
    const transactionManager = {
      transaction: transactionSpy as TransactionManager["transaction"],
    } satisfies TransactionManager;

    const walletService = new WalletService(
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
      userRepository,
      walletRepository,
      walletTransactionRepository,
      walletService,
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

    // Capture lockValue so finally-block del() is always exercised
    let capturedLockValue: string;
    mockRedisClient.set.mockImplementation(async (_key: string, value: string) => {
      capturedLockValue = value;
      return "OK";
    });
    mockRedisClient.get.mockImplementation(async () => capturedLockValue);
    mockRedisClient.del.mockResolvedValue(1);

    mockRedisObject.mockResolvedValue(mockRedisClient as never);
  });

  // ─── fundWalletViaCard ──────────────────────────────────────────────────────

  describe("fundWalletViaCard", () => {
    it("returns authorization_url and reference, creates transaction and audit log", async () => {
      const {
        auditLogRepository,
        transactionSpy,
        trx,
        walletRepository,
        walletTransactionRepository,
        walletService,
      } = createDependencies();

      mockCreatePaystackPayment.mockResolvedValue({
        authorization_url: "https://paystack.com/pay/abc",
        reference: "paystack-ref-001",
      });
      walletRepository.findByUserId.mockResolvedValue(senderWallet);
      walletTransactionRepository.create.mockResolvedValue(sampleTransaction);
      auditLogRepository.create.mockResolvedValue(undefined);

      const result = await walletService.fundWalletViaCard(
        { amount: 5000, reason: "top-up" },
        sampleUser,
      );

      expect(result).toEqual({
        authorization_url: "https://paystack.com/pay/abc",
        reference: "paystack-ref-001",
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(walletTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          walletId: senderWallet.id,
          amount: 5000,
          reference: "paystack-ref-001",
          status: "processing",
          type: "deposit",
          via: "card",
        }),
        trx,
      );
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          action: AUDIT_ACTIONS.FUND_WALLET_LINK,
          entityId: sampleTransaction.id,
          entityType: "wallet_transaction",
        }),
        trx,
      );
    });

    it("throws when Paystack payment creation fails", async () => {
      const { walletService } = createDependencies();

      mockCreatePaystackPayment.mockRejectedValue(new Error("Paystack error"));

      await expect(
        walletService.fundWalletViaCard({ amount: 5000, reason: "top-up" }, sampleUser),
      ).rejects.toThrow("Paystack error");
    });
  });

  // ─── transferToInternalWallet ───────────────────────────────────────────────

  describe("transferToInternalWallet", () => {
    const transferData = {
      amount: 1000,
      recipient_username: "bob_babbage",
      reason: "lunch",
    };

    it("returns ignored when the Redis lock is already held", async () => {
      const { walletService } = createDependencies();

      mockRedisClient.set.mockResolvedValue(null); // lock not acquired

      const result = await walletService.transferToInternalWallet(
        transferData,
        sampleUser,
      );

      expect(result).toEqual({
        status: "ignored",
        message: "Transfer is already being processed for this user",
      });
    });

    it("throws when sender has insufficient balance", async () => {
      const { walletRepository, walletService } = createDependencies();

      walletRepository.findByUserId.mockResolvedValue({
        ...senderWallet,
        availableBalance: 500,
      });

      await expect(
        walletService.transferToInternalWallet(transferData, sampleUser),
      ).rejects.toThrow("Insufficient wallet balance for transfer");
    });

    it("throws when recipient user is not found", async () => {
      const { userRepository, walletRepository, walletService } =
        createDependencies();

      walletRepository.findByUserId.mockResolvedValue(senderWallet);
      userRepository.findByUsername.mockResolvedValue(null);

      await expect(
        walletService.transferToInternalWallet(transferData, sampleUser),
      ).rejects.toThrow("Recipient user not found");
    });

    it("throws when recipient wallet is not found", async () => {
      const { userRepository, walletRepository, walletService } =
        createDependencies();

      walletRepository.findByUserId
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(null);
      userRepository.findByUsername.mockResolvedValue(recipientUser);

      await expect(
        walletService.transferToInternalWallet(transferData, sampleUser),
      ).rejects.toThrow("Recipient wallet not found");
    });

    it("creates two transactions, adjusts both balances, and logs audit inside transaction", async () => {
      const {
        auditLogRepository,
        transactionSpy,
        trx,
        userRepository,
        walletRepository,
        walletTransactionRepository,
        walletService,
      } = createDependencies();

      walletRepository.findByUserId
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);
      userRepository.findByUsername.mockResolvedValue(recipientUser);
      walletTransactionRepository.create.mockResolvedValue(sampleTransaction);
      walletRepository.incrementBalance.mockResolvedValue(undefined);
      auditLogRepository.create.mockResolvedValue(undefined);

      const result = await walletService.transferToInternalWallet(
        transferData,
        sampleUser,
      );

      expect(result).toEqual({
        status: "success",
        message: "Transfer completed successfully",
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(walletTransactionRepository.create).toHaveBeenCalledTimes(2);

      // sender withdrawal
      expect(walletTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          walletId: senderWallet.id,
          type: "withdrawal",
          via: "wallet",
          status: "completed",
        }),
        trx,
      );

      // recipient deposit
      expect(walletTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: recipientUser.id,
          walletId: recipientWallet.id,
          type: "deposit",
          via: "wallet",
          status: "completed",
        }),
        trx,
      );

      // balance updates
      expect(walletRepository.incrementBalance).toHaveBeenCalledWith(
        senderWallet.id,
        -transferData.amount,
        trx,
      );
      expect(walletRepository.incrementBalance).toHaveBeenCalledWith(
        recipientWallet.id,
        transferData.amount,
        trx,
      );

      // audit log
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          action: AUDIT_ACTIONS.INTERNAL_TRANSFER,
          entityType: "user",
        }),
        trx,
      );

      // lock released in finally
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });
  });

  // ─── transferToExternalWallet ───────────────────────────────────────────────

  describe("transferToExternalWallet", () => {
    const externalData = {
      amount: 2000,
      bank_code: "044",
      account_number: "0123456789",
      reason: "payment",
    };

    it("returns ignored when the Redis lock is already held", async () => {
      const { walletService } = createDependencies();

      mockRedisClient.set.mockResolvedValue(null);

      const result = await walletService.transferToExternalWallet(
        externalData,
        sampleUser,
      );

      expect(result).toEqual({
        status: "ignored",
        message: "Transfer is already being processed for this user",
      });
    });

    it("throws when bank code is invalid", async () => {
      const { walletService } = createDependencies();

      mockGetBankList.mockResolvedValue([{ name: "Access Bank", code: "044" }]);
      mockValidateAccount.mockResolvedValue({ found: true, account_name: "Test User" });

      await expect(
        walletService.transferToExternalWallet(
          { ...externalData, bank_code: "999" },
          sampleUser,
        ),
      ).rejects.toThrow("Invalid bank code");
    });

    it("throws when account details are invalid", async () => {
      const { walletService } = createDependencies();

      mockGetBankList.mockResolvedValue([{ name: "Access Bank", code: "044" }]);
      mockValidateAccount.mockResolvedValue({ found: false, account_name: null });

      await expect(
        walletService.transferToExternalWallet(externalData, sampleUser),
      ).rejects.toThrow("Invalid account details");
    });

    it("throws when sender has insufficient balance", async () => {
      const { walletRepository, walletService } = createDependencies();

      mockGetBankList.mockResolvedValue([{ name: "Access Bank", code: "044" }]);
      mockValidateAccount.mockResolvedValue({ found: true, account_name: "Test User" });
      walletRepository.findByUserId.mockResolvedValue({
        ...senderWallet,
        availableBalance: 100,
      });

      await expect(
        walletService.transferToExternalWallet(externalData, sampleUser),
      ).rejects.toThrow("Insufficient wallet balance for transfer");
    });

    it("creates transaction, decrements balance, and logs audit inside transaction", async () => {
      const {
        auditLogRepository,
        transactionSpy,
        trx,
        walletRepository,
        walletTransactionRepository,
        walletService,
      } = createDependencies();

      mockGetBankList.mockResolvedValue([{ name: "Access Bank", code: "044" }]);
      mockValidateAccount.mockResolvedValue({ found: true, account_name: "Test User" });
      walletRepository.findByUserId.mockResolvedValue(senderWallet);
      walletTransactionRepository.create.mockResolvedValue(sampleTransaction);
      walletRepository.incrementBalance.mockResolvedValue(undefined);
      auditLogRepository.create.mockResolvedValue(undefined);

      const result = await walletService.transferToExternalWallet(
        externalData,
        sampleUser,
      );

      expect(result).toEqual({
        status: "success",
        message: "Transfer to external wallet completed successfully",
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(walletTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          walletId: senderWallet.id,
          type: "withdrawal",
          via: "direct_bank",
          status: "completed",
        }),
        trx,
      );
      expect(walletRepository.incrementBalance).toHaveBeenCalledWith(
        senderWallet.id,
        -externalData.amount,
        trx,
      );
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUser.id,
          action: AUDIT_ACTIONS.EXTERNAL_TRANSFER,
          entityType: "wallet",
        }),
        trx,
      );
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getWalletOverview ──────────────────────────────────────────────────────

  describe("getWalletOverview", () => {
    it("returns wallet and transactions for the user", async () => {
      const { walletRepository, walletTransactionRepository, walletService } =
        createDependencies();

      walletRepository.findByUserId.mockResolvedValue(senderWallet);
      walletTransactionRepository.findByWalletId.mockResolvedValue([
        sampleTransaction,
      ]);

      const result = await walletService.getWalletOverview(sampleUser);

      expect(result).toEqual({
        wallet: senderWallet,
        transactions: [sampleTransaction],
      });
      expect(walletRepository.findByUserId).toHaveBeenCalledWith(sampleUser.id);
      expect(walletTransactionRepository.findByWalletId).toHaveBeenCalledWith(
        senderWallet.id,
      );
    });

    it("returns null wallet and empty transactions when user has none", async () => {
      const { walletRepository, walletTransactionRepository, walletService } =
        createDependencies();

      walletRepository.findByUserId.mockResolvedValue(null);
      walletTransactionRepository.findByWalletId.mockResolvedValue([]);

      const result = await walletService.getWalletOverview(sampleUser);

      expect(result).toEqual({ wallet: null, transactions: [] });
    });
  });

  // ─── bankList ───────────────────────────────────────────────────────────────

  describe("bankList", () => {
    it("returns the list of banks from Paystack", async () => {
      const { walletService } = createDependencies();

      const banks = [
        { name: "Access Bank", code: "044" },
        { name: "First Bank", code: "011" },
      ];
      mockGetBankList.mockResolvedValue(banks);

      const result = await walletService.bankList();

      expect(result).toEqual(banks);
      expect(mockGetBankList).toHaveBeenCalledTimes(1);
    });
  });
});
