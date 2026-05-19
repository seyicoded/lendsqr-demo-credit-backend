import type { Knex } from "knex";
import { USERS_TABLE } from "../../src/const/tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.integer("bvn", 20).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.dropColumn("bvn");
  });
}
