import { RedisObject } from "../connector/redisAdaptor";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import { UserRepository } from "../repositories/user.repository";
import { WalletTransactionRepository } from "../repositories/wallet-transaction.repository";
import { WalletRepository } from "../repositories/wallet.repository";
import { TransactionManager } from "../types/database";

export class WebhookService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly walletRepository: WalletRepository,
    private readonly walletTransactionRepository: WalletTransactionRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  verifyPaystackTransaction = async (req: any): Promise<any> => {
    const {
      event,
      data: { reference },
    } = req.body;

    const rs = await RedisObject();
    const lockKey = `paystack:webhook:lock:${reference}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let lockAcquired = false;

    try {
      if (!rs.isOpen) {
        await rs.connect();
      }

      // Prevent duplicate processing of the same payment reference.
      const lock = await rs.set(lockKey, lockValue, { NX: true, EX: 90 });

      if (lock !== "OK") {
        return {
          status: "ignored",
          message: "Reference is currently being processed",
        };
      }

      lockAcquired = true;

      console.log(req.headers, "headers");
      console.log(req.body, "body");

      if (!Object.keys(req.headers).includes("x-paystack-signature")) {
        console.error("x-paystack-signature not found on headers");
        throw new Error("x-paystack-signature not found on headers");
      }

      if (event != "charge.success") {
        console.error("event of payment, card not charged");
        return {
          status: "ignored",
          message: "Event ignored, not a charge.success event",
        };
      }

      // get wallet transaction with reference
      const walletTransaction =
        await this.walletTransactionRepository.findByReference(reference);

      if (!walletTransaction) {
        console.error("No wallet transaction found for reference:", reference);
        throw new Error(
          "No wallet transaction found for reference: " + reference,
        );
      }

      if (walletTransaction.status === "completed") {
        console.warn(
          "Wallet transaction already completed for reference:",
          reference,
        );
        return {
          status: "ignored",
          message: "Wallet transaction already completed for this reference",
        };
      }

      // update wallet transaction to completed, update wallet balance, create audit log
      await this.transactionManager.transaction(async (trx) => {
        await this.walletTransactionRepository.updateStatus(
          walletTransaction.id,
          "completed",
          trx,
        );

        await this.walletRepository.incrementBalance(
          walletTransaction.walletId,
          walletTransaction.amount,
          trx,
        );

        await this.auditLogRepository.create(
          {
            userId: walletTransaction.userId,
            action: "wallet_funded",
            details: `Wallet funded with amount: ${walletTransaction.amount} via Paystack`,
            entityId: walletTransaction.id,
            entityType: "wallet_transaction",
          },
          trx,
        );
      });

      return {
        status: "success",
        message: "Wallet transaction verified and completed successfully",
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
}
