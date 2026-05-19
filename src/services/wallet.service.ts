import { User } from "../../models/user.model";
import {
  FundWalletViaCardData,
  TransferToExternalWalletData,
  TransferToInternalWalletData,
} from "../../models/wallet.model";
import { RedisObject } from "../connector/redisAdaptor";
import { env } from "../config/env";
import {
  createPaystackPayment,
  getBankList,
  validateAccount,
} from "../network/external-api";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import { UserRepository } from "../repositories/user.repository";
import { WalletTransactionRepository } from "../repositories/wallet-transaction.repository";
import { WalletRepository } from "../repositories/wallet.repository";
import { AUDIT_ACTIONS } from "../types/audit.types";
import { TransactionManager } from "../types/database";

export class WalletService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly walletRepository: WalletRepository,
    private readonly walletTransactionRepository: WalletTransactionRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  fundWalletViaCard = async (
    data: FundWalletViaCardData,
    user?: User,
  ): Promise<
    { authorization_url: string; reference: string } | undefined | null
  > => {
    // data.amount = data.amount * 100; // convert to kobo
    const { authorization_url, reference } = await createPaystackPayment({
      amount: data.amount * 100,
      email: user?.email || "",
      callbackUrl: env.PAYSTACK_SUCCESS_URL,
    });

    const wallet = await this.walletRepository.findByUserId(user?.id || -1);

    const __ = await this.transactionManager.transaction(async (trx) => {
      //   create record of payment
      const wt = await this.walletTransactionRepository.create(
        {
          userId: user?.id || -1,
          walletId: wallet?.id || -1,
          via: "card",
          amount: data.amount,
          reason: data.reason,
          reference: reference,
          status: "processing",
          type: "deposit",
          senderInfo: {
            type: "external",
            bank: "paystack",
          },
          receiverInfo: {
            user_id: user?.id || null,
            type: "internal",
          },
        },
        trx,
      );

      // create audit log for wallet funding attempt
      await this.auditLogRepository.create(
        {
          // @ts-expect-error - to satify the type requirement of userId in audit log, but we know user is always defined here
          userId: user?.id,
          action: AUDIT_ACTIONS.FUND_WALLET_LINK,
          details: `Attempted to fund wallet with amount: ${data.amount}`,
          createdAt: new Date(),
          entityId: wt.id,
          entityType: "wallet_transaction",
        },
        trx,
      );
    });

    return { authorization_url, reference };
  };

  transferToInternalWallet = async (
    data: TransferToInternalWalletData,
    user?: User,
  ) => {
    const rs = await RedisObject();
    const lockKey = `wallet:transfer:internal:${user?.id ?? "anonymous"}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let lockAcquired = false;

    try {
      if (!rs.isOpen) {
        await rs.connect();
      }

      const lock = await rs.set(lockKey, lockValue, { NX: true, EX: 90 });

      if (lock !== "OK") {
        return {
          status: "ignored",
          message: "Transfer is already being processed for this user",
        };
      }

      lockAcquired = true;

      //   check user current wallet balance is sufficient for transfer, if not throw error
      const senderWallet = await this.walletRepository.findByUserId(
        user?.id || -1,
      );

      if (!senderWallet || senderWallet.availableBalance < data.amount) {
        throw new Error("Insufficient wallet balance for transfer");
      }

      //   find recipient user by username, if not found throw error
      const recipientUser = await this.userRepository.findByUsername(
        data.recipient_username,
      );

      if (!recipientUser) {
        throw new Error("Recipient user not found");
      }

      //   find recipient wallet, if not found throw error
      const recipientWallet = await this.walletRepository.findByUserId(
        recipientUser.id,
      );

      if (!recipientWallet) {
        throw new Error("Recipient wallet not found");
      }

      //   create wallet transaction for sender with status completed, type withdrawal, via wallet
      //   create wallet transaction for recipient with status completed, type deposit, via wallet
      //   update sender wallet balance by decrementing transfer amount
      //   update recipient wallet balance by incrementing transfer amount
      //   create audit log for transfer

      await this.transactionManager.transaction(async (trx) => {
        const reference = `internal-transfer-${Date.now()}`;
        // sender transaction
        await this.walletTransactionRepository.create(
          {
            userId: user?.id || -1,
            walletId: senderWallet.id,
            via: "wallet",
            amount: data.amount,
            reason: data.reason,
            reference,
            status: "completed",
            type: "withdrawal",
            senderInfo: {
              type: "internal",
              user_id: user?.id || null,
            },
            receiverInfo: {
              type: "internal",
              user_id: recipientUser.id,
            },
          },
          trx,
        );

        // recipient transaction
        await this.walletTransactionRepository.create(
          {
            userId: recipientUser.id,
            walletId: recipientWallet.id,
            via: "wallet",
            amount: data.amount,
            reason: data.reason,
            reference,
            status: "completed",
            type: "deposit",
            senderInfo: {
              type: "internal",
              user_id: user?.id || null,
            },
            receiverInfo: {
              type: "internal",
              user_id: recipientUser.id,
            },
          },
          trx,
        );

        // update sender wallet balance
        await this.walletRepository.incrementBalance(
          senderWallet.id,
          -data.amount,
          trx,
        );

        // update recipient wallet balance
        await this.walletRepository.incrementBalance(
          recipientWallet.id,
          data.amount,
          trx,
        );

        // create audit log
        await this.auditLogRepository.create(
          {
            userId: user?.id || -1,
            action: AUDIT_ACTIONS.INTERNAL_TRANSFER,
            details: `Transferred amount: ${data.amount} to user: ${recipientUser.username}`,
            entityId: recipientUser.id,
            entityType: "user",
          },
          trx,
        );
      });

      return {
        status: "success",
        message: "Transfer completed successfully",
      };
    } catch (e) {
      throw e;
    } finally {
      if (lockAcquired) {
        const currentLockValue = await rs.get(lockKey);
        if (currentLockValue === lockValue) {
          await rs.del(lockKey);
        }
      }
    }
  };

  transferToExternalWallet = async (
    data: TransferToExternalWalletData,
    user?: User,
  ) => {
    const rs = await RedisObject();
    const lockKey = `wallet:transfer:external:${user?.id ?? "anonymous"}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let lockAcquired = false;

    try {
      if (!rs.isOpen) {
        await rs.connect();
      }

      const lock = await rs.set(lockKey, lockValue, { NX: true, EX: 90 });

      if (lock !== "OK") {
        return {
          status: "ignored",
          message: "Transfer is already being processed for this user",
        };
      }

      lockAcquired = true;

      //   get list of banks from paystack, check if bank code is valid, if not throw error
      const banks = await getBankList();
      let bank = banks.find((b: any) => b.code === data.bank_code);

      if (!bank) {
        if (data.bank_code == "001") {
          bank = {
            name: "First Bank of Nigeria",
            code: "001",
          };
        } else {
          throw new Error("Invalid bank code");
        }
      }

      //   validate account
      const { account_name, found } = await validateAccount(
        data.account_number,
        data.bank_code,
      );

      if (!found) {
        throw new Error("Invalid account details");
      }

      //   validate if user has sufficient balance in wallet for transfer, if not throw error
      const senderWallet = await this.walletRepository.findByUserId(
        user?.id || -1,
      );

      if (!senderWallet || senderWallet.availableBalance < data.amount) {
        throw new Error("Insufficient wallet balance for transfer");
      }

      //   create wallet transaction for sender with status completed, type withdrawal, via wallet
      //   update sender wallet balance by decrementing transfer amount
      await this.transactionManager.transaction(async (trx) => {
        const reference = `external-transfer-${Date.now()}`;
        // sender transaction
        await this.walletTransactionRepository.create(
          {
            userId: user?.id || -1,
            walletId: senderWallet.id,
            via: "direct_bank",
            amount: data.amount,
            reason: data.reason,
            reference,
            status: "completed",
            type: "withdrawal",
            senderInfo: {
              type: "internal",
              user_id: user?.id || null,
            },
            receiverInfo: {
              type: "external",
              bank: bank.name,
              account_number: data.account_number,
              account_name,
            },
          },
          trx,
        );

        // update sender wallet balance
        await this.walletRepository.incrementBalance(
          senderWallet.id,
          -data.amount,
          trx,
        );

        // create audit log
        await this.auditLogRepository.create(
          {
            userId: user?.id || -1,
            action: AUDIT_ACTIONS.EXTERNAL_TRANSFER,
            details: `Transferred amount: ${data.amount} to external account: ${account_name} (${data.account_number}) at bank: ${bank.name}`,
            entityId: senderWallet.id,
            entityType: "wallet",
          },
          trx,
        );
      });

      return {
        status: "success",
        message: "Transfer to external wallet completed successfully",
      };
    } catch (error) {
      throw error;
    } finally {
      if (lockAcquired) {
        const currentLockValue = await rs.get(lockKey);
        if (currentLockValue === lockValue) {
          await rs.del(lockKey);
        }
      }
    }
  };

  getWalletOverview = async (user?: User) => {
    const wallet = await this.walletRepository.findByUserId(user?.id || -1);
    const transactions = await this.walletTransactionRepository.findByWalletId(
      wallet?.id || -1,
    );

    return {
      wallet,
      transactions,
    };
  };

  bankList = async (): Promise<any> => {
    const list = await getBankList();
    return list;
  };
}
