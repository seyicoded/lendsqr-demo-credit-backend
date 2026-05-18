import type { Knex } from "knex";
import { AUDIT_LOGS_TABLE, USERS_TABLE } from "../../src/const/tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(USERS_TABLE, (table) => {
    table.bigIncrements("id").primary();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).notNullable().unique();
    table.datetime("last_activity_at").nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable(AUDIT_LOGS_TABLE, (table) => {
    table.bigIncrements("id").primary();
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(USERS_TABLE)
      .onDelete("CASCADE");
    table.string("action", 120).notNullable();
    table.bigInteger("entity_id").notNullable();
    table.string("entity_type", 120).notNullable();
    table.json("metadata").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();

    table.index(["entity_type", "entity_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(AUDIT_LOGS_TABLE);
  await knex.schema.dropTableIfExists(USERS_TABLE);
}
