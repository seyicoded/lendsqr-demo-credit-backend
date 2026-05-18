import type { Knex } from "knex";

import type {
  CreateWalletData,
  Wallet,
  WalletRecord,
} from "../../models/wallet.model";
import { toWallet } from "../../models/wallet.model";
import { WALLETS_TABLE } from "../const/tables";

type Queryable = Knex | Knex.Transaction;

export class WalletRepository {
  constructor(private readonly database: Knex) {}

  async create(
    data: CreateWalletData,
    trx?: Knex.Transaction,
  ): Promise<Wallet> {
    const executor = this.resolveExecutor(trx);

    const [id] = await executor<WalletRecord>(WALLETS_TABLE).insert({
      user_id: data.userId,
      available_balance: data.availableBalance,
    });

    const record = await executor<WalletRecord>(WALLETS_TABLE)
      .where({ id: Number(id) })
      .first();

    if (!record) {
      throw new Error("Failed to load created wallet");
    }

    return toWallet(record);
  }

  async findById(id: number, trx?: Knex.Transaction): Promise<Wallet | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<WalletRecord>(WALLETS_TABLE)
      .where({ id })
      .first();

    return record ? toWallet(record) : null;
  }

  async findByUserId(
    userId: number,
    trx?: Knex.Transaction,
  ): Promise<Wallet | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<WalletRecord>(WALLETS_TABLE)
      .where({ user_id: userId })
      .first();

    return record ? toWallet(record) : null;
  }

  async update(
    id: number,
    data: Partial<CreateWalletData>,
    trx?: Knex.Transaction,
  ): Promise<Wallet> {
    const executor = this.resolveExecutor(trx);

    const updateData: Partial<WalletRecord> = {};
    if (data.userId !== undefined) updateData.user_id = data.userId;
    if (data.availableBalance !== undefined) {
      updateData.available_balance = data.availableBalance;
    }

    await executor<WalletRecord>(WALLETS_TABLE)
      .where({ id })
      .update(updateData);

    const record = await executor<WalletRecord>(WALLETS_TABLE)
      .where({ id })
      .first();

    if (!record) {
      throw new Error("Failed to load updated wallet");
    }

    return toWallet(record);
  }

  async list(trx?: Knex.Transaction): Promise<Wallet[]> {
    const executor = this.resolveExecutor(trx);
    const records = await executor<WalletRecord>(WALLETS_TABLE)
      .select("*")
      .orderBy("id", "desc");

    return records.map(toWallet);
  }

  private resolveExecutor(trx?: Knex.Transaction): Queryable {
    return trx ?? this.database;
  }
}
