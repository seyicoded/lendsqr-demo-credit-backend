import type { Knex } from "knex";
import { USERS_TABLE } from "../../src/const/tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.string("username", 100).notNullable().unique();
    table.double("max_loan_threshold").notNullable().defaultTo(30000);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.dropColumn("username");
    table.dropColumn("max_loan_threshold");
  });
}
