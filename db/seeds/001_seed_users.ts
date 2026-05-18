import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("audit_logs").del();
  await knex("users").del();

  const [userId] = await knex("users").insert([
    {
      first_name: "Sample",
      last_name: "User",
      email: "sample.user@example.com",
    },
  ]);

  await knex("audit_logs").insert({
    action: "USER_SEEDED",
    entity_id: Number(userId),
    entity_type: "user",
    metadata: JSON.stringify({ email: "sample.user@example.com" }),
  });
}
