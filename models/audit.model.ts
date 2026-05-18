export interface CreateAuditLogData {
  userId: number;
  action: string;
  entityId: number;
  entityType: string;
  metadata?: Record<string, unknown>;
}
