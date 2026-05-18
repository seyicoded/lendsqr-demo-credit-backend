import type { Knex } from "knex";
import { USERS_TABLE, WALLETS_TABLE } from "../../src/const/tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(WALLETS_TABLE, (table) => {
    table.bigIncrements("id").primary();
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(USERS_TABLE)
      .onDelete("CASCADE");
    table.double("available_balance").notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(WALLETS_TABLE);
}
