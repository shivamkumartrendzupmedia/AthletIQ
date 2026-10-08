import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import type { AuditAction } from '../models/constants.js';

export interface LogAuditParams {
  actor: Types.ObjectId | string;
  action: AuditAction;
  targetType: string;
  targetId: Types.ObjectId | string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Record an audit log event.
   * Guaranteed to be fail-safe: failures are logged to console and will never interrupt request execution.
   */
  async logAudit(params: LogAuditParams): Promise<void> {
    try {
      await AuditLog.create({
        actor: typeof params.actor === 'string' ? new Types.ObjectId(params.actor) : params.actor,
        action: params.action,
        targetType: params.targetType,
        targetId: typeof params.targetId === 'string' ? new Types.ObjectId(params.targetId) : params.targetId,
        meta: params.meta ?? {},
        ip: params.ip,
        userAgent: params.userAgent,
      });
    } catch (err) {
      console.error('Audit logging failed safely without throwing:', err);
    }
  }
}

export const auditService = new AuditService();
