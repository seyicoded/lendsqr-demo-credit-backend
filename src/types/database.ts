import type { Knex } from "knex";

export interface TransactionManager {
  transaction<T>(handler: (trx: Knex.Transaction) => Promise<T>): Promise<T>;
}
