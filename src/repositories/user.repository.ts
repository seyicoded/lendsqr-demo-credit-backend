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
      username: data.username,
      password: data.password,
      last_activity_at: new Date(),
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

  async findByUsername(
    username: string,
    trx?: Knex.Transaction,
  ): Promise<User | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<UserRecord>("users")
      .where({ username })
      .first();

    return record ? toUser(record) : null;
  }

  async find(
    where: Partial<CreateUserData>,
    trx?: Knex.Transaction,
  ): Promise<User | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<UserRecord>("users").where(where).first();

    return record ? toUser(record) : null;
  }

  async findByEmailOrUsername(
    email: string,
    username: string,
    trx?: Knex.Transaction,
  ): Promise<User | null> {
    const executor = this.resolveExecutor(trx);
    const record = await executor<UserRecord>("users")
      .where({ email })
      .orWhere({ username })
      .first();

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

  // update record
  async update(
    id: number,
    data: Partial<CreateUserData>,
    trx?: Knex.Transaction,
  ): Promise<User> {
    const executor = this.resolveExecutor(trx);

    await executor<UserRecord>("users").where({ id }).update({
      first_name: data.firstName,
      last_name: data.lastName,
      password: data.password,
      last_activity_at: new Date(),
      updated_at: new Date(),
    });

    const record = await executor<UserRecord>("users").where({ id }).first();

    if (!record) {
      throw new Error("Failed to load updated user");
    }

    return toUser(record);
  }

  private resolveExecutor(trx?: Knex.Transaction): Queryable {
    return trx ?? this.database;
  }
}
