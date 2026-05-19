export interface CreateAuditLogData {
  userId: number;
  action: string;
  details?: string;
  entityId: number;
  entityType: string;
  metadata?: Record<string, unknown>;
}
