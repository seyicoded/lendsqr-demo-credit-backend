import type { Knex } from "knex";

export interface CreateAuditLogData {
  action: string;
  entityId: number;
  entityType: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogRepository {
  constructor(private readonly database: Knex) {}

  async create(
    data: CreateAuditLogData,
    trx?: Knex.Transaction,
  ): Promise<void> {
    const executor = trx ?? this.database;

    await executor("audit_logs").insert({
      action: data.action,
      entity_id: data.entityId,
      entity_type: data.entityType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }
}
