import type { Knex } from "knex";
import {
  USERS_TABLE,
  WALLET_TRANSACTIONS_TABLE,
  WALLETS_TABLE,
} from "../../src/const/tables";

const info = JSON.stringify({
  type: "external | internal",
  user_id: "id | null",
  bank: "string | null",
  account_number: "string | null",
  account_name: "string | null",
});

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(WALLET_TRANSACTIONS_TABLE, (table) => {
    table.bigIncrements("id").primary();
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(USERS_TABLE)
      .onDelete("CASCADE");
    table
      .bigInteger("wallet_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(WALLETS_TABLE)
      .onDelete("CASCADE");
    table.double("amount").notNullable();
    table.boolean("status").defaultTo(false).notNullable();
    table.enum("type", ["deposit", "withdrawal"]).notNullable();
    table.enum("via", ["wallet", "direct_bank"]).notNullable();
    table.jsonb("sender_info").comment(info).notNullable();
    table.jsonb("reciever_info").comment(info).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(WALLET_TRANSACTIONS_TABLE);
}
