import type { Knex } from "knex";

import type {
  WalletTransaction,
  WalletTransactionRecord,
} from "../../models/wallet-transaction";
import { toWalletTransaction } from "../../models/wallet-transaction";
import { WALLET_TRANSACTIONS_TABLE } from "../const/tables";

type Queryable = Knex | Knex.Transaction;

type CreateWalletTransactionData = Omit<
  WalletTransaction,
  "id" | "createdAt" | "updatedAt"
>;

type WalletTransactionDbRecord = Omit<
  WalletTransactionRecord,
  "receiver_info"
> & {
  reciever_info: WalletTransactionRecord["receiver_info"];
};

type WalletTransactionUpdateRecord = Partial<
  Omit<WalletTransactionDbRecord, "id" | "created_at" | "updated_at">
>;

export class WalletTransactionRepository {
  constructor(private readonly database: Knex) {}

  async create(
    data: CreateWalletTransactionData,
    trx?: Knex.Transaction,
  ): Promise<WalletTransaction> {
    const executor = this.resolveExecutor(trx);

    const [id] = await executor<WalletTransactionDbRecord>(
      WALLET_TRANSACTIONS_TABLE,
    ).insert({
      user_id: data.userId,
      wallet_id: data.walletId,
      amount: data.amount,
      reference: data.reference,
      status: data.status,
      reason: data.reason,
      type: data.type,
      via: data.via,
      sender_info: data.senderInfo,
      reciever_info: data.receiverInfo,
    });

    const record = await this.findRecordById(Number(id), executor);

    if (!record) {
      throw new Error("Failed to load created wallet transaction");
    }

    return toWalletTransaction(record);
  }

  async findById(
    id: number,
    trx?: Knex.Transaction,
  ): Promise<WalletTransaction | null> {
    const executor = this.resolveExecutor(trx);
    const record = await this.findRecordById(id, executor);

    return record ? toWalletTransaction(record) : null;
  }

  async findByUserId(
    userId: number,
    trx?: Knex.Transaction,
  ): Promise<WalletTransaction[]> {
    const executor = this.resolveExecutor(trx);
    const records = await this.baseSelect(executor).where({ user_id: userId });

    return records.map(toWalletTransaction);
  }

  async findByWalletId(
    walletId: number,
    trx?: Knex.Transaction,
  ): Promise<WalletTransaction[]> {
    const executor = this.resolveExecutor(trx);
    const records = await this.baseSelect(executor).where({
      wallet_id: walletId,
    });

    return records.map(toWalletTransaction);
  }

  async update(
    id: number,
    data: Partial<CreateWalletTransactionData>,
    trx?: Knex.Transaction,
  ): Promise<WalletTransaction> {
    const executor = this.resolveExecutor(trx);

    const updateData: WalletTransactionUpdateRecord = {};
    if (data.userId !== undefined) updateData.user_id = data.userId;
    if (data.walletId !== undefined) updateData.wallet_id = data.walletId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.via !== undefined) updateData.via = data.via;
    if (data.senderInfo !== undefined) updateData.sender_info = data.senderInfo;
    if (data.receiverInfo !== undefined) {
      updateData.reciever_info = data.receiverInfo;
    }

    await executor<WalletTransactionDbRecord>(WALLET_TRANSACTIONS_TABLE)
      .where({ id })
      .update(updateData);

    const record = await this.findRecordById(id, executor);

    if (!record) {
      throw new Error("Failed to load updated wallet transaction");
    }

    return toWalletTransaction(record);
  }

  async list(trx?: Knex.Transaction): Promise<WalletTransaction[]> {
    const executor = this.resolveExecutor(trx);
    const records = await this.baseSelect(executor).orderBy("id", "desc");

    return records.map(toWalletTransaction);
  }

  private baseSelect(executor: Queryable) {
    return executor<WalletTransactionDbRecord>(WALLET_TRANSACTIONS_TABLE)
      .select(
        "id",
        "user_id",
        "wallet_id",
        "amount",
        "reference",
        "status",
        "reason",
        "type",
        "via",
        "sender_info",
        { receiver_info: "reciever_info" },
        "created_at",
        "updated_at",
      )
      .orderBy("id", "desc");
  }

  private async findRecordById(
    id: number,
    executor: Queryable,
  ): Promise<WalletTransactionRecord | undefined> {
    const record = await this.baseSelect(executor).where({ id }).first();

    return record as WalletTransactionRecord | undefined;
  }

  private resolveExecutor(trx?: Knex.Transaction): Queryable {
    return trx ?? this.database;
  }
}
