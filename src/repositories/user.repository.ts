import type { Knex } from "knex";

import type { CreateUserData, User, UserRecord } from "../../models/user.model";
import { toUser } from "../../models/user.model";

type Queryable = Knex | Knex.Transaction;

export class UserRepository {
  constructor(private readonly database: Knex) {}

  async create(data: CreateUserData, trx?: Knex.Transaction): Promise<User> {
    const executor = this.resolveExecutor(trx);

    const [id] = await executor<UserRecord>("users").insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
    });

    const record = await executor<UserRecord>("users")
      .where({ id: Number(id) })
      .first();

    if (!record) {
      throw new Error("Failed to load created user");
    }

    return toUser(record);
  }

  async findByEmail(
    email: string,
    trx?: Knex.Transaction,
  ): Promise<User | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<UserRecord>("users").where({ email }).first();

    return record ? toUser(record) : null;
  }

  async findById(id: number, trx?: Knex.Transaction): Promise<User | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<UserRecord>("users").where({ id }).first();

    return record ? toUser(record) : null;
  }

  async list(trx?: Knex.Transaction): Promise<User[]> {
    const executor = this.resolveExecutor(trx);
    const records = await executor<UserRecord>("users")
      .select("*")
      .orderBy("id", "desc");

    return records.map(toUser);
  }

  private resolveExecutor(trx?: Knex.Transaction): Queryable {
    return trx ?? this.database;
  }
}
