import type { Knex } from "knex";

import type { CreateAuditLogData } from "../../models/audit.model";

export class AuditLogRepository {
  constructor(private readonly database: Knex) {}

  async create(
    data: CreateAuditLogData,
    trx?: Knex.Transaction,
  ): Promise<void> {
    const executor = trx ?? this.database;

    await executor("audit_logs").insert({
      user_id: data.userId,
      action: data.action,
      entity_id: data.entityId,
      entity_type: data.entityType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }
}
