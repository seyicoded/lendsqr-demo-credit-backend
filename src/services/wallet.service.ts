import { User } from "../../models/user.model";
import { FundWalletViaCardData } from "../../models/wallet.model";
import { env } from "../config/env";
import { createPaystackPayment } from "../network/external-api";
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
    data.amount = data.amount * 100; // convert to kobo
    const { authorization_url, reference } = await createPaystackPayment({
      amount: data.amount,
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
}
