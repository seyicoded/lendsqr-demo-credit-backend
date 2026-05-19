import type { Knex } from "knex";
import { WALLETS_TABLE } from "../../src/const/tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(WALLETS_TABLE, (table) => {
    table.string("name").notNullable().defaultTo("My Wallet");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(WALLETS_TABLE, (table) => {
    table.dropColumn("name");
  });
}
